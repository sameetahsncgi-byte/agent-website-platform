-- Run after the existing account, content, theme, and onboarding migrations.
-- Existing accounts/content are preserved. Website publishing and account access
-- are separate: disabling a website does not disable its agent editor.
begin;
create table if not exists public.agent_website_settings (
  site_id text primary key references public.agent_profiles(site_id) on delete cascade,
  enabled boolean not null default true,
  hostname text unique,
  updated_at timestamptz not null default now(),
  constraint website_hostname_format check (hostname is null or (
    hostname = lower(hostname) and length(hostname) <= 253
    and hostname ~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]([a-z0-9-]{0,61}[a-z0-9])?$'
  ))
);
alter table public.agent_website_settings enable row level security;
revoke all on public.agent_website_settings from public, anon, authenticated;
grant select on public.agent_website_settings to authenticated;
grant all on public.agent_website_settings to service_role;
grant select on public.agent_profiles, public.agent_onboarding to service_role;
drop policy if exists "Agent reads own website settings" on public.agent_website_settings;
create policy "Agent reads own website settings" on public.agent_website_settings
for select to authenticated using (exists (
  select 1 from public.agent_profiles p where p.site_id = agent_website_settings.site_id
  and p.user_id = (select auth.uid()) and p.active and p.role = 'agent'
));
create or replace function public.agent_website_is_active(requested_site text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.agent_profiles p
    left join public.agent_website_settings s on s.site_id = p.site_id
    where p.site_id = requested_site and p.active and p.role = 'agent' and coalesce(s.enabled, true));
$$;
revoke all on function public.agent_website_is_active(text) from public;
grant execute on function public.agent_website_is_active(text) to anon, authenticated;
-- Public hostname lookup reveals only the published website ID.
create or replace function public.resolve_agent_hostname(requested_hostname text)
returns text language sql stable security definer set search_path = '' as $$
  select s.site_id from public.agent_website_settings s
    where s.hostname = lower(requested_hostname) and s.enabled
      and public.agent_website_is_active(s.site_id);
$$;
revoke all on function public.resolve_agent_hostname(text) from public;
grant execute on function public.resolve_agent_hostname(text) to anon, authenticated;
-- The owner can keep editing an unpublished website. Public access still uses
-- Read active website content, which calls agent_website_is_active above.
drop policy if exists "Agent reads own unpublished content" on public.agent_site_content;
create policy "Agent reads own unpublished content" on public.agent_site_content
for select to authenticated using (exists (
  select 1 from public.agent_profiles p where p.site_id = agent_site_content.site_id
    and p.user_id = (select auth.uid()) and p.active and p.role = 'agent'
));
commit;
notify pgrst, 'reload schema';
select 'Website controls and hostname routing are ready' as result;
