-- Recreate update_user_trust_atomic with RETURN QUERY so it correctly returns rows
-- for Supabase RPC calls.
CREATE OR REPLACE FUNCTION update_user_trust_atomic(p_user_id TEXT, p_flagged BOOLEAN)
RETURNS TABLE(trust_score INTEGER, payout_hold BOOLEAN, impression_count INTEGER, flagged_count INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  delta INTEGER := CASE WHEN p_flagged THEN -10 ELSE 1 END;
BEGIN
  RETURN QUERY
  INSERT INTO public.user_trust (
    user_id,
    trust_score,
    impression_count,
    flagged_count,
    payout_hold
  )
  VALUES (
    p_user_id,
    GREATEST(0, LEAST(100, 50 + delta)),
    1,
    CASE WHEN p_flagged THEN 1 ELSE 0 END,
    GREATEST(0, LEAST(100, 50 + delta)) < 20
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    trust_score = GREATEST(0, LEAST(100, public.user_trust.trust_score + delta)),
    impression_count = public.user_trust.impression_count + 1,
    flagged_count = public.user_trust.flagged_count + CASE WHEN p_flagged THEN 1 ELSE 0 END,
    payout_hold = GREATEST(0, LEAST(100, public.user_trust.trust_score + delta)) < 20,
    last_seen_at = now()
  RETURNING
    public.user_trust.trust_score,
    public.user_trust.payout_hold,
    public.user_trust.impression_count,
    public.user_trust.flagged_count;
END;
$$;
