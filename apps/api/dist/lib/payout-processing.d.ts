export interface PayoutProcessingSummary {
    ok: boolean;
    message?: string;
    batches: BatchPayoutResult[];
}
interface BatchPayoutResult {
    batchId: string;
    totalKwh?: number;
    payoutPoolNgn?: number;
    payouts?: unknown[];
    batchStatusUpdateError?: string;
    error?: string;
}
/**
 * Finds every "verified" carbon batch, splits its revenue across the
 * users whose telemetry contributed to it (proportional to kWh), and
 * attempts a real payout for anyone with a payout method on file.
 *
 * Called by both the `/admin/payouts/process` route (manual trigger) and
 * the scheduler (Session 12) — single source of truth for the logic.
 */
export declare function runPayoutProcessing(): Promise<PayoutProcessingSummary>;
export {};
