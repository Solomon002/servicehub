-- Shop account email is private: authenticated users can only read public
-- profile columns, while owners retrieve their own contact email via RPC.
revoke select on table public.businesses from authenticated;
grant select (id, slug, name, location, phone, timezone)
  on table public.businesses to authenticated;

create or replace function public.get_owner_business_email(p_business_id uuid)
returns text
language sql stable security definer set search_path = public, pg_temp
as $$
  select b.email
  from public.businesses b
  where b.id = p_business_id
    and public.user_has_business_role(b.id, array['owner']::public.member_role[]);
$$;
revoke all on function public.get_owner_business_email(uuid) from public, anon;
grant execute on function public.get_owner_business_email(uuid) to authenticated;

-- RLS limits which appointment a barber can target. This trigger also limits
-- which fields and status transitions they can change through the API.
create or replace function public.enforce_appointment_update_permissions()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if public.user_has_business_role(old.business_id, array['owner']::public.member_role[]) then
    return new;
  end if;

  if public.user_is_assigned_barber(old.business_id, old.barber_id) then
    if row(new.id, new.business_id, new.customer_id, new.barber_id, new.service_id,
           new.appointment_date, new.starts_at, new.duration_minutes, new.price_ngn,
           new.customer_note, new.created_at)
       is distinct from
       row(old.id, old.business_id, old.customer_id, old.barber_id, old.service_id,
           old.appointment_date, old.starts_at, old.duration_minutes, old.price_ngn,
           old.customer_note, old.created_at) then
      raise exception 'Barbers may only update appointment status' using errcode = '42501';
    end if;
    if new.status <> old.status and not (
      (old.status = 'pending' and new.status in ('confirmed', 'cancelled')) or
      (old.status = 'confirmed' and new.status in ('completed', 'cancelled'))
    ) then
      raise exception 'Invalid appointment status transition' using errcode = '42501';
    end if;
    return new;
  end if;

  raise exception 'Not authorized to update this appointment' using errcode = '42501';
end;
$$;
revoke all on function public.enforce_appointment_update_permissions() from public, anon, authenticated;
drop trigger if exists enforce_appointment_update_permissions on public.appointments;
create trigger enforce_appointment_update_permissions
  before update on public.appointments
  for each row execute function public.enforce_appointment_update_permissions();
