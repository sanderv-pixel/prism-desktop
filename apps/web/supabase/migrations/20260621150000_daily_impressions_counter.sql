-- Maintain a daily impressions counter alongside daily spend so the time-series
-- chart isn't drawn from the capped 1000-row fetch. Incremented per validated
-- impression in the daily-spend RPC; backfilled from validated impressions.
alter table public.campaign_daily_spend
  add column if not exists impressions integer not null default 0;

create or replace function public.increment_campaign_daily_spend_mc(
  p_campaign_id uuid, p_spend_date date, p_amount_mc bigint, p_cap_mc bigint
) returns boolean language plpgsql as $$
begin
  insert into public.campaign_daily_spend (campaign_id, spend_date, spent_millicents, spent_cents, impressions)
  values (p_campaign_id, p_spend_date, p_amount_mc, (p_amount_mc / 1000)::int, 1)
  on conflict (campaign_id, spend_date)
  do update set
    spent_millicents = public.campaign_daily_spend.spent_millicents + excluded.spent_millicents,
    spent_cents = ((public.campaign_daily_spend.spent_millicents + excluded.spent_millicents) / 1000)::int,
    impressions = public.campaign_daily_spend.impressions + 1
  where public.campaign_daily_spend.spent_millicents + excluded.spent_millicents <= p_cap_mc;
  return found;
end; $$;

update public.campaign_daily_spend ds
  set impressions = sub.cnt
  from (
    select campaign_id, date(created_at) as d, count(*) as cnt
    from public.impressions where validated
    group by campaign_id, date(created_at)
  ) sub
  where ds.campaign_id = sub.campaign_id and ds.spend_date = sub.d;
