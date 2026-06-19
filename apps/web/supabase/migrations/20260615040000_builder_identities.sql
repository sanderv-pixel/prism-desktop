-- Link authenticated users to their anonymous extension/CLI identifiers
-- so earnings can be aggregated across devices.

CREATE TABLE IF NOT EXISTS public.builder_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(auth_user_id, anonymous_user_id)
);

CREATE INDEX IF NOT EXISTS idx_builder_identities_auth_user ON public.builder_identities(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_builder_identities_anonymous ON public.builder_identities(anonymous_user_id);

ALTER TABLE public.builder_identities DISABLE ROW LEVEL SECURITY;
