-- globe feature: shared "we've visited" record + photos per country

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

alter table visited_countries enable row level security;
alter table country_photos     enable row level security;
