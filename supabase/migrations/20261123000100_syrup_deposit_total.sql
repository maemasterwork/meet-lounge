do $$
declare
  definition text;
  price_case_pattern text := '(v_unit[[:space:]]*:=\s*case\s+when\s+v_pct\s+is\s+null\s+then\s+v_base\s+else\s+.*?end;)';
  syrup_adjustment text := 'v_unit := v_unit + v_syrup_price * v_syrup_pumps;';
begin
  definition := pg_get_functiondef('public.create_order(jsonb, public.order_mode, text, text, text)'::regprocedure);
  if position(syrup_adjustment in definition) = 0 then
    definition := regexp_replace(
      definition,
      price_case_pattern,
      E'\\1\n      ' || syrup_adjustment,
      's'
    );
    if position(syrup_adjustment in definition) = 0 then
      raise exception 'Could not update create_order to include syrup costs in order totals';
    end if;
    execute definition;
  end if;
end
$$;
