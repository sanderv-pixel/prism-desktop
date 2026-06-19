-- Performance indexes for Phase 2 fraud queries.
CREATE INDEX IF NOT EXISTS idx_impressions_user_campaign_validated_created
  ON public.impressions(user_id, campaign_id, validated, created_at DESC);
