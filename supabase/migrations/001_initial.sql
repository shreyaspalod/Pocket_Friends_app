-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- CREATE ALL TABLES FIRST (no cross-references in table defs)
-- ============================================================

create table if not exists public.profiles (
  id        uuid references auth.users(id) on delete cascade primary key,
  name      text not null,
  created_at timestamptz default now() not null
);

create table if not exists public.groups (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  description text,
  currency    text default '₹' not null,
  invite_code text unique default substring(md5(random()::text) from 1 for 8) not null,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz default now() not null
);

create table if not exists public.group_members (
  id         uuid default gen_random_uuid() primary key,
  group_id   uuid references public.groups(id) on delete cascade not null,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  joined_at  timestamptz default now() not null,
  unique(group_id, user_id)
);

create table if not exists public.expenses (
  id              uuid default gen_random_uuid() primary key,
  group_id        uuid references public.groups(id) on delete cascade not null,
  paid_by         uuid references public.profiles(id) on delete set null,
  title           text not null,
  amount          numeric(12, 2) not null check (amount > 0),
  expense_date    date default current_date not null,
  notes           text,
  is_recurring    boolean default false not null,
  recurrence_day  int check (recurrence_day between 1 and 28),
  created_at      timestamptz default now() not null
);

create table if not exists public.expense_splits (
  id          uuid default gen_random_uuid() primary key,
  expense_id  uuid references public.expenses(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  amount      numeric(12, 2) not null check (amount >= 0),
  unique(expense_id, user_id)
);

create table if not exists public.settlements (
  id          uuid default gen_random_uuid() primary key,
  group_id    uuid references public.groups(id) on delete cascade not null,
  from_user   uuid references public.profiles(id) on delete set null,
  to_user     uuid references public.profiles(id) on delete set null,
  amount      numeric(12, 2) not null check (amount > 0),
  note        text,
  created_at  timestamptz default now() not null
);

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements enable row level security;

-- ============================================================
-- PROFILES POLICIES
-- ============================================================

create policy "profiles_select_all" on public.profiles
  for select using (true);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- ============================================================
-- GROUPS POLICIES
-- ============================================================

-- Members can see their groups
create policy "groups_select_member" on public.groups
  for select using (
    exists (
      select 1 from public.group_members
      where group_id = public.groups.id and user_id = auth.uid()
    )
  );

-- Any authenticated user can look up a group by invite code (needed for join flow)
create policy "groups_select_by_invite_code" on public.groups
  for select using (auth.uid() is not null);

create policy "groups_insert_auth" on public.groups
  for insert with check (auth.uid() = created_by);

create policy "groups_update_creator" on public.groups
  for update using (auth.uid() = created_by);

-- ============================================================
-- GROUP MEMBERS POLICIES
-- ============================================================

create policy "group_members_select" on public.group_members
  for select using (
    exists (
      select 1 from public.group_members gm2
      where gm2.group_id = public.group_members.group_id and gm2.user_id = auth.uid()
    )
  );

create policy "group_members_insert" on public.group_members
  for insert with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.groups g
      where g.id = public.group_members.group_id and g.created_by = auth.uid()
    )
  );

-- ============================================================
-- EXPENSES POLICIES
-- ============================================================

create policy "expenses_select_member" on public.expenses
  for select using (
    exists (
      select 1 from public.group_members
      where group_id = public.expenses.group_id and user_id = auth.uid()
    )
  );

create policy "expenses_insert_member" on public.expenses
  for insert with check (
    exists (
      select 1 from public.group_members
      where group_id = public.expenses.group_id and user_id = auth.uid()
    )
  );

create policy "expenses_delete_payer" on public.expenses
  for delete using (paid_by = auth.uid());

-- ============================================================
-- EXPENSE SPLITS POLICIES
-- ============================================================

create policy "splits_select_member" on public.expense_splits
  for select using (
    exists (
      select 1 from public.expenses e
      join public.group_members gm on gm.group_id = e.group_id
      where e.id = public.expense_splits.expense_id and gm.user_id = auth.uid()
    )
  );

create policy "splits_insert_member" on public.expense_splits
  for insert with check (
    exists (
      select 1 from public.expenses e
      join public.group_members gm on gm.group_id = e.group_id
      where e.id = public.expense_splits.expense_id and gm.user_id = auth.uid()
    )
  );

-- ============================================================
-- SETTLEMENTS POLICIES
-- ============================================================

create policy "settlements_select_member" on public.settlements
  for select using (
    exists (
      select 1 from public.group_members
      where group_id = public.settlements.group_id and user_id = auth.uid()
    )
  );

create policy "settlements_insert_member" on public.settlements
  for insert with check (
    exists (
      select 1 from public.group_members
      where group_id = public.settlements.group_id and user_id = auth.uid()
    )
  );

-- ============================================================
-- HELPER FUNCTION: auto-create profile on signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'User')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
