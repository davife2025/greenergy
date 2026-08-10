import type { FastifyInstance, FastifyRequest } from "fastify";
import { supabase } from "../lib/supabase.js";
import { verifyPaystackSignature } from "../lib/payment-collection.js";

interface RawBodyRequest extends FastifyRequest {
  rawBody?: Buffer;
}

export async function webhooksRoutes(app: FastifyInstance) {
  // Deliberately NOT behind requireAuth or requireAdminSecret — Paystack
  // calls this directly. Trust is established entirely by the signature
  // check below, not by any header we control.
  app.post("/webhooks/paystack", async (request: RawBodyRequest, reply) => {
    const signature = request.headers["x-paystack-signature"] as string | undefined;
    const rawBody = request.rawBody;

    if (!rawBody || !verifyPaystackSignature(rawBody, signature)) {
      // Do not process, do not leak details about why.
      return reply.status(401).send({ status: "error", message: "Invalid signature." });
    }

    const event = request.body as { event: string; data: { reference: string; amount: number; status: string } };

    if (event.event !== "charge.success") {
      // Acknowledge and ignore — Paystack sends other event types we
      // don't act on yet (refunds, disputes, etc).
      return reply.status(200).send({ status: "ignored" });
    }

    const { reference, amount: amountKobo } = event.data;

    const { data: energyRequest, error } = await supabase
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
      app.log.error(
        `Amount mismatch for ${reference}: expected ${expectedKobo} kobo, got ${amountKobo} kobo.`
      );
      return reply.status(200).send({ status: "amount_mismatch_flagged" });
    }

    if (energyRequest.status === "pending_payment") {
      await supabase
        .from("energy_requests")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", energyRequest.id);
    }

    return reply.status(200).send({ status: "ok" });
  });
}
