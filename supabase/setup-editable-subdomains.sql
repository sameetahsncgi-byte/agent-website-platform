-- Run AFTER setup-automatic-subdomains.sql. Preserves website IDs and content.
begin;
alter table public.agent_website_settings add column if not exists subdomain_slug text;
create table if not exists public.agent_subdomain_aliases (
  handle text primary key check(length(handle) between 3 and 40 and handle ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  site_id text not null references public.agent_profiles(site_id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.agent_subdomain_aliases enable row level security;
revoke all on public.agent_subdomain_aliases from public, anon, authenticated;
grant all on public.agent_subdomain_aliases to service_role;
create index if not exists agent_subdomain_aliases_site on public.agent_subdomain_aliases(site_id);
insert into public.agent_subdomain_aliases(handle, site_id)
select site_slug, site_id from public.agent_onboarding
on conflict(handle) do nothing;
-- Fail instead of silently accepting a conflicting reservation.
do $$ begin
  if exists(select 1 from public.agent_onboarding o join public.agent_subdomain_aliases a on a.handle=o.site_slug where a.site_id<>o.site_id) then
    raise exception 'Conflicting website handle reservations; no changes made';
  end if;
end $$;
update public.agent_website_settings s set subdomain_slug=o.site_slug
from public.agent_onboarding o where o.site_id=s.site_id and s.subdomain_slug is null;

-- Future account provisioning must reserve its handle too. This trigger runs
-- inside the existing provision_agent_website transaction.
create or replace function public.reserve_agent_subdomain()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.agent_subdomain_aliases(handle,site_id) values(new.site_slug,new.site_id)
  on conflict(handle) do nothing;
  if not exists(select 1 from public.agent_subdomain_aliases where handle=new.site_slug and site_id=new.site_id) then
    raise exception 'Website handle is already used or reserved' using errcode='23505';
  end if;
  return new;
end $$;
revoke all on function public.reserve_agent_subdomain() from public,anon,authenticated;
drop trigger if exists reserve_agent_subdomain on public.agent_onboarding;
create trigger reserve_agent_subdomain after insert or update of site_slug on public.agent_onboarding
for each row execute function public.reserve_agent_subdomain();

create or replace function public.protect_brokerage_hostname()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.subdomain_slug is null then
    select o.site_slug into new.subdomain_slug from public.agent_onboarding o where o.site_id=new.site_id;
  end if;
  if new.subdomain_slug is not null and not exists(
    select 1 from public.agent_subdomain_aliases a where a.handle=new.subdomain_slug and a.site_id=new.site_id
  ) then raise exception 'Website handle is not reserved for this agent' using errcode='23514'; end if;
  if new.hostname='brokerage.sncgi.com' or (new.hostname like '%.brokerage.sncgi.com' and not exists(
    select 1 from public.agent_subdomain_aliases a where a.site_id=new.site_id
      and new.hostname=a.handle||'.brokerage.sncgi.com'
  )) then raise exception 'Brokerage hostname is not reserved for this agent' using errcode='23514'; end if;
  return new;
end $$;
drop trigger if exists protect_brokerage_hostname on public.agent_website_settings;
create trigger protect_brokerage_hostname before insert or update of hostname,subdomain_slug on public.agent_website_settings
for each row execute function public.protect_brokerage_hostname();

-- Service-only operation. p_actor must be supplied by a token-verified backend
-- or by the authenticated wrapper below, never directly by a browser caller.
create or replace function public.rename_agent_subdomain(p_site_id text,p_slug text,p_actor uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_profile public.agent_profiles%rowtype; v_settings public.agent_website_settings%rowtype;
begin
  if p_slug is null or length(p_slug) not between 3 and 40 or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or p_slug in ('admin','api','app','auth','www','login','super-admin','onboarding','support','mail') then
    raise exception 'Use 3-40 lowercase letters, numbers or single hyphens. Avoid reserved names.' using errcode='22023';
  end if;
  select * into v_profile from public.agent_profiles where site_id=p_site_id and role='agent' for update;
  if not found then raise exception 'Agent website not found' using errcode='P0002'; end if;
  if p_actor is null or not (exists(select 1 from public.platform_admins where user_id=p_actor and active)
      or (v_profile.user_id=p_actor and v_profile.active)) then
    raise exception 'Active website owner or Super Admin required' using errcode='42501';
  end if;
  insert into public.agent_subdomain_aliases(handle,site_id) values(p_slug,p_site_id)
  on conflict(handle) do nothing;
  if not exists(select 1 from public.agent_subdomain_aliases where handle=p_slug and site_id=p_site_id) then
    raise exception 'That website name is already used or reserved' using errcode='23505';
  end if;
  update public.agent_onboarding set site_slug=p_slug where site_id=p_site_id;
  insert into public.agent_website_settings(site_id,subdomain_slug,hostname)
  values(p_site_id,p_slug,p_slug||'.brokerage.sncgi.com')
  on conflict(site_id) do update set subdomain_slug=excluded.subdomain_slug,
    hostname=case when public.agent_website_settings.hostname is null or public.agent_website_settings.hostname like '%.brokerage.sncgi.com'
      then excluded.hostname else public.agent_website_settings.hostname end,
    updated_at=now()
  returning * into v_settings;
  return jsonb_build_object('site_id',p_site_id,'subdomain_slug',p_slug,'hostname',v_settings.hostname,'enabled',v_settings.enabled);
end $$;
revoke all on function public.rename_agent_subdomain(text,text,uuid) from public,anon,authenticated;
grant execute on function public.rename_agent_subdomain(text,text,uuid) to service_role;

-- An agent can rename only their own active profile; no user/site ID argument.
create or replace function public.rename_my_subdomain(p_slug text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_site text; v_user uuid := auth.uid();
begin
  select site_id into v_site from public.agent_profiles where user_id=v_user and active and role='agent';
  if v_site is null then raise exception 'Sign in with an active agent account' using errcode='42501'; end if;
  return public.rename_agent_subdomain(v_site,p_slug,v_user);
end $$;
revoke all on function public.rename_my_subdomain(text) from public,anon;
grant execute on function public.rename_my_subdomain(text) to authenticated;

-- Old brokerage links keep opening the SAME website and cannot be claimed by
-- another agent. Disabled sites remain unavailable through every alias.
create or replace function public.resolve_agent_hostname(requested_hostname text)
returns text language sql stable security definer set search_path='' as $$
  select p.site_id from public.agent_profiles p
  left join public.agent_website_settings s on s.site_id=p.site_id
  where public.agent_website_is_active(p.site_id) and (
    s.hostname=lower(requested_hostname) or exists(
      select 1 from public.agent_subdomain_aliases a where a.site_id=p.site_id
        and a.handle||'.brokerage.sncgi.com'=lower(requested_hostname)
    )) limit 1;
$$;
revoke all on function public.resolve_agent_hostname(text) from public;
grant execute on function public.resolve_agent_hostname(text) to anon,authenticated;
commit;
notify pgrst,'reload schema';
select 'Editable brokerage subdomains are ready' as result;
