-- Two-state ad pill (expanded panel) support.

-- Optional promo code an advertiser can attach to a campaign, surfaced in the
-- overlay's expanded ad panel as "Copy code". Null = no code shown.
alter table public.campaigns add column if not exists promo_code text;

-- Lightweight per-user feedback from the expanded ad panel controls
-- (thumbs up/down, fewer-like-this, hidden). Drives ad eligibility (hidden/down
-- suppress an advertiser) and future ranking. Service-role (the API) writes;
-- the owner can read their own rows.
create table if not exists public.overlay_ad_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,                                   -- earner id (anonymous_user_id == auth uid)
  campaign_id uuid references public.campaigns(id) on delete cascade,
  advertiser_id uuid references public.advertisers(id) on delete cascade,
  signal text not null check (signal in ('up','down','fewer','hidden')),
  created_at timestamptz not null default now()
);

create index if not exists idx_overlay_ad_feedback_user
  on public.overlay_ad_feedback(user_id, created_at desc);
create index if not exists idx_overlay_ad_feedback_user_adv
  on public.overlay_ad_feedback(user_id, advertiser_id);

alter table public.overlay_ad_feedback enable row level security;

drop policy if exists overlay_ad_feedback_owner_select on public.overlay_ad_feedback;
create policy overlay_ad_feedback_owner_select on public.overlay_ad_feedback
  for select using (auth.uid()::text = user_id);
