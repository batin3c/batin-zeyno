-- 0013: enforce constraints + drop dead schema after multi-group + no-password landings
--
-- Background: an audit found that 0011_groups.sql intended to enforce a composite
-- PK on visited_countries and to NOT NULL every group_id, but those steps were
-- never executed. By the time this migration was authored, parts (a) and (b) had
-- already been applied out-of-band, but the statements are kept here (idempotent)
-- so a clean replay of the migration history reaches the same end state.

-- (a) visited_countries: composite PK was supposed to land in 0011 but didn't.
--     country_photos FK currently references the (single-column) PK — must be
--     dropped first, recreated as composite afterwards.
alter table country_photos drop constraint if exists country_photos_code_fkey;
alter table country_photos drop constraint if exists country_photos_group_code_fkey;
alter table visited_countries drop constraint if exists visited_countries_pkey;
alter table visited_countries add primary key (group_id, code);
alter table country_photos
  add constraint country_photos_group_code_fkey
  foreign key (group_id, code)
  references visited_countries (group_id, code)
  on delete cascade;

-- (b) NOT NULL on every group_id (rows already backfilled in 0011/0012)
alter table trips alter column group_id set not null;
alter table visited_countries alter column group_id set not null;
alter table country_photos alter column group_id set not null;
alter table visited_cities alter column group_id set not null;
alter table city_photos alter column group_id set not null;
alter table expenses alter column group_id set not null;
alter table settlements alter column group_id set not null;

-- (c) members.handle UNIQUE — index variant so we can keep nullable handles
create unique index if not exists members_handle_unique
  on members(handle) where handle is not null;

-- (d) drop dead pattern columns (puzzle removed in commit 835256a)
alter table members drop column if exists pattern_hash;
alter table groups drop column if exists pattern_hash;
drop index if exists groups_pattern_hash_unique;

-- (e) drop dead app_config table entirely (puzzle pattern was its only row)
drop table if exists app_config;

-- (f) explicit ON DELETE actions on expense/settlement member FKs so a
--     hard-deleted member doesn't leave orphaned-but-not-deletable rows
alter table expenses drop constraint if exists expenses_paid_by_fkey;
alter table expenses
  add constraint expenses_paid_by_fkey
  foreign key (paid_by) references members(id) on delete restrict;
alter table settlements drop constraint if exists settlements_from_member_fkey;
alter table settlements
  add constraint settlements_from_member_fkey
  foreign key (from_member) references members(id) on delete restrict;
alter table settlements drop constraint if exists settlements_to_member_fkey;
alter table settlements
  add constraint settlements_to_member_fkey
  foreign key (to_member) references members(id) on delete restrict;
