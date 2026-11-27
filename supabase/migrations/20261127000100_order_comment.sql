alter table public.orders
  add column if not exists customer_comment text
  check (customer_comment is null or char_length(customer_comment) <= 500);

-- Add a separate six-argument overload. The existing five-argument overload remains available
-- for older clients and migrations; no default makes five- and six-argument calls unambiguous.
do $$
declare
  definition text;
begin
  if to_regprocedure('public.create_order(jsonb, public.order_mode, text, text, text)') is not null then
    definition := pg_get_functiondef(
      'public.create_order(jsonb, public.order_mode, text, text, text)'::regprocedure
    );

    -- The comment overload may exist from a previous run with default parameters.
    -- DROP FUNCTION is required before changing parameter defaults.
    if to_regprocedure('public.create_order(jsonb, public.order_mode, text, text, text, text)') is not null then
      drop function public.create_order(jsonb, public.order_mode, text, text, text, text);
    end if;

    definition := 'CREATE OR REPLACE FUNCTION public.create_order(p_items jsonb, p_mode public.order_mode, p_table text, p_address text, p_phone text, p_comment text)'
      || substr(definition, strpos(definition, E'\n'));

    definition := replace(
      definition,
      E'  return o;',
      E'  update public.orders set customer_comment = nullif(btrim(p_comment), '''') where id = o.id returning * into o;\n  return o;'
    );

    execute definition;
  end if;
end $$;

grant execute on function public.create_order(jsonb, public.order_mode, text, text, text, text) to anon, authenticated;
