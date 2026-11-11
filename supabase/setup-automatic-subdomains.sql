-- Requires setup-website-controls.sql and earlier onboarding migrations.
-- One shared wildcard *.brokerage.sncgi.com must already be connected to Vercel.
-- This changes publishing eligibility; it does NOT activate pending auth accounts.
begin;
alter table public.agent_website_settings
  add column if not exists publish_before_onboarding boolean not null default false;

-- Reserve each default subdomain for its real onboarding record. A custom
-- hostname cannot hijack another agent's generated brokerage address.
create or replace function public.protect_brokerage_hostname()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.hostname = 'brokerage.sncgi.com' or (new.hostname like '%.brokerage.sncgi.com' and not exists (
    select 1 from public.agent_onboarding o where o.site_id = new.site_id
      and new.hostname = o.site_slug || '.brokerage.sncgi.com'
  )) then raise exception 'That brokerage subdomain belongs to another agent or is not reserved' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.protect_brokerage_hostname() from public, anon, authenticated;
drop trigger if exists protect_brokerage_hostname on public.agent_website_settings;
create trigger protect_brokerage_hostname before insert or update of hostname on public.agent_website_settings
for each row execute function public.protect_brokerage_hostname();

-- Give existing onboarded/created agents their generated address too, while
-- preserving their enabled/disabled state and any existing primary hostname.
insert into public.agent_website_settings (site_id, hostname, publish_before_onboarding)
select o.site_id, o.site_slug || '.brokerage.sncgi.com', true
from public.agent_onboarding o
on conflict (site_id) do update set
  hostname = coalesce(public.agent_website_settings.hostname, excluded.hostname),
  publish_before_onboarding = true;

create or replace function public.agent_website_is_active(requested_site text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.agent_profiles p
    left join public.agent_website_settings s on s.site_id = p.site_id
    left join public.agent_onboarding o on o.site_id = p.site_id
    where p.site_id = requested_site and p.role = 'agent'
      and coalesce(s.enabled, true)
      and (p.active or (coalesce(s.publish_before_onboarding, false) and o.status = 'invited')));
$$;
revoke all on function public.agent_website_is_active(text) from public;
grant execute on function public.agent_website_is_active(text) to anon, authenticated;

create or replace function public.resolve_agent_hostname(requested_hostname text)
returns text language sql stable security definer set search_path = '' as $$
  select p.site_id from public.agent_profiles p
    left join public.agent_website_settings s on s.site_id = p.site_id
    left join public.agent_onboarding o on o.site_id = p.site_id
    where public.agent_website_is_active(p.site_id)
      and (s.hostname = lower(requested_hostname)
        or o.site_slug || '.brokerage.sncgi.com' = lower(requested_hostname))
    limit 1;
$$;
revoke all on function public.resolve_agent_hostname(text) from public;
grant execute on function public.resolve_agent_hostname(text) to anon, authenticated;

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
  if p_slug is null or p_slug !~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' or p_slug like '%--%' then
    raise exception 'Invalid website handle';
  end if;
  if p_slug in ('admin','api','app','auth','www','login','super-admin','onboarding','support','mail') then
    raise exception 'Reserved website handle';
  end if;
  insert into public.agent_profiles (user_id, agent_id, name, site_id, role, active)
    values (p_user_id, 'agent-' || p_user_id::text, p_name, v_site_id, 'agent', false);
  insert into public.agent_site_content (site_id, name, professional_title, headline, bio, theme_key)
    values (v_site_id, p_name, 'Real Estate Agent', 'Your next chapter starts at home.', 'Welcome to my real estate website. More about my services and local expertise is coming soon.', 'forest');
  insert into public.agent_onboarding (user_id, request_id, site_id, name, email, site_slug, created_by)
    values (p_user_id, p_request_id, v_site_id, p_name, p_email, p_slug, p_admin_id);
  insert into public.agent_website_settings (site_id, enabled, hostname, publish_before_onboarding)
    values (v_site_id, true, p_slug || '.brokerage.sncgi.com', true);
  return v_site_id;
end;
$$;
revoke all on function public.provision_agent_website(uuid, uuid, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.provision_agent_website(uuid, uuid, text, text, text, uuid) to service_role;

commit;
notify pgrst, 'reload schema';
select 'Automatic brokerage subdomains are ready' as result;
