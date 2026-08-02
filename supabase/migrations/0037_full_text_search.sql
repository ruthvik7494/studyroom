-- 0037_full_text_search.sql
--
-- The existing centre search only matched name/area/address via PostgREST's
-- .or() filter. Facilities (amenities, a joined table) and tags (a text[]
-- array column) can't be expressed in that same .or() string at all, and
-- city/description weren't included either — so a search for e.g. "WiFi",
-- "Quiet", or a centre's city never found anything, even when the centre
-- genuinely had that facility/tag.
--
-- This function centralises the full match logic in one place so every
-- caller (the /centres page search, the public /api/centres route, and any
-- future caller) searches the same fields the same way.

create or replace function search_centres_by_text(p_query text)
returns table (id uuid)
language sql
stable
as $$
  select distinct c.id
  from centres c
  where c.is_published = true
    and (
      c.name ilike '%' || p_query || '%'
      or c.area ilike '%' || p_query || '%'
      or c.city ilike '%' || p_query || '%'
      or c.address ilike '%' || p_query || '%'
      or c.description ilike '%' || p_query || '%'
      or exists (
        select 1 from unnest(c.tags) as t(tag)
        where t.tag ilike '%' || p_query || '%'
      )
      or exists (
        select 1
        from centre_amenities ca
        join amenities a on a.id = ca.amenity_id
        where ca.centre_id = c.id
          and a.label ilike '%' || p_query || '%'
      )
    );
$$;

revoke all on function search_centres_by_text(text) from public;
grant execute on function search_centres_by_text(text) to authenticated, anon;
