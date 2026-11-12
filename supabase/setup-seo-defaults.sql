-- Run AFTER deploying this correction. Requires setup-seo-homepage.sql.
-- Defaults initialize each page once. Later cleared fields remain blank.
begin;
create or replace function public.agent_seo_text_defaults(p_page_key text)
returns jsonb language sql immutable set search_path='' as $$
 select coalesce('{"home":{"title":"{{agent_name}} | Real Estate in {{service_area}}","description":"Buy or sell a home in {{service_area}} with {{agent_name}} at {{brokerage}}. Explore properties and get personal guidance for your next move.","focus_keyword":"{{service_area}} real estate","category":"Real Estate","tags":"{{service_area}}, buying a home, selling a home","social_title":"{{seo_title}}","social_description":"{{meta_description}}"},"about":{"title":"About {{agent_name}} | {{brokerage}}","description":"Meet {{agent_name}}, your {{professional_title}} serving {{service_area}}. Learn about their approach to buying and selling with {{brokerage}}.","focus_keyword":"{{agent_name}}","category":"About Your Agent","tags":"{{agent_name}}, {{brokerage}}, local real estate agent","social_title":"{{seo_title}}","social_description":"{{meta_description}}"},"contact":{"title":"Contact {{agent_name}} | {{service_area}} Real Estate","description":"Contact {{agent_name}} at {{brokerage}} for help buying or selling in {{service_area}}. Ask a question or discuss your next real estate move.","focus_keyword":"contact {{agent_name}}","category":"Contact","tags":"{{agent_name}}, {{service_area}}, real estate advice","social_title":"{{seo_title}}","social_description":"{{meta_description}}"},"active-listings":{"title":"Homes for Sale in {{service_area}} | {{agent_name}}","description":"Explore available homes in {{service_area}} with {{agent_name}} at {{brokerage}}. Get property details and guidance for your home search.","focus_keyword":"homes for sale in {{service_area}}","category":"Available Homes","tags":"{{service_area}}, homes for sale, property search","social_title":"{{seo_title}}","social_description":"{{meta_description}}"},"sold-listings":{"title":"Past Sales in {{service_area}} | {{agent_name}}","description":"View past property sales featured by {{agent_name}} in {{service_area}}. Contact {{brokerage}} to discuss your own buying or selling plans.","focus_keyword":"past sales in {{service_area}}","category":"Past Sales","tags":"{{service_area}}, sold homes, past property sales","social_title":"{{seo_title}}","social_description":"{{meta_description}}"}}'::jsonb -> p_page_key,'{}'::jsonb);
$$;
revoke all on function public.agent_seo_text_defaults(text) from public,anon,authenticated;
alter table public.agent_page_seo add column if not exists defaults_initialized boolean not null default false;
-- Mark edits as intentional, including explicitly empty strings. This trigger
-- does not fill or change any text field (also safe for INSERT ON CONFLICT).
create or replace function public.mark_agent_seo_initialized()
returns trigger language plpgsql set search_path='' as $$
begin new.defaults_initialized:=true;return new;end $$;
revoke all on function public.mark_agent_seo_initialized() from public,anon,authenticated;
drop trigger if exists mark_agent_seo_initialized on public.agent_page_seo;
create trigger mark_agent_seo_initialized before insert or update on public.agent_page_seo for each row execute function public.mark_agent_seo_initialized();
-- Disable the old automatic refill for INSERT/UPSERT and UPDATE alike.
drop trigger if exists fill_agent_seo_text_defaults on public.agent_page_seo;
-- Defaults are explicitly provided only when a NEW agent's pages are created.
create or replace function public.initialize_agent_page_seo()
returns trigger language plpgsql security definer set search_path='' as $$
declare page text;defaults jsonb;
begin
 if new.role='agent' then
  foreach page in array array['home','about','contact','active-listings','sold-listings'] loop
   defaults:=public.agent_seo_text_defaults(page);
   insert into public.agent_page_seo(site_id,page_key,slug,title,description,focus_keyword,social_title,social_description,tags,category)
   values(new.site_id,page,case when page='home' then '' else page end,defaults->>'title',defaults->>'description',defaults->>'focus_keyword',defaults->>'social_title',defaults->>'social_description',defaults->>'tags',defaults->>'category') on conflict do nothing;
  end loop;
  insert into public.agent_page_routes select site_id,slug,page_key from public.agent_page_seo where site_id=new.site_id on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function public.initialize_agent_page_seo() from public,anon,authenticated;
drop trigger if exists initialize_agent_page_seo on public.agent_profiles;
create trigger initialize_agent_page_seo after insert on public.agent_profiles for each row execute function public.initialize_agent_page_seo();
-- Older sites get their initial defaults once, without changing custom text.
update public.agent_page_seo s set
 title=case when btrim(s.title)='' then d.value->>'title' else s.title end,
 description=case when btrim(s.description)='' then d.value->>'description' else s.description end,
 focus_keyword=case when btrim(s.focus_keyword)='' then d.value->>'focus_keyword' else s.focus_keyword end,
 social_title=case when btrim(s.social_title)='' then d.value->>'social_title' else s.social_title end,
 social_description=case when btrim(s.social_description)='' then d.value->>'social_description' else s.social_description end,
 tags=case when btrim(s.tags)='' then d.value->>'tags' else s.tags end,
 category=case when btrim(s.category)='' then d.value->>'category' else s.category end,
 defaults_initialized=true
 from (select page_key,public.agent_seo_text_defaults(page_key) as value from public.agent_page_seo group by page_key) d
 where s.page_key=d.page_key and not s.defaults_initialized;
-- Only missing page records are inserted below. Initialized rows are preserved.
with missing as (
 select p.site_id,k,public.agent_seo_text_defaults(k) as defaults from public.agent_profiles p
 cross join unnest(array['home','about','contact','active-listings','sold-listings']) k where p.role='agent'
)
insert into public.agent_page_seo(site_id,page_key,slug,title,description,focus_keyword,social_title,social_description,tags,category)
select site_id,k,case when k='home' then '' else k end,defaults->>'title',defaults->>'description',defaults->>'focus_keyword',defaults->>'social_title',defaults->>'social_description',defaults->>'tags',defaults->>'category' from missing on conflict do nothing;
insert into public.agent_page_routes select site_id,slug,page_key from public.agent_page_seo on conflict do nothing;
commit;
notify pgrst,'reload schema';
