alter table public.orders add column archived boolean not null default false;

grant update (archived) on public.orders to authenticated;
