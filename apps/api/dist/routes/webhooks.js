"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhooksRoutes = webhooksRoutes;
const supabase_js_1 = require("../lib/supabase.js");
const payment_collection_js_1 = require("../lib/payment-collection.js");
async function webhooksRoutes(app) {
    // Deliberately NOT behind requireAuth or requireAdminSecret — Paystack
    // calls this directly. Trust is established entirely by the signature
    // check below, not by any header we control.
    app.post("/webhooks/paystack", async (request, reply) => {
        const signature = request.headers["x-paystack-signature"];
        const rawBody = request.rawBody;
        if (!rawBody || !(0, payment_collection_js_1.verifyPaystackSignature)(rawBody, signature)) {
            // Do not process, do not leak details about why.
            return reply.status(401).send({ status: "error", message: "Invalid signature." });
        }
        const event = request.body;
        if (event.event !== "charge.success") {
            // Acknowledge and ignore — Paystack sends other event types we
            // don't act on yet (refunds, disputes, etc).
            return reply.status(200).send({ status: "ignored" });
        }
        const { reference, amount: amountKobo } = event.data;
        const { data: energyRequest, error } = await supabase_js_1.supabase
            .from("energy_requests")
            .select("id, amount_ngn, status")
            .eq("paystack_reference", reference)
            .single();
        if (error || !energyRequest) {
            // Unknown reference — acknowledge so Paystack doesn't retry
            // forever, but this is worth alerting on in a real deployment.
            app.log.warn(`Webhook for unknown reference: ${reference}`);
            return reply.status(200).send({ status: "unknown_reference" });
        }
        // Re-check the amount against our own record rather than trusting
        // the webhook payload alone — Paystack's own docs recommend this.
        const expectedKobo = Math.round(Number(energyRequest.amount_ngn) * 100);
        if (amountKobo !== expectedKobo) {
            app.log.error(`Amount mismatch for ${reference}: expected ${expectedKobo} kobo, got ${amountKobo} kobo.`);
            return reply.status(200).send({ status: "amount_mismatch_flagged" });
        }
        if (energyRequest.status === "pending_payment") {
            await supabase_js_1.supabase
                .from("energy_requests")
                .update({ status: "paid", paid_at: new Date().toISOString() })
                .eq("id", energyRequest.id);
        }
        return reply.status(200).send({ status: "ok" });
    });
}
