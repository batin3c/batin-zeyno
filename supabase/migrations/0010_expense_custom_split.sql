-- allow per-member custom shares on an expense
-- shares is { memberId: amount }, only used when split_mode = 'custom'
alter table expenses drop constraint if exists expenses_split_mode_check;
alter table expenses
  add constraint expenses_split_mode_check
  check (split_mode in ('half', 'full', 'custom'));
alter table expenses add column if not exists shares jsonb;
