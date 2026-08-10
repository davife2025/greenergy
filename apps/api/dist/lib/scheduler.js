"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startScheduler = startScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const env_js_1 = require("./env.js");
const aggregation_js_1 = require("./aggregation.js");
const payout_processing_js_1 = require("./payout-processing.js");
/**
 * Runs aggregation, then payout processing, in that order (payouts need
 * batches to already be verified). Logged with a shared run id so a
 * single scheduled run's output is easy to follow in the logs.
 */
async function runScheduledJob() {
    const runId = new Date().toISOString();
    console.log(`[scheduler:${runId}] Starting scheduled run.`);
    try {
        const aggregationResult = await (0, aggregation_js_1.runAggregation)();
        console.log(`[scheduler:${runId}] Aggregation:`, aggregationResult);
        const payoutResult = await (0, payout_processing_js_1.runPayoutProcessing)();
        console.log(`[scheduler:${runId}] Payouts:`, payoutResult);
    }
    catch (err) {
        // A failed scheduled run should never crash the server — log and
        // wait for the next scheduled attempt.
        console.error(`[scheduler:${runId}] Run failed:`, err);
    }
    console.log(`[scheduler:${runId}] Done.`);
}
function startScheduler() {
    if (!env_js_1.env.SCHEDULER_ENABLED) {
        console.log("[scheduler] Disabled (SCHEDULER_ENABLED=false) — trigger aggregation/payouts manually via the /admin routes.");
        return;
    }
    if (!node_cron_1.default.validate(env_js_1.env.SCHEDULER_CRON)) {
        console.error(`[scheduler] Invalid SCHEDULER_CRON value "${env_js_1.env.SCHEDULER_CRON}" — scheduler NOT started. Fix the cron expression and restart.`);
        return;
    }
    node_cron_1.default.schedule(env_js_1.env.SCHEDULER_CRON, runScheduledJob, { timezone: "UTC" });
    console.log(`[scheduler] Enabled — running on schedule "${env_js_1.env.SCHEDULER_CRON}" (UTC).`);
}
