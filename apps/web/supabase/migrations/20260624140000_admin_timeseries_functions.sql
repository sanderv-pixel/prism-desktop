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
    GROUP BY date_trunc('day', gs)
  ) d;
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
      COALESCE(sum(CASE WHEN t.type = 'deposit' THEN t.amount_cents ELSE 0 END), 0) AS deposits,
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
