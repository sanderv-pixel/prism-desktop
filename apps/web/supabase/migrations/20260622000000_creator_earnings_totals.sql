-- Uncapped all-time earnings totals for a creator: own payouts plus lifelong
-- referral commission (10% of referred creators' earnings). Summed in SQL so the
-- balance is not truncated by the 1000-row PostgREST fetch cap and referral
-- earnings never drop off after the dashboard's 60-day display window.
create or replace function public.creator_earnings_totals(p_user_ids text[], p_referrer_id uuid)
returns table(own_millicents bigint, referral_millicents bigint)
language sql stable as $$
  select
    coalesce((select sum(payout_millicents) from public.impressions
              where user_id = any(p_user_ids) and validated and not payout_hold), 0)::bigint as own_millicents,
    coalesce((select sum(referrer_payout_millicents) from public.impressions
              where referrer_user_id = p_referrer_id and validated and not payout_hold), 0)::bigint as referral_millicents;
$$;
