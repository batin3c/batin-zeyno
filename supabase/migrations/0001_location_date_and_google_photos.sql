-- add visit_date + google_photo_urls to locations
alter table locations
  add column if not exists visit_date date;

alter table locations
  add column if not exists google_photo_urls text[] not null default '{}';

create index if not exists idx_locations_trip_visit_date
  on locations (trip_id, visit_date nulls last);
