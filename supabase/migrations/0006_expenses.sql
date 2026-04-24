-- per-location cost tracking
alter table locations add column if not exists amount numeric;
alter table locations add column if not exists currency char(3);
