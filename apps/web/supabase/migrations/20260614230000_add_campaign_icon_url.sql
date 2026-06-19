-- Add icon_url to campaigns for advertiser logos in ad surfaces.

ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS icon_url TEXT;
