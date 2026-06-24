-- Close the three "RLS disabled in public" advisor errors. All three tables are
-- exposed via PostgREST; without RLS, the anon/authenticated roles could read/write
-- them directly. Service-role API routes are unaffected (service_role bypasses RLS).

-- visits + waitlist: written only by service-role API routes (api/visit, api/waitlist,
-- api/contact, admin metrics). Enable RLS with no policy => service_role still bypasses
-- RLS, anon/authenticated get no access. No app code uses a user session for these.
alter table public.visits enable row level security;
alter table public.waitlist enable row level security;

-- campaign_creatives: served + managed via service-role routes (api/ads, api/clicks,
-- campaigns/[id]/creatives[/cid]), but the campaign-edit route (api/campaigns/[id])
-- syncs the primary creative via the advertiser's own session. Enable RLS and grant
-- owners access to creatives of campaigns they own, mirroring the existing campaigns
-- ownership policies. service_role bypasses RLS for ad serving + admin CRUD.
alter table public.campaign_creatives enable row level security;

create policy "Users can view own campaign creatives" on public.campaign_creatives
  for select using (
    campaign_id in (
      select c.id from public.campaigns c
      where c.advertiser_id in (
        select a.id from public.advertisers a where a.user_id = auth.uid()
      )
    )
  );

create policy "Users can insert own campaign creatives" on public.campaign_creatives
  for insert with check (
    campaign_id in (
      select c.id from public.campaigns c
      where c.advertiser_id in (
        select a.id from public.advertisers a where a.user_id = auth.uid()
      )
    )
  );

create policy "Users can update own campaign creatives" on public.campaign_creatives
  for update using (
    campaign_id in (
      select c.id from public.campaigns c
      where c.advertiser_id in (
        select a.id from public.advertisers a where a.user_id = auth.uid()
      )
    )
  );

create policy "Users can delete own campaign creatives" on public.campaign_creatives
  for delete using (
    campaign_id in (
      select c.id from public.campaigns c
      where c.advertiser_id in (
        select a.id from public.advertisers a where a.user_id = auth.uid()
      )
    )
  );
