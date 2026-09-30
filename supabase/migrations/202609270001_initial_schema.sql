-- ServiceHub MVP schema. Apply with `supabase db push` after linking a Supabase project.
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create type public.member_role as enum ('owner', 'barber');
create type public.appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled');
create type public.payment_status as enum ('unpaid', 'paid', 'refunded');
create type public.payment_method as enum ('cash', 'pos', 'bank_transfer', 'online', 'other');

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) between 2 and 120),
  location text not null default '',
  phone text not null default '',
  email text not null default '',
  timezone text not null default 'Africa/Lagos',
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now()
);

create table public.barbers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete set null,
  display_name text not null check (length(trim(display_name)) between 2 and 120),
  phone text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, business_id)
);

create table public.business_memberships (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null,
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create table public.barber_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  barber_id uuid not null,
  email text not null,
  created_by uuid not null references auth.users(id),
  expires_at timestamptz not null default now() + interval '24 hours',
  accepted_user_id uuid unique references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (barber_id, business_id) references public.barbers(id, business_id) on delete cascade
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 120),
  duration_minutes integer not null check (duration_minutes between 5 and 480),
  price_ngn numeric(12,2) not null check (price_ngn >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, business_id),
  unique (business_id, name)
);

create table public.barber_services (
  business_id uuid not null references public.businesses(id) on delete cascade,
  barber_id uuid not null,
  service_id uuid not null,
  primary key (barber_id, service_id),
  foreign key (barber_id, business_id) references public.barbers(id, business_id) on delete cascade,
  foreign key (service_id, business_id) references public.services(id, business_id) on delete cascade
);

create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  check (is_closed or (opens_at is not null and closes_at is not null and opens_at < closes_at)),
  unique (business_id, day_of_week)
);

create table public.barber_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  barber_id uuid not null,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  starts_at time,
  ends_at time,
  is_day_off boolean not null default false,
  check (is_day_off or (starts_at is not null and ends_at is not null and starts_at < ends_at)),
  unique (barber_id, day_of_week),
  foreign key (barber_id, business_id) references public.barbers(id, business_id) on delete cascade
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 2 and 120),
  phone text not null,
  normalized_phone text not null,
  notes text not null default '',
  preferred_barber_id uuid,
  created_at timestamptz not null default now(),
  unique (id, business_id),
  unique (business_id, normalized_phone),
  foreign key (preferred_barber_id, business_id) references public.barbers(id, business_id) on delete set null (preferred_barber_id)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null,
  barber_id uuid not null,
  service_id uuid not null,
  appointment_date date not null,
  starts_at time not null,
  duration_minutes integer not null check (duration_minutes between 5 and 480),
  price_ngn numeric(12,2) not null check (price_ngn >= 0),
  status public.appointment_status not null default 'pending',
  customer_note text not null default '',
  created_at timestamptz not null default now(),
  slot tsrange generated always as (tsrange(
    (appointment_date + starts_at)::timestamp,
    (appointment_date + starts_at + make_interval(mins => duration_minutes))::timestamp,
    '[)'
  )) stored,
  foreign key (customer_id, business_id) references public.customers(id, business_id),
  foreign key (barber_id, business_id) references public.barbers(id, business_id),
  foreign key (service_id, business_id) references public.services(id, business_id),
  unique (id, business_id),
  exclude using gist (barber_id with =, slot with &&) where (status <> 'cancelled')
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  appointment_id uuid not null,
  amount_ngn numeric(12,2) not null check (amount_ngn >= 0),
  status public.payment_status not null default 'unpaid',
  method public.payment_method,
  paid_at timestamptz,
  reference text,
  created_at timestamptz not null default now(),
  unique (appointment_id),
  foreign key (appointment_id, business_id) references public.appointments(id, business_id) on delete cascade
);

create or replace function public.create_unpaid_payment()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$ begin
  insert into public.payments(business_id, appointment_id, amount_ngn, status)
  values(new.business_id, new.id, new.price_ngn, 'unpaid');
  return new;
