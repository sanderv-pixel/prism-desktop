-- Advertiser-held key for server-to-server conversion postbacks. Write-only scope:
-- can only record conversions attributed to the advertiser's own campaigns.
alter table public.advertisers add column if not exists conversion_api_key text;
update public.advertisers
  set conversion_api_key = 'pck_' || replace(gen_random_uuid()::text, '-', '')
  where conversion_api_key is null;
create unique index if not exists idx_advertisers_conversion_key
  on public.advertisers(conversion_api_key);
