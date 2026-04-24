-- drag reorder for trips on home
alter table trips add column if not exists sort_order integer not null default 0;
create index if not exists idx_trips_sort on trips (sort_order);

with ranked as (
  select id, row_number() over (order by updated_at desc) * 100 as rn
  from trips
)
update trips set sort_order = ranked.rn
from ranked
where trips.id = ranked.id and trips.sort_order = 0;
