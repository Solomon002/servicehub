create or replace function public.list_public_businesses()
returns table(slug text, name text, location text)
language sql stable security definer set search_path = public, pg_temp
as $$
  select b.slug, b.name, b.location
  from public.businesses b
  where b.is_public
  order by b.name;
$$;

revoke all on function public.list_public_businesses() from public;
grant execute on function public.list_public_businesses() to anon, authenticated;
