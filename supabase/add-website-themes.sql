-- Run in the same Supabase project used by your existing website.
-- Adds only a theme preference; preserves website content and access rules.
begin;
alter table public.agent_site_content
  add column if not exists theme_key text not null default 'forest';
-- Named check also works if you already ran the earlier SQL from the chat.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.agent_site_content'::regclass
      and conname = 'agent_site_content_theme_key_check'
  ) then
    alter table public.agent_site_content
      add constraint agent_site_content_theme_key_check check (
        theme_key in (
          'forest', 'ocean', 'violet', 'teal', 'rose', 'sunset',
          'ruby', 'indigo', 'cyan', 'amber', 'magenta', 'lime'
        )
      );
  end if;
end $$;
commit;
select 'Website themes are ready' as result;
