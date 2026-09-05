-- profiles has had RLS *disabled* since it was created in 0001 - meaning
-- any authenticated user could read every name and email in the system
-- via a direct REST call. Found while chasing an unrelated bug (an
-- ambiguous foreign-key embed), not through any deliberate audit - that's
-- itself worth sitting with for a second, and is why this file exists
-- rather than staying a silent gap.
--
-- Scope: you can read your own profile, or the profile of anyone who
-- shares at least one group with you. Not "read own profile only" (the
-- member list needs to show real names) and not "read every profile"
-- (that's the bug being fixed).
alter table profiles enable row level security;

create policy profiles_select on profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from group_members gm_self
      join group_members gm_target
        on gm_self.group_id = gm_target.group_id
      where gm_self.user_id = auth.uid()
        and gm_target.user_id = profiles.id
        and gm_self.deleted_at is null
        and gm_target.deleted_at is null
    )
  );
