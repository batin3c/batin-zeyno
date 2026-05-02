-- pattern moves from member to group: each group has one shared puzzle pattern
-- members.pattern_hash kept for now (legacy), will be dropped later

alter table groups add column if not exists pattern_hash text;

-- only enforce uniqueness on non-null hashes (groups can be NULL during setup)
create unique index if not exists groups_pattern_hash_unique
  on groups(pattern_hash) where pattern_hash is not null;
