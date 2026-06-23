-- Creator insights aggregate (uncapped, all-time): earnings by hour-of-day (UTC)
-- and day-of-week, plus lifetime monetized wait time, eligible view count, and
-- the single highest-paying view. Used on the earnings dashboard.
create or replace function public.creator_insights(p_user_ids text[])
returns json language sql stable as $$
  with elig as (
    select created_at, payout_millicents, duration_ms
    from public.impressions
    where user_id = any(p_user_ids)
      and validated = true
      and coalesce(payout_hold, false) = false
      and coalesce(payout_millicents, 0) > 0
  )
  select json_build_object(
    'hourly', (
      select coalesce(json_agg(json_build_object('h', h, 'mc', mc) order by h), '[]'::json)
      from (
        select extract(hour from created_at at time zone 'UTC')::int as h,
               sum(payout_millicents) as mc
        from elig group by 1
      ) x
    ),
    'dow', (
      select coalesce(json_agg(json_build_object('d', d, 'mc', mc) order by d), '[]'::json)
      from (
        select extract(dow from created_at at time zone 'UTC')::int as d,
               sum(payout_millicents) as mc
        from elig group by 1
      ) y
    ),
    'total_duration_ms', (select coalesce(sum(duration_ms), 0) from elig),
    'total_views', (select count(*) from elig),
    'max_payout_mc', (select coalesce(max(payout_millicents), 0) from elig)
  );
$$;
