-- Hardening for the security advisor WARN-level findings.
--
-- 1) function_search_path_mutable (x24): pin search_path on the flagged functions.
--    The effective caller search_path is ("$user", public, extensions); pinning to
--    (public, extensions) reproduces resolution exactly (no schema named after the
--    role exists), so behavior is unchanged while the lint is cleared.
-- 2) handle_new_user_referral is a SECURITY DEFINER *trigger* function
--    (on_auth_user_created_referral on auth.users) that the app never calls as an RPC.
--    Postgres does not check EXECUTE for trigger firing, so revoking the public RPC
--    grants is safe and removes the anon/authenticated SECURITY DEFINER exposure.
-- 3) is_admin_user(uuid) is intentionally left executable by authenticated: the
--    audit_logs / anomaly_events admin RLS policies call it, so revoking would break
--    admin access. Its search_path is pinned below.

ALTER FUNCTION public.bump_creative_counts(p_creative_id uuid, p_imp integer, p_clk integer) SET search_path = public, extensions;
ALTER FUNCTION public.campaign_analytics_breakdowns(p_campaign_ids uuid[], p_since timestamp with time zone) SET search_path = public, extensions;
ALTER FUNCTION public.creator_daily_earnings(p_user_ids text[], p_since timestamp with time zone) SET search_path = public, extensions;
ALTER FUNCTION public.creator_dashboard_series(p_user_ids text[], p_referrer uuid, p_days integer) SET search_path = public, extensions;
ALTER FUNCTION public.creator_earnings_totals(p_user_ids text[], p_referrer_id uuid) SET search_path = public, extensions;
ALTER FUNCTION public.creator_insights(p_user_ids text[], p_tz text) SET search_path = public, extensions;
ALTER FUNCTION public.credit_advertiser_balance(p_advertiser_id uuid, p_amount_cents integer, p_description text, p_stripe_payment_intent_id text) SET search_path = public, extensions;
ALTER FUNCTION public.credit_advertiser_balance(p_advertiser_id uuid, p_amount_cents integer, p_description text, p_stripe_payment_intent_id text, p_is_test boolean) SET search_path = public, extensions;
ALTER FUNCTION public.decrease_campaign_budget(p_advertiser_id uuid, p_campaign_id uuid, p_reduction_cents integer) SET search_path = public, extensions;
ALTER FUNCTION public.generate_referral_code() SET search_path = public, extensions;
ALTER FUNCTION public.get_admin_metrics() SET search_path = public, extensions;
ALTER FUNCTION public.get_admin_revenue_timeseries(p_days integer) SET search_path = public, extensions;
ALTER FUNCTION public.get_admin_visits_timeseries(p_days integer) SET search_path = public, extensions;
ALTER FUNCTION public.increase_campaign_budget(p_advertiser_id uuid, p_campaign_id uuid, p_additional_cents integer) SET search_path = public, extensions;
ALTER FUNCTION public.increment_campaign_click_count(p_campaign_id uuid) SET search_path = public, extensions;
ALTER FUNCTION public.increment_campaign_daily_spend(p_campaign_id uuid, p_spend_date date, p_amount integer, p_cap integer) SET search_path = public, extensions;
ALTER FUNCTION public.increment_campaign_daily_spend_mc(p_campaign_id uuid, p_spend_date date, p_amount_mc bigint, p_cap_mc bigint) SET search_path = public, extensions;
ALTER FUNCTION public.increment_campaign_spent(p_campaign_id uuid, p_amount integer) SET search_path = public, extensions;
ALTER FUNCTION public.increment_campaign_spent_mc(p_campaign_id uuid, p_amount_mc bigint) SET search_path = public, extensions;
ALTER FUNCTION public.increment_fingerprint_mismatch(p_anonymous_user_id text) SET search_path = public, extensions;
ALTER FUNCTION public.is_admin_user(user_id uuid) SET search_path = public, extensions;
ALTER FUNCTION public.pause_advertiser_campaigns() SET search_path = public, extensions;
ALTER FUNCTION public.release_campaign_budget(p_advertiser_id uuid, p_campaign_id uuid) SET search_path = public, extensions;
ALTER FUNCTION public.reserve_campaign_budget(p_advertiser_id uuid, p_campaign_id uuid, p_amount_cents integer) SET search_path = public, extensions;
ALTER FUNCTION public.safe_context_key(p text) SET search_path = public, extensions;
ALTER FUNCTION public.set_payout_hold(p_user_id text, p_hold boolean) SET search_path = public, extensions;
ALTER FUNCTION public.update_user_trust_atomic(p_user_id text, p_flagged boolean) SET search_path = public, extensions;

REVOKE EXECUTE ON FUNCTION public.handle_new_user_referral() FROM anon, authenticated;
