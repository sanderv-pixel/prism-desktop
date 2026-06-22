-- Proof-of-humanity tagging for earning-device keys. A credential is `verified`
-- when minted with a human proof (Turnstile or a signed-in account); anonymous
-- minting stays allowed but is tagged unverified, so the impressions flow can hold
-- payouts for unverified identities once PRISM_DEVICE_POH_ENFORCED is on. Default
-- false is non-breaking: existing rows and today's anon minting read as unverified.
alter table public.device_credentials
  add column if not exists verified boolean not null default false;
