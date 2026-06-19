-- Lightweight page-view tracking for the admin dashboard.
CREATE TABLE IF NOT EXISTS public.visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visits_created_at
  ON public.visits(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_visits_path_created_at
  ON public.visits(path, created_at DESC);

ALTER TABLE public.visits DISABLE ROW LEVEL SECURITY;
