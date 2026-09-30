create or replace function public.accept_barber_invitation()
returns table (business_id uuid, barber_id uuid)
language plpgsql volatile security definer
set search_path = public, auth, pg_temp
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_email text;
  invitation public.barber_invitations%rowtype;
begin
  if current_user_id is null then
    return;
  end if;

  select lower(u.email)
    into current_email
    from auth.users u
   where u.id = current_user_id
     and u.email_confirmed_at is not null;

  if current_email is null then
    return;
  end if;

  select i.*
    into invitation
    from public.barber_invitations i
    join public.barbers b on b.id = i.barber_id and b.business_id = i.business_id
   where lower(i.email) = current_email
     and i.expires_at > now()
     and i.accepted_user_id is null
     and b.user_id is null
     and b.is_active
     and not exists (
       select 1 from public.business_memberships m
        where m.business_id = i.business_id
          and m.user_id = current_user_id
          and m.role = 'owner'
     )
   order by i.created_at desc
   limit 1
   for update of i skip locked;

  if not found then
    return;
  end if;

  update public.barbers
     set user_id = current_user_id
   where id = invitation.barber_id
     and business_id = invitation.business_id
     and user_id is null;

  if not found then
    return;
  end if;

  insert into public.business_memberships (business_id, user_id, role)
  values (invitation.business_id, current_user_id, 'barber')
  on conflict (business_id, user_id) do update set role = 'barber';

  update public.barber_invitations
     set accepted_user_id = current_user_id
   where id = invitation.id;

  return query select invitation.business_id, invitation.barber_id;
end;
$$;

revoke all on function public.accept_barber_invitation() from public;
grant execute on function public.accept_barber_invitation() to authenticated;
