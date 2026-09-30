-- Public booking pages need shop contact and schedule data, but never owner email.
revoke select on table public.businesses from anon;
grant select (id, slug, name, location, phone, timezone) on table public.businesses to anon;

drop function public.get_public_business(text);
create function public.get_public_business(p_slug text)
returns table(id uuid, slug text, name text, location text, phone text, timezone text)
language sql stable security definer set search_path = public, pg_temp
as $$
  select b.id, b.slug, b.name, b.location, b.phone, b.timezone
  from public.businesses b
  where b.slug = lower(p_slug) and b.is_public;
$$;

revoke all on function public.get_public_business(text) from public;
grant execute on function public.get_public_business(text) to anon, authenticated;
