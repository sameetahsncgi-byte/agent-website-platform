begin;
alter table public.agent_site_content add column if not exists hero_path text not null default '';
alter table public.agent_site_content add column if not exists hero_overlay integer not null default 55 check(hero_overlay between 0 and 100);
alter table public.agent_site_content add column if not exists hero_alt text not null default '' check(length(hero_alt)<=220);
alter table public.agent_site_content add column if not exists photo_alt text not null default '' check(length(photo_alt)<=220);
alter table public.agent_site_content add column if not exists logo_alt text not null default '' check(length(logo_alt)<=220);
create or replace function public.check_hero_path() returns trigger language plpgsql set search_path='' as $$
begin
 if length(new.hero_path)>300 or (new.hero_path<>'' and (new.hero_path !~ '^[0-9a-f-]{36}/hero-[0-9a-f-]{36}\.webp$' or (auth.uid() is not null and split_part(new.hero_path,'/',1)<>auth.uid()::text))) then
 raise exception 'Choose an image uploaded by this account' using errcode='23514'; end if;
 return new;
end $$;
drop trigger if exists check_hero_path on public.agent_site_content;
create trigger check_hero_path before insert or update on public.agent_site_content for each row execute function public.check_hero_path();
create table if not exists public.agent_page_seo(
 site_id text not null references public.agent_profiles(site_id) on delete cascade,
 page_key text not null check(page_key in ('home','about','contact','active-listings','sold-listings')),
 slug text not null check((page_key='home' and slug='') or (page_key<>'home' and length(slug) between 1 and 80 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and slug not in ('home','admin','login','super-admin','onboarding','api','assets','robots','sitemap','favicon'))),
 title text not null default '' check(length(title)<=120),description text not null default '' check(length(description)<=320),
 focus_keyword text not null default '' check(length(focus_keyword)<=120),
 social_title text not null default '' check(length(social_title)<=120),social_description text not null default '' check(length(social_description)<=320),
 social_path text not null default '' check(length(social_path)<=300),noindex boolean not null default false,
 tags text not null default '' check(length(tags)<=500),category text not null default '' check(length(category)<=80),
 updated_at timestamptz not null default now(),primary key(site_id,page_key),unique(site_id,slug)
);
create table if not exists public.agent_page_routes(
 site_id text not null,slug text not null,page_key text not null,
 primary key(site_id,slug),foreign key(site_id,page_key) references public.agent_page_seo(site_id,page_key) on delete cascade
);
insert into public.agent_page_seo(site_id,page_key,slug)
 select p.site_id,k,case when k='home' then '' else k end from public.agent_profiles p
 cross join unnest(array['home','about','contact','active-listings','sold-listings']) k where p.role='agent' on conflict do nothing;
insert into public.agent_page_routes select site_id,slug,page_key from public.agent_page_seo on conflict do nothing;
create or replace function public.initialize_agent_page_seo()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.role='agent' then
  insert into public.agent_page_seo(site_id,page_key,slug)
  select new.site_id,k,case when k='home' then '' else k end from unnest(array['home','about','contact','active-listings','sold-listings']) k on conflict do nothing;
  insert into public.agent_page_routes select site_id,slug,page_key from public.agent_page_seo where site_id=new.site_id on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function public.initialize_agent_page_seo() from public,anon,authenticated;
