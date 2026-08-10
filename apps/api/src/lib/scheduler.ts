import cron from "node-cron";
import { env } from "./env.js";
import { runAggregation } from "./aggregation.js";
import { runPayoutProcessing } from "./payout-processing.js";

/**
 * Runs aggregation, then payout processing, in that order (payouts need
 * batches to already be verified). Logged with a shared run id so a
 * single scheduled run's output is easy to follow in the logs.
 */
async function runScheduledJob() {
  const runId = new Date().toISOString();
  console.log(`[scheduler:${runId}] Starting scheduled run.`);

  try {
    const aggregationResult = await runAggregation();
    console.log(`[scheduler:${runId}] Aggregation:`, aggregationResult);

    const payoutResult = await runPayoutProcessing();
    console.log(`[scheduler:${runId}] Payouts:`, payoutResult);
  } catch (err) {
    // A failed scheduled run should never crash the server — log and
    // wait for the next scheduled attempt.
    console.error(`[scheduler:${runId}] Run failed:`, err);
  }

  console.log(`[scheduler:${runId}] Done.`);
}

export function startScheduler() {
  if (!env.SCHEDULER_ENABLED) {
    console.log("[scheduler] Disabled (SCHEDULER_ENABLED=false) — trigger aggregation/payouts manually via the /admin routes.");
    return;
  }

  if (!cron.validate(env.SCHEDULER_CRON)) {
    console.error(
      `[scheduler] Invalid SCHEDULER_CRON value "${env.SCHEDULER_CRON}" — scheduler NOT started. Fix the cron expression and restart.`
    );
    return;
  }

  cron.schedule(env.SCHEDULER_CRON, runScheduledJob, { timezone: "UTC" });
  console.log(`[scheduler] Enabled — running on schedule "${env.SCHEDULER_CRON}" (UTC).`);
}
