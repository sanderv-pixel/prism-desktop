-- Per-advertiser email notification preferences (enforced in the email helpers).
alter table public.advertisers
  add column if not exists notify_budget boolean not null default true,
  add column if not exists notify_low_balance boolean not null default true,
  add column if not exists notify_campaign_status boolean not null default true;
