-- Tally: initial schema.
-- Every table below maps directly to a rule in GROUND_RULES.md. Read that
-- file first if you're wondering "why is this table shaped this way".

create extension if not exists pgcrypto;

-- ── Profiles ─────────────────────────────────────────────────────────────
-- One row per real, signed-up user. Supabase Auth owns auth.users; this
-- table holds the app-facing profile and is what every foreign key below
-- points at.
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  name        text not null,
  created_at  timestamptz not null default now()
);

-- ── Groups ───────────────────────────────────────────────────────────────
create table groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid not null references profiles(id),
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz,          -- soft delete, ground rule #7
  deleted_by  uuid references profiles(id)
);

-- ── Group members, including ghost members ──────────────────────────────
-- Ground rule: a member does not need an account. `user_id` is null for a
-- ghost member; `display_name` carries their name instead. `claimed_by` is
-- filled in later, once that person signs up and an admin (or they, via an
-- invite link) links the ghost row to a real profile — history is
-- preserved, nothing is re-created.
create table group_members (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references groups(id) on delete cascade,
  user_id       uuid references profiles(id),
  display_name  text,                -- required when user_id is null
  is_ghost      boolean not null generated always as (user_id is null) stored,
  claimed_by    uuid references profiles(id),
  role          text not null default 'member' check (role in ('admin', 'member')),
  added_by      uuid not null references profiles(id),
  joined_at     timestamptz not null default now(),
  deleted_at    timestamptz,
  deleted_by    uuid references profiles(id),
  constraint member_identity check (
    (user_id is not null and display_name is null) or
    (user_id is null and display_name is not null)
  )
);
create unique index one_active_membership_per_user
  on group_members (group_id, user_id) where deleted_at is null and user_id is not null;

-- ── Expenses ─────────────────────────────────────────────────────────────
-- amount is integer paise, never a float. See shared/lib/money.ts.
create table expenses (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references groups(id) on delete cascade,
  description   text not null,
  amount_paise  bigint not null check (amount_paise > 0),
  paid_by       uuid not null references group_members(id),
  category      text,
  created_by    uuid not null references profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  deleted_by    uuid references profiles(id)
);

-- ── Expense splits ───────────────────────────────────────────────────────
-- One row per person's share of one expense — a real table, not a JSON
-- array on the expense row, so "what does X owe across every group" is a
-- plain WHERE clause.
create table expense_splits (
  id            uuid primary key default gen_random_uuid(),
  expense_id    uuid not null references expenses(id) on delete cascade,
  member_id     uuid not null references group_members(id),
  share_paise   bigint not null check (share_paise >= 0),
  settled       boolean not null default false
);

-- ── Settlements (payments recorded between members) ─────────────────────
create table settlements (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references groups(id) on delete cascade,
  from_member   uuid not null references group_members(id),
  to_member     uuid not null references group_members(id),
  amount_paise  bigint not null check (amount_paise > 0),
  note          text,
  created_by    uuid not null references profiles(id),
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  deleted_by    uuid references profiles(id)
);

-- ── Idempotency keys (ground rule #1) ────────────────────────────────────
-- Every mutating call carries an Idempotency-Key header. The API layer
-- checks this table before doing any work; a replayed key returns the
-- stored response instead of repeating the mutation.
create table idempotency_keys (
  key           text primary key,
  user_id       uuid not null references profiles(id),
  endpoint      text not null,
  response      jsonb,
  created_at    timestamptz not null default now()
);
-- Keys older than 48h are safe to purge; retries beyond that window are
-- treated as new actions. Wire this into the same cron job as trash cleanup.

-- ── Audit log (ground rule #6) ───────────────────────────────────────────
-- Append-only. Written exclusively by triggers below, never by app code
-- directly, so logging can't be forgotten in some new mutation path.
create table audit_log (
  id            uuid primary key default gen_random_uuid(),
  entity_type   text not null,
  entity_id     uuid not null,
  actor_id      uuid references profiles(id),
  action        text not null check (action in ('insert', 'update', 'delete', 'soft_delete', 'restore')),
  before_data   jsonb,
  after_data    jsonb,
  created_at    timestamptz not null default now()
);

create or replace function audit_row_change() returns trigger as $$
declare
  v_actor uuid := auth.uid();
  v_action text;
begin
  if tg_op = 'INSERT' then
    v_action := 'insert';
  elsif tg_op = 'UPDATE' then
    v_action := case
      when new.deleted_at is not null and old.deleted_at is null then 'soft_delete'
      when new.deleted_at is null and old.deleted_at is not null then 'restore'
      else 'update'
    end;
  else
    v_action := 'delete';
  end if;

  insert into audit_log (entity_type, entity_id, actor_id, action, before_data, after_data)
  values (
    tg_table_name,
    coalesce(new.id, old.id),
    v_actor,
    v_action,
    case when tg_op != 'INSERT' then to_jsonb(old) end,
    case when tg_op != 'DELETE' then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger audit_expenses after insert or update or delete on expenses
  for each row execute function audit_row_change();
create trigger audit_settlements after insert or update or delete on settlements
  for each row execute function audit_row_change();
create trigger audit_group_members after insert or update or delete on group_members
  for each row execute function audit_row_change();

-- audit_log itself is append-only: no update/delete grants for the app role.
revoke update, delete on audit_log from authenticated;

-- ── Trash auto-purge (ground rule #7) ────────────────────────────────────
-- Run this daily via pg_cron (or a Supabase scheduled Edge Function).
-- Restoring is just `set deleted_at = null` while inside the 30-day window,
-- gated by the RLS policies below (admins only).
create or replace function purge_expired_trash() returns void as $$
begin
  delete from expenses where deleted_at < now() - interval '30 days';
  delete from settlements where deleted_at < now() - interval '30 days';
  delete from group_members where deleted_at < now() - interval '30 days';
end;
$$ language plpgsql security definer;

-- ── Row level security ───────────────────────────────────────────────────
alter table groups enable row level security;
alter table group_members enable row level security;
alter table expenses enable row level security;
alter table expense_splits enable row level security;
alter table settlements enable row level security;
alter table audit_log enable row level security;

create or replace function is_group_admin(p_group_id uuid) returns boolean as $$
  select exists (
    select 1 from group_members
    where group_id = p_group_id and user_id = auth.uid() and role = 'admin' and deleted_at is null
  );
$$ language sql security definer stable;

create or replace function is_group_member(p_group_id uuid) returns boolean as $$
  select exists (
    select 1 from group_members
    where group_id = p_group_id and user_id = auth.uid() and deleted_at is null
  );
$$ language sql security definer stable;

-- Members can see their own groups; only admins can see soft-deleted rows
-- (the Trash view), matching "restore is admin-only".
create policy group_members_select on group_members for select
  using (is_group_member(group_id) and (deleted_at is null or is_group_admin(group_id)));
create policy expenses_select on expenses for select
  using (is_group_member(group_id) and (deleted_at is null or is_group_admin(group_id)));
create policy settlements_select on settlements for select
  using (is_group_member(group_id) and (deleted_at is null or is_group_admin(group_id)));

create policy expenses_restore on expenses for update
  using (is_group_admin(group_id));
create policy settlements_restore on settlements for update
  using (is_group_admin(group_id));
create policy group_members_restore on group_members for update
  using (is_group_admin(group_id));
