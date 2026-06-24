-- Follow-up to 20260627150000: that migration revoked EXECUTE on the
-- handle_new_user_referral trigger function from anon/authenticated, but the default
-- PUBLIC grant remained, through which both roles still inherited EXECUTE. Revoke from
-- PUBLIC to fully close the SECURITY DEFINER RPC exposure. The function is only ever
-- invoked by its trigger (on_auth_user_created_referral on auth.users), which bypasses
-- the EXECUTE check, so this is behavior-safe. postgres + service_role retain EXECUTE.
REVOKE EXECUTE ON FUNCTION public.handle_new_user_referral() FROM PUBLIC;
