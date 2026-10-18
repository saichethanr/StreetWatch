-- StreetWatch: initial schema.
-- Tables: profiles, reports, comments, report_upvotes.
--
-- Security model: the browser uses the anon key, so every table has Row Level
-- Security, and clients may only write the columns they own. Counters, status,
-- timestamps, and the jurisdiction (accountability) fields are server-controlled.

------------------------------------------------------------------------------
-- Enums
------------------------------------------------------------------------------

create type public.report_category as enum (
  'garbage',
  'pothole',
  'footpath',
  'streetlight',
  'waterlogging',
  'encroachment',
  'open_manhole',
  'debris_dumping',
  'pipeline_leak',
  'hanging_wires',
  'other'
);

create type public.report_status as enum ('active', 'resolved');

------------------------------------------------------------------------------
-- profiles: one row per Supabase Auth user
------------------------------------------------------------------------------

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  -- Lowercase so @mentions resolve case-insensitively and stay unique.
  username   text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  full_name  text check (char_length(full_name) <= 100),
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Every new auth user gets a profile with a generated username
-- (e.g. user_3f9a1c2b7d4e), which they can change later.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    'user_' || substr(replace(new.id::text, '-', ''), 1, 12),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

------------------------------------------------------------------------------
-- reports: civic issues shown on the map
------------------------------------------------------------------------------

create table public.reports (
  id                    uuid primary key default gen_random_uuid(),
  -- Reports are a public record, so they survive account deletion.
  user_id               uuid default auth.uid() references public.profiles (id) on delete set null,
  image_url             text not null,
  category              public.report_category not null,
  description           text check (char_length(description) <= 1000),
  latitude              double precision not null check (latitude between -90 and 90),
  longitude             double precision not null check (longitude between -180 and 180),
  status                public.report_status not null default 'active',
  upvotes_count         integer not null default 0 check (upvotes_count >= 0),
  days_ignored          integer not null default 0 check (days_ignored >= 0),
  -- Political Accountability Badge. Filled server-side from the coordinates,
  -- never by the reporter, so the badge cannot be falsified.
  assembly_constituency text,
  mla_name              text,
  ward_number_name      text,
  councillor_name       text,
  created_at            timestamptz not null default now()
);

comment on column public.reports.days_ignored is
  'Whole days the report has stayed active. Kept current by public.refresh_days_ignored().';

-- The map loads active reports inside the visible bounding box.
create index reports_status_lat_lng_idx on public.reports (status, latitude, longitude);
create index reports_created_at_idx on public.reports (created_at desc);
create index reports_user_id_idx on public.reports (user_id);

-- Recomputes days_ignored for every active report from created_at.
-- Resolved reports keep the count they had when they were resolved.
create function public.refresh_days_ignored()
returns void
language sql
set search_path = ''
as $$
  update public.reports
  set days_ignored = (current_date - (created_at at time zone 'utc')::date)
  where status = 'active'
    and days_ignored <> (current_date - (created_at at time zone 'utc')::date);
$$;

-- To run it nightly, enable the pg_cron extension in the Supabase dashboard
-- (Database > Extensions) and then run:
--   select cron.schedule('refresh-days-ignored', '5 0 * * *',
--                        'select public.refresh_days_ignored()');

------------------------------------------------------------------------------
-- comments: discussion under a report
------------------------------------------------------------------------------

create table public.comments (
  id           uuid primary key default gen_random_uuid(),
  report_id    uuid not null references public.reports (id) on delete cascade,
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- Plain text; mentions are written as @username and resolved by the client.
  comment_text text not null check (char_length(comment_text) between 1 and 1000),
  created_at   timestamptz not null default now()
);

create index comments_report_id_created_at_idx on public.comments (report_id, created_at);
create index comments_user_id_idx on public.comments (user_id);

------------------------------------------------------------------------------
-- report_upvotes: at most one vote per user per report
------------------------------------------------------------------------------

create table public.report_upvotes (
  report_id uuid not null references public.reports (id) on delete cascade,
  user_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  primary key (report_id, user_id)
);

create index report_upvotes_user_id_idx on public.report_upvotes (user_id);

-- Keeps reports.upvotes_count equal to the number of report_upvotes rows.
-- security definer because voters have no UPDATE right on reports.
create function public.sync_upvotes_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.reports set upvotes_count = upvotes_count + 1 where id = new.report_id;
  else
    update public.reports set upvotes_count = upvotes_count - 1 where id = old.report_id;
  end if;
  return null;
end;
$$;

create trigger report_upvotes_sync_count
  after insert or delete on public.report_upvotes
  for each row execute function public.sync_upvotes_count();

------------------------------------------------------------------------------
-- Privileges
------------------------------------------------------------------------------

-- Supabase grants anon/authenticated full access to new tables and functions
-- by default. Replace that with exactly what the client needs.
revoke all on public.profiles, public.reports, public.comments, public.report_upvotes
  from anon, authenticated;

grant select on public.profiles, public.reports, public.comments to anon, authenticated;

grant update (username, full_name, avatar_url) on public.profiles to authenticated;
grant insert (image_url, category, description, latitude, longitude) on public.reports to authenticated;
grant insert (report_id, comment_text), delete on public.comments to authenticated;
grant select, insert (report_id), delete on public.report_upvotes to authenticated;

revoke execute on function public.refresh_days_ignored() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.sync_upvotes_count() from public, anon, authenticated;

------------------------------------------------------------------------------
-- Row Level Security
------------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.comments enable row level security;
alter table public.report_upvotes enable row level security;

create policy "Profiles are publicly readable"
  on public.profiles for select to anon, authenticated using (true);

create policy "Users update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Reports are publicly readable"
  on public.reports for select to anon, authenticated using (true);

create policy "Signed-in users submit reports as themselves"
  on public.reports for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Comments are publicly readable"
  on public.comments for select to anon, authenticated using (true);

create policy "Signed-in users comment as themselves"
  on public.comments for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users delete their own comments"
  on public.comments for delete to authenticated
  using (user_id = (select auth.uid()));

-- Users only see their own votes (to show "you upvoted"); totals come from
-- reports.upvotes_count.
create policy "Users see their own upvotes"
  on public.report_upvotes for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users upvote as themselves"
  on public.report_upvotes for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users remove their own upvotes"
  on public.report_upvotes for delete to authenticated
  using (user_id = (select auth.uid()));

------------------------------------------------------------------------------
-- Realtime: stream new comments to open detail drawers
------------------------------------------------------------------------------

alter publication supabase_realtime add table public.comments;