end; $$;
create trigger appointment_payment_record after insert on public.appointments
for each row execute function public.create_unpaid_payment();

create index appointments_business_date_idx on public.appointments (business_id, appointment_date);
create index appointments_barber_date_idx on public.appointments (barber_id, appointment_date);
create index appointments_customer_idx on public.appointments (customer_id, appointment_date desc);
create index customers_business_name_idx on public.customers (business_id, full_name);
create index payments_business_status_idx on public.payments (business_id, status, created_at desc);

create or replace function public.user_has_business_role(target_business uuid, allowed_roles public.member_role[])
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$ select exists (select 1 from public.business_memberships m where m.business_id = target_business and m.user_id = (select auth.uid()) and m.role = any(allowed_roles)) $$;

create or replace function public.user_is_assigned_barber(target_business uuid, target_barber uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$ select exists (select 1 from public.barbers b where b.id = target_barber and b.business_id = target_business and b.user_id = (select auth.uid())) $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, auth, pg_temp
as $$
declare new_business_id uuid; requested_business_id uuid; requested_barber_id uuid; role_value text;
begin
  insert into public.profiles(id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), coalesce(new.raw_user_meta_data->>'phone', ''));

  role_value := new.raw_user_meta_data->>'servicehub_role';
  if role_value = 'owner'
     and length(trim(coalesce(new.raw_user_meta_data->>'business_name', ''))) >= 2
     and length(trim(coalesce(new.raw_user_meta_data->>'business_slug', ''))) >= 2 then
    insert into public.businesses(slug, name, location, phone, email)
    values (
      lower(trim(new.raw_user_meta_data->>'business_slug')),
      trim(new.raw_user_meta_data->>'business_name'),
      coalesce(new.raw_user_meta_data->>'location', ''),
      coalesce(new.raw_user_meta_data->>'phone', ''),
      new.email
    ) returning id into new_business_id;
    insert into public.business_memberships(business_id, user_id, role) values (new_business_id, new.id, 'owner');
    insert into public.business_hours(business_id, day_of_week, opens_at, closes_at)
    select new_business_id, day, '09:00', '18:00' from generate_series(0, 6) day;
  elsif role_value = 'barber' then
    requested_business_id := nullif(new.raw_user_meta_data->>'business_id', '')::uuid;
    requested_barber_id := nullif(new.raw_user_meta_data->>'barber_id', '')::uuid;
    if requested_business_id is not null and requested_barber_id is not null and exists (
      select 1 from public.barbers b join public.barber_invitations i on i.barber_id=b.id and i.business_id=b.business_id
      where b.id = requested_barber_id and b.business_id = requested_business_id and lower(i.email)=lower(new.email)
        and i.accepted_user_id is null and i.expires_at > now()
    ) then
      update public.barbers set user_id = new.id where id = requested_barber_id and business_id = requested_business_id;
      insert into public.business_memberships(business_id, user_id, role) values (requested_business_id, new.id, 'barber');
      update public.barber_invitations set accepted_user_id=new.id where barber_id=requested_barber_id and business_id=requested_business_id and lower(email)=lower(new.email) and accepted_user_id is null;
    end if;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.businesses enable row level security;
alter table public.profiles enable row level security;
alter table public.business_memberships enable row level security;
alter table public.barber_invitations enable row level security;
alter table public.barbers enable row level security;
alter table public.services enable row level security;
alter table public.barber_services enable row level security;
alter table public.business_hours enable row level security;
alter table public.barber_hours enable row level security;
alter table public.customers enable row level security;
alter table public.appointments enable row level security;
alter table public.payments enable row level security;

create policy businesses_public_read on public.businesses for select to anon, authenticated using (is_public or public.user_has_business_role(id, array['owner','barber']::public.member_role[]));
create policy businesses_owner_update on public.businesses for update to authenticated using (public.user_has_business_role(id, array['owner']::public.member_role[])) with check (public.user_has_business_role(id, array['owner']::public.member_role[]));
create policy profiles_self_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_self_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy memberships_self_read on public.business_memberships for select to authenticated using (user_id = (select auth.uid()));

