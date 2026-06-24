// Centralized payout / earnings-split constants. Previously duplicated inline in
// the dashboard route, the payouts route, and CreatorInsights; keep one source.

/** Minimum balance (cents) to request a payout / the auto-payout threshold. $20.00. */
export const MIN_PAYOUT_CENTS = 2000

/**
 * Creator revenue share: the creator keeps 50% of the auction clearing price per
 * impression. Mirrors the split applied in /api/impressions
 * (payoutMillicents = round(auctionPriceCpm / 2)). Exposed to the overlay panel as
 * a "You keep 50%" chip.
 */
export const CREATOR_SHARE = 0.5

/** The split as a whole-number percent for display ("You keep 50%"). */
export const CREATOR_SHARE_PERCENT = Math.round(CREATOR_SHARE * 100)
