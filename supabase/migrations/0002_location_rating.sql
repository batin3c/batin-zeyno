-- add rating + rating_count to locations
alter table locations
  add column if not exists rating numeric;

alter table locations
  add column if not exists rating_count integer;
