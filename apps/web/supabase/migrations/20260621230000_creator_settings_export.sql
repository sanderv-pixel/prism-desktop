-- Creator daily-earnings aggregation (for CSV/statement export, uncapped) and
-- creator email notification preferences.
create or replace function public.creator_daily_earnings(
  p_user_ids text[], p_since timestamptz default null
) returns table(day date, impressions bigint, earnings_millicents bigint)
language sql stable as $$
  select date(created_at) as day,
         count(*) as impressions,
         coalesce(sum(payout_millicents), 0) as earnings_millicents
  from public.impressions
  where user_id = any(p_user_ids)
    and validated and not payout_hold
    and (p_since is null or created_at >= p_since)
  group by date(created_at)
  order by date(created_at) desc;
$$;

alter table public.builder_payout_settings
  add column if not exists notify_payout boolean not null default true,
  add column if not exists notify_product boolean not null default false;
