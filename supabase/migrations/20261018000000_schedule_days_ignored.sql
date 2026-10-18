-- Nightly refresh of reports.days_ignored via pg_cron.
-- Runs at 00:05 UTC; public.refresh_days_ignored() recomputes the count for active reports.

create extension if not exists pg_cron with schema pg_catalog;

-- cron.schedule with an existing job name replaces that job, so this is safe to rerun.
select cron.schedule('refresh-days-ignored', '5 0 * * *', 'select public.refresh_days_ignored()');
