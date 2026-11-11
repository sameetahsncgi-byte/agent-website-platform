-- Run AFTER setup-domain-locks.sql. No content or account data is deleted.
begin;
-- Super Admin's Save hostname selects the primary address as well as renaming
-- the brokerage name. Agent self-service renames still preserve custom domains.
create or replace function public.set_agent_brokerage_hostname(p_site_id text,p_slug text,p_actor uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_settings public.agent_website_settings%rowtype;
begin
  if p_actor is null or not exists(select 1 from public.platform_admins where user_id=p_actor and active) then
    raise exception 'Active Super Admin required' using errcode='42501';
  end if;
  -- rename_agent_subdomain takes the profile lock and reserves/validates the
  -- unique handle. Both changes roll back together on any error.
  perform public.rename_agent_subdomain(p_site_id,p_slug,p_actor);
  update public.agent_website_settings
    set hostname=p_slug||'.brokerage.sncgi.com',updated_at=now()
    where site_id=p_site_id returning * into v_settings;
  return jsonb_build_object('site_id',p_site_id,'hostname',v_settings.hostname,
    'subdomain_slug',v_settings.subdomain_slug,'enabled',v_settings.enabled,
    'domain_locked',v_settings.domain_locked);
end $$;
revoke all on function public.set_agent_brokerage_hostname(text,text,uuid) from public,anon,authenticated;
grant execute on function public.set_agent_brokerage_hostname(text,text,uuid) to service_role;
commit;
notify pgrst,'reload schema';