create policy barbers_owner_manage on public.barbers for all to authenticated using (public.user_has_business_role(business_id, array['owner']::public.member_role[])) with check (public.user_has_business_role(business_id, array['owner']::public.member_role[]));
create policy barbers_self_read on public.barbers for select to authenticated using (public.user_is_assigned_barber(business_id, id));
create policy services_public_read on public.services for select to anon, authenticated using ((is_active and exists(select 1 from public.businesses b where b.id=business_id and b.is_public)) or public.user_has_business_role(business_id, array['owner','barber']::public.member_role[]));
create policy services_owner_manage on public.services for all to authenticated using (public.user_has_business_role(business_id, array['owner']::public.member_role[])) with check (public.user_has_business_role(business_id, array['owner']::public.member_role[]));
create policy barber_services_owner_manage on public.barber_services for all to authenticated using (public.user_has_business_role(business_id, array['owner']::public.member_role[])) with check (public.user_has_business_role(business_id, array['owner']::public.member_role[]));
create policy business_hours_public_read on public.business_hours for select to anon, authenticated using (exists(select 1 from public.businesses b where b.id = business_id and b.is_public));
create policy business_hours_owner_manage on public.business_hours for all to authenticated using (public.user_has_business_role(business_id, array['owner']::public.member_role[])) with check (public.user_has_business_role(business_id, array['owner']::public.member_role[]));
create policy barber_hours_owner_manage on public.barber_hours for all to authenticated using (public.user_has_business_role(business_id, array['owner']::public.member_role[])) with check (public.user_has_business_role(business_id, array['owner']::public.member_role[]));
create policy barber_hours_self_read on public.barber_hours for select to authenticated using (public.user_is_assigned_barber(business_id, barber_id));

create policy customers_owner_read on public.customers for select to authenticated using (public.user_has_business_role(business_id, array['owner']::public.member_role[]));
create policy customers_barber_read_related on public.customers for select to authenticated using (
  exists (select 1 from public.appointments a where a.customer_id = customers.id and a.business_id = customers.business_id and public.user_is_assigned_barber(a.business_id, a.barber_id))
);
create policy customers_owner_insert on public.customers for insert to authenticated with check (public.user_has_business_role(business_id, array['owner']::public.member_role[]));
create policy customers_owner_update on public.customers for update to authenticated using (public.user_has_business_role(business_id, array['owner']::public.member_role[])) with check (public.user_has_business_role(business_id, array['owner']::public.member_role[]));
create policy customers_owner_delete on public.customers for delete to authenticated using (public.user_has_business_role(business_id, array['owner']::public.member_role[]));

create policy appointments_owner_read on public.appointments for select to authenticated using (public.user_has_business_role(business_id, array['owner']::public.member_role[]));
create policy appointments_barber_read_own on public.appointments for select to authenticated using (public.user_is_assigned_barber(business_id, barber_id));
create policy appointments_owner_insert on public.appointments for insert to authenticated with check (public.user_has_business_role(business_id, array['owner']::public.member_role[]));
create policy appointments_owner_update on public.appointments for update to authenticated using (public.user_has_business_role(business_id, array['owner']::public.member_role[])) with check (public.user_has_business_role(business_id, array['owner']::public.member_role[]));
create policy appointments_barber_update_own on public.appointments for update to authenticated using (public.user_is_assigned_barber(business_id, barber_id)) with check (public.user_is_assigned_barber(business_id, barber_id));
create policy appointments_owner_delete on public.appointments for delete to authenticated using (public.user_has_business_role(business_id, array['owner']::public.member_role[]));

create policy payments_owner_read on public.payments for select to authenticated using (public.user_has_business_role(business_id, array['owner']::public.member_role[]));
create policy payments_owner_manage on public.payments for all to authenticated using (public.user_has_business_role(business_id, array['owner']::public.member_role[])) with check (public.user_has_business_role(business_id, array['owner']::public.member_role[]));

