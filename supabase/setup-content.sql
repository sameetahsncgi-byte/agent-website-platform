-- Run AFTER setup-agent.sql in Supabase SQL Editor. Safe to rerun.
begin;
create table if not exists public.agent_site_content (
  site_id text primary key references public.agent_profiles(site_id) on delete cascade,
  name text not null default '' check (length(name) <= 100),
  professional_title text not null default '' check (length(professional_title) <= 120),
  brokerage text not null default '' check (length(brokerage) <= 160),
  headline text not null default '' check (length(headline) <= 180),
  bio text not null default '' check (length(bio) <= 2000),
  about_title text not null default '' check (length(about_title) <= 180),
  about_intro text not null default '' check (length(about_intro) <= 2000),
  about_story text not null default '' check (length(about_story) <= 10000),
  email text not null default '' check (length(email) <= 254),
  phone text not null default '' check (length(phone) <= 50),
  location text not null default '' check (length(location) <= 180),
  address text not null default '' check (length(address) <= 400),
  website text not null default '' check (website = '' or (length(website) <= 500 and website ~ '^https://[^[:space:]]+$')),
  facebook text not null default '' check (facebook = '' or (length(facebook) <= 500 and facebook ~ '^https://[^[:space:]]+$')),
  instagram text not null default '' check (instagram = '' or (length(instagram) <= 500 and instagram ~ '^https://[^[:space:]]+$')),
  linkedin text not null default '' check (linkedin = '' or (length(linkedin) <= 500 and linkedin ~ '^https://[^[:space:]]+$')),
  photo_path text not null default '' check (length(photo_path) <= 300),
  logo_path text not null default '' check (length(logo_path) <= 300),
  updated_at timestamptz not null default now()
);
-- Narrow public lookup; keeps account-access records private.
create or replace function public.agent_website_is_active(requested_site text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.agent_profiles p where p.site_id = requested_site and p.active and p.role = 'agent');
$$;
revoke all on function public.agent_website_is_active(text) from public;
grant execute on function public.agent_website_is_active(text) to anon, authenticated;
create or replace function public.touch_agent_content()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists agent_content_updated on public.agent_site_content;
create trigger agent_content_updated before update on public.agent_site_content
  for each row execute function public.touch_agent_content();
alter table public.agent_site_content enable row level security;
revoke all on public.agent_site_content from anon, authenticated;
grant select on public.agent_site_content to anon, authenticated;
grant insert, update on public.agent_site_content to authenticated;
drop policy if exists "Read active website content" on public.agent_site_content;
create policy "Read active website content" on public.agent_site_content
  for select to anon, authenticated using (public.agent_website_is_active(site_id));
drop policy if exists "Agent inserts own website content" on public.agent_site_content;
create policy "Agent inserts own website content" on public.agent_site_content
  for insert to authenticated with check (
    exists (select 1 from public.agent_profiles p where p.site_id = agent_site_content.site_id
      and p.user_id = (select auth.uid()) and p.active and p.role = 'agent')
    and (photo_path = '' or split_part(photo_path, '/', 1) = (select auth.uid())::text)
    and (logo_path = '' or split_part(logo_path, '/', 1) = (select auth.uid())::text)
  );
drop policy if exists "Agent updates own website content" on public.agent_site_content;
create policy "Agent updates own website content" on public.agent_site_content
  for update to authenticated
  using (exists (select 1 from public.agent_profiles p where p.site_id = agent_site_content.site_id
    and p.user_id = (select auth.uid()) and p.active and p.role = 'agent'))
  with check (
    exists (select 1 from public.agent_profiles p where p.site_id = agent_site_content.site_id
      and p.user_id = (select auth.uid()) and p.active and p.role = 'agent')
    and (photo_path = '' or split_part(photo_path, '/', 1) = (select auth.uid())::text)
    and (logo_path = '' or split_part(logo_path, '/', 1) = (select auth.uid())::text)
  );
-- Public website assets only. Upload keys are unique, so update is unnecessary.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('agent-images', 'agent-images', true, 1048576, array['image/webp'])
on conflict (id) do update set public = true, file_size_limit = 1048576, allowed_mime_types = array['image/webp'];
drop policy if exists "Agent uploads own website images" on storage.objects;
create policy "Agent uploads own website images" on storage.objects for insert to authenticated
with check (bucket_id = 'agent-images' and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.agent_profiles where user_id = (select auth.uid()) and active and role = 'agent'));
drop policy if exists "Agent reads own image objects" on storage.objects;
create policy "Agent reads own image objects" on storage.objects for select to authenticated
using (bucket_id = 'agent-images' and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.agent_profiles where user_id = (select auth.uid()) and active and role = 'agent'));
drop policy if exists "Agent removes own website images" on storage.objects;
create policy "Agent removes own website images" on storage.objects for delete to authenticated
using (bucket_id = 'agent-images' and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.agent_profiles where user_id = (select auth.uid()) and active and role = 'agent'));
-- First Save & Publish creates the record; this migration changes no account roles.
commit;
select 'Website content table and agent-images bucket are ready' as result;
