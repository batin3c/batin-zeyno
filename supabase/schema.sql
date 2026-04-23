-- baze schema

create extension if not exists "pgcrypto";

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  cover_url text,
  start_date date,
  end_date date,
  center_lat double precision,
  center_lng double precision,
  created_by uuid references members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_trips_updated on trips (updated_at desc);

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  name text not null,
  address text,
  lat double precision not null,
  lng double precision not null,
  google_place_id text,
  google_maps_url text,
  category text not null default 'other',
  note text,
  status text not null default 'want',
  loved_by uuid[] not null default '{}',
  photo_urls text[] not null default '{}',
  google_photo_urls text[] not null default '{}',
  visit_date date,
  rating numeric,
  rating_count integer,
  added_by uuid references members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_locations_trip on locations (trip_id);
create index if not exists idx_locations_created on locations (created_at desc);
create index if not exists idx_locations_trip_visit_date on locations (trip_id, visit_date nulls last);

create table if not exists visited_countries (
  code       char(2) primary key,
  note       text,
  added_by   uuid references members(id) on delete set null,
  added_at   timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists country_photos (
  id        uuid primary key default gen_random_uuid(),
  code      char(2) not null references visited_countries(code) on delete cascade,
  url       text not null,
  added_by  uuid references members(id) on delete set null,
  added_at  timestamptz not null default now()
);

create index if not exists idx_country_photos_code on country_photos (code, added_at desc);

create table if not exists app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- default puzzle pattern (3x3 grid, 0-indexed left-to-right top-to-bottom)
-- change from /setup after first login; this is an X across center
insert into app_config (key, value) values
  ('puzzle_pattern', '[0, 4, 8, 6, 2]'::jsonb)
on conflict (key) do nothing;

-- seed two members (edit names before running if you like)
insert into members (name, avatar_url, sort_order)
  select 'Batın', '/avatars/batin.jpg', 0
  where not exists (select 1 from members where name = 'Batın');

insert into members (name, avatar_url, sort_order)
  select 'Zeynep', '/avatars/zeynep.jpg', 1
  where not exists (select 1 from members where name = 'Zeynep');

-- lock everything down; the app talks only via service_role
alter table members enable row level security;
alter table trips enable row level security;
alter table locations enable row level security;
alter table app_config enable row level security;
alter table visited_countries enable row level security;
alter table country_photos enable row level security;
