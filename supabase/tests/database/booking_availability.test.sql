begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(8);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('40000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'booking-owner@example.test', '', now(), '{}', '{"servicehub_role":"owner","business_name":"Booking Test Shop","business_slug":"booking-test-shop"}', now(), now());

insert into public.services (business_id, name, description, duration_minutes, price_ngn, is_active)
select id, 'Long Test Service', '', 60, 2000, true from public.businesses where slug='booking-test-shop';
insert into public.services (business_id, name, description, duration_minutes, price_ngn, is_active)
select id, 'Archived Test Service', '', 30, 1000, false from public.businesses where slug='booking-test-shop';
insert into public.barbers (business_id, display_name)
select id, name from public.businesses cross join (values ('Available Barber'), ('Day Off Barber')) as b(name) where slug='booking-test-shop';
insert into public.barber_services (business_id, barber_id, service_id)
select b.business_id, b.id, s.id from public.barbers b join public.services s on s.business_id=b.business_id
where b.display_name in ('Available Barber','Day Off Barber') and s.name='Long Test Service';

update public.business_hours set opens_at='09:00', closes_at='18:00', is_closed=false
where business_id=(select id from public.businesses where slug='booking-test-shop') and day_of_week=extract(dow from current_date + 1)::smallint;
insert into public.barber_hours (business_id, barber_id, day_of_week, starts_at, ends_at, is_day_off)
select business_id, id, extract(dow from current_date + 1)::smallint, '09:00', '18:00', false from public.barbers where display_name='Available Barber';
insert into public.barber_hours (business_id, barber_id, day_of_week, starts_at, ends_at, is_day_off)
select business_id, id, extract(dow from current_date + 1)::smallint, null, null, true from public.barbers where display_name='Day Off Barber';

insert into public.customers (business_id, full_name, phone, normalized_phone)
select id, 'Overlap Test Client', '08000000011', '08000000011' from public.businesses where slug='booking-test-shop';
insert into public.appointments (business_id, customer_id, barber_id, service_id, appointment_date, starts_at, duration_minutes, price_ngn, status)
select biz.id, c.id, b.id, s.id, current_date + 1, '10:00', 60, 2000, 'confirmed'
from public.businesses biz join public.customers c on c.business_id=biz.id
join public.barbers b on b.business_id=biz.id join public.services s on s.business_id=biz.id
where biz.slug='booking-test-shop' and b.display_name='Available Barber' and s.name='Long Test Service';
insert into public.appointments (business_id, customer_id, barber_id, service_id, appointment_date, starts_at, duration_minutes, price_ngn, status)
select biz.id, c.id, b.id, s.id, current_date + 1, '12:00', 60, 2000, 'cancelled'
from public.businesses biz join public.customers c on c.business_id=biz.id
join public.barbers b on b.business_id=biz.id join public.services s on s.business_id=biz.id
where biz.slug='booking-test-shop' and b.display_name='Available Barber' and s.name='Long Test Service';

select extensions.throws_ok($$insert into public.appointments (business_id, customer_id, barber_id, service_id, appointment_date, starts_at, duration_minutes, price_ngn, status)
select biz.id, c.id, b.id, s.id, current_date + 1, '10:30', 60, 2000, 'confirmed'
from public.businesses biz join public.customers c on c.business_id=biz.id
join public.barbers b on b.business_id=biz.id join public.services s on s.business_id=biz.id
where biz.slug='booking-test-shop' and b.display_name='Available Barber' and s.name='Long Test Service'$$,
'23P01', null, 'Database exclusion constraint rejects a double booking');

select extensions.is((select count(*)::int from public.create_public_booking(
  'booking-test-shop',
  (select id from public.services where business_id=(select id from public.businesses where slug='booking-test-shop') and name='Long Test Service'),
  (select id from public.barbers where display_name='Available Barber'),
  current_date + 1, time '13:00', 'Public Booking Client', '08000000077'
)), 1, 'Customer booking function returns a confirmation for a valid booking');
select extensions.is((select count(*)::int from public.appointments a join public.customers c on c.id=a.customer_id where c.normalized_phone='08000000077' and a.status='pending'), 1, 'Customer booking creates one pending appointment');

select extensions.ok(not exists(select 1 from public.get_available_booking_slots('booking-test-shop', (select id from public.services where name='Long Test Service' and business_id=(select id from public.businesses where slug='booking-test-shop')), (select id from public.barbers where display_name='Available Barber'), current_date + 1) where slot_time='10:30'), 'A 60-minute service does not offer an overlapping start during an existing booking');
select extensions.ok(exists(select 1 from public.get_available_booking_slots('booking-test-shop', (select id from public.services where name='Long Test Service' and business_id=(select id from public.businesses where slug='booking-test-shop')), (select id from public.barbers where display_name='Available Barber'), current_date + 1) where slot_time='12:00'), 'Cancelled appointment releases its slot');
select extensions.is((select count(*)::int from public.get_available_booking_slots('booking-test-shop', (select id from public.services where name='Long Test Service' and business_id=(select id from public.businesses where slug='booking-test-shop')), (select id from public.barbers where display_name='Day Off Barber'), current_date + 1)), 0, 'Barber day off removes all slots for that barber');
select extensions.is((select count(*)::int from public.get_available_booking_slots('booking-test-shop', (select id from public.services where name='Archived Test Service' and business_id=(select id from public.businesses where slug='booking-test-shop')), null, current_date + 1)), 0, 'Archived services cannot be booked');
select extensions.ok(not exists(select 1 from public.get_available_booking_slots('booking-test-shop', (select id from public.services where name='Long Test Service' and business_id=(select id from public.businesses where slug='booking-test-shop')), (select id from public.barbers where display_name='Available Barber'), current_date + 1) where slot_time > time '17:00'), 'Service duration constrains final start to shop closing');

select * from extensions.finish();
rollback;
