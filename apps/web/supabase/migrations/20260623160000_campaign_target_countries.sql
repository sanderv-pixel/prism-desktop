-- Geo-targeting: campaigns can restrict delivery to specific countries (ISO-2
-- codes). Null/empty means serve everywhere. Matched against the viewer's
-- country (x-vercel-ip-country) at ad-serving time.
alter table public.campaigns add column if not exists target_countries text[];
create index if not exists idx_campaigns_target_countries_gin
  on public.campaigns using gin(target_countries);
