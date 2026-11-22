-- GHAYAS UD DIN PHARMACY & MART
-- Run this once in Supabase Dashboard > SQL Editor.
-- Keep public sign-ups disabled. Create authorized users in Authentication > Users.

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  quantity integer not null default 0 check (quantity >= 0),
  purchase_price numeric(12,2) not null default 0,
  sale_price numeric(12,2) not null default 0,
  expiry_date date,
  low_stock_level integer not null default 5,
  created_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  quantity integer not null default 1,
  total_amount numeric(12,2) not null check (total_amount >= 0),
  cost_amount numeric(12,2) not null default 0 check (cost_amount >= 0),
  payment_method text not null default 'cash'
    check (payment_method in ('cash','digital','credit')),
  created_at timestamptz not null default now()
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  supplier text not null,
  description text not null,
  quantity integer not null default 1,
  amount numeric(12,2) not null check (amount >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  consultation_fee numeric(12,2) not null default 200,
  consultation_paid boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.purchases enable row level security;
alter table public.patients enable row level security;
alter table public.expenses enable row level security;

-- Authenticated staff only. Add role-based policies before inviting staff if needed.
do $$
declare tbl text;
begin
  foreach tbl in array array['products','sales','purchases','patients','expenses']
  loop
    execute format('drop policy if exists "Authenticated users can manage %I" on public.%I', tbl, tbl);
    execute format(
      'create policy "Authenticated users can manage %I" on public.%I for all to authenticated using (true) with check (true)',
      tbl, tbl
    );
  end loop;
end $$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.products, public.sales,
  public.purchases, public.patients, public.expenses to authenticated;

-- Important:
-- 1. Never put the Supabase service_role key in the browser app.
-- 2. Create only trusted users in Supabase Auth; disable public sign-ups.
-- 3. Patient notes should contain only the minimum necessary information.
-- 4. Configure scheduled backups/point-in-time recovery according to your Supabase plan.
