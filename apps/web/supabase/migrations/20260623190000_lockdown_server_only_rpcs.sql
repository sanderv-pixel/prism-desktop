-- SECURITY: these functions are only ever called server-side via the service
-- role (API routes / webhooks). They were executable by the public `anon` and
-- `authenticated` roles, which Supabase exposes through PostgREST. Several are
-- SECURITY DEFINER (bypass RLS), so the worst of them — credit_advertiser_balance,
-- the campaign-budget movers, and the admin metrics readers — let anyone holding
-- the public anon key mint wallet balance, move money, or read platform revenue.
-- Revoke direct client access; keep service_role (the server) able to call them.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        -- earnings / analytics aggregates (server-only)
        'creator_insights','creator_dashboard_series','creator_earnings_totals',
        'campaign_analytics_breakdowns',
        -- wallet / budget money movement (server-only)
        'credit_advertiser_balance','increment_campaign_spent_mc',
        'reserve_campaign_budget','release_campaign_budget',
        'increase_campaign_budget','decrease_campaign_budget',
        'increment_campaign_click_count',
        -- admin dashboards (server-only)
        'get_admin_metrics','get_admin_revenue_timeseries','get_admin_visits_timeseries'
      )
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

-- NOTE: is_admin_user() and handle_new_user_referral() are intentionally left
-- callable: the former is an RLS-policy helper (authenticated must keep EXECUTE
-- or policy evaluation breaks); the latter is a trigger function.
