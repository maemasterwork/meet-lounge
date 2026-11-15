-- Meet Lounge: four seasons (spring, summer, fall, winter) and a special-event decoration
-- (Yalda, Christmas, Nowruz) for the 3D cafe. Same access as before: everyone reads, only the owner changes it.
alter table public.settings drop constraint if exists settings_season_check;
alter table public.settings
  add constraint settings_season_check check (season in ('spring', 'summer', 'fall', 'winter'));
alter table public.settings
  add column if not exists scene_event text not null default 'none' check (scene_event in ('none', 'yalda', 'xmas', 'nowruz'));
