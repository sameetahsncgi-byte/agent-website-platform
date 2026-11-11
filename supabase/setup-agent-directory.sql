-- Private login emails for the token-verified Super Admin API only.
-- This does not expose auth.users or change public website content.
begin;
create or replace function public.platform_agent_emails()
returns table(site_id text,email text)
language sql stable security definer set search_path='' as $$
  select p.site_id,u.email::text from public.agent_profiles p
  join auth.users u on u.id=p.user_id where p.role='agent';
$$;
revoke all on function public.platform_agent_emails() from public,anon,authenticated;
grant execute on function public.platform_agent_emails() to service_role;
commit;
notify pgrst,'reload schema';
