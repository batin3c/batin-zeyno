-- per-group manual ordering for cities (album view drag-reorder)
alter table visited_cities add column if not exists sort_order integer not null default 0;
create index if not exists idx_visited_cities_group_sort
  on visited_cities(group_id, sort_order, added_at desc);

create or replace function reorder_visited_cities(p_group_id uuid, p_ids uuid[])
returns void language plpgsql as $$
begin
  update visited_cities
    set sort_order = idx * 100, updated_at = now()
    from unnest(p_ids) with ordinality as t(id, idx)
    where visited_cities.id = t.id and visited_cities.group_id = p_group_id;
end$$;
