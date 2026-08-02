-- 0041_centre_lifecycle_actions.sql
--
-- centres.status already supports 'archived' as a value, and is_published
-- already exists as a column, but there was no owner-facing action to reach
-- either — is_published only ever got set at admin-approval time, and
-- nothing ever set status='archived'. This adds the two missing actions.

-- Owner toggles visibility of an already-approved listing without losing
-- its approved status or needing re-review — e.g. taking a centre
-- temporarily offline for renovation.
create or replace function set_centre_published(p_centre_id uuid, p_published boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_role user_role;
  v_centre centres%rowtype;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  select role into v_role from profiles where id = v_user;
  select * into v_centre from centres where id = p_centre_id for update;
  if v_centre.id is null then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if v_role <> 'admin' and v_user <> v_centre.owner_id then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if v_centre.status <> 'approved' then
    raise exception 'INVALID_STATE' using errcode='P0001'; -- only approved listings can be toggled
  end if;

  update centres set is_published = p_published where id = p_centre_id;
  perform log_audit('centre.publish_toggled', 'centre', p_centre_id::text,
    jsonb_build_object('by', v_user, 'published', p_published));
end; $$;

-- Archive a listing — removes it from public view and marks it archived,
-- distinct from draft (never published) or a temporary unpublish above.
-- Reversible: archiving doesn't delete anything, matching "soft delete".
create or replace function archive_centre(p_centre_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_role user_role;
  v_centre centres%rowtype;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  select role into v_role from profiles where id = v_user;
  select * into v_centre from centres where id = p_centre_id for update;
  if v_centre.id is null then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if v_role <> 'admin' and v_user <> v_centre.owner_id then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if v_centre.status = 'archived' then
    raise exception 'INVALID_STATE' using errcode='P0001';
  end if;

  update centres set status = 'archived', is_published = false where id = p_centre_id;
  perform log_audit('centre.archived', 'centre', p_centre_id::text, jsonb_build_object('by', v_user));
end; $$;

-- Restore an archived listing back to draft (owner reviews/re-submits from
-- there, same as any new listing) — never straight back to approved,
-- since whatever made it worth archiving deserves a fresh look first.
create or replace function unarchive_centre(p_centre_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_role user_role;
  v_centre centres%rowtype;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  select role into v_role from profiles where id = v_user;
  select * into v_centre from centres where id = p_centre_id for update;
  if v_centre.id is null then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if v_role <> 'admin' and v_user <> v_centre.owner_id then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if v_centre.status <> 'archived' then
    raise exception 'INVALID_STATE' using errcode='P0001';
  end if;

  update centres set status = 'draft' where id = p_centre_id;
  perform log_audit('centre.unarchived', 'centre', p_centre_id::text, jsonb_build_object('by', v_user));
end; $$;

grant execute on function set_centre_published(uuid, boolean) to authenticated;
grant execute on function archive_centre(uuid) to authenticated;
grant execute on function unarchive_centre(uuid) to authenticated;
