-- Two more RPCs, same write pattern as create_group (rule #14): checked
-- membership, server-side idempotency, security definer.

create or replace function add_ghost_member(p_group_id uuid, p_display_name text, p_idempotency_key text)
returns jsonb as $$
declare
  v_existing jsonb;
  v_member group_members;
begin
  if not is_group_member(p_group_id) then
    raise exception 'Not a member of this group';
  end if;

  select response into v_existing from idempotency_keys
    where key = p_idempotency_key and user_id = auth.uid();
  if v_existing is not null then
    return v_existing;
  end if;

  if trim(p_display_name) = '' then
    raise exception 'Name cannot be empty';
  end if;

  insert into group_members (group_id, display_name, added_by, role)
    values (p_group_id, trim(p_display_name), auth.uid(), 'member')
    returning * into v_member;

  insert into idempotency_keys (key, user_id, endpoint, response)
    values (p_idempotency_key, auth.uid(), 'add_ghost_member', to_jsonb(v_member));

  return to_jsonb(v_member);
end;
$$ language plpgsql security definer set search_path = public;

-- The split math mirrors shared/lib/money.ts's splitEvenly() exactly
-- (remainder paise go one-each to the first N members in the order given).
-- The client version is a preview only - this is the authoritative
-- calculation. A client can send whatever "preview" it wants; what gets
-- stored is always computed here, server-side.
create or replace function add_expense(
  p_group_id uuid,
  p_description text,
  p_amount_paise bigint,
  p_paid_by uuid,
  p_member_ids uuid[],
  p_idempotency_key text
) returns jsonb as $$
declare
  v_existing jsonb;
  v_expense expenses;
  v_count int := coalesce(array_length(p_member_ids, 1), 0);
  v_base bigint;
  v_remainder bigint;
  v_share bigint;
  v_member_id uuid;
  v_idx int := 0;
  v_result jsonb;
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
  if v_count = 0 then
    raise exception 'Pick at least one person to split with';
  end if;
  if trim(p_description) = '' then
    raise exception 'Description cannot be empty';
  end if;

  v_base := p_amount_paise / v_count;
  v_remainder := p_amount_paise - v_base * v_count;

  insert into expenses (group_id, description, amount_paise, paid_by, created_by)
    values (p_group_id, trim(p_description), p_amount_paise, p_paid_by, auth.uid())
    returning * into v_expense;

  foreach v_member_id in array p_member_ids loop
    v_share := v_base + (case when v_idx < v_remainder then 1 else 0 end);
    insert into expense_splits (expense_id, member_id, share_paise) values (v_expense.id, v_member_id, v_share);
    v_idx := v_idx + 1;
  end loop;

  v_result := to_jsonb(v_expense) || jsonb_build_object('split_count', v_count);

  insert into idempotency_keys (key, user_id, endpoint, response)
    values (p_idempotency_key, auth.uid(), 'add_expense', v_result);

  return v_result;
end;
$$ language plpgsql security definer set search_path = public;
