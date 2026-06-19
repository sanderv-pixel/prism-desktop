-- The wallet RPCs insert rows into advertiser_transactions, which has RLS
-- enabled but no INSERT policy. When called by an authenticated user via
-- SECURITY INVOKER, the insert is rejected. Switch these functions to
-- SECURITY DEFINER so they can maintain the transaction ledger while still
-- enforcing advertiser ownership and balance checks internally.

ALTER FUNCTION public.credit_advertiser_balance SECURITY DEFINER;
ALTER FUNCTION public.reserve_campaign_budget SECURITY DEFINER;
ALTER FUNCTION public.release_campaign_budget SECURITY DEFINER;
ALTER FUNCTION public.increase_campaign_budget SECURITY DEFINER;
ALTER FUNCTION public.decrease_campaign_budget SECURITY DEFINER;
