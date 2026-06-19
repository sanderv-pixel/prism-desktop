-- Dashboard/auth/API visits should not count as public website visits.
-- Update admin metrics to exclude internal paths.

CREATE OR REPLACE FUNCTION public.get_admin_visits_timeseries(p_days INTEGER DEFAULT 30)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(json_agg(row_to_json(d) ORDER BY d.date), '[]'::json)
  FROM (
    SELECT
      date_trunc('day', gs)::date AS date,
      count(v.id) AS visits,
      count(DISTINCT v.ip) AS unique_visitors
    FROM generate_series(
      date_trunc('day', now()) - (p_days - 1) * interval '1 day',
      date_trunc('day', now()),
      interval '1 day'
    ) gs
    LEFT JOIN public.visits v
      ON date_trunc('day', v.created_at) = date_trunc('day', gs)
      AND v.path !~ '^/(admin|advertiser|dashboard|auth|api|_next|favicon)'
    GROUP BY date_trunc('day', gs)
  ) d;
$$;

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
      'today', COALESCE((SELECT sum(amount_cents) FROM public.advertiser_transactions WHERE type = 'deposit' AND created_at >= date_trunc('day', now())), 0),
      'month', COALESCE((SELECT sum(amount_cents) FROM public.advertiser_transactions WHERE type = 'deposit' AND created_at >= date_trunc('month', now())), 0),
      'total', COALESCE((SELECT sum(amount_cents) FROM public.advertiser_transactions WHERE type = 'deposit'), 0),
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
