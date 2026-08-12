export interface BatchReviewInput {
    readingCount: number;
    flaggedCount: number;
    totalKwh: number;
}
export interface BatchReviewResult {
    verdict: "approve" | "flag";
    summary: string;
}
/**
 * Asks Kimi K2 (via Hugging Face Inference Providers) to write a short
 * MRV-style review note for a pooled carbon batch, given only aggregate
 * statistics — no per-user data, no PII.
 *
 * This is a narrative/explanatory layer on top of the deterministic
 * checks in `anomaly-detection.ts` and `carbon.ts` — it can only add
 * caution (downgrade a batch to `pending`), never override a
 * deterministic rejection. If no HF_TOKEN is configured, this is
 * skipped entirely and batches rely on the deterministic checks alone.
 *
 * Not yet tested against a live HF token in this environment — same
 * caveat as the untested Paystack integration in earlier sessions.
 */
export declare function reviewBatch(input: BatchReviewInput): Promise<BatchReviewResult | null>;
