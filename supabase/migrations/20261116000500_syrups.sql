create table public.syrups (
  id              text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name_fa         text not null check (char_length(name_fa) between 1 and 80),
  name_en         text not null check (char_length(name_en) between 1 and 80),
  price_per_pump  integer not null check (price_per_pump >= 0),
  active          boolean not null default true,
  sort            integer not null default 0
);

alter table public.syrups enable row level security;
grant select on public.syrups to anon, authenticated;
grant insert, update, delete on public.syrups to authenticated;

create policy syrups_read on public.syrups for select to anon, authenticated
  using (active or public.is_owner());
create policy syrups_insert on public.syrups for insert to authenticated with check (public.is_owner());
create policy syrups_update on public.syrups for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy syrups_delete on public.syrups for delete to authenticated using (public.is_owner());

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.syrups;
  end if;
end $$;

insert into public.syrups (id, name_fa, name_en, price_per_pump, sort) values
  ('vanilla', 'وانیل', 'Vanilla', 30000, 0),
  ('caramel', 'کارامل', 'Caramel', 30000, 1),
  ('hazelnut', 'فندق', 'Hazelnut', 30000, 2)
on conflict (id) do update set
  name_fa = excluded.name_fa,
  name_en = excluded.name_en,
  price_per_pump = excluded.price_per_pump,
  sort = excluded.sort;

alter table public.order_items
  add column syrup_id text references public.syrups (id) on delete restrict,
  add column syrup_pumps integer not null default 0 check (syrup_pumps between 0 and 2);

do $$
declare
  definition text;
begin
  definition := pg_get_functiondef('public.create_order(jsonb, public.order_mode, text, text, text)'::regprocedure);
  definition := replace(definition, 'v_sugar    integer;',
    E'v_syrup_id text;\n  v_syrup_pumps integer;\n  v_syrup_price integer;');
  definition := replace(definition,
    E'v_sugar  := case when m.category in (''hot'', ''cold'', ''tea'') then coalesce((el ->> ''sugar'')::integer, 1) else 1 end;',
    E'v_syrup_id := nullif(el ->> ''syrup_id'', '''');\n    v_syrup_pumps := coalesce((el ->> ''syrup_pumps'')::integer, 0);\n    v_syrup_price := 0;');
  definition := replace(definition,
    'if v_qty not between 1 and 20 or v_sugar not between 0 and 2 then raise exception ''bad-option''; end if;',
    E'if v_qty not between 1 and 20 then raise exception ''bad-option''; end if;\n    if v_syrup_pumps not between 0 and 2 or (v_syrup_pumps = 0 and v_syrup_id is not null) then raise exception ''bad-option''; end if;\n    if v_syrup_pumps > 0 then\n      if m.category not in (''hot'', ''cold'', ''tea'') or v_syrup_id is null or v_reward then raise exception ''bad-option''; end if;\n      select price_per_pump into v_syrup_price from public.syrups where id = v_syrup_id and active;\n      if not found then raise exception ''bad-option''; end if;\n    end if;');
  definition := replace(definition, 'milk, sugar, qty', 'milk, syrup_id, syrup_pumps, qty');
  definition := replace(definition, 'v_milk, v_sugar, v_qty', 'v_milk, v_syrup_id, v_syrup_pumps, v_qty');
  definition := replace(definition,
    E'v_unit := case when v_pct is null then v_base\n                     else (round(v_base * (1 - v_pct / 100.0) / 1000.0) * 1000)::integer end;',
    E'v_unit := case when v_pct is null then v_base\n                     else (round(v_base * (1 - v_pct / 100.0) / 1000.0) * 1000)::integer end;\n      v_unit := v_unit + v_syrup_price * v_syrup_pumps;');
  if position('v_sugar' in definition) > 0 or position('v_syrup_pumps' in definition) = 0 then
    raise exception 'Could not update create_order for syrup options';
  end if;
  execute definition;
end
$$;
