-- Recording a settlement is a routine, low-risk action (unlike removal
-- or invite links) - any group member can log one, same permission
-- level as add_expense and add_ghost_member.
create or replace function record_settlement(
  p_group_id uuid,
  p_from_member uuid,
  p_to_member uuid,
  p_amount_paise bigint,
  p_note text,
  p_idempotency_key text
) returns jsonb as $$
declare
  v_existing jsonb;
  v_settlement settlements;
begin
  if not is_group_member(p_group_id) then
    raise exception 'Not a member of this group';
  end if;

  select response into v_existing from idempotency_keys
    where key = p_idempotency_key and user_id = auth.uid();
  if v_existing is not null then
    return v_existing;
  end if;

  if p_amount_paise <= 0 then
    raise exception 'Amount must be positive';
  end if;
  if p_from_member = p_to_member then
    raise exception 'Cannot record a payment from someone to themselves';
  end if;
  if not exists (select 1 from group_members where id = p_from_member and group_id = p_group_id and deleted_at is null) then
    raise exception 'That payer is not in this group';
  end if;
  if not exists (select 1 from group_members where id = p_to_member and group_id = p_group_id and deleted_at is null) then
    raise exception 'That payee is not in this group';
  end if;

  insert into settlements (group_id, from_member, to_member, amount_paise, note, created_by)
    values (p_group_id, p_from_member, p_to_member, p_amount_paise, nullif(trim(p_note), ''), auth.uid())
    returning * into v_settlement;

  insert into idempotency_keys (key, user_id, endpoint, response)
    values (p_idempotency_key, auth.uid(), 'record_settlement', to_jsonb(v_settlement));

  return to_jsonb(v_settlement);
end;
$$ language plpgsql security definer set search_path = public;
