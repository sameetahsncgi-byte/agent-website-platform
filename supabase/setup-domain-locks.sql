-- Run AFTER setup-editable-subdomains.sql. Keeps accounts, content and reservations.
begin;
alter table public.agent_website_settings add column if not exists domain_locked boolean not null default false;

-- Old names stay reserved, but only the CURRENT brokerage address resolves.
-- Bring any previously saved brokerage primary hostname into agreement first.
update public.agent_website_settings set hostname=subdomain_slug||'.brokerage.sncgi.com'
where subdomain_slug is not null and hostname like '%.brokerage.sncgi.com'
  and hostname<>subdomain_slug||'.brokerage.sncgi.com';

create or replace function public.protect_brokerage_hostname()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.subdomain_slug is null then
    select o.site_slug into new.subdomain_slug from public.agent_onboarding o where o.site_id=new.site_id;
  end if;
  if new.subdomain_slug is not null and not exists(
    select 1 from public.agent_subdomain_aliases a where a.handle=new.subdomain_slug and a.site_id=new.site_id
  ) then raise exception 'Website handle is not reserved for this agent' using errcode='23514'; end if;
  if new.hostname='brokerage.sncgi.com' or (new.hostname like '%.brokerage.sncgi.com'
    and (new.subdomain_slug is null or new.hostname<>new.subdomain_slug||'.brokerage.sncgi.com')) then
    raise exception 'Brokerage hostname must match the current website name' using errcode='23514';
  end if;
  return new;
end $$;

create or replace function public.rename_agent_subdomain(p_site_id text,p_slug text,p_actor uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_profile public.agent_profiles%rowtype; v_settings public.agent_website_settings%rowtype; v_admin boolean;
begin
  if p_slug is null or length(p_slug) not between 3 and 40 or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or p_slug in ('admin','api','app','auth','www','login','super-admin','onboarding','support','mail') then
    raise exception 'Use 3-40 lowercase letters, numbers or single hyphens. Avoid reserved names.' using errcode='22023';
  end if;
  select * into v_profile from public.agent_profiles where site_id=p_site_id and role='agent' for update;
  if not found then raise exception 'Agent website not found' using errcode='P0002'; end if;
  v_admin := exists(select 1 from public.platform_admins where user_id=p_actor and active);
  if p_actor is null or not (v_admin or (v_profile.user_id=p_actor and v_profile.active)) then
    raise exception 'Active website owner or Super Admin required' using errcode='42501';
  end if;
  select * into v_settings from public.agent_website_settings where site_id=p_site_id;
  if not v_admin and coalesce(v_settings.domain_locked,false) then
    raise exception 'Domain is locked. Please contact support.' using errcode='P0423';
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
  return jsonb_build_object('site_id',p_site_id,'subdomain_slug',p_slug,'hostname',v_settings.hostname,'enabled',v_settings.enabled,'domain_locked',v_settings.domain_locked);
end $$;
revoke all on function public.rename_agent_subdomain(text,text,uuid) from public,anon,authenticated;
grant execute on function public.rename_agent_subdomain(text,text,uuid) to service_role;


-- Serialize lock changes against renames on the SAME profile row. Only the
-- token-verified Super Admin backend can invoke this operation.
create or replace function public.set_agent_domain_lock(p_site_id text,p_locked boolean,p_actor uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_settings public.agent_website_settings%rowtype;
begin
  if p_actor is null or not exists(select 1 from public.platform_admins where user_id=p_actor and active) then
    raise exception 'Active Super Admin required' using errcode='42501';
  end if;
  if p_locked is null then raise exception 'Lock status is required' using errcode='22023'; end if;
  perform 1 from public.agent_profiles where site_id=p_site_id and role='agent' for update;
  if not found then raise exception 'Agent website not found' using errcode='P0002'; end if;
  insert into public.agent_website_settings(site_id,domain_locked) values(p_site_id,p_locked)
  on conflict(site_id) do update set domain_locked=excluded.domain_locked,updated_at=now()
  returning * into v_settings;
  return jsonb_build_object('site_id',p_site_id,'enabled',v_settings.enabled,'hostname',v_settings.hostname,
    'subdomain_slug',v_settings.subdomain_slug,'domain_locked',v_settings.domain_locked);
end $$;
revoke all on function public.set_agent_domain_lock(text,boolean,uuid) from public,anon,authenticated;
grant execute on function public.set_agent_domain_lock(text,boolean,uuid) to service_role;

create or replace function public.resolve_agent_hostname(requested_hostname text)
returns text language sql stable security definer set search_path='' as $$
  select s.site_id from public.agent_website_settings s
  where public.agent_website_is_active(s.site_id) and (
    s.subdomain_slug||'.brokerage.sncgi.com'=lower(requested_hostname)
    or (s.hostname=lower(requested_hostname) and s.hostname not like '%.brokerage.sncgi.com')
  ) limit 1;
$$;
revoke all on function public.resolve_agent_hostname(text) from public;
grant execute on function public.resolve_agent_hostname(text) to anon,authenticated;
commit;
notify pgrst,'reload schema';
select 'Domain locks and current-address routing are ready' as result;
