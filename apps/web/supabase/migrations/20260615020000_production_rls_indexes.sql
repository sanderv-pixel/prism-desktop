-- Production-ready RLS, indexes, and constraints for Prism tables.
-- Re-enables RLS (previously disabled for development), tightens policies,
-- adds production indexes, and adds non-negativity/budget checks.

-- 1. Enable RLS on all Prism tables (defense in depth: also force RLS for owners).
alter table public.advertisers enable row level security;
alter table public.campaigns enable row level security;
alter table public.impressions enable row level security;
alter table public.payouts enable row level security;

alter table public.advertisers force row level security;
alter table public.campaigns force row level security;
alter table public.impressions force row level security;
alter table public.payouts force row level security;

-- 2. Recreate production RLS policies. Service-role clients bypass RLS automatically,
--    so /api/ads and /api/impressions continue to work with createAdminClient().

-- Advertisers: users can read/insert/update their own row.
drop policy if exists "Users can view own advertiser" on public.advertisers;
drop policy if exists "Users can insert own advertiser" on public.advertisers;
drop policy if exists "Users can update own advertiser" on public.advertisers;

create policy "Users can view own advertiser"
  on public.advertisers for select
  using (auth.uid() = user_id);

create policy "Users can insert own advertiser"
  on public.advertisers for insert
  with check (auth.uid() = user_id);

create policy "Users can update own advertiser"
  on public.advertisers for update
  using (auth.uid() = user_id);

-- Campaigns: users can CRUD campaigns belonging to their advertiser.
drop policy if exists "Users can view own campaigns" on public.campaigns;
drop policy if exists "Users can insert own campaigns" on public.campaigns;
drop policy if exists "Users can update own campaigns" on public.campaigns;

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

-- Impressions: anonymous browser/CLI extensions can insert. Authenticated users
-- can read only rows where user_id matches their UUID. user_id is TEXT (anonymous
-- extension IDs), so auth.uid() is cast to text for the comparison.
drop policy if exists "Anonymous can insert impressions" on public.impressions;
drop policy if exists "Users can view own impressions" on public.impressions;

create policy "Anonymous can insert impressions"
  on public.impressions for insert
  to anon, authenticated
  with check (true);

create policy "Users can view own impressions"
  on public.impressions for select
  to authenticated
  using (auth.uid()::text = user_id);

-- Payouts: authenticated users can read only their own payouts.
drop policy if exists "Users can view own payouts" on public.payouts;

create policy "Users can view own payouts"
  on public.payouts for select
  using (auth.uid() = user_id);

-- 3. Indexes for production query performance.
create index if not exists idx_campaigns_status_budget_spent
  on public.campaigns(status, budget_cents, spent_cents);

create index if not exists idx_impressions_user_id_created_at
  on public.impressions(user_id, created_at);

create index if not exists idx_impressions_campaign_id_created_at
  on public.impressions(campaign_id, created_at);

create index if not exists idx_advertisers_user_id
  on public.advertisers(user_id);

create index if not exists idx_payouts_user_id_status
  on public.payouts(user_id, status);

-- 4. Constraints / checks.
alter table public.campaigns drop constraint if exists campaigns_max_bid_cpm_nonneg;
alter table public.campaigns add constraint campaigns_max_bid_cpm_nonneg
  check (max_bid_cpm >= 0);

alter table public.campaigns drop constraint if exists campaigns_budget_cents_nonneg;
alter table public.campaigns add constraint campaigns_budget_cents_nonneg
  check (budget_cents >= 0);

alter table public.campaigns drop constraint if exists campaigns_spent_within_budget;
alter table public.campaigns add constraint campaigns_spent_within_budget
  check (spent_cents <= budget_cents);

alter table public.impressions drop constraint if exists impressions_payout_cents_nonneg;
alter table public.impressions add constraint impressions_payout_cents_nonneg
  check (payout_cents >= 0);
