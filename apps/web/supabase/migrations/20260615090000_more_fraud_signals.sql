-- More fraud signals: store client IP, context hash, and fraud score on impressions.

ALTER TABLE public.impressions
  ADD COLUMN IF NOT EXISTS client_ip TEXT,
  ADD COLUMN IF NOT EXISTS context_hash TEXT,
  ADD COLUMN IF NOT EXISTS fraud_score INTEGER NOT NULL DEFAULT 0;

-- Index for IP-based velocity and distinct-user checks.
CREATE INDEX IF NOT EXISTS idx_impressions_client_ip_created_at
  ON public.impressions(client_ip, created_at);

-- Index for per-user time-series fraud checks.
CREATE INDEX IF NOT EXISTS idx_impressions_user_created_at
  ON public.impressions(user_id, created_at);

-- Index for per-user-per-campaign velocity checks.
CREATE INDEX IF NOT EXISTS idx_impressions_user_campaign_created_at
  ON public.impressions(user_id, campaign_id, created_at);

-- Index for repeated-context (copy-paste bot) detection.
CREATE INDEX IF NOT EXISTS idx_impressions_context_hash_created_at
  ON public.impressions(context_hash, created_at);
