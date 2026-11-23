alter table public.settings
  add column if not exists reusable_mug_discount integer not null default 10000
  check (reusable_mug_discount >= 0);

alter table public.order_items
  add column if not exists reusable_mug_qty integer not null default 0
  check (reusable_mug_qty between 0 and qty);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.settings'::regclass
      and conname = 'settings_reusable_mug_discount_check'
  ) then
    alter table public.settings
      add constraint settings_reusable_mug_discount_check
      check (reusable_mug_discount >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.order_items'::regclass
      and conname = 'order_items_reusable_mug_qty_check'
  ) then
    alter table public.order_items
      add constraint order_items_reusable_mug_qty_check
      check (reusable_mug_qty between 0 and qty);
  end if;
end
$$;

do $$
declare
  definition text;
  syrup_init text := 'v_syrup_price := 0;';
  syrup_pumps_check text := 'if v_syrup_pumps not between 0 and 2 or (v_syrup_pumps = 0 and v_syrup_id is not null) then raise exception ''bad-option''; end if;';
  syrup_insert_columns text := 'milk, syrup_id, syrup_pumps, qty';
  syrup_insert_values text := 'v_milk, v_syrup_id, v_syrup_pumps, v_qty';
  subtotal_update text := 'v_sub := v_sub + v_unit * v_qty;';
begin
  definition := pg_get_functiondef('public.create_order(jsonb, public.order_mode, text, text, text)'::regprocedure);

  if position('v_mug_qty integer;' in definition) > 0 then
    if position('reusable_mug_qty, qty' in definition) = 0
       or position('least(v_unit, s.reusable_mug_discount) * v_mug_qty' in definition) = 0 then
      raise exception 'create_order has an incomplete reusable mug discount patch';
    end if;
  else
    if position('v_syrup_price integer;' in definition) = 0
       or position(syrup_init in definition) = 0
       or position(syrup_pumps_check in definition) = 0
       or position(syrup_insert_columns in definition) = 0
       or position(syrup_insert_values in definition) = 0
       or position(subtotal_update in definition) = 0 then
      raise exception 'Could not locate create_order syrup anchors for reusable mug discount';
    end if;

    definition := replace(definition, 'v_syrup_price integer;',
      E'v_syrup_price integer;\n  v_mug_qty integer;');
    definition := replace(definition, syrup_init,
      E'v_syrup_price := 0;\n    v_mug_qty := coalesce((el ->> ''mug_qty'')::integer, 0);');
    definition := replace(definition, syrup_pumps_check,
      syrup_pumps_check || E'\n    if v_mug_qty < 0 or v_mug_qty > v_qty then raise exception ''bad-option''; end if;\n    if v_mug_qty > 0 and (m.category not in (''hot'', ''cold'', ''tea'') or p_mode not in (''pickup'', ''table'') or v_reward) then raise exception ''bad-option''; end if;');
    definition := replace(definition, syrup_insert_columns, 'milk, syrup_id, syrup_pumps, reusable_mug_qty, qty');
    definition := replace(definition, syrup_insert_values, 'v_milk, v_syrup_id, v_syrup_pumps, v_mug_qty, v_qty');
    definition := replace(definition, subtotal_update,
      'v_sub := v_sub + v_unit * v_qty - least(v_unit, s.reusable_mug_discount) * v_mug_qty;');

    if position('v_mug_qty integer;' in definition) = 0
       or position('reusable_mug_qty, qty' in definition) = 0
       or position('least(v_unit, s.reusable_mug_discount) * v_mug_qty' in definition) = 0 then
      raise exception 'Could not add reusable mug discount to create_order';
    end if;

    execute definition;
  end if;
end
$$;
