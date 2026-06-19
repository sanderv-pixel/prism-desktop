-- -----------------------------------------------------------------------------
-- Audit log for security/financial actions.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id TEXT,
  actor_email TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created_at
  ON public.audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_created_at
  ON public.audit_logs(target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created_at
  ON public.audit_logs(actor_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- Anomaly events for fraud/operational alerting.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.anomaly_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details JSONB DEFAULT '{}'::jsonb,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anomaly_events_created_at
  ON public.anomaly_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_events_unacknowledged
  ON public.anomaly_events(acknowledged_at, created_at DESC)
  WHERE acknowledged_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_anomaly_events_type_created_at
  ON public.anomaly_events(type, created_at DESC);

-- -----------------------------------------------------------------------------
-- Helper to determine if a user is an admin (mirrors app logic).
-- Must be created before the RLS policies that depend on it.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
  admin_emails TEXT[];
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = user_id;
  admin_emails := string_to_array(current_setting('app.settings.prism_admin_emails', true), ',');
  IF admin_emails IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN lower(user_email) = ANY(array(SELECT lower(trim(e)) FROM unnest(admin_emails) e));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- RLS: only admins can read these tables. Service-role keys bypass RLS.
-- -----------------------------------------------------------------------------
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomaly_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_admin_select
  ON public.audit_logs
  FOR SELECT
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY anomaly_events_admin_select
  ON public.anomaly_events
  FOR SELECT
  USING (public.is_admin_user(auth.uid()));
