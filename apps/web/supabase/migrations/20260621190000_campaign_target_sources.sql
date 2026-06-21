-- Surface/tool targeting: a campaign can restrict delivery to specific surfaces
-- (claude, cursor, codex, terminal). NULL or empty = all surfaces.
alter table public.campaigns add column if not exists target_sources text[];
