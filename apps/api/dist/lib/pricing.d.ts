/**
 * Average market price for a carbon credit, ~$33/ton. This is a volatile,
 * real-world market figure — treat as a starting default, not a fact.
 * In production this should come from a live registry/marketplace quote,
 * not a static constant.
 */
export declare const CARBON_CREDIT_PRICE_USD_PER_TON = 33;
/**
 * USD → NGN reference rate, approx. August 2026 mid-market rate.
 * MUST be replaced with a live FX lookup before this handles real money —
 * this exists so the payout math is wired up correctly end-to-end for now.
 */
export declare const USD_TO_NGN_RATE = 1360;
/**
 * Share of a carbon batch's revenue paid out to the users whose usage
 * contributed to it; the remainder is platform revenue. This is a business
 * decision, not an engineering one — 70% is a starting default chosen to
 * make the "we pay you back, unlike PAYG competitors" pitch credible. It
 * should be set deliberately, not left as a code default.
 */
export declare const PAYOUT_USER_SHARE = 0.7;
export declare function batchValueNgn(estimatedTonsCo2e: number): number;
/**
 * Platform's commission on excess-energy marketplace transactions
 * (Session 13) — a direct, real transaction, unlike the still-simulated
 * carbon credit revenue above. 20% is a starting default in line with
 * typical two-sided marketplace commissions (Uber, Airbnb land in a
 * similar range) — a real decision to revisit, not a fact.
 */
export declare const MARKETPLACE_COMMISSION_RATE = 0.2;
