-- Enable RLS on tables created after the main RLS migration.
-- Service-role clients bypass RLS automatically, so /api routes using
-- createAdminClient() are unaffected.

-- 1. builder_identities: users can only manage their own linked IDs.
ALTER TABLE public.builder_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_identities FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own identities" ON public.builder_identities;
DROP POLICY IF EXISTS "Users can insert own identity" ON public.builder_identities;

CREATE POLICY "Users can view own identities"
  ON public.builder_identities FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "Users can insert own identity"
  ON public.builder_identities FOR INSERT
  WITH CHECK (auth_user_id = auth.uid());

-- 2. user_trust: users can view their own trust record (identified by text id).
ALTER TABLE public.user_trust ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_trust FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own trust" ON public.user_trust;

CREATE POLICY "Users can view own trust"
  ON public.user_trust FOR SELECT
  USING (user_id = auth.uid()::text);

-- 3. campaign_daily_spend: only service-role clients should touch this.
-- Enable RLS as defense-in-depth; no anon/authenticated policies needed.
ALTER TABLE public.campaign_daily_spend ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_daily_spend FORCE ROW LEVEL SECURITY;
