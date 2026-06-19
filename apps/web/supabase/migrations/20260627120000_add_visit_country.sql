-- Add country geolocation to page visits for the admin dashboard.
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS country TEXT;

CREATE INDEX IF NOT EXISTS idx_visits_country
  ON public.visits(country);
