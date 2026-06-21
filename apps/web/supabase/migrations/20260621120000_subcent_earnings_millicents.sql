-- Sub-cent earnings: store payouts and campaign spend in millicents
-- (1 cent = 1000 millicents) so a creator earns an exact 50% of the auction
-- clearing price per impression instead of a flat 1-cent floor. At an $8 CPM the
-- per-impression price is 0.8c and the creator's 50% is 0.4c, which whole cents
-- cannot represent. The existing *_cents columns are kept (maintained as the
-- floor of millicents) so every advertiser-facing cents reader keeps working.

alter table public.impressions
  add column if not exists payout_millicents integer not null default 0,
  add column if not exists referrer_payout_millicents integer not null default 0;

-- Backfill historical rows: each recorded cent is 1000 millicents.
update public.impressions
  set payout_millicents = payout_cents * 1000,
      referrer_payout_millicents = coalesce(referrer_payout_cents, 0) * 1000
  where payout_millicents = 0
    and (payout_cents <> 0 or coalesce(referrer_payout_cents, 0) <> 0);

alter table public.campaigns
  add column if not exists spent_millicents bigint not null default 0;
update public.campaigns
  set spent_millicents = spent_cents::bigint * 1000
  where spent_millicents = 0 and spent_cents <> 0;

alter table public.campaign_daily_spend
  add column if not exists spent_millicents bigint not null default 0;
update public.campaign_daily_spend
  set spent_millicents = spent_cents::bigint * 1000
  where spent_millicents = 0 and spent_cents <> 0;

-- Millicent-precise spend RPCs. Each keeps spent_cents maintained (floor of
-- millicents) so existing cents readers and budget filters keep working. The cap
-- check is done in millicents for exactness.
create or replace function public.increment_campaign_spent_mc(
  p_campaign_id uuid, p_amount_mc bigint
) returns integer language plpgsql as $$
declare new_cents integer;
begin
  update public.campaigns
    set spent_millicents = spent_millicents + p_amount_mc,
        spent_cents = ((spent_millicents + p_amount_mc) / 1000)::int
  where id = p_campaign_id
    and spent_millicents + p_amount_mc <= budget_cents::bigint * 1000
  returning spent_cents into new_cents;
  return new_cents; -- null when the budget cap would be exceeded
end; $$;

create or replace function public.increment_campaign_daily_spend_mc(
  p_campaign_id uuid, p_spend_date date, p_amount_mc bigint, p_cap_mc bigint
) returns boolean language plpgsql as $$
begin
  insert into public.campaign_daily_spend (campaign_id, spend_date, spent_millicents, spent_cents)
  values (p_campaign_id, p_spend_date, p_amount_mc, (p_amount_mc / 1000)::int)
  on conflict (campaign_id, spend_date)
  do update set
    spent_millicents = public.campaign_daily_spend.spent_millicents + excluded.spent_millicents,
    spent_cents = ((public.campaign_daily_spend.spent_millicents + excluded.spent_millicents) / 1000)::int
  where public.campaign_daily_spend.spent_millicents + excluded.spent_millicents <= p_cap_mc;
  return found;
end; $$;
