-- Two invite mechanisms, deliberately different trust levels:
--   - invite link: admin-only to create/revoke, since anyone holding it
--     can join - a higher-trust action gated to a higher-trust role.
--   - email invite: any member can send one, since it only works against
--     one specific, already-registered account - much lower blast radius
--     than a link, so the bar to send one is lower too.

create table group_invite_links (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups(id) on delete cascade,
  code        text not null unique,
  created_by  uuid not null references profiles(id),
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz
);

create table group_invites (
  id                  uuid primary key default gen_random_uuid(),
  group_id            uuid not null references groups(id) on delete cascade,
  group_name          text not null, -- snapshot at invite time, see note below
  email               text not null,
  invited_profile_id  uuid not null references profiles(id),
  invited_by          uuid not null references profiles(id),
  status              text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'revoked')),
  created_at          timestamptz not null default now(),
  responded_at        timestamptz
);
-- One pending invite per email per group - resending just refreshes it
-- rather than piling up duplicates.
create unique index one_pending_invite_per_email_per_group
  on group_invites (group_id, email) where status = 'pending';

alter table group_invite_links enable row level security;
alter table group_invites enable row level security;

-- Only admins can even see the link (matches admin-only create/revoke).
create policy group_invite_links_select on group_invite_links for select
  using (is_group_admin(group_id));

-- Two SELECT policies on group_invites - Postgres OR's them together, so
-- a row is visible if the viewer is a member of the group (can see who's
-- been invited) OR is the person actually invited (can see their own
-- invite even though they aren't a group member yet - that's the whole
-- point).
create policy group_invites_select_member on group_invites for select
  using (is_group_member(group_id));
create policy group_invites_select_invitee on group_invites for select
  using (invited_profile_id = auth.uid());

-- ── Invite link: create / revoke / join / preview ────────────────────────

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

  -- One active link per group - creating a new one retires the old one,
  -- so an old leaked link can't be quietly resurrected.
  update group_invite_links set revoked_at = now() where group_id = p_group_id and revoked_at is null;

  insert into group_invite_links (group_id, code, created_by)
    values (p_group_id, encode(gen_random_bytes(6), 'hex'), auth.uid())
    returning * into v_link;

  insert into idempotency_keys (key, user_id, endpoint, response)
    values (p_idempotency_key, auth.uid(), 'create_invite_link', to_jsonb(v_link));

  return to_jsonb(v_link);
end;
$$ language plpgsql security definer set search_path = public;

create or replace function revoke_invite_link(p_group_id uuid, p_idempotency_key text)
returns jsonb as $$
declare
  v_existing jsonb;
begin
  if not is_group_admin(p_group_id) then
    raise exception 'Only a group admin can revoke the invite link';
  end if;

  select response into v_existing from idempotency_keys
    where key = p_idempotency_key and user_id = auth.uid();
  if v_existing is not null then
    return v_existing;
  end if;

  update group_invite_links set revoked_at = now() where group_id = p_group_id and revoked_at is null;

  insert into idempotency_keys (key, user_id, endpoint, response)
    values (p_idempotency_key, auth.uid(), 'revoke_invite_link', '{"revoked": true}'::jsonb);

  return '{"revoked": true}'::jsonb;
end;
$$ language plpgsql security definer set search_path = public;

-- Lets the join-confirmation screen show "You're joining <Group Name>"
-- before committing - resolvable by anyone holding a valid code, since
-- they aren't a member yet and can't read the group any other way.
create or replace function preview_invite_link(p_code text)
returns jsonb as $$
declare
  v_name text;
begin
  select g.name into v_name
    from group_invite_links l join groups g on g.id = l.group_id
    where l.code = p_code and l.revoked_at is null;
  if v_name is null then
    raise exception 'This invite link is invalid or has been revoked';
  end if;
  return jsonb_build_object('group_name', v_name);
end;
$$ language plpgsql security definer set search_path = public stable;

create or replace function join_group_via_link(p_code text, p_idempotency_key text)
returns jsonb as $$
declare
  v_existing jsonb;
  v_link group_invite_links;
  v_member group_members;
begin
  select response into v_existing from idempotency_keys
    where key = p_idempotency_key and user_id = auth.uid();
  if v_existing is not null then
    return v_existing;
  end if;

  select * into v_link from group_invite_links where code = p_code and revoked_at is null;
  if v_link is null then
    raise exception 'This invite link is invalid or has been revoked';
  end if;

  if is_group_member(v_link.group_id) then
    raise exception 'You are already in this group';
  end if;

  insert into group_members (group_id, user_id, added_by, role)
    values (v_link.group_id, auth.uid(), auth.uid(), 'member')
    returning * into v_member;

  insert into idempotency_keys (key, user_id, endpoint, response)
    values (p_idempotency_key, auth.uid(), 'join_group_via_link', to_jsonb(v_member));

  return to_jsonb(v_member);
end;
$$ language plpgsql security definer set search_path = public;

-- ── Email invite: send / respond ─────────────────────────────────────────

create or replace function invite_by_email(p_group_id uuid, p_email text, p_idempotency_key text)
returns jsonb as $$
declare
  v_existing jsonb;
  v_profile profiles;
  v_group_name text;
  v_invite group_invites;
begin
  if not is_group_member(p_group_id) then
    raise exception 'Not a member of this group';
  end if;

  select response into v_existing from idempotency_keys
    where key = p_idempotency_key and user_id = auth.uid();
  if v_existing is not null then
    return v_existing;
  end if;

  select * into v_profile from profiles where email = lower(trim(p_email));
  if v_profile is null then
    raise exception 'No Tally account found for that email yet. Share the invite link instead.';
  end if;

  if exists (
    select 1 from group_members
    where group_id = p_group_id and user_id = v_profile.id and deleted_at is null
  ) then
    raise exception 'They are already in this group';
  end if;

  select name into v_group_name from groups where id = p_group_id;

  insert into group_invites (group_id, group_name, email, invited_profile_id, invited_by)
    values (p_group_id, v_group_name, v_profile.email, v_profile.id, auth.uid())
    on conflict (group_id, email) where status = 'pending'
    do update set invited_by = excluded.invited_by, created_at = now()
    returning * into v_invite;

  insert into idempotency_keys (key, user_id, endpoint, response)
    values (p_idempotency_key, auth.uid(), 'invite_by_email', to_jsonb(v_invite));

  return to_jsonb(v_invite);
end;
$$ language plpgsql security definer set search_path = public;

create or replace function respond_to_invite(p_invite_id uuid, p_accept boolean, p_idempotency_key text)
returns jsonb as $$
declare
  v_existing jsonb;
  v_invite group_invites;
begin
  select response into v_existing from idempotency_keys
    where key = p_idempotency_key and user_id = auth.uid();
  if v_existing is not null then
    return v_existing;
  end if;

  select * into v_invite from group_invites
    where id = p_invite_id and invited_profile_id = auth.uid() and status = 'pending';
  if v_invite is null then
    raise exception 'Invite not found or already handled';
  end if;

  if p_accept then
    insert into group_members (group_id, user_id, added_by, role)
      values (v_invite.group_id, auth.uid(), v_invite.invited_by, 'member');
    update group_invites set status = 'accepted', responded_at = now() where id = p_invite_id;
  else
    update group_invites set status = 'declined', responded_at = now() where id = p_invite_id;
  end if;

  insert into idempotency_keys (key, user_id, endpoint, response)
    values (p_idempotency_key, auth.uid(), 'respond_to_invite', jsonb_build_object('accepted', p_accept));

  return jsonb_build_object('accepted', p_accept);
end;
$$ language plpgsql security definer set search_path = public;
