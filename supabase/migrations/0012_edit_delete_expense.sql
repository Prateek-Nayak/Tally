-- Both editable by whoever created the expense, or a group admin - the
-- same "you can fix your own mistake, or an admin can clean up" rule
-- most shared-expense apps use. No new audit trigger needed: the
-- existing audit_expenses trigger (from 0001) already fires on UPDATE
-- and classifies a deleted_at transition as 'soft_delete' automatically.

create or replace function update_expense(
  p_expense_id uuid,
  p_description text,
  p_amount_paise bigint,
  p_paid_by uuid,
  p_member_ids uuid[],
  p_idempotency_key text
) returns jsonb as $$
declare
  v_existing jsonb;
  v_expense expenses;
  v_group_id uuid;
  v_created_by uuid;
  v_count int := coalesce(array_length(p_member_ids, 1), 0);
  v_base bigint;
  v_remainder bigint;
  v_share bigint;
  v_member_id uuid;
  v_idx int := 0;
begin
  select group_id, created_by into v_group_id, v_created_by
    from expenses where id = p_expense_id and deleted_at is null;
  if v_group_id is null then
    raise exception 'Expense not found';
  end if;
  if v_created_by != auth.uid() and not is_group_admin(v_group_id) then
    raise exception 'Only the person who added this expense, or a group admin, can edit it';
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

  update expenses set
    description = trim(p_description),
    amount_paise = p_amount_paise,
    paid_by = p_paid_by,
    updated_at = now()
  where id = p_expense_id
  returning * into v_expense;

  delete from expense_splits where expense_id = p_expense_id;

  v_base := p_amount_paise / v_count;
  v_remainder := p_amount_paise - v_base * v_count;
  foreach v_member_id in array p_member_ids loop
    v_share := v_base + (case when v_idx < v_remainder then 1 else 0 end);
    insert into expense_splits (expense_id, member_id, share_paise) values (p_expense_id, v_member_id, v_share);
    v_idx := v_idx + 1;
  end loop;

  insert into idempotency_keys (key, user_id, endpoint, response)
    values (p_idempotency_key, auth.uid(), 'update_expense', to_jsonb(v_expense));

  return to_jsonb(v_expense);
end;
$$ language plpgsql security definer set search_path = public;

create or replace function delete_expense(p_expense_id uuid, p_idempotency_key text)
returns jsonb as $$
declare
  v_existing jsonb;
  v_group_id uuid;
  v_created_by uuid;
  v_expense expenses;
begin
  select group_id, created_by into v_group_id, v_created_by
    from expenses where id = p_expense_id and deleted_at is null;
  if v_group_id is null then
    raise exception 'Expense not found';
  end if;
  if v_created_by != auth.uid() and not is_group_admin(v_group_id) then
    raise exception 'Only the person who added this expense, or a group admin, can delete it';
  end if;

  select response into v_existing from idempotency_keys
    where key = p_idempotency_key and user_id = auth.uid();
  if v_existing is not null then
    return v_existing;
  end if;

  update expenses set deleted_at = now(), deleted_by = auth.uid()
    where id = p_expense_id
    returning * into v_expense;

  insert into idempotency_keys (key, user_id, endpoint, response)
    values (p_idempotency_key, auth.uid(), 'delete_expense', to_jsonb(v_expense));

  return to_jsonb(v_expense);
end;
$$ language plpgsql security definer set search_path = public;
