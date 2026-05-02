-- 0014: server-side reorder helpers to replace per-row N+1 updates
--
-- Both functions take an ordered array of UUIDs and renumber sort_order in a
-- single SQL statement (UPDATE … FROM unnest WITH ORDINALITY). The action
-- callers in app/actions/{locations,trips}.ts use db.rpc(...) instead of
-- looping per row. Service-role bypasses RLS so no GRANTs are needed.

create or replace function reorder_locations(p_trip_id uuid, p_ids uuid[])
returns void language plpgsql as $$
begin
  update locations
    set sort_order = (t.idx * 100)::int,
        updated_at = now()
    from unnest(p_ids) with ordinality as t(id, idx)
    where locations.id = t.id
      and locations.trip_id = p_trip_id;
end$$;

create or replace function reorder_trips(p_group_id uuid, p_ids uuid[])
returns void language plpgsql as $$
begin
  update trips
    set sort_order = (t.idx * 100)::int,
        updated_at = now()
    from unnest(p_ids) with ordinality as t(id, idx)
    where trips.id = t.id
      and trips.group_id = p_group_id;
end$$;
