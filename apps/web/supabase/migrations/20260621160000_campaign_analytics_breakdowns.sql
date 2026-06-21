-- Source + context breakdowns and reach computed in the DB (GROUP BY) so advertiser
-- reporting isn't limited by the 1000-row API fetch. Validated/billable impressions
-- only, to reconcile with spend.

-- Safely extract a context display key from the impression context (stored as text).
-- Returns 'Other' on non-JSON. Mirrors the app's parseContextKey.
create or replace function public.safe_context_key(p text) returns text
language plpgsql immutable as $$
declare j jsonb;
begin
  begin
    j := p::jsonb;
  exception when others then
    return 'Other';
  end;
  return coalesce(
    nullif(j->>'editor', ''),
    nullif(j->>'aiTool', ''),
    nullif(j->>'projectType', ''),
    'Other'
  );
end; $$;

create or replace function public.campaign_analytics_breakdowns(
  p_campaign_ids uuid[], p_since timestamptz default null
) returns json language sql stable as $$
  with imps as (
    select source, session_id, auction_price_cpm, context
    from public.impressions
    where campaign_id = any(p_campaign_ids)
      and validated
      and (p_since is null or created_at >= p_since)
  )
  select json_build_object(
    'reach', (select count(distinct session_id) from imps),
    'impressions', (select count(*) from imps),
    'source', coalesce((
      select json_agg(json_build_object('name', name, 'impressions', impressions, 'spend', spend)
                      order by impressions desc)
      from (
        select coalesce(source, 'unknown') as name, count(*) as impressions,
               coalesce(sum(auction_price_cpm), 0) / 100000.0 as spend
        from imps group by coalesce(source, 'unknown')
      ) s
    ), '[]'::json),
    'context', coalesce((
      select json_agg(json_build_object('name', name, 'impressions', impressions, 'spend', spend)
                      order by impressions desc)
      from (
        select public.safe_context_key(context) as name, count(*) as impressions,
               coalesce(sum(auction_price_cpm), 0) / 100000.0 as spend
        from imps group by public.safe_context_key(context)
        order by count(*) desc limit 10
      ) c
    ), '[]'::json)
  );
$$;
