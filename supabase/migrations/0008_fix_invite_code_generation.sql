-- create_invite_link's original version called gen_random_bytes(), from
-- the pgcrypto extension - which Supabase installs into a schema called
-- `extensions`, not `public`. The function's `set search_path = public`
-- made that invisible, so it failed at call time with "function ...
-- does not exist".
--
-- Fixing forward with a new migration rather than editing 0006 in place -
-- 0006 stays as an accurate record of what was actually run; this is a
-- correction on top of it, the same way the app's own audit log records
-- corrections rather than rewriting history.
--
-- Rather than chase down the exact extension schema (fragile - it can
-- differ across Supabase projects/plans), this drops the pgcrypto
-- dependency entirely. gen_random_uuid() is built into Postgres core
-- (pg_catalog) since PG13, already used everywhere else in this schema
-- with no schema issues - and 32 hex characters from a UUID is actually
-- more random than the original 12-character version, not less.
create or replace function create_invite_link(p_group_id uuid, p_idempotency_key text)
returns jsonb as $$
declare
  v_existing jsonb;
  v_link group_invite_links;
begin
  if not is_group_admin(p_group_id) then
    raise exception 'Only a group admin can create an invite link';
  end if;

  select response into v_existing from idempotency_keys
    where key = p_idempotency_key and user_id = auth.uid();
  if v_existing is not null then
    return v_existing;
  end if;

  update group_invite_links set revoked_at = now() where group_id = p_group_id and revoked_at is null;

  insert into group_invite_links (group_id, code, created_by)
    values (p_group_id, replace(gen_random_uuid()::text, '-', ''), auth.uid())
    returning * into v_link;

  insert into idempotency_keys (key, user_id, endpoint, response)
    values (p_idempotency_key, auth.uid(), 'create_invite_link', to_jsonb(v_link));

  return to_jsonb(v_link);
end;
$$ language plpgsql security definer set search_path = public;
