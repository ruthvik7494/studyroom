-- 0044_review_edit_and_owner_response.sql
--
-- Reviews had no way for a student to edit or delete their own review, and
-- no column at all for an owner to respond to one. Adding both — owner
-- responses as new columns (nothing existing is touched), and edit/delete
-- enforced via RLS so only the review's own author (or admin) can act on it.

alter table reviews add column if not exists owner_response text;
alter table reviews add column if not exists owner_responded_at timestamptz;
alter table reviews add column if not exists updated_at timestamptz not null default now();

-- Author can update their own review's rating/body.
drop policy if exists "reviews author update" on reviews;
create policy "reviews author update" on reviews
  for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

-- Author (or admin) can delete their own review.
drop policy if exists "reviews author delete" on reviews;
create policy "reviews author delete" on reviews
  for delete using (auth.uid() = author_id or auth_role() = 'admin');

-- Centre owner can set/update just the response fields — enforced by the
-- function below rather than a column-level RLS policy (Postgres RLS can't
-- restrict which columns an UPDATE touches on its own).
create or replace function respond_to_review(p_review_id uuid, p_response text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_role user_role;
  v_owner uuid;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  select role into v_role from profiles where id = v_user;

  select c.owner_id into v_owner
  from reviews r join centres c on c.id = r.centre_id
  where r.id = p_review_id;
  if v_owner is null then raise exception 'NOT_FOUND' using errcode='P0002'; end if;

  if v_role <> 'admin' and v_user <> v_owner then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  update reviews set owner_response = p_response, owner_responded_at = now() where id = p_review_id;
  perform log_audit('review.responded', 'review', p_review_id::text, jsonb_build_object('by', v_user));
end; $$;

grant execute on function respond_to_review(uuid, text) to authenticated;
