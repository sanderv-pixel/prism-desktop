-- Auto-recharge: when the wallet drops below a threshold, automatically charge the
-- saved card for a top-up so pay-as-you-go campaigns don't pause.
alter table public.advertisers
  add column if not exists auto_recharge_enabled boolean not null default false,
  add column if not exists auto_recharge_threshold_cents integer not null default 2000,
  add column if not exists auto_recharge_amount_cents integer not null default 5000,
  add column if not exists default_payment_method_id text,
  add column if not exists last_auto_recharge_at timestamptz;
