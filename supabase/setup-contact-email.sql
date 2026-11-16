-- Server-only submission counters. No visitor messages or raw IP addresses stored.
begin;
create table if not exists public.contact_form_limits(
 bucket text primary key,
 attempts integer not null default 0,
 expires_at timestamptz not null
);
insert into public.contact_form_limits(bucket,attempts,expires_at) values ('mutex',0,'infinity') on conflict do nothing;
alter table public.contact_form_limits enable row level security;
revoke all on public.contact_form_limits from public,anon,authenticated;
create or replace function public.consume_contact_quota(p_site text,p_ip_hash text,p_daily_limit integer default 90)
returns boolean language plpgsql security definer set search_path='' as $$
declare t timestamptz:=now(); ip_bucket text;site_bucket text;global_bucket text;
begin
 if p_site is null or length(p_site)>120 or p_ip_hash is null or p_ip_hash!~'^[a-f0-9]{64}$' or p_daily_limit is null or p_daily_limit<1 or p_daily_limit>100000 then raise exception 'Invalid quota';end if;
 -- All Vercel instances share this atomic reservation.
 perform 1 from public.contact_form_limits where bucket='mutex' for update;
 delete from public.contact_form_limits where expires_at<t;
 ip_bucket:='ip:'||p_ip_hash||':'||floor(extract(epoch from t)/600)::text;
 site_bucket:='site:'||p_site||':'||floor(extract(epoch from t)/3600)::text;
 global_bucket:='global:'||floor(extract(epoch from t)/86400)::text;
 if coalesce((select attempts from public.contact_form_limits where bucket=ip_bucket),0)>=5
 or coalesce((select attempts from public.contact_form_limits where bucket=site_bucket),0)>=30
 or coalesce((select attempts from public.contact_form_limits where bucket=global_bucket),0)>=p_daily_limit then return false;end if;
 insert into public.contact_form_limits(bucket,attempts,expires_at) values
 (ip_bucket,1,t+interval '1 day'),(site_bucket,1,t+interval '1 day'),(global_bucket,1,t+interval '2 days')
 on conflict(bucket) do update set attempts=public.contact_form_limits.attempts+1;
 return true;
end $$;
revoke all on function public.consume_contact_quota(text,text,integer) from public,anon,authenticated;
grant execute on function public.consume_contact_quota(text,text,integer) to service_role;
grant execute on function public.resolve_agent_hostname(text) to service_role;
grant execute on function public.agent_website_is_active(text) to service_role;
commit;
notify pgrst,'reload schema';
