-- Add campaign review queue columns.
alter table public.campaigns
  add column if not exists reviewed_at TIMESTAMPTZ,
  add column if not exists reviewed_by UUID;

-- Drop and recreate the status check constraint to include pending_review.
alter table public.campaigns drop constraint if exists campaigns_status_check;
alter table public.campaigns add constraint campaigns_status_check
  check (status in ('active', 'paused', 'pending', 'pending_review', 'rejected'));
