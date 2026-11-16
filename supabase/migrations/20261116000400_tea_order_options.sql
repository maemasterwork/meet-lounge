do $$
declare
  definition text;
  old_condition text := 'm.category in (''hot'', ''cold'')';
begin
  definition := pg_get_functiondef('public.create_order(jsonb, public.order_mode, text, text, text)'::regprocedure);
  if position(old_condition in definition) = 0 then
    raise exception 'create_order drink category condition was not found';
  end if;
  execute replace(definition, old_condition, 'm.category in (''hot'', ''cold'', ''tea'')');
end
$$;