create or replace function public.get_public_business(p_slug text)
returns table(id uuid, slug text, name text, location text, phone text, email text, timezone text)
language sql stable security definer set search_path = public, pg_temp
as $$ select b.id, b.slug, b.name, b.location, b.phone, b.email, b.timezone from public.businesses b where b.slug = lower(p_slug) and b.is_public $$;

create or replace function public.get_public_services(p_slug text)
returns table(id uuid, name text, duration_minutes integer, price_ngn numeric)
language sql stable security definer set search_path = public, pg_temp
as $$ select s.id, s.name, s.duration_minutes, s.price_ngn from public.services s join public.businesses b on b.id=s.business_id where b.slug=lower(p_slug) and b.is_public and s.is_active order by s.name $$;

create or replace function public.get_public_barbers(p_slug text, p_service_id uuid)
returns table(id uuid, display_name text)
language sql stable security definer set search_path = public, pg_temp
as $$ select b.id,b.display_name from public.barbers b join public.businesses biz on biz.id=b.business_id join public.barber_services bs on bs.barber_id=b.id and bs.business_id=b.business_id where biz.slug=lower(p_slug) and biz.is_public and b.is_active and bs.service_id=p_service_id order by b.display_name $$;

create or replace function public.get_available_booking_slots(p_slug text, p_service_id uuid, p_barber_id uuid, p_date date)
returns table(slot_time time, available_barbers integer)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare biz public.businesses%rowtype; duration integer; day_hours public.business_hours%rowtype;
begin
  select * into biz from public.businesses where slug=lower(p_slug) and is_public;
  if biz.id is null or p_date < (now() at time zone biz.timezone)::date or p_date > (now() at time zone biz.timezone)::date + 60 then return; end if;
  select * into day_hours from public.business_hours where business_id=biz.id and day_of_week=extract(dow from p_date)::smallint;
  if day_hours.id is null or day_hours.is_closed then return; end if;
  select s.duration_minutes into duration from public.services s where s.id=p_service_id and s.business_id=biz.id and s.is_active;
  if duration is null then return; end if;
  return query
    select slots.slot_start::time,
      count(b.id)::integer
    from generate_series(
      (p_date + day_hours.opens_at)::timestamp,
      (p_date + day_hours.closes_at - make_interval(mins => duration))::timestamp,
      interval '30 minutes'
    ) as slots(slot_start)
    cross join public.barbers b
    join public.barber_services bs on bs.barber_id=b.id and bs.business_id=b.business_id and bs.service_id=p_service_id
    left join public.barber_hours bh on bh.barber_id=b.id and bh.day_of_week=extract(dow from p_date)::smallint
    where b.business_id=biz.id and b.is_active and (p_barber_id is null or b.id=p_barber_id)
      and (bh.id is null or (not bh.is_day_off and slots.slot_start::time >= bh.starts_at and slots.slot_start::time + make_interval(mins => duration) <= bh.ends_at))
      and (p_date > (now() at time zone biz.timezone)::date or slots.slot_start > (now() at time zone biz.timezone))
      and not exists (
        select 1 from public.appointments a where a.barber_id=b.id and a.appointment_date=p_date and a.status <> 'cancelled'
          and tsrange(slots.slot_start, slots.slot_start + make_interval(mins=>duration),'[)') && a.slot
      )
    group by slots.slot_start having count(b.id)>0 order by slots.slot_start;
end;
$$;

create or replace function public.create_public_booking(
  p_slug text, p_service_id uuid, p_barber_id uuid, p_date date, p_time time,
  p_customer_name text, p_customer_phone text
)
returns table(appointment_id uuid, service_name text, barber_name text, appointment_date date, starts_at time, price_ngn numeric, status public.appointment_status)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare biz public.businesses%rowtype; service_row public.services%rowtype; barber_row public.barbers%rowtype;
  customer_row public.customers%rowtype; day_hours public.business_hours%rowtype; norm_phone text; now_local timestamp;
