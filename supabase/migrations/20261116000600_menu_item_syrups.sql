alter table public.menu_items
  add column syrup_options boolean not null default false;

update public.menu_items
set syrup_options = true
where category in ('hot', 'cold', 'tea');

do $$
declare
  definition text;
  old_condition text := 'if m.category not in (''hot'', ''cold'', ''tea'') or v_syrup_id is null or v_reward then';
begin
  definition := pg_get_functiondef('public.create_order(jsonb, public.order_mode, text, text, text)'::regprocedure);
  if position(old_condition in definition) = 0 then
    raise exception 'create_order syrup eligibility condition was not found';
  end if;
  definition := replace(definition, old_condition,
    'if not m.syrup_options or v_syrup_id is null or v_reward then');
  execute definition;
end
$$;
