-- 0017: social layer — posts (akış), reactions, comments, follows, public flags
--
-- Posts are explicit shares from a member. They reference exactly one of
-- city/location/trip via ref_type+id, and carry a snapshot jsonb so the feed
-- card renders without joining live source rows (which may have been
-- deleted — CASCADE handles that case for us).
--
-- is_public default FALSE on cities/locations: nothing leaks until the
-- author opts in. Existing rows stay private until the user toggles them.

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references members(id) on delete cascade,
  group_id uuid not null references groups(id) on delete cascade,
  caption text check (length(caption) <= 500),
  ref_type text not null check (ref_type in ('city','location','trip')),
  city_id uuid references visited_cities(id) on delete cascade,
  location_id uuid references locations(id) on delete cascade,
  trip_id uuid references trips(id) on delete cascade,
  -- { title, subtitle?, country_code?, photo_urls: string[] }
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  check (
    (case when city_id is not null then 1 else 0 end) +
    (case when location_id is not null then 1 else 0 end) +
    (case when trip_id is not null then 1 else 0 end) = 1
  )
);
create index if not exists idx_posts_recent on posts (created_at desc);
create index if not exists idx_posts_author on posts (author_id, created_at desc);

create table if not exists post_reactions (
  post_id uuid not null references posts(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, member_id)
);
create index if not exists idx_reactions_post on post_reactions (post_id);

create table if not exists post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references members(id) on delete cascade,
  body text not null check (length(body) > 0 and length(body) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists idx_comments_post on post_comments (post_id, created_at);

create table if not exists follows (
  follower_id uuid not null references members(id) on delete cascade,
  followed_id uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);
create index if not exists idx_follows_follower on follows (follower_id);
create index if not exists idx_follows_followed on follows (followed_id);

-- Opt-in community visibility: default FALSE so nothing existing leaks.
alter table locations
  add column if not exists is_public boolean not null default false;
alter table visited_cities
  add column if not exists is_public boolean not null default false;

-- Public profile bio (shown on /u/[memberId])
alter table members
  add column if not exists bio text check (length(bio) <= 200);
