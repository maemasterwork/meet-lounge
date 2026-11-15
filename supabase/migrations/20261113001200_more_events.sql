-- Meet Lounge: three more special-event decorations for the 3D cafe: anniversary, Valentine's day and Oil Day.
alter table public.settings drop constraint if exists settings_scene_event_check;
alter table public.settings
  add constraint settings_scene_event_check check (scene_event in ('none', 'yalda', 'xmas', 'nowruz', 'anniv', 'vday', 'oil'));
