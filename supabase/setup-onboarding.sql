-- Requires setup-agent.sql, setup-content.sql, themes, and platform_admins.
-- Run once in the same Supabase project's SQL Editor. Safe to rerun.
begin;
create table if not exists public.agent_onboarding (
  user_id uuid primary key references auth.users(id) on delete cascade,
  request_id uuid unique not null,
  site_id text unique not null references public.agent_profiles(site_id) on delete cascade,
  name text not null check (length(name) between 1 and 100),
  email text unique not null check (email = lower(email) and length(email) <= 254),
  site_slug text unique not null check (site_slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  status text not null default 'invited' check (status in ('invited', 'active')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.agent_onboarding enable row level security;
revoke all on public.agent_onboarding from public, anon, authenticated;
grant select on public.agent_onboarding to authenticated;
grant all on public.agent_onboarding to service_role;
grant select on public.platform_admins to service_role;
drop policy if exists "Agents read own onboarding" on public.agent_onboarding;
create policy "Agents read own onboarding" on public.agent_onboarding
  for select to authenticated using (user_id = (select auth.uid()));

-- Atomic record creation. Only the protected backend can call this function.
-- SECURITY DEFINER permits the narrow auth.users checks without exposing that table.
create or replace function public.provision_agent_website(
  p_user_id uuid, p_admin_id uuid, p_name text, p_email text,
  p_slug text, p_request_id uuid
) returns text language plpgsql security definer set search_path = '' as $$
declare v_site_id text := 'site-' || p_slug;
begin
  if not exists (select 1 from public.platform_admins where user_id = p_admin_id and active) then
    raise exception 'Active platform administrator required';
  end if;
  if exists (select 1 from public.platform_admins where user_id = p_user_id) then
    raise exception 'Administrator accounts cannot be enrolled as new agents';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id and lower(email) = p_email) then
    raise exception 'Account email does not match';
  end if;
  if p_slug in ('admin','api','app','auth','www','login','super-admin','onboarding','support','mail') then
    raise exception 'Reserved website handle';
  end if;
  insert into public.agent_profiles (user_id, agent_id, name, site_id, role, active)
    values (p_user_id, 'agent-' || p_user_id::text, p_name, v_site_id, 'agent', false);
  insert into public.agent_site_content (site_id, name, professional_title, headline, theme_key)
    values (v_site_id, p_name, 'Real Estate Agent', 'Your next chapter starts at home.', 'forest');
  insert into public.agent_onboarding (user_id, request_id, site_id, name, email, site_slug, created_by)
    values (p_user_id, p_request_id, v_site_id, p_name, p_email, p_slug, p_admin_id);
  return v_site_id;
end;
$$;
revoke all on function public.provision_agent_website(uuid, uuid, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.provision_agent_website(uuid, uuid, text, text, text, uuid) to service_role;

-- Activates only the verified invitation recipient after a password is set.
create or replace function public.complete_agent_onboarding(p_user_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_record public.agent_onboarding%rowtype;
begin
  select * into v_record from public.agent_onboarding where user_id = p_user_id for update;
  if not found then raise exception 'No onboarding record for this account'; end if;
  if not exists (select 1 from auth.users where id = p_user_id
      and email_confirmed_at is not null
      and coalesce(raw_app_meta_data, '{}'::jsonb) @> '{"agent_onboarding_password_set":true}'::jsonb) then
    raise exception 'Accept the invitation and set a password first';
  end if;
  if v_record.status = 'active' then
    if not exists (select 1 from public.agent_profiles where user_id = p_user_id and active and role = 'agent') then
      raise exception 'Account access is disabled';
    end if;
    return v_record.site_id;
  end if;
  update public.agent_profiles set active = true where user_id = p_user_id and role = 'agent';
  if not found then raise exception 'Agent profile missing'; end if;
  update public.agent_onboarding set status = 'active', completed_at = now() where user_id = p_user_id;
  return v_record.site_id;
end;
$$;
revoke all on function public.complete_agent_onboarding(uuid) from public, anon, authenticated;
grant execute on function public.complete_agent_onboarding(uuid) to service_role;
commit;
notify pgrst, 'reload schema';
select 'Agent onboarding is ready' as result;
