-- Trivial change to force PostgREST schema cache refresh.
COMMENT ON TABLE public.advertisers IS 'Prism advertisers';
COMMENT ON TABLE public.campaigns IS 'Prism ad campaigns';
COMMENT ON TABLE public.impressions IS 'Prism ad impressions';
COMMENT ON TABLE public.payouts IS 'Prism creator payouts';
