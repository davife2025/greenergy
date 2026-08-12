export interface AggregationResult {
    ok: boolean;
    created: boolean;
    message?: string;
    batchId?: string;
    batchStatus?: string;
    readingsIncluded?: number;
    readingsExcluded?: number;
    excludedReadingIds?: string[];
    aiReviewRan?: boolean;
}
/**
 * Pools every telemetry reading that hasn't been included in a batch yet
 * and isn't currently flagged for review, runs it through two layers of
 * verification, and creates a new carbon_batch.
 *
 * Layer 1 (deterministic, always runs): a flat plausibility bound
 * (Session 4) plus per-link statistical anomaly detection (Session 6).
 * Anything that fails either check is marked `flagged` with a reason and
 * left for manual review (Session 9) instead of silently disappearing.
 * Layer 2 (optional, AI-assisted): if HF_TOKEN is configured, Kimi K2
 * (via Hugging Face Inference Providers) reviews the aggregate stats and
 * can downgrade a batch to "pending" — it can add caution, never
 * override a deterministic rejection.
 *
 * Called by both the `/admin/carbon-batches/aggregate` route (manual
 * trigger) and the scheduler (Session 12) — this is the single source of
 * truth for the logic, not duplicated between them.
 */
export declare function runAggregation(): Promise<AggregationResult>;
