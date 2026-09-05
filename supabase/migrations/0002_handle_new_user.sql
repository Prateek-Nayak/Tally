-- Auto-creates a `profiles` row whenever a new user completes sign-up in
-- Supabase Auth. This lives at the DB layer for the same reason the audit
-- triggers do: it must not be possible to add a new sign-up path (email,
-- OAuth, magic link, whatever comes later) that forgets to create the
-- matching profile.

create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
