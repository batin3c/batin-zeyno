-- drag reorder için sort_order
alter table locations add column if not exists sort_order integer not null default 0;
create index if not exists idx_locations_sort on locations (trip_id, sort_order);

-- mevcut kayıtları visit_date + created_at sırasına göre backfill
with ranked as (
  select id, row_number() over (
    partition by trip_id
    order by visit_date nulls last, created_at
  ) * 100 as rn
  from locations
)
update locations set sort_order = ranked.rn
from ranked
where locations.id = ranked.id and locations.sort_order = 0;

-- şehir admin sınırı cache
alter table visited_cities add column if not exists boundary_geojson jsonb;
alter table visited_cities add column if not exists boundary_fetched_at timestamptz;
