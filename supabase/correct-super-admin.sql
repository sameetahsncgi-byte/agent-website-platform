-- Run in Supabase SQL Editor as the project owner.
-- All changes roll back if the UID does not belong to the intended email.
begin;
do $$
begin
  if not exists (
    select 1 from auth.users
    where id = '2ac0cd60-d824-4c78-b4cf-350fb3db28ea'::uuid
      and lower(email) = 'sameet.ah@outlook.com'
  ) then
    raise exception 'No changes made: verify that this UID belongs to sameet.ah@outlook.com in Authentication > Users.';
  end if;

  insert into public.platform_admins (user_id, active)
  values ('2ac0cd60-d824-4c78-b4cf-350fb3db28ea'::uuid, true)
  on conflict (user_id) do update set active = true;

  -- Remove platform access from the agent email shown in the screenshot.
  -- This does not delete the account or change its agent access.
  update public.platform_admins as admins set active = false
  from auth.users as users
  where admins.user_id = users.id
    and lower(users.email) = 'sameet.a@sncgi.net';
end;
$$;
commit;

select users.email, admins.active
from public.platform_admins as admins
join auth.users as users on users.id = admins.user_id
where lower(users.email) in ('sameet.ah@outlook.com', 'sameet.a@sncgi.net');
