"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAggregation = runAggregation;
const supabase_js_1 = require("./supabase.js");
const carbon_js_1 = require("./carbon.js");
const anomaly_detection_js_1 = require("./anomaly-detection.js");
const ai_review_js_1 = require("./ai-review.js");
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
async function runAggregation() {
    const { data: alreadyBatched, error: batchedError } = await supabase_js_1.supabase
        .from("carbon_batch_readings")
        .select("telemetry_reading_id");
    if (batchedError) {
        return { ok: false, created: false, message: batchedError.message };
    }
    const batchedIds = new Set((alreadyBatched ?? []).map((r) => r.telemetry_reading_id));
    const { data: readings, error: readingsError } = await supabase_js_1.supabase
        .from("telemetry_readings")
        .select("id, kwh, energy_provider_link_id")
        .eq("flagged", false);
    if (readingsError) {
        return { ok: false, created: false, message: readingsError.message };
    }
    const unbatched = (readings ?? []).filter((r) => !batchedIds.has(r.id));
    if (unbatched.length === 0) {
        return { ok: true, created: false, message: "No unbatched readings to aggregate." };
    }
    const linkIds = new Set(unbatched.map((r) => r.energy_provider_link_id));
    const anomalyFlaggedIds = new Set();
    for (const linkId of linkIds) {
        const { data: linkReadings, error: linkReadingsError } = await supabase_js_1.supabase
            .from("telemetry_readings")
            .select("id, kwh")
            .eq("energy_provider_link_id", linkId);
        if (linkReadingsError || !linkReadings)
            continue;
        const result = (0, anomaly_detection_js_1.detectStatisticalAnomalies)(linkReadings.map((r) => ({ id: r.id, kwh: Number(r.kwh) })));
        for (const id of result.flaggedIds)
            anomalyFlaggedIds.add(id);
    }
    const included = unbatched.filter((r) => (0, carbon_js_1.isPlausibleReading)(Number(r.kwh)) && !anomalyFlaggedIds.has(r.id));
    const excludedImplausible = unbatched.filter((r) => !(0, carbon_js_1.isPlausibleReading)(Number(r.kwh)));
    const excludedAnomalous = unbatched.filter((r) => (0, carbon_js_1.isPlausibleReading)(Number(r.kwh)) && anomalyFlaggedIds.has(r.id));
    const excluded = [...excludedImplausible, ...excludedAnomalous];
    if (excludedImplausible.length > 0) {
        await supabase_js_1.supabase
            .from("telemetry_readings")
            .update({ flagged: true, flag_reason: "implausible_value", review_status: "pending" })
            .in("id", excludedImplausible.map((r) => r.id));
    }
    if (excludedAnomalous.length > 0) {
        await supabase_js_1.supabase
            .from("telemetry_readings")
            .update({ flagged: true, flag_reason: "statistical_anomaly", review_status: "pending" })
            .in("id", excludedAnomalous.map((r) => r.id));
    }
    const totalKwh = included.reduce((sum, r) => sum + Number(r.kwh), 0);
    const estimatedTonsCo2e = (0, carbon_js_1.estimateTonsCo2e)(totalKwh);
    const deterministicallyClean = excluded.length === 0;
    const aiReview = await (0, ai_review_js_1.reviewBatch)({
        readingCount: unbatched.length,
        flaggedCount: excluded.length,
        totalKwh: Number(totalKwh.toFixed(4)),
    });
    const finalStatus = deterministicallyClean && aiReview?.verdict !== "flag" ? "verified" : "pending";
    const { data: batch, error: batchError } = await supabase_js_1.supabase
        .from("carbon_batches")
        .insert({
        status: finalStatus,
        total_kwh: Number(totalKwh.toFixed(4)),
        estimated_tons_co2e: estimatedTonsCo2e,
        verified_at: finalStatus === "verified" ? new Date().toISOString() : null,
        review_notes: aiReview?.summary ?? null,
    })
        .select()
        .single();
    if (batchError || !batch) {
        return { ok: false, created: false, message: batchError?.message ?? "Could not create batch." };
    }
    const joinRows = included.map((r) => ({
        carbon_batch_id: batch.id,
        telemetry_reading_id: r.id,
    }));
    const { error: joinError } = await supabase_js_1.supabase.from("carbon_batch_readings").insert(joinRows);
    if (joinError) {
        return { ok: false, created: true, batchId: batch.id, message: joinError.message };
    }
    return {
        ok: true,
        created: true,
        batchId: batch.id,
        batchStatus: batch.status,
        readingsIncluded: included.length,
        readingsExcluded: excluded.length,
        excludedReadingIds: excluded.map((r) => r.id),
        aiReviewRan: aiReview !== null,
    };
}
