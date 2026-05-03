-- 0018: trip planner death — baze becomes anı deposu + sosyal feed
--
-- BEFORE running this: `node scripts/dump-expenses.mjs` writes a JSON
-- backup to docs/archive/expenses-backup-<date>.json. Once that succeeds,
-- this migration drops the planner subsystem permanently.

drop table if exists settlements cascade;
drop table if exists expenses cascade;

-- Trip = etiket. Drop planner-only columns. Keep name + dates + cover_url +
-- description (description is reused as a memory caption).
alter table trips drop column if exists center_lat;
alter table trips drop column if exists center_lng;
alter table trips drop column if exists sort_order;

drop index if exists idx_trips_sort;
drop function if exists reorder_trips(uuid, uuid[]);

-- Locations can now exist without a trip (city-only memories).
alter table locations alter column trip_id drop not null;

-- Per-location cost was an expense feature; nuke alongside the rest.
alter table locations drop column if exists amount;
alter table locations drop column if exists currency;
