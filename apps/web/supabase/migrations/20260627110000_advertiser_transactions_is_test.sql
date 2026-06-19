-- Distinguish real revenue from test-mode deposits.

ALTER TABLE public.advertiser_transactions
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill existing test deposits that were marked via description.
UPDATE public.advertiser_transactions
  SET is_test = TRUE
  WHERE type = 'deposit'
    AND description ILIKE '[TEST]%';

-- Update the credit function so future test deposits can be flagged explicitly.
CREATE OR REPLACE FUNCTION public.credit_advertiser_balance(
  p_advertiser_id UUID,
  p_amount_cents INTEGER,
  p_description TEXT,
  p_stripe_payment_intent_id TEXT DEFAULT NULL,
  p_is_test BOOLEAN DEFAULT FALSE
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE public.advertisers
    SET balance_cents = balance_cents + p_amount_cents,
        lifetime_deposits_cents = lifetime_deposits_cents + p_amount_cents,
        updated_at = now()
    WHERE id = p_advertiser_id
    RETURNING balance_cents INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'Advertiser not found: %', p_advertiser_id;
  END IF;

  INSERT INTO public.advertiser_transactions (
    advertiser_id,
    type,
    amount_cents,
    balance_after_cents,
    description,
    stripe_payment_intent_id,
    is_test
  ) VALUES (
    p_advertiser_id,
    'deposit',
    p_amount_cents,
    v_new_balance,
    p_description,
    p_stripe_payment_intent_id,
    p_is_test
  );

  RETURN v_new_balance;
END;
$$;

-- Exclude test deposits from admin revenue metrics.
CREATE OR REPLACE FUNCTION public.get_admin_metrics()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'visits', json_build_object(
      'today', (SELECT count(*) FROM public.visits WHERE created_at >= date_trunc('day', now()) AND path !~ '^/(admin|advertiser|dashboard|auth|api|_next|favicon)'),
      'week', (SELECT count(*) FROM public.visits WHERE created_at >= date_trunc('week', now()) AND path !~ '^/(admin|advertiser|dashboard|auth|api|_next|favicon)'),
      'month', (SELECT count(*) FROM public.visits WHERE created_at >= date_trunc('month', now()) AND path !~ '^/(admin|advertiser|dashboard|auth|api|_next|favicon)'),
      'uniqueToday', COALESCE((SELECT count(DISTINCT ip) FROM public.visits WHERE created_at >= date_trunc('day', now()) AND ip IS NOT NULL AND path !~ '^/(admin|advertiser|dashboard|auth|api|_next|favicon)'), 0)
    ),
    'signups', json_build_object(
      'total', (SELECT count(*) FROM public.waitlist),
      'today', (SELECT count(*) FROM public.waitlist WHERE created_at >= date_trunc('day', now()))
    ),
    'revenue', json_build_object(
      'today', COALESCE((SELECT sum(amount_cents) FROM public.advertiser_transactions WHERE type = 'deposit' AND created_at >= date_trunc('day', now()) AND is_test = FALSE), 0),
      'month', COALESCE((SELECT sum(amount_cents) FROM public.advertiser_transactions WHERE type = 'deposit' AND created_at >= date_trunc('month', now()) AND is_test = FALSE), 0),
      'total', COALESCE((SELECT sum(amount_cents) FROM public.advertiser_transactions WHERE type = 'deposit' AND is_test = FALSE), 0),
      'spend', COALESCE((SELECT sum(spent_cents) FROM public.campaigns), 0),
      'held', COALESCE((SELECT sum(balance_cents) FROM public.advertisers), 0)
    ),
    'payouts', json_build_object(
      'pending', (SELECT count(*) FROM public.payouts WHERE status = 'pending_review'),
      'pendingCents', COALESCE((SELECT sum(amount_cents) FROM public.payouts WHERE status = 'pending_review'), 0),
      'paid', (SELECT count(*) FROM public.payouts WHERE status = 'paid'),
      'paidCents', COALESCE((SELECT sum(amount_cents) FROM public.payouts WHERE status = 'paid'), 0)
    ),
    'campaigns', json_build_object(
      'active', (SELECT count(*) FROM public.campaigns WHERE status = 'active'),
      'pendingReview', (SELECT count(*) FROM public.campaigns WHERE status = 'pending_review'),
      'totalSpend', COALESCE((SELECT sum(spent_cents) FROM public.campaigns), 0)
    ),
    'impressions', json_build_object(
      'today', (SELECT count(*) FROM public.impressions WHERE created_at >= date_trunc('day', now())),
      'total', (SELECT count(*) FROM public.impressions)
    ),
    'clicks', json_build_object(
      'today', (SELECT count(*) FROM public.clicks WHERE created_at >= date_trunc('day', now())),
      'total', (SELECT count(*) FROM public.clicks)
    ),
    'conversions', json_build_object(
      'today', (SELECT count(*) FROM public.conversions WHERE created_at >= date_trunc('day', now())),
      'total', (SELECT count(*) FROM public.conversions),
      'valueToday', COALESCE((SELECT sum(value_cents) FROM public.conversions WHERE created_at >= date_trunc('day', now())), 0),
      'valueTotal', COALESCE((SELECT sum(value_cents) FROM public.conversions), 0)
    ),
    'anomalies', json_build_object(
      'total', (SELECT count(*) FROM public.anomaly_events WHERE acknowledged_at IS NULL),
      'bySeverity', COALESCE((
        SELECT json_object_agg(severity, cnt)
        FROM (
          SELECT severity, count(*) AS cnt
          FROM public.anomaly_events
          WHERE acknowledged_at IS NULL
          GROUP BY severity
        ) s
      ), '{}'::json)
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_admin_revenue_timeseries(p_days INTEGER DEFAULT 30)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(json_agg(row_to_json(d) ORDER BY d.date), '[]'::json)
  FROM (
    SELECT
      date_trunc('day', gs)::date AS date,
      COALESCE(sum(CASE WHEN t.type = 'deposit' AND t.is_test = FALSE THEN t.amount_cents ELSE 0 END), 0) AS deposits,
      COALESCE(sum(CASE WHEN t.type = 'campaign_allocation' THEN -t.amount_cents ELSE 0 END), 0) AS spend
    FROM generate_series(
      date_trunc('day', now()) - (p_days - 1) * interval '1 day',
      date_trunc('day', now()),
      interval '1 day'
    ) gs
    LEFT JOIN public.advertiser_transactions t
      ON date_trunc('day', t.created_at) = date_trunc('day', gs)
    GROUP BY date_trunc('day', gs)
  ) d;
$$;
