alter table public.services
  add column if not exists description text not null default '';

drop function if exists public.get_public_services(text);

create function public.get_public_services(p_slug text)
returns table(id uuid, name text, description text, duration_minutes integer, price_ngn numeric)
language sql stable security definer set search_path = public, pg_temp
as $$
  select s.id, s.name, s.description, s.duration_minutes, s.price_ngn
  from public.services s
  join public.businesses b on b.id = s.business_id
  where b.slug = lower(p_slug) and b.is_public and s.is_active
  order by s.name
$$;

revoke all on function public.get_public_services(text) from public;
grant execute on function public.get_public_services(text) to anon, authenticated;
