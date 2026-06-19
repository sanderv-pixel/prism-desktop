-- Purpose: make the product credible to professional media buyers.
-- - Campaign objectives (awareness vs performance)
-- - Blind second-price auction support (auction_price_cpm on impressions)
-- - Click and conversion tracking
-- - Flight dates, frequency caps, daily budgets
-- - Nullable impression/click user_id for anonymous extension users

-- Campaign objectives & flight controls
alter table public.campaigns
  add column if not exists objective text not null default 'awareness',
  add column if not exists bid_type text not null default 'cpm',
  add column if not exists start_date timestamptz,
  add column if not exists end_date timestamptz,
  add column if not exists daily_budget_cents integer,
  add column if not exists frequency_cap integer,
  add column if not exists frequency_window_hours integer default 24,
  add column if not exists impression_count integer not null default 0,
  add column if not exists click_count integer not null default 0;

-- Constraint helpers
alter table public.campaigns
  add constraint campaigns_objective_check
  check (objective in ('awareness', 'performance'));

alter table public.campaigns
  add constraint campaigns_bid_type_check
  check (bid_type in ('cpm', 'cpc', 'cpa'));

-- Impressions need to support anonymous users and record the clearing price.
alter table public.impressions
  alter column user_id drop not null,
  add column if not exists session_id text,
  add column if not exists auction_price_cpm integer not null default 0,
  add column if not exists currency text not null default 'usd',
  add column if not exists click_id uuid;

-- Clicks: redirect through Prism so we can report CTR/CPC and attribute conversions.
create table if not exists public.clicks (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  impression_id uuid references public.impressions(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  context text,
  url text not null,
  redirected boolean not null default false,
  created_at timestamptz not null default now()
);

-- Conversions: server-side or pixel events attributed to a click.
create table if not exists public.conversions (
  id uuid primary key default gen_random_uuid(),
  click_id uuid references public.clicks(id) on delete set null,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  event_name text not null,
  value_cents integer not null default 0,
  currency text not null default 'usd',
  attribution_window_hours integer not null default 168,
  created_at timestamptz not null default now()
);

-- Optional: published CPM floors by context tag. Internal / delayed updates only.
create table if not exists public.market_floors (
  context text primary key,
  floor_cpm integer not null,
  effective_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for reporting and auction performance
create index if not exists idx_campaigns_objective on public.campaigns(objective);
create index if not exists idx_campaigns_bid_type on public.campaigns(bid_type);
create index if not exists idx_campaigns_dates on public.campaigns(start_date, end_date);
create index if not exists idx_impressions_session_id on public.impressions(session_id);
create index if not exists idx_impressions_created_at on public.impressions(created_at);
create index if not exists idx_clicks_campaign_id on public.clicks(campaign_id);
create index if not exists idx_clicks_impression_id on public.clicks(impression_id);
create index if not exists idx_clicks_created_at on public.clicks(created_at);
create index if not exists idx_conversions_campaign_id on public.conversions(campaign_id);
create index if not exists idx_conversions_click_id on public.conversions(click_id);
create index if not exists idx_conversions_created_at on public.conversions(created_at);

-- Enable RLS on new tables
alter table public.clicks enable row level security;
alter table public.conversions enable row level security;
alter table public.market_floors enable row level security;

-- RLS: advertisers can read their own clicks and conversions
-- Service role inserts these, so we only need read policies.
create policy "Advertisers can view own clicks"
  on public.clicks for select
  using (
    campaign_id in (
      select id from public.campaigns where advertiser_id in (
        select id from public.advertisers where user_id = auth.uid()
      )
    )
  );

create policy "Advertisers can view own conversions"
  on public.conversions for select
  using (
    campaign_id in (
      select id from public.campaigns where advertiser_id in (
        select id from public.advertisers where user_id = auth.uid()
      )
    )
  );

-- Market floors are read-only for advertisers
create policy "Advertisers can view market floors"
  on public.market_floors for select
  to authenticated
  using (true);

-- Increment campaign click counter atomically.
create or replace function public.increment_campaign_click_count(p_campaign_id uuid)
returns void as $$
begin
  update public.campaigns
  set click_count = click_count + 1,
      updated_at = now()
  where id = p_campaign_id;
end;
$$ language plpgsql security definer;
