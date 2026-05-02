-- album view: per-city manual cover photo (defaults to first photo when null)
alter table visited_cities
  add column if not exists cover_photo_id uuid
  references city_photos(id) on delete set null;
