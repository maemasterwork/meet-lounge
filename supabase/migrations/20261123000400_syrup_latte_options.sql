do $$
declare
  definition text;
  old_condition text := 'if not m.syrup_options or v_syrup_id is null or v_reward then';
  new_condition text := 'if (not m.syrup_options and m.art not in (''syruplatte'', ''syrupicedlatte'')) or v_syrup_id is null or v_reward then';
begin
  definition := pg_get_functiondef('public.create_order(jsonb, public.order_mode, text, text, text)'::regprocedure);

  if position(new_condition in definition) = 0 then
    if position(old_condition in definition) = 0 then
      raise exception 'Could not locate create_order syrup eligibility condition';
    end if;
    definition := replace(definition, old_condition, new_condition);
    execute definition;
  end if;
end
$$;
