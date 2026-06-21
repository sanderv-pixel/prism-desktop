-- Pay-as-you-go wallet: a campaign budget is a per-campaign spend cap, and the
-- advertiser wallet is drawn down only as impressions deliver (not reserved upfront
-- on creation). The wallet gets millicent precision since per-impression cost is
-- sub-cent. Top-ups and spend both maintain balance_millicents; delivery pauses when
-- the wallet empties (enforced here and by the ads eligibility filter).
alter table public.advertisers
  add column if not exists balance_millicents bigint not null default 0;
update public.advertisers set balance_millicents = balance_cents::bigint * 1000;

create or replace function public.credit_advertiser_balance(
  p_advertiser_id uuid, p_amount_cents integer, p_description text,
  p_stripe_payment_intent_id text default null
) returns integer language plpgsql security definer as $function$
declare v_new_balance integer;
begin
  update public.advertisers
    set balance_cents = balance_cents + p_amount_cents,
        balance_millicents = balance_millicents + p_amount_cents::bigint * 1000,
        lifetime_deposits_cents = lifetime_deposits_cents + p_amount_cents,
        updated_at = now()
  where id = p_advertiser_id
  returning balance_cents into v_new_balance;
  if v_new_balance is null then raise exception 'Advertiser not found: %', p_advertiser_id; end if;
  insert into public.advertiser_transactions (advertiser_id, type, amount_cents, balance_after_cents, description, stripe_payment_intent_id)
  values (p_advertiser_id, 'deposit', p_amount_cents, v_new_balance, p_description, p_stripe_payment_intent_id);
  return v_new_balance;
end; $function$;

create or replace function public.credit_advertiser_balance(
  p_advertiser_id uuid, p_amount_cents integer, p_description text,
  p_stripe_payment_intent_id text default null, p_is_test boolean default false
) returns integer language plpgsql security definer as $function$
declare v_new_balance integer;
begin
  update public.advertisers
    set balance_cents = balance_cents + p_amount_cents,
        balance_millicents = balance_millicents + p_amount_cents::bigint * 1000,
        lifetime_deposits_cents = lifetime_deposits_cents + p_amount_cents,
        updated_at = now()
  where id = p_advertiser_id
  returning balance_cents into v_new_balance;
  if v_new_balance is null then raise exception 'Advertiser not found: %', p_advertiser_id; end if;
  insert into public.advertiser_transactions (advertiser_id, type, amount_cents, balance_after_cents, description, stripe_payment_intent_id, is_test)
  values (p_advertiser_id, 'deposit', p_amount_cents, v_new_balance, p_description, p_stripe_payment_intent_id, p_is_test);
  return v_new_balance;
end; $function$;

-- Spend draws from the wallet first (pausing if empty), then charges the campaign
-- budget cap and counts the billable impression. Refunds the wallet if the cap is hit.
create or replace function public.increment_campaign_spent_mc(p_campaign_id uuid, p_amount_mc bigint)
returns integer language plpgsql as $function$
declare new_cents integer; v_adv uuid;
begin
  select advertiser_id into v_adv from public.campaigns where id = p_campaign_id;
  if v_adv is null then return null; end if;

  update public.advertisers
    set balance_millicents = balance_millicents - p_amount_mc,
        balance_cents = ((balance_millicents - p_amount_mc) / 1000)::int,
        updated_at = now()
  where id = v_adv and balance_millicents >= p_amount_mc;
  if not found then return null; end if;

  update public.campaigns
    set spent_millicents = spent_millicents + p_amount_mc,
        spent_cents = ((spent_millicents + p_amount_mc) / 1000)::int,
        impression_count = coalesce(impression_count, 0) + 1
  where id = p_campaign_id
    and spent_millicents + p_amount_mc <= budget_cents::bigint * 1000
  returning spent_cents into new_cents;

  if new_cents is null then
    update public.advertisers
      set balance_millicents = balance_millicents + p_amount_mc,
          balance_cents = ((balance_millicents + p_amount_mc) / 1000)::int
    where id = v_adv;
    return null;
  end if;

  return new_cents;
end; $function$;

-- One-time: migrate existing reserve-upfront campaigns to pay-as-you-go by crediting
-- back each reserved campaign's unspent budget so the wallet reflects deposits minus
-- actual spend.
with reserved as (
  select t.advertiser_id, t.campaign_id,
         sum(-t.amount_cents) as reserved_cents,
         max(c.spent_cents) as spent_cents
  from public.advertiser_transactions t
  join public.campaigns c on c.id = t.campaign_id
  where t.type = 'campaign_allocation'
  group by t.advertiser_id, t.campaign_id
),
refund as (
  select advertiser_id, sum(greatest(reserved_cents - spent_cents, 0)) as cents
  from reserved group by advertiser_id
)
update public.advertisers a
set balance_cents = a.balance_cents + r.cents,
    balance_millicents = a.balance_millicents + r.cents::bigint * 1000
from refund r
where a.id = r.advertiser_id;
