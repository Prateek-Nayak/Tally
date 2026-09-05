-- profiles was the one table that never got wired into audit_row_change().
-- Found the hard way: a manual delete from the Supabase table editor left
-- zero trace. This closes that gap the same way the other tables work.
create trigger audit_profiles after insert or update or delete on profiles
  for each row execute function audit_row_change();

-- Note for whoever reads this later: edits made directly via the Supabase
-- dashboard (SQL Editor / Table Editor) run as the project owner, not as
-- an authenticated app user, so auth.uid() is null and actor_id will be
-- null on those rows. The row still gets logged with a timestamp and the
-- full before/after snapshot - you just won't get a name attached to
-- dashboard-originated changes. That's a real, permanent limit of this
-- approach: nothing in Postgres can stop the project owner from bypassing
-- the app entirely via direct table access. The trigger buys visibility
-- after the fact, not prevention.
