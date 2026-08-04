-- 0048_review_rating_sync.sql
-- centres.rating / centres.reviews_count are plain columns (default 0) with
-- nothing that ever recalculated them after a review was submitted, edited,
-- deleted, or moderated — every centre showed "★0.0 (0 reviews)" regardless
-- of how many real reviews it had. This adds a trigger that keeps both in
-- sync with the `reviews` table (published reviews only — pending/removed
-- reviews don't count), and backfills every existing centre once so
-- current data is correct immediately after this migration runs.

create or replace function sync_centre_rating() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  v_ids uuid[];
begin
  -- INSERT: only NEW exists. DELETE: only OLD exists. UPDATE: both — e.g. a
  -- moderation status change or an edited rating. array_remove + a single
  -- `id = any(...)` update naturally de-dupes when they're the same centre.
  v_ids := array_remove(array[old.centre_id, new.centre_id], null);

  update centres c set
    rating = coalesce((
      select round(avg(r.rating)::numeric, 1)
      from reviews r
      where r.centre_id = c.id and r.status = 'published'
    ), 0),
    reviews_count = (
      select count(*) from reviews r
      where r.centre_id = c.id and r.status = 'published'
    )
  where c.id = any(v_ids);

  return null; -- AFTER trigger — return value is ignored either way
end; $$;

drop trigger if exists trg_reviews_sync_rating on reviews;
create trigger trg_reviews_sync_rating
  after insert or delete or update of rating, status, centre_id on reviews
  for each row execute function sync_centre_rating();

-- Backfill: recompute every centre once so existing reviews (submitted
-- before this migration, while nothing was syncing) show up immediately.
update centres c set
  rating = coalesce((
    select round(avg(r.rating)::numeric, 1) from reviews r
    where r.centre_id = c.id and r.status = 'published'
  ), 0),
  reviews_count = (
    select count(*) from reviews r
    where r.centre_id = c.id and r.status = 'published'
  );
