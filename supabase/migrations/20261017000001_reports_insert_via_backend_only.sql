-- Reports can only be created by the submit-verified-report Edge Function.
-- That function authenticates the user, verifies the photo with AI, and inserts
-- with the service role, which bypasses RLS. Browsers (anon / authenticated,
-- including anyone holding the publishable key) can still read reports but can
-- no longer insert, update, or delete them.

drop policy "Signed-in users submit reports as themselves" on public.reports;

-- Also removes the column-level INSERT grant from the initial migration.
revoke insert on public.reports from anon, authenticated;

-- Unchanged, for reference: "Reports are publicly readable" (SELECT for anon,
-- authenticated using true) stays in place for the public map.
