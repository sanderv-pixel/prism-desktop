-- CPC bidding. Campaigns can bid cost-per-click (max_bid_cpc, cents per click)
-- alongside CPM. The auction ranks both on a common effective-CPM axis, but CPC
-- campaigns are charged on the click, not the impression. bid_type on impressions
-- marks how an impression settles so creator earnings and advertiser spend stay
-- correct (CPC impressions earn nothing until the click is recorded).
alter table public.campaigns add column if not exists max_bid_cpc integer;
alter table public.impressions add column if not exists bid_type text not null default 'cpm';
