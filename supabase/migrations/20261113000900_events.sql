-- Meet Lounge: little gatherings ("Events"), managed in Dashboard -> Events.
-- The owner creates events; customers save a seat through book_event(); seat counts are kept by the functions only.

create table public.events (
  id             uuid primary key default gen_random_uuid(),
  icon           text not null default 'cup' check (icon in ('music', 'book', 'cake', 'bean', 'cup', 'lantern', 'brush', 'jar', 'heart')),
  title_fa       text not null check (char_length(title_fa) between 1 and 80),
  title_en       text not null check (char_length(title_en) between 1 and 80),
  description_fa text not null default '' check (char_length(description_fa) <= 400),
  description_en text not null default '' check (char_length(description_en) <= 400),
  place_fa       text not null default '' check (char_length(place_fa) <= 80),
  place_en       text not null default '' check (char_length(place_en) <= 80),
  day            date not null,
  start_time     text not null check (start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  hours          integer not null default 2 check (hours between 1 and 12),
  capacity       integer not null check (capacity between 1 and 500),
  held           integer not null default 0 check (held >= 0),      -- seats the cafe keeps for itself / walk-ins
  booked         integer not null default 0 check (booked >= 0),    -- seats saved by customers (set only by the functions)
  published      boolean not null default true,
  created_at     timestamptz not null default now(),
  check (held + booked <= capacity)
);
create index events_day on public.events (day);

create table public.event_seats (
  event_id    uuid not null references public.events (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (event_id, customer_id)
);

-- "Today" at the cafe (Tehran). Change the zone here if the cafe is elsewhere.
create function public.cafe_today() returns date language sql stable as $$ select (now() at time zone 'Asia/Tehran')::date $$;

-- `booked` can only change inside book_event / cancel_booking, never by a direct update (even by the owner).
create function public.events_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then new.booked := 0; return new; end if;
  if coalesce(current_setting('ml.booking', true), '') <> '1' then new.booked := old.booked; end if;
  if new.held + new.booked > new.capacity then raise exception 'capacity-too-small'; end if;
  return new;
end $$;
create trigger events_guard before insert or update on public.events for each row execute function public.events_guard();

alter table public.events enable row level security;
alter table public.event_seats enable row level security;
create policy events_read   on public.events for select to anon, authenticated using (published or public.is_staff());
create policy events_insert on public.events for insert to authenticated with check (public.is_owner());
create policy events_update on public.events for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy events_delete on public.events for delete to authenticated using (public.is_owner());
create policy seats_read    on public.event_seats for select to authenticated using (customer_id = auth.uid() or public.is_staff());

revoke all on public.events, public.event_seats from anon, authenticated;
grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;             -- owner only, by policy
grant select on public.event_seats to authenticated;                        -- own rows (staff: all), by policy

create function public.book_event(p_event uuid) returns public.events
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); e public.events;
begin
  if uid is null then raise exception 'not-authenticated' using errcode = '42501'; end if;
  select * into e from public.events where id = p_event for update;
  if not found or not e.published then raise exception 'event-not-found'; end if;
  if e.day < public.cafe_today() then raise exception 'event-closed'; end if;
  if exists (select 1 from public.event_seats where event_id = e.id and customer_id = uid) then return e; end if;   -- already saved
  if e.held + e.booked >= e.capacity then raise exception 'event-full'; end if;
  insert into public.event_seats (event_id, customer_id) values (e.id, uid);
  perform set_config('ml.booking', '1', true);
  update public.events set booked = booked + 1 where id = e.id returning * into e;
  perform set_config('ml.booking', '', true);
  return e;
end $$;

create function public.cancel_booking(p_event uuid) returns public.events
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); e public.events;
begin
  if uid is null then raise exception 'not-authenticated' using errcode = '42501'; end if;
  select * into e from public.events where id = p_event for update;
  if not found then raise exception 'event-not-found'; end if;
  if exists (select 1 from public.event_seats where event_id = e.id and customer_id = uid) then
    delete from public.event_seats where event_id = e.id and customer_id = uid;
    perform set_config('ml.booking', '1', true);
    update public.events set booked = booked - 1 where id = e.id returning * into e;
    perform set_config('ml.booking', '', true);
  end if;
  return e;
end $$;

-- Staff: who saved a seat.
create function public.event_attendees(p_event uuid) returns table (name text, phone text, at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'not-allowed' using errcode = '42501'; end if;
  return query select p.display_name, p.phone, s.created_at from public.event_seats s join public.profiles p on p.id = s.customer_id
    where s.event_id = p_event order by s.created_at;
end $$;

revoke all on function public.book_event(uuid), public.cancel_booking(uuid), public.event_attendees(uuid), public.cafe_today() from public, anon;
grant execute on function public.book_event(uuid), public.cancel_booking(uuid), public.event_attendees(uuid), public.cafe_today() to authenticated;

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.events;
  end if;
end $$;
