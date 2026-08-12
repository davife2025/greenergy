"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPayoutProcessing = runPayoutProcessing;
const supabase_js_1 = require("./supabase.js");
const pricing_js_1 = require("./pricing.js");
const payout_provider_js_1 = require("./payout-provider.js");
/**
 * Finds every "verified" carbon batch, splits its revenue across the
 * users whose telemetry contributed to it (proportional to kWh), and
 * attempts a real payout for anyone with a payout method on file.
 *
 * Called by both the `/admin/payouts/process` route (manual trigger) and
 * the scheduler (Session 12) — single source of truth for the logic.
 */
async function runPayoutProcessing() {
    const { data: batches, error: batchesError } = await supabase_js_1.supabase
        .from("carbon_batches")
        .select("id, status, total_kwh, estimated_tons_co2e")
        .eq("status", "verified");
    if (batchesError) {
        return { ok: false, message: batchesError.message, batches: [] };
    }
    if (!batches || batches.length === 0) {
        return { ok: true, message: "No verified batches ready for payout.", batches: [] };
    }
    const results = [];
    for (const batch of batches) {
        results.push(await processBatch(batch));
    }
    return { ok: true, batches: results };
}
async function processBatch(batch) {
    const { data: joinRows, error: joinError } = await supabase_js_1.supabase
        .from("carbon_batch_readings")
        .select("telemetry_reading_id")
        .eq("carbon_batch_id", batch.id);
    if (joinError || !joinRows) {
        return { batchId: batch.id, error: joinError?.message ?? "Could not load batch readings." };
    }
    const readingIds = joinRows.map((r) => r.telemetry_reading_id);
    const { data: readings, error: readingsError } = await supabase_js_1.supabase
        .from("telemetry_readings")
        .select("id, kwh, energy_provider_link_id")
        .in("id", readingIds);
    if (readingsError || !readings) {
        return { batchId: batch.id, error: readingsError?.message ?? "Could not load telemetry readings." };
    }
    const linkIds = Array.from(new Set(readings.map((r) => r.energy_provider_link_id)));
    const { data: links, error: linksError } = await supabase_js_1.supabase
        .from("energy_provider_links")
        .select("id, user_id")
        .in("id", linkIds);
    if (linksError || !links) {
        return { batchId: batch.id, error: linksError?.message ?? "Could not load energy provider links." };
    }
    const linkToUser = new Map(links.map((l) => [l.id, l.user_id]));
    const kwhByUser = new Map();
    for (const reading of readings) {
        const userId = linkToUser.get(reading.energy_provider_link_id);
        if (!userId)
            continue;
        kwhByUser.set(userId, (kwhByUser.get(userId) ?? 0) + Number(reading.kwh));
    }
    const batchTotalKwh = Array.from(kwhByUser.values()).reduce((sum, v) => sum + v, 0);
    const payoutPoolNgn = (0, pricing_js_1.batchValueNgn)(batch.estimated_tons_co2e) * pricing_js_1.PAYOUT_USER_SHARE;
    const payoutResults = [];
    for (const [userId, userKwh] of kwhByUser.entries()) {
        const share = batchTotalKwh > 0 ? userKwh / batchTotalKwh : 0;
        const amountNgn = Number((payoutPoolNgn * share).toFixed(2));
        if (amountNgn <= 0)
            continue;
        payoutResults.push(await payUser(userId, batch.id, amountNgn));
    }
    const { error: updateError } = await supabase_js_1.supabase
        .from("carbon_batches")
        .update({ status: "sold" })
        .eq("id", batch.id);
    return {
        batchId: batch.id,
        totalKwh: batchTotalKwh,
        payoutPoolNgn: Number(payoutPoolNgn.toFixed(2)),
        payouts: payoutResults,
        batchStatusUpdateError: updateError?.message,
    };
}
async function payUser(userId, carbonBatchId, amountNgn) {
    const { data: user, error: userError } = await supabase_js_1.supabase
        .from("users")
        .select("id, phone_number, mobile_money_provider, mobile_money_identifier")
        .eq("id", userId)
        .single();
    if (userError || !user) {
        return { userId, status: "error", message: userError?.message ?? "User not found." };
    }
    const { data: payout, error: payoutError } = await supabase_js_1.supabase
        .from("payouts")
        .insert({
        user_id: userId,
        carbon_batch_id: carbonBatchId,
        amount: amountNgn,
        currency: "NGN",
        status: "pending",
    })
        .select()
        .single();
    if (payoutError || !payout) {
        return { userId, status: "error", message: payoutError?.message ?? "Could not create payout record." };
    }
    if (!user.mobile_money_provider || !user.mobile_money_identifier) {
        return {
            userId,
            status: "pending",
            message: "No payout method on file yet — payout recorded but not sent.",
            payoutId: payout.id,
        };
    }
    if (!(0, payout_provider_js_1.isSupportedPayoutProvider)(user.mobile_money_provider)) {
        return {
            userId,
            status: "pending",
            message: `${user.mobile_money_provider} isn't supported for real transfers yet.`,
            payoutId: payout.id,
        };
    }
    try {
        const recipient = await (0, payout_provider_js_1.createTransferRecipient)({
            name: user.phone_number ?? "Greenenergy user",
            provider: user.mobile_money_provider,
            accountNumber: user.mobile_money_identifier,
        });
        const transfer = await (0, payout_provider_js_1.initiateTransfer)({
            recipientCode: recipient.recipientCode,
            amountNgn,
            reason: "Greenenergy carbon revenue payout",
            reference: `payout_${payout.id}`,
        });
        await supabase_js_1.supabase
            .from("payouts")
            .update({
            status: transfer.status === "success" ? "paid" : "pending",
            mobile_money_reference: transfer.paystackReference,
        })
            .eq("id", payout.id);
        return { userId, status: "sent", payoutId: payout.id, paystackStatus: transfer.status };
    }
    catch (err) {
        await supabase_js_1.supabase.from("payouts").update({ status: "failed" }).eq("id", payout.id);
        return {
            userId,
            status: "failed",
            payoutId: payout.id,
            message: err instanceof Error ? err.message : "Unknown error calling Paystack.",
        };
    }
}
