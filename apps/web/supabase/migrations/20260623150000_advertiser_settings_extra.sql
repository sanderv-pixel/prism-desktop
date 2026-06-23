-- Additional advertiser settings surfaced on /advertiser/settings.
--   support_email          : public contact address (optional)
--   notify_weekly_summary  : weekly performance email
--   notify_receipts        : email a receipt on each successful top-up
alter table public.advertisers
  add column if not exists support_email text,
  add column if not exists notify_weekly_summary boolean not null default true,
  add column if not exists notify_receipts boolean not null default true;
