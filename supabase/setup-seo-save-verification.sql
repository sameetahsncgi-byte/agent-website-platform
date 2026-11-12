-- Run after the latest setup-seo-defaults.sql. Preserves SEO, routes and permissions.
begin;
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
 if p_values->>'site_id' is not null and p_values->>'site_id'<>v_site then raise exception 'The signed-in website account changed' using errcode='42501';end if;
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
commit;
notify pgrst,'reload schema';
