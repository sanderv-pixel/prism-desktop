-- Enable RLS
alter table if exists public.advertisers enable row level security;
alter table if exists public.campaigns enable row level security;
alter table if exists public.impressions enable row level security;
alter table if exists public.payouts enable row level security;

-- Users are managed by Supabase Auth.
-- We add a public profile only when needed for extra fields.

-- Advertisers
create table if not exists public.advertisers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  website text,
  status text not null default 'pending',
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text not null default 'inactive',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Campaigns
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null references public.advertisers(id) on delete cascade,
  title text not null,
  copy text not null,
  url text not null,
  max_bid_cpm integer not null,
  budget_cents integer not null,
  spent_cents integer not null default 0,
  status text not null default 'pending',
  contexts text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Impressions
create table if not exists public.impressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  context text,
  validated boolean not null default false,
  duration_ms integer,
  payout_cents integer not null default 0,
  created_at timestamptz not null default now()
);

-- Payouts
create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_cents integer not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- Indexes
create index if not exists idx_advertisers_user_id on public.advertisers(user_id);
create index if not exists idx_campaigns_advertiser_id on public.campaigns(advertiser_id);
create index if not exists idx_campaigns_status on public.campaigns(status);
create index if not exists idx_impressions_user_id on public.impressions(user_id);
create index if not exists idx_impressions_campaign_id on public.impressions(campaign_id);

-- RLS policies

-- Advertisers: users can read/update their own row
create policy "Users can view own advertiser"
  on public.advertisers for select
  using (auth.uid() = user_id);

create policy "Users can insert own advertiser"
  on public.advertisers for insert
  with check (auth.uid() = user_id);

create policy "Users can update own advertiser"
  on public.advertisers for update
  using (auth.uid() = user_id);

-- Campaigns: users can CRUD campaigns belonging to their advertiser
create policy "Users can view own campaigns"
  on public.campaigns for select
  using (
    advertiser_id in (
      select id from public.advertisers where user_id = auth.uid()
    )
  );

create policy "Users can insert own campaigns"
  on public.campaigns for insert
  with check (
    advertiser_id in (
      select id from public.advertisers where user_id = auth.uid()
    )
  );

create policy "Users can update own campaigns"
  on public.campaigns for update
  using (
    advertiser_id in (
      select id from public.advertisers where user_id = auth.uid()
    )
  );

-- Impressions: service role inserts, users read own
create policy "Users can view own impressions"
  on public.impressions for select
  using (auth.uid() = user_id);

-- Payouts: users read own
create policy "Users can view own payouts"
  on public.payouts for select
  using (auth.uid() = user_id);
