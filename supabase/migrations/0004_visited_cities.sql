-- cities layer for the globe — dots inside countries

create table if not exists visited_cities (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  country_code    char(2),
  lat             double precision not null,
  lng             double precision not null,
  google_place_id text,
  note            text,
  added_by        uuid references members(id) on delete set null,
  added_at        timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists city_photos (
  id        uuid primary key default gen_random_uuid(),
  city_id   uuid not null references visited_cities(id) on delete cascade,
  url       text not null,
  added_by  uuid references members(id) on delete set null,
  added_at  timestamptz not null default now()
);

create index if not exists idx_visited_cities_country on visited_cities (country_code);
create index if not exists idx_city_photos_city on city_photos (city_id, added_at desc);

alter table visited_cities enable row level security;
alter table city_photos enable row level security;
