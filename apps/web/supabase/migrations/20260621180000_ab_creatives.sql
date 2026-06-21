-- A/B creatives: a campaign can have multiple creative variants. The ad server
-- rotates among active ones (balanced, fewest-impressions-first) and tracks
-- per-variant performance. impressions/clicks carry the served creative_id.
create table if not exists public.campaign_creatives (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  copy text not null,
  brand_name text,
  url text not null,
  icon_url text,
  status text not null default 'active',
  impression_count integer not null default 0,
  click_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_campaign_creatives_campaign on public.campaign_creatives(campaign_id);

-- Backfill one creative per existing campaign from its current fields.
insert into public.campaign_creatives (campaign_id, copy, brand_name, url, icon_url, status, impression_count, click_count)
select id, copy, brand_name, url, icon_url, 'active', coalesce(impression_count, 0), coalesce(click_count, 0)
from public.campaigns c
where not exists (select 1 from public.campaign_creatives cc where cc.campaign_id = c.id);

alter table public.impressions add column if not exists creative_id uuid;
alter table public.clicks add column if not exists creative_id uuid;

create or replace function public.bump_creative_counts(
  p_creative_id uuid, p_imp integer default 0, p_clk integer default 0
) returns void language sql as $$
  update public.campaign_creatives
    set impression_count = impression_count + p_imp,
        click_count = click_count + p_clk
  where id = p_creative_id;
$$;
