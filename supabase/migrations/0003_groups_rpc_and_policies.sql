-- Two things landing together because they're the same concern: making
-- "create a group, then see it" actually work end to end.

-- ── Fix: groups and expense_splits had RLS enabled but no policy at all ──
-- That means, as shipped, nobody could read even their own group back.
-- Caught while wiring up the real Groups screen against the real schema.
alter table groups enable row level security; -- no-op if already on, kept for clarity
create policy groups_select on groups for select
  using (is_group_member(id) and (deleted_at is null or is_group_admin(id)));
create policy groups_restore on groups for update
  using (is_group_admin(id));

create policy expense_splits_select on expense_splits for select
  using (exists (
    select 1 from expenses e where e.id = expense_id and is_group_member(e.group_id)
  ));

-- ── Write pattern: mutations go through SECURITY DEFINER RPCs, not raw
-- REST inserts. Deliberate — see GROUND_RULES.md rule 14. This is also
-- where idempotency (ground rule #1) actually gets enforced server-side,
-- not just as a client-side header nobody's checking.
create or replace function create_group(p_name text, p_idempotency_key text)
returns jsonb as $$
declare
  v_existing jsonb;
  v_group groups;
begin
  select response into v_existing from idempotency_keys
    where key = p_idempotency_key and user_id = auth.uid();
  if v_existing is not null then
    return v_existing;
  end if;

  if trim(p_name) = '' then
    raise exception 'Group name cannot be empty';
  end if;

  insert into groups (name, created_by) values (trim(p_name), auth.uid())
    returning * into v_group;
  insert into group_members (group_id, user_id, role, added_by)
    values (v_group.id, auth.uid(), 'admin', auth.uid());

  insert into idempotency_keys (key, user_id, endpoint, response)
    values (p_idempotency_key, auth.uid(), 'create_group', to_jsonb(v_group));

  return to_jsonb(v_group);
end;
$$ language plpgsql security definer set search_path = public;
