begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(16);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
('10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'rls-owner-a@example.test', '', now(), '{}', '{"servicehub_role":"owner","business_name":"RLS Shop A","business_slug":"rls-test-shop-a"}', now(), now()),
('20000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'rls-owner-b@example.test', '', now(), '{}', '{"servicehub_role":"owner","business_name":"RLS Shop B","business_slug":"rls-test-shop-b"}', now(), now());

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('30000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'rls-barber-a@example.test', '', now(), '{}', '{}', now(), now());

insert into public.business_memberships (business_id, user_id, role)
select id, '30000000-0000-4000-8000-000000000003', 'barber' from public.businesses where slug='rls-test-shop-a';

insert into public.barbers (business_id, user_id, display_name)
select id, '30000000-0000-4000-8000-000000000003', 'RLS Barber A' from public.businesses where slug='rls-test-shop-a';
insert into public.barbers (business_id, display_name)
select id, 'RLS Barber B' from public.businesses where slug='rls-test-shop-b';

insert into public.services (business_id, name, duration_minutes, price_ngn)
select id, 'RLS Test Haircut', 60, 1000 from public.businesses where slug='rls-test-shop-a';
insert into public.services (business_id, name, duration_minutes, price_ngn)
select id, 'RLS Test Haircut', 60, 1000 from public.businesses where slug='rls-test-shop-b';

insert into public.customers (business_id, full_name, phone, normalized_phone)
select id, 'RLS Customer A', '08000000001', '08000000001' from public.businesses where slug='rls-test-shop-a';
insert into public.customers (business_id, full_name, phone, normalized_phone)
select id, 'RLS Customer B', '08000000002', '08000000002' from public.businesses where slug='rls-test-shop-b';

insert into public.appointments (business_id, customer_id, barber_id, service_id, appointment_date, starts_at, duration_minutes, price_ngn, status)
select biz.id, customer.id, barber.id, service.id, current_date + 1, '10:00', 60, 1000, 'confirmed'
from public.businesses biz join public.customers customer on customer.business_id=biz.id
join public.barbers barber on barber.business_id=biz.id join public.services service on service.business_id=biz.id
where biz.slug='rls-test-shop-a' and customer.full_name='RLS Customer A' and barber.display_name='RLS Barber A' and service.name='RLS Test Haircut';
insert into public.appointments (business_id, customer_id, barber_id, service_id, appointment_date, starts_at, duration_minutes, price_ngn, status)
select biz.id, customer.id, barber.id, service.id, current_date + 1, '10:00', 60, 1000, 'confirmed'
from public.businesses biz join public.customers customer on customer.business_id=biz.id
join public.barbers barber on barber.business_id=biz.id join public.services service on service.business_id=biz.id
where biz.slug='rls-test-shop-b' and customer.full_name='RLS Customer B' and service.name='RLS Test Haircut';

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
select extensions.is((select count(*)::int from public.customers), 1, 'Shop A owner reads only Shop A customers');
select extensions.is((select count(*)::int from public.appointments), 1, 'Shop A owner reads only Shop A appointments');
select extensions.is((with changed as (update public.appointments set status='completed' where customer_id=(select id from public.customers where full_name='RLS Customer A') returning status) select count(*)::int from changed where status='completed'), 1, 'Shop owner can update an appointment in their shop');
select extensions.is((with changed as (update public.appointments set status='cancelled' where business_id=(select id from public.businesses where slug='rls-test-shop-b') returning id) select count(*)::int from changed), 0, 'Shop A owner cannot update Shop B appointments');
select extensions.is(public.get_owner_business_email((select id from public.businesses where slug='rls-test-shop-a')), 'rls-owner-a@example.test', 'Owner can retrieve their own private business email');

set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000002';
select extensions.is((select count(*)::int from public.customers), 1, 'Shop B owner reads only Shop B customers');
select extensions.is((select count(*)::int from public.appointments), 1, 'Shop B owner reads only Shop B appointments');

set local request.jwt.claim.sub = '30000000-0000-4000-8000-000000000003';
select extensions.is((select count(*)::int from public.appointments), 1, 'Barber reads only their assigned appointments');
select extensions.is((select count(*)::int from public.customers), 1, 'Barber reads only customers related to their assigned appointments');
select extensions.throws_ok($$update public.appointments set price_ngn=1 where customer_id=(select id from public.customers where full_name='RLS Customer A')$$, '42501', 'Barbers may only update appointment status', 'Barber cannot change appointment price or other booking fields');
update public.appointments set status='cancelled' where customer_id=(select id from public.customers where full_name='RLS Customer A');
select extensions.is((select count(*)::int from public.appointments where status='cancelled'), 1, 'Barber can cancel their own appointment');
select extensions.is(public.get_owner_business_email((select id from public.businesses where slug='rls-test-shop-a')), null, 'Barber cannot retrieve the private owner email');
select extensions.ok(not has_column_privilege('authenticated', 'public.businesses', 'email', 'select'), 'Authenticated users cannot directly select private business email');

reset role;
set local role anon;
select extensions.ok(not has_column_privilege('anon', 'public.businesses', 'email', 'select'), 'Public shop access cannot read the private business email');
select extensions.ok(not has_table_privilege('anon', 'public.customers', 'select'), 'Anonymous customers cannot query private customer records');
select extensions.is((select count(*)::int from public.get_public_business('rls-test-shop-a')), 1, 'Anonymous customers can view public shop profile fields');

select * from extensions.finish();
rollback;
