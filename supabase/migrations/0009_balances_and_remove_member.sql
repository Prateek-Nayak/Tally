-- Net balance per member, in paise. Positive = the group owes them.
-- Negative = they owe the group. Zero = settled up.
--
-- Deliberately NOT security definer - a plain function that runs as the
-- caller. RLS already lets any group member see every expense/split/
-- settlement in their own group (the SELECT policies are group-scoped,
-- not per-row-owner-scoped), so the aggregates below are already correct
-- for a real member. The explicit is_group_member() check exists only to
-- turn "silently wrong numbers for a non-member" into a clear error.
create or replace function get_group_balances(p_group_id uuid)
returns table(member_id uuid, balance_paise bigint) as $$
begin
  if not is_group_member(p_group_id) then
    raise exception 'Not a member of this group';
  end if;

  return query
  select
    m.id,
    coalesce(paid.total, 0) - coalesce(owed.total, 0)
      + coalesce(paid_settle.total, 0) - coalesce(received_settle.total, 0)
  from group_members m
  left join (
    select e.paid_by, sum(e.amount_paise) as total
    from expenses e
    where e.group_id = p_group_id and e.deleted_at is null
    group by e.paid_by
  ) paid on paid.paid_by = m.id
  left join (
    select es.member_id, sum(es.share_paise) as total
    from expense_splits es
    join expenses e on e.id = es.expense_id
    where e.group_id = p_group_id and e.deleted_at is null
    group by es.member_id
  ) owed on owed.member_id = m.id
  left join (
    select s.from_member, sum(s.amount_paise) as total
    from settlements s
    where s.group_id = p_group_id and s.deleted_at is null
    group by s.from_member
  ) paid_settle on paid_settle.from_member = m.id
  left join (
    select s.to_member, sum(s.amount_paise) as total
    from settlements s
    where s.group_id = p_group_id and s.deleted_at is null
    group by s.to_member
  ) received_settle on received_settle.to_member = m.id
  where m.group_id = p_group_id and m.deleted_at is null;
end;
$$ language plpgsql stable set search_path = public;

-- Removal is admin-only (same "higher blast radius -> higher trust role"
-- reasoning as invite links) and reuses the existing soft-delete pattern
-- from ground rule #7 - a removed member is trashed, not deleted, with
-- the same 30-day restore window and admin-only visibility every other
-- trashed row already has. The audit trigger already on group_members
-- fires automatically; nothing new needed there.
create or replace function remove_member(p_group_id uuid, p_member_id uuid, p_idempotency_key text)
returns jsonb as $$
declare
  v_existing jsonb;
  v_balance bigint;
  v_member group_members;
begin
  if not is_group_admin(p_group_id) then
    raise exception 'Only a group admin can remove someone';
  end if;

  select response into v_existing from idempotency_keys
    where key = p_idempotency_key and user_id = auth.uid();
  if v_existing is not null then
    return v_existing;
  end if;

  select balance_paise into v_balance from get_group_balances(p_group_id) where member_id = p_member_id;
  if v_balance is null then
    raise exception 'Person not found in this group';
  end if;
  if v_balance != 0 then
    raise exception 'They still have an unsettled balance in this group. Settle up before removing them.';
  end if;

  update group_members set deleted_at = now(), deleted_by = auth.uid()
    where id = p_member_id and group_id = p_group_id
    returning * into v_member;

  insert into idempotency_keys (key, user_id, endpoint, response)
    values (p_idempotency_key, auth.uid(), 'remove_member', to_jsonb(v_member));

  return to_jsonb(v_member);
end;
$$ language plpgsql security definer set search_path = public;
