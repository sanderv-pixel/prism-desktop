-- Server-side aggregation for the creator dashboard's daily chart, by-tool
-- breakdown, validated/total impression counts, 30-day total, and the 30/60-day
-- deltas. The route previously computed these from a raw impressions row scan
-- that Supabase caps at 1000 rows, which silently dropped recent days (including
-- today) for high-volume creators. Aggregating in SQL keeps it accurate at any
-- volume and returns ~30 rows.

create or replace function creator_dashboard_series(
  p_user_ids text[],
  p_referrer uuid,
  p_days int default 30
)
returns json
language sql
stable
as $func$
  with b as (
    select (now() at time zone 'utc')::date as today,
           now() - make_interval(days => p_days)     as win_start,
           now() - make_interval(days => p_days * 2)  as prev_start
  ),
  own as (
    select created_at, payout_millicents, validated, payout_hold,
      coalesce(
        nullif(substring(context from '"aiTool"\s*:\s*"([^"]*)"'), ''),
        nullif(substring(context from '"editor"\s*:\s*"([^"]*)"'), ''),
        case when context !~ '^\s*\{' then nullif(context, '') end,
        'Unknown'
      ) as tool
    from impressions, b
    where user_id = any(p_user_ids) and created_at >= b.prev_start
  ),
  ref as (
    select created_at, referrer_payout_millicents, validated, payout_hold
    from impressions, b
    where referrer_user_id = p_referrer and created_at >= b.prev_start
  ),
  day_series as (
    select gs::date as day
    from b, generate_series(b.today - (p_days - 1), b.today, interval '1 day') gs
  ),
  own_daily as (
    select (o.created_at at time zone 'utc')::date as day,
           sum(o.payout_millicents) as mc, count(*) as cnt
    from own o, b
    where o.validated and not o.payout_hold and o.created_at >= b.win_start
    group by 1
  ),
  ref_daily as (
    select (r.created_at at time zone 'utc')::date as day, sum(r.referrer_payout_millicents) as mc
    from ref r, b
    where r.validated and not r.payout_hold and r.created_at >= b.win_start
    group by 1
  ),
  daily as (
    select d.day, coalesce(od.mc,0) as own_mc, coalesce(rd.mc,0) as ref_mc, coalesce(od.cnt,0) as impressions
    from day_series d
    left join own_daily od on od.day = d.day
    left join ref_daily rd on rd.day = d.day
  ),
  tools as (
    select o.tool, sum(o.payout_millicents) as mc, count(*) as cnt
    from own o, b
    where o.validated and not o.payout_hold and o.created_at >= b.win_start
    group by o.tool order by sum(o.payout_millicents) desc nulls last limit 12
  ),
  ownw as (
    select
      count(*) filter (where o.validated and not o.payout_hold) as validated_impr,
      count(*) as total_impr,
      coalesce(sum(o.payout_millicents) filter (where o.validated and not o.payout_hold and o.created_at >= b.win_start),0) as own_mc_win,
      coalesce(sum(o.payout_millicents) filter (where o.validated and not o.payout_hold and o.created_at < b.win_start),0) as own_mc_prev,
      count(*) filter (where o.validated and not o.payout_hold and o.created_at >= b.win_start) as cnt_win,
      count(*) filter (where o.validated and not o.payout_hold and o.created_at < b.win_start) as cnt_prev
    from own o, b
  ),
  refw as (
    select
      coalesce(sum(r.referrer_payout_millicents) filter (where r.validated and not r.payout_hold and r.created_at >= b.win_start),0) as ref_mc_win,
      coalesce(sum(r.referrer_payout_millicents) filter (where r.validated and not r.payout_hold and r.created_at < b.win_start),0) as ref_mc_prev
    from ref r, b
  )
  select json_build_object(
    'daily', (select coalesce(json_agg(json_build_object('day', day, 'own_mc', own_mc, 'ref_mc', ref_mc, 'impressions', impressions) order by day), '[]'::json) from daily),
    'tools', (select coalesce(json_agg(json_build_object('tool', tool, 'mc', mc, 'cnt', cnt) order by mc desc), '[]'::json) from tools),
    'validated_impressions', (select validated_impr from ownw),
    'total_impressions', (select total_impr from ownw),
    'own_mc_win', (select own_mc_win from ownw),
    'own_mc_prev', (select own_mc_prev from ownw),
    'cnt_win', (select cnt_win from ownw),
    'cnt_prev', (select cnt_prev from ownw),
    'ref_mc_win', (select ref_mc_win from refw),
    'ref_mc_prev', (select ref_mc_prev from refw)
  );
$func$;
