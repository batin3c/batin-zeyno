-- multi-group support: each user belongs to 1+ groups, all data scoped per group
-- Batın & Zeynep stay together as the seed group; new users create or join others

-- members: per-user login (handle + hashed pattern), soft-deactivate, ui color
alter table members add column if not exists handle text;
alter table members add column if not exists pattern_hash text;
alter table members add column if not exists is_active boolean not null default true;
alter table members add column if not exists color text;

-- groups
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

-- group_id on every data table (nullable for now — backfill, then NOT NULL in 0012)
alter table trips add column if not exists group_id uuid references groups(id) on delete cascade;
alter table visited_countries add column if not exists group_id uuid references groups(id) on delete cascade;
alter table country_photos add column if not exists group_id uuid references groups(id) on delete cascade;
alter table visited_cities add column if not exists group_id uuid references groups(id) on delete cascade;
alter table city_photos add column if not exists group_id uuid references groups(id) on delete cascade;
alter table expenses add column if not exists group_id uuid references groups(id) on delete cascade;
alter table settlements add column if not exists group_id uuid references groups(id) on delete cascade;
-- locations is scoped through trips.group_id (no direct column)

create index if not exists idx_trips_group on trips(group_id);
create index if not exists idx_visited_countries_group on visited_countries(group_id);
create index if not exists idx_visited_cities_group on visited_cities(group_id);
create index if not exists idx_country_photos_group on country_photos(group_id);
create index if not exists idx_city_photos_group on city_photos(group_id);
create index if not exists idx_expenses_group on expenses(group_id);
create index if not exists idx_settlements_group on settlements(group_id);
