/**
 * Average market price for a carbon credit, ~$33/ton. This is a volatile,
 * real-world market figure — treat as a starting default, not a fact.
 * In production this should come from a live registry/marketplace quote,
 * not a static constant.
 */
export const CARBON_CREDIT_PRICE_USD_PER_TON = 33;

/**
 * USD → NGN reference rate, approx. August 2026 mid-market rate.
 * MUST be replaced with a live FX lookup before this handles real money —
 * this exists so the payout math is wired up correctly end-to-end for now.
 */
export const USD_TO_NGN_RATE = 1360;

/**
 * Share of a carbon batch's revenue paid out to the users whose usage
 * contributed to it; the remainder is platform revenue. This is a business
 * decision, not an engineering one — 70% is a starting default chosen to
 * make the "we pay you back, unlike PAYG competitors" pitch credible. It
 * should be set deliberately, not left as a code default.
 */
export const PAYOUT_USER_SHARE = 0.7;

export function batchValueNgn(estimatedTonsCo2e: number): number {
  const usd = estimatedTonsCo2e * CARBON_CREDIT_PRICE_USD_PER_TON;
  return usd * USD_TO_NGN_RATE;
}
