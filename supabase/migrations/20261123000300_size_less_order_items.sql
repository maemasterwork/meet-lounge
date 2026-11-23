alter table public.menu_items
  drop constraint if exists menu_items_sizes_check;

alter table public.menu_items
  add constraint menu_items_sizes_check
  check (jsonb_typeof(sizes) = 'array' and jsonb_array_length(sizes) between 0 and 6);

do $$
declare
  definition text;
  old_selection text := E'v_size := coalesce(el ->> ''size'', m.sizes -> 0 ->> ''key'');\n      select e into sz from jsonb_array_elements(m.sizes) e where e ->> ''key'' = v_size;\n      if sz is null then raise exception ''bad-option''; end if;';
  new_selection text := E'if m.sizes = ''[]''::jsonb or m.sizes = ''[{}]''::jsonb then\n        v_size := '''';\n        sz := ''{"mult":1}''::jsonb;\n      else\n        v_size := coalesce(nullif(el ->> ''size'', ''''), m.sizes -> 0 ->> ''key'');\n        select e into sz from jsonb_array_elements(m.sizes) e where e ->> ''key'' = v_size;\n        if sz is null then raise exception ''bad-option''; end if;\n      end if;';
begin
  definition := pg_get_functiondef('public.create_order(jsonb, public.order_mode, text, text, text)'::regprocedure);
  definition := replace(definition, E'\r\n', E'\n');

  if position('m.sizes = ''[]''::jsonb or m.sizes = ''[{}]''::jsonb' in definition) = 0 then
    if position(old_selection in definition) = 0 then
      raise exception 'Could not locate create_order size validation for size-less item support';
    end if;

    definition := replace(definition, old_selection, new_selection);
    definition := replace(definition,
      'v_size := m.sizes -> 0 ->> ''key'';',
      'v_size := coalesce(m.sizes -> 0 ->> ''key'', '''');');

    if position('m.sizes = ''[]''::jsonb or m.sizes = ''[{}]''::jsonb' in definition) = 0
       or position('v_size := coalesce(m.sizes -> 0 ->> ''key'', '''');' in definition) = 0 then
      raise exception 'Could not add size-less item support to create_order';
    end if;

    execute definition;
  end if;
end
$$;
