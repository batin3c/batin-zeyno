-- baze schema
-- This file is the source of truth for fresh installs. For incremental changes
-- on existing databases use the files under supabase/migrations/.
--
-- It mirrors the state of the production database as of migration 0013, i.e.:
--   * groups + group_members (multi-group model)
--   * group_id NOT NULL on every per-group data table
--   * composite PK (group_id, code) on visited_countries
--   * unique handle per member, no puzzle pattern columns, no app_config table
--   * explicit ON DELETE RESTRICT on member-referencing FKs in expenses/settlements

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- members + groups
-- ---------------------------------------------------------------------------

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  handle text,
  is_active boolean not null default true,
  color text
);

create unique index if not exists members_handle_unique
  on members(handle) where handle is not null;

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text,
  invite_code text not null unique,
  created_by uuid references members(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  group_id uuid not null references groups(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, member_id)
);

create index if not exists idx_group_members_member on group_members(member_id);

-- ---------------------------------------------------------------------------
-- trips + locations
-- ---------------------------------------------------------------------------

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  name text not null,
  description text,
  cover_url text,
  start_date date,
  end_date date,
  center_lat double precision,
  center_lng double precision,
  sort_order integer not null default 0,
  created_by uuid references members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_trips_updated on trips (updated_at desc);
create index if not exists idx_trips_sort on trips (sort_order);
create index if not exists idx_trips_group on trips (group_id);

-- locations are scoped through their parent trip's group_id (no direct column)
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
  sort_order integer not null default 0,
  amount numeric,
  currency char(3),
  added_by uuid references members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_locations_trip on locations (trip_id);
create index if not exists idx_locations_created on locations (created_at desc);
create index if not exists idx_locations_trip_visit_date on locations (trip_id, visit_date nulls last);
create index if not exists idx_locations_sort on locations (trip_id, sort_order);

-- ---------------------------------------------------------------------------
-- globe: visited countries + photos (composite PK by group)
-- ---------------------------------------------------------------------------

create table if not exists visited_countries (
  group_id   uuid not null references groups(id) on delete cascade,
  code       char(2) not null,
  note       text,
  added_by   uuid references members(id) on delete set null,
  added_at   timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (group_id, code)
);

create index if not exists idx_visited_countries_group on visited_countries (group_id);

create table if not exists country_photos (
  id        uuid primary key default gen_random_uuid(),
  group_id  uuid not null references groups(id) on delete cascade,
  code      char(2) not null,
  url       text not null,
  added_by  uuid references members(id) on delete set null,
  added_at  timestamptz not null default now(),
  constraint country_photos_group_code_fkey
    foreign key (group_id, code)
    references visited_countries (group_id, code)
    on delete cascade
);

create index if not exists idx_country_photos_code on country_photos (code, added_at desc);
create index if not exists idx_country_photos_group on country_photos (group_id);

-- ---------------------------------------------------------------------------
-- globe: visited cities + photos
-- ---------------------------------------------------------------------------

create table if not exists visited_cities (
  id                  uuid primary key default gen_random_uuid(),
  group_id            uuid not null references groups(id) on delete cascade,
  name                text not null,
  country_code        char(2),
  lat                 double precision not null,
  lng                 double precision not null,
  google_place_id     text,
  note                text,
  boundary_geojson    jsonb,
  boundary_fetched_at timestamptz,
  added_by            uuid references members(id) on delete set null,
  added_at            timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_visited_cities_country on visited_cities (country_code);
create index if not exists idx_visited_cities_group on visited_cities (group_id);

create table if not exists city_photos (
  id        uuid primary key default gen_random_uuid(),
  group_id  uuid not null references groups(id) on delete cascade,
  city_id   uuid not null references visited_cities(id) on delete cascade,
  url       text not null,
  added_by  uuid references members(id) on delete set null,
  added_at  timestamptz not null default now()
);

create index if not exists idx_city_photos_city on city_photos (city_id, added_at desc);
create index if not exists idx_city_photos_group on city_photos (group_id);

-- ---------------------------------------------------------------------------
-- splitwise-style expenses + settlements
-- ON DELETE RESTRICT on member-referencing FKs so a hard-deleted member can't
-- silently orphan a settlement or expense entry. Soft-deactivate via
-- members.is_active = false instead.
-- ---------------------------------------------------------------------------

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  trip_id uuid not null references trips(id) on delete cascade,
  title text not null,
  amount numeric not null check (amount > 0),
  currency char(3) not null,
  paid_by uuid not null references members(id) on delete restrict,
  -- 'half' = 50/50 between trip members
  -- 'full' = paid_by paid for the other(s) entirely
  -- 'custom' = use the per-member amounts in `shares`
  split_mode text not null default 'half' check (split_mode in ('half', 'full', 'custom')),
  shares jsonb,
  location_id uuid references locations(id) on delete set null,
  spent_at date not null default current_date,
  note text,
  created_by uuid references members(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_expenses_trip on expenses(trip_id, spent_at desc);
create index if not exists idx_expenses_group on expenses(group_id);

create table if not exists settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  trip_id uuid not null references trips(id) on delete cascade,
  from_member uuid not null references members(id) on delete restrict,
  to_member uuid not null references members(id) on delete restrict
    check (to_member <> from_member),
  amount numeric not null check (amount > 0),
  currency char(3) not null,
  settled_at date not null default current_date,
  note text,
  created_by uuid references members(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_settlements_trip on settlements(trip_id, settled_at desc);
create index if not exists idx_settlements_group on settlements(group_id);

-- ---------------------------------------------------------------------------
-- web push subscriptions
-- ---------------------------------------------------------------------------

create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_push_member on push_subscriptions (member_id);

-- ---------------------------------------------------------------------------
-- RLS — service_role bypasses RLS, app talks only via service_role.
-- Lock everything down so accidental anon-key access stays empty.
-- ---------------------------------------------------------------------------

alter table members enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table trips enable row level security;
alter table locations enable row level security;
alter table visited_countries enable row level security;
alter table country_photos enable row level security;
alter table visited_cities enable row level security;
alter table city_photos enable row level security;
alter table expenses enable row level security;
alter table settlements enable row level security;
alter table push_subscriptions enable row level security;

-- ---------------------------------------------------------------------------
-- Seed: two members + the original Batın & Zeynep group, idempotent.
-- Edit names before first run if you like; subsequent runs are no-ops.
-- ---------------------------------------------------------------------------

insert into members (name, avatar_url, sort_order)
  select 'Batın', '/avatars/batin.jpg', 0
  where not exists (select 1 from members where name = 'Batın');

insert into members (name, avatar_url, sort_order)
  select 'Zeynep', '/avatars/zeynep.jpg', 1
  where not exists (select 1 from members where name = 'Zeynep');
