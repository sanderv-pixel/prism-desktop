-- Maintain a billable impression counter per campaign so advertiser reporting is
-- not capped by the API's 1000-row fetch limit (high-volume campaigns appeared
-- "stuck at 1000"). impression_count is incremented on each validated impression
-- alongside spend, so it equals the billable count that reconciles with spend, and
-- is backfilled from existing validated impressions.
create or replace function public.increment_campaign_spent_mc(
  p_campaign_id uuid, p_amount_mc bigint
) returns integer language plpgsql as $$
declare new_cents integer;
begin
  update public.campaigns
    set spent_millicents = spent_millicents + p_amount_mc,
        spent_cents = ((spent_millicents + p_amount_mc) / 1000)::int,
        impression_count = coalesce(impression_count, 0) + 1
  where id = p_campaign_id
    and spent_millicents + p_amount_mc <= budget_cents::bigint * 1000
  returning spent_cents into new_cents;
  return new_cents;
end; $$;

update public.campaigns c
  set impression_count = (
    select count(*) from public.impressions i
    where i.campaign_id = c.id and i.validated
  );
