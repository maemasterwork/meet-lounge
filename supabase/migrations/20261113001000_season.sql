-- Meet Lounge: the owner picks the season of the 3D cafe shown behind the app (summer or fall).
-- Everyone can read it (settings are public); only the owner can change it (existing settings policy).
alter table public.settings
  add column if not exists season text not null default 'fall' check (season in ('summer', 'fall'));
