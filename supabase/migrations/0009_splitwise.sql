-- splitwise-style expense tracking per trip
-- expenses: who paid, how much, in what currency, how it splits
-- settlements: explicit "I paid you back" entries that zero out a balance

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  title text not null,
  amount numeric not null check (amount > 0),
  currency char(3) not null,
  paid_by uuid not null references members(id),
  -- 'half' = 50/50 between trip members (the other owes amount/2)
  -- 'full' = paid_by paid for the other entirely (the other owes amount)
  split_mode text not null default 'half' check (split_mode in ('half', 'full')),
  location_id uuid references locations(id) on delete set null,
  spent_at date not null default current_date,
  note text,
  created_by uuid references members(id),
  created_at timestamptz not null default now()
);

create table if not exists settlements (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  from_member uuid not null references members(id),
  to_member uuid not null references members(id) check (to_member <> from_member),
  amount numeric not null check (amount > 0),
  currency char(3) not null,
  settled_at date not null default current_date,
  note text,
  created_by uuid references members(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_expenses_trip on expenses(trip_id, spent_at desc);
create index if not exists idx_settlements_trip on settlements(trip_id, settled_at desc);
