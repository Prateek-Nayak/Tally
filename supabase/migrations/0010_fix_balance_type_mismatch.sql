-- sum() over a bigint column returns numeric in Postgres, always - a
-- long-standing, easy-to-forget behavior (it exists to avoid silent
-- overflow on large sums). get_group_balances() declared its column as
-- bigint but the computed expression was numeric, so Postgres refused to
-- run the function at all, on every single call - including the one
-- inside remove_member()'s own safety check, which is why a removal
-- attempt failed with a raw Postgres error instead of either succeeding
-- or giving a sane "unsettled balance" message.
create or replace function get_group_balances(p_group_id uuid)
returns table(member_id uuid, balance_paise bigint) as $$
begin
  if not is_group_member(p_group_id) then
    raise exception 'Not a member of this group';
  end if;

  return query
  select
    m.id,
    (coalesce(paid.total, 0) - coalesce(owed.total, 0)
      + coalesce(paid_settle.total, 0) - coalesce(received_settle.total, 0))::bigint
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
