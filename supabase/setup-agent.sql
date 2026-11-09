-- Run in your Supabase project's SQL Editor.
-- This creates an account-access table only; it does not store passwords.
-- Change the email in the INSERT below if your Supabase user has another email.
begin;

create table if not exists public.agent_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  agent_id text unique not null,
  name text not null,
  site_id text unique not null,
  role text not null default 'agent' check (role in ('agent', 'super_admin')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.agent_profiles enable row level security;
revoke all on public.agent_profiles from anon, authenticated;
grant select on public.agent_profiles to authenticated;

drop policy if exists "Agents read own active profile" on public.agent_profiles;
create policy "Agents read own active profile" on public.agent_profiles
  for select to authenticated
  using ((select auth.uid()) = user_id and active = true and role = 'agent');

-- Only this existing account is enrolled. Sign-ups do not auto-enroll agents.
insert into public.agent_profiles (user_id, agent_id, name, site_id, role, active)
select id, 'agent001', 'Sameet Ahmed', 'site-agent001', 'agent', true
from auth.users
where lower(email) = lower('sameet.a@sncgi.net')
on conflict (user_id) do nothing;

commit;

-- You should see the enrolled agent below. No rows means the email above
-- does not match an existing Supabase Authentication user.
select agent_id, name, site_id, role, active from public.agent_profiles;
