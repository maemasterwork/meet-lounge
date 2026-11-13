-- Meet Lounge: schema. Run in order (see SETUP.md). Idempotent where practical.
-- Prices are in Toman (integers). Timestamps are timestamptz.

create type public.user_role    as enum ('customer', 'staff', 'owner');
create type public.order_mode   as enum ('pickup', 'table', 'delivery');
create type public.order_status as enum ('new', 'prep', 'ready', 'out', 'done', 'cancelled');
create type public.item_category as enum ('hot', 'cold', 'sweet', 'goods');

-- One profile per auth user (created by a trigger, see 20261113000200_functions.sql).
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  phone        text check (phone is null or phone ~ '^\+?[0-9 ()-]{6,20}$'),
  role         public.user_role not null default 'customer',
  locale       text not null default 'fa' check (locale in ('fa', 'en')),
  created_at   timestamptz not null default now()
);

create table public.menu_items (
  id              text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  category        public.item_category not null,
  name_fa         text not null check (char_length(name_fa) between 1 and 80),
  name_en         text not null check (char_length(name_en) between 1 and 80),
  description_fa  text not null default '' check (char_length(description_fa) <= 400),
  description_en  text not null default '' check (char_length(description_en) <= 400),
  base_price      integer not null check (base_price >= 0),
  -- [{"key":"small","mult":1,"scale":0.9}, ...]; the first size is the base size and the reward size.
  sizes           jsonb not null default '[{"key":"piece1","mult":1,"scale":1}]'
                  check (jsonb_typeof(sizes) = 'array' and jsonb_array_length(sizes) between 1 and 6),
  milk_options    boolean not null default false,
  available       boolean not null default true,
  archived        boolean not null default false,
  reward_eligible boolean not null default false,
  image_path      text,
  tags            text[] not null default '{}',
  art             text not null default 'espresso',
  sort            integer not null default 0,
  created_at      timestamptz not null default now()
);

create table public.offers (
  id           bigint generated always as identity primary key,
  title_fa     text not null check (char_length(title_fa) between 1 and 80),
  title_en     text not null default '' check (char_length(title_en) <= 80),
  body_fa      text not null check (char_length(body_fa) between 1 and 240),
  body_en      text not null default '' check (char_length(body_en) <= 240),
  item_id      text not null references public.menu_items (id) on delete cascade,
  discount_pct integer not null default 0 check (discount_pct between 0 and 90),
  audience     text not null default 'all' check (audience in ('all', 'repeat', 'near_reward')),
  starts_at    timestamptz,
  ends_at      timestamptz,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- One row only (id = 1). Public data: nothing secret belongs here.
create table public.settings (
  id               integer primary key default 1 check (id = 1),
  reward_every     integer not null default 6 check (reward_every between 2 and 50),
  delivery_fee     integer not null default 30000 check (delivery_fee >= 0),
  milk_surcharges  integer[] not null default '{0,15000,20000}',
  shop_open        boolean not null default true,
  table_count      integer not null default 12 check (table_count between 1 and 200),
  brand_name_fa    text not null default 'میت لانج',
  brand_name_en    text not null default 'Meet Lounge',
  theme            jsonb not null default '{}',
  hero_image_path  text
);

create sequence public.order_number_seq start 100;

create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  number        integer not null unique default nextval('public.order_number_seq'),
  customer_id   uuid not null references public.profiles (id) on delete restrict,
  mode          public.order_mode not null,
  table_no      text check (table_no is null or table_no ~ '^[0-9]{1,3}$'),
  address       text check (address is null or char_length(address) <= 300),
  guest_phone   text check (guest_phone is null or guest_phone ~ '^\+?[0-9 ()-]{6,20}$'),
  subtotal      integer not null check (subtotal >= 0),
  delivery_fee  integer not null default 0 check (delivery_fee >= 0),
  total         integer not null check (total >= 0),
  reward_coins  integer not null default 0 check (reward_coins >= 0),
  status        public.order_status not null default 'new',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (mode <> 'table' or table_no is not null),
  check (mode <> 'delivery' or address is not null)
);
create index orders_customer_idx on public.orders (customer_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at);

create table public.order_items (
  id          bigint generated always as identity primary key,
  order_id    uuid not null references public.orders (id) on delete cascade,
  item_id     text not null references public.menu_items (id) on delete restrict,
  size        text not null,
  milk        integer not null default 0 check (milk between 0 and 9),
  sugar       integer not null default 1 check (sugar between 0 and 9),
  qty         integer not null check (qty between 1 and 20),
  unit_price  integer not null check (unit_price >= 0),
  is_reward   boolean not null default false
);
create index order_items_order_idx on public.order_items (order_id);

-- Append-only. Balance = sum(delta). Unique (order_id, reason) makes every order-linked entry happen at most once.
create table public.coin_ledger (
  id          bigint generated always as identity primary key,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  delta       integer not null check (delta <> 0),
  reason      text not null check (reason in ('welcome', 'earn', 'reward', 'refund', 'revoke', 'adjust')),
  order_id    uuid references public.orders (id) on delete set null,
  note        text check (note is null or char_length(note) <= 200),
  created_by  uuid,
  created_at  timestamptz not null default now()
);
create unique index coin_ledger_once on public.coin_ledger (order_id, reason) where order_id is not null;
create index coin_ledger_customer_idx on public.coin_ledger (customer_id, created_at desc);

create table public.push_subscriptions (
  id          bigint generated always as identity primary key,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);
