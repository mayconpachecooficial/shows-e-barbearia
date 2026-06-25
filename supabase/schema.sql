create extension if not exists "pgcrypto";

create table public.clients (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  phone text not null,
  birth_date date,
  notes text default '',
  created_at timestamptz not null default now()
);

create table public.barbers (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  commission_rate numeric(5,2) not null default 0,
  role text not null default 'Barbeiro',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.service_records (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  client_id text references public.clients(id) on delete set null,
  barber_id text references public.barbers(id) on delete set null,
  service_date date not null,
  service text not null,
  custom_service text,
  value numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.expenses (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  expense_date date not null,
  category text not null,
  description text default '',
  value numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.products (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  stock integer not null default 0,
  cost numeric(12,2) not null default 0,
  price numeric(12,2) not null default 0,
  sold integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.product_sales (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  client_id text references public.clients(id) on delete set null,
  sale_date date not null,
  quantity integer not null default 1,
  unit_price numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.appointments (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  client_id text references public.clients(id) on delete set null,
  barber_id text references public.barbers(id) on delete set null,
  appointment_date date not null,
  appointment_time time not null,
  service text not null,
  status text not null default 'Pendente',
  created_at timestamptz not null default now()
);

alter table public.clients enable row level security;
alter table public.barbers enable row level security;
alter table public.service_records enable row level security;
alter table public.expenses enable row level security;
alter table public.products enable row level security;
alter table public.product_sales enable row level security;
alter table public.appointments enable row level security;

create policy "Users manage own clients" on public.clients for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own barbers" on public.barbers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own service records" on public.service_records for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own expenses" on public.expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own products" on public.products for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own product sales" on public.product_sales for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own appointments" on public.appointments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Public shared clients" on public.clients for all to anon using (user_id is null) with check (user_id is null);
create policy "Public shared barbers" on public.barbers for all to anon using (user_id is null) with check (user_id is null);
create policy "Public shared service records" on public.service_records for all to anon using (user_id is null) with check (user_id is null);
create policy "Public shared expenses" on public.expenses for all to anon using (user_id is null) with check (user_id is null);
create policy "Public shared products" on public.products for all to anon using (user_id is null) with check (user_id is null);
create policy "Public shared product sales" on public.product_sales for all to anon using (user_id is null) with check (user_id is null);
create policy "Public shared appointments" on public.appointments for all to anon using (user_id is null) with check (user_id is null);
