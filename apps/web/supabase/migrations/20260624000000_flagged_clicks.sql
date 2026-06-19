-- Track fraud signals on blocked/bot clicks without counting them as real clicks.
ALTER TABLE public.clicks
  ADD COLUMN IF NOT EXISTS fraud_flags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS client_ip TEXT;

CREATE INDEX IF NOT EXISTS idx_clicks_fraud_flags
  ON public.clicks USING GIN (fraud_flags);