begin
  select * into biz from public.businesses where slug=lower(p_slug) and is_public;
  if biz.id is null then raise exception 'Shop not found'; end if;
  if length(trim(coalesce(p_customer_name,''))) not between 2 and 120 then raise exception 'Enter a valid name'; end if;
  norm_phone := regexp_replace(coalesce(p_customer_phone,''), '[^0-9]', '', 'g');
  if length(norm_phone) not between 7 and 15 then raise exception 'Enter a valid phone number'; end if;
  select * into service_row from public.services where id=p_service_id and business_id=biz.id and is_active;
  if service_row.id is null then raise exception 'Service is not available'; end if;
  now_local := now() at time zone biz.timezone;
  if p_date < now_local::date or p_date > now_local::date + 60 or (p_date=now_local::date and p_time <= now_local::time) then raise exception 'Choose a future appointment time'; end if;

  perform pg_advisory_xact_lock(hashtextextended(biz.id::text || p_date::text, 0));
  select * into day_hours from public.business_hours where business_id=biz.id and day_of_week=extract(dow from p_date)::smallint;
  if day_hours.id is null or day_hours.is_closed or p_time < day_hours.opens_at or p_time + make_interval(mins=>service_row.duration_minutes) > day_hours.closes_at then raise exception 'Shop is closed at that time'; end if;

  insert into public.customers(business_id, full_name, phone, normalized_phone)
  values(biz.id, trim(p_customer_name), trim(p_customer_phone), norm_phone)
  on conflict (business_id, normalized_phone) do update set full_name=excluded.full_name, phone=excluded.phone
  returning * into customer_row;

  select b.* into barber_row from public.barbers b
  join public.barber_services bs on bs.barber_id=b.id and bs.business_id=b.business_id and bs.service_id=service_row.id
  left join public.barber_hours bh on bh.barber_id=b.id and bh.day_of_week=extract(dow from p_date)::smallint
  where b.business_id=biz.id and b.is_active and (p_barber_id is null or b.id=p_barber_id)
    and (bh.id is null or (not bh.is_day_off and p_time >= bh.starts_at and p_time + make_interval(mins=>service_row.duration_minutes) <= bh.ends_at))
    and not exists(select 1 from public.appointments a where a.barber_id=b.id and a.appointment_date=p_date and a.status <> 'cancelled'
      and tsrange((p_date+p_time)::timestamp,(p_date+p_time+make_interval(mins=>service_row.duration_minutes))::timestamp,'[)') && a.slot)
  order by (select count(*) from public.appointments a where a.barber_id=b.id and a.appointment_date=p_date and a.status <> 'cancelled'), b.display_name
  limit 1;
  if barber_row.id is null then raise exception 'That time is no longer available. Please choose another slot.'; end if;

  insert into public.appointments(business_id, customer_id, barber_id, service_id, appointment_date, starts_at, duration_minutes, price_ngn, status)
  values(biz.id, customer_row.id, barber_row.id, service_row.id, p_date, p_time, service_row.duration_minutes, service_row.price_ngn, 'pending')
  returning id into appointment_id;
  service_name := service_row.name; barber_name := barber_row.display_name; appointment_date := p_date;
  starts_at := p_time; price_ngn := service_row.price_ngn; status := 'pending';
  return next;
end;
$$;

revoke all on function public.get_public_business(text) from public;
revoke all on function public.get_public_services(text) from public;
revoke all on function public.get_public_barbers(text, uuid) from public;
revoke all on function public.get_available_booking_slots(text, uuid, uuid, date) from public;
revoke all on function public.create_public_booking(text, uuid, uuid, date, time, text, text) from public;
grant execute on function public.get_public_business(text) to anon, authenticated;
grant execute on function public.get_public_services(text) to anon, authenticated;
grant execute on function public.get_public_barbers(text, uuid) to anon, authenticated;
grant execute on function public.get_available_booking_slots(text, uuid, uuid, date) to anon, authenticated;
grant execute on function public.create_public_booking(text, uuid, uuid, date, time, text, text) to anon, authenticated;

revoke all on all tables in schema public from anon;
grant select on public.businesses, public.services, public.business_hours to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
