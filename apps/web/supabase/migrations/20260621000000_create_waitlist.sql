CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'creator',
  source TEXT DEFAULT 'homepage',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_waitlist_type CHECK (type IN ('creator', 'advertiser', 'partner'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_email_type ON public.waitlist(email, type);
