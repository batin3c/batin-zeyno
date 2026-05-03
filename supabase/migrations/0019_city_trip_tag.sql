-- 0019: optional trip tag on visited_cities
-- Lets the album group cities by trip etiketi (Roma 2024 / İtalya 2025).
-- Nullable — old cities and any city not part of a specific trip stay
-- "etiketsiz" and only appear under the "tümü" chip.

alter table visited_cities
  add column if not exists trip_id uuid references trips(id) on delete set null;

create index if not exists idx_visited_cities_trip
  on visited_cities (group_id, trip_id);