drop trigger if exists initialize_agent_page_seo on public.agent_profiles;
create trigger initialize_agent_page_seo after insert on public.agent_profiles for each row execute function public.initialize_agent_page_seo();
alter table public.agent_page_seo enable row level security;
alter table public.agent_page_routes enable row level security;
revoke all on public.agent_page_seo,public.agent_page_routes from anon,authenticated;
grant select on public.agent_page_seo,public.agent_page_routes to anon,authenticated;
grant all on public.agent_page_seo,public.agent_page_routes to service_role;
drop policy if exists "Read website SEO" on public.agent_page_seo;
create policy "Read website SEO" on public.agent_page_seo for select to anon,authenticated using(public.agent_website_is_active(site_id));
drop policy if exists "Owner reads unpublished SEO" on public.agent_page_seo;
create policy "Owner reads unpublished SEO" on public.agent_page_seo for select to authenticated using(exists(select 1 from public.agent_profiles p where p.site_id=agent_page_seo.site_id and p.user_id=(select auth.uid()) and p.active and p.role='agent'));
drop policy if exists "Read website page routes" on public.agent_page_routes;
create policy "Read website page routes" on public.agent_page_routes for select to anon,authenticated using(public.agent_website_is_active(site_id));
create or replace function public.save_my_page_seo(p_page_key text,p_values jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_site text;v_old text;v_slug text;v_row public.agent_page_seo%rowtype;
begin
 select site_id into v_site from public.agent_profiles where user_id=auth.uid() and active and role='agent' for update;
 if v_site is null then raise exception 'Active agent required' using errcode='42501';end if;
 if p_page_key is null or p_page_key not in ('home','about','contact','active-listings','sold-listings') or jsonb_typeof(p_values) is distinct from 'object' or length(p_values::text)>8000 then raise exception 'Invalid SEO settings' using errcode='22023';end if;
 insert into public.agent_page_seo(site_id,page_key,slug)
 select v_site,k,case when k='home' then '' else k end from unnest(array['home','about','contact','active-listings','sold-listings']) k on conflict do nothing;
 insert into public.agent_page_routes select site_id,slug,page_key from public.agent_page_seo where site_id=v_site on conflict do nothing;
 v_slug:=case when p_page_key='home' then '' else lower(trim(p_values->>'slug')) end;
 if exists(select 1 from public.agent_page_routes where site_id=v_site and slug=v_slug and page_key<>p_page_key) then raise exception 'This page address is used or reserved by another page' using errcode='23505';end if;
 if coalesce(p_values->>'social_path','')<>'' and ((p_values->>'social_path') !~ '^[0-9a-f-]{36}/social-[0-9a-f-]{36}\.webp$' or split_part(p_values->>'social_path','/',1)<>auth.uid()::text) then raise exception 'Choose your own social image' using errcode='23514';end if;
 select slug into v_old from public.agent_page_seo where site_id=v_site and page_key=p_page_key;
 insert into public.agent_page_seo(site_id,page_key,slug,title,description,focus_keyword,social_title,social_description,social_path,noindex,tags,category)
 values(v_site,p_page_key,v_slug,coalesce(p_values->>'title',''),coalesce(p_values->>'description',''),coalesce(p_values->>'focus_keyword',''),coalesce(p_values->>'social_title',''),coalesce(p_values->>'social_description',''),coalesce(p_values->>'social_path',''),coalesce((p_values->>'noindex')::boolean,false),coalesce(p_values->>'tags',''),coalesce(p_values->>'category',''))
 on conflict(site_id,page_key) do update set slug=excluded.slug,title=excluded.title,description=excluded.description,focus_keyword=excluded.focus_keyword,social_title=excluded.social_title,social_description=excluded.social_description,social_path=excluded.social_path,noindex=excluded.noindex,tags=excluded.tags,category=excluded.category,updated_at=now() returning * into v_row;
 -- Reserve both old and current URLs. An old slug redirects directly to the
 -- stable page's CURRENT slug; there are no redirect chains or cross-site URLs.
 insert into public.agent_page_routes(site_id,slug,page_key) values(v_site,coalesce(v_old,case when p_page_key='home' then '' else p_page_key end),p_page_key) on conflict do nothing;
 insert into public.agent_page_routes(site_id,slug,page_key) values(v_site,v_slug,p_page_key) on conflict do nothing;
 return to_jsonb(v_row);
end $$;
revoke all on function public.save_my_page_seo(text,jsonb) from public,anon;
grant execute on function public.save_my_page_seo(text,jsonb) to authenticated;
create or replace function public.public_agent_primary_hostname(requested_site text)
returns text language sql stable security definer set search_path='' as $$
 select coalesce(s.hostname,s.subdomain_slug||'.brokerage.sncgi.com') from public.agent_website_settings s where s.site_id=requested_site and public.agent_website_is_active(s.site_id);
$$;
revoke all on function public.public_agent_primary_hostname(text) from public;
grant execute on function public.public_agent_primary_hostname(text) to anon,authenticated;
commit;
notify pgrst,'reload schema';
