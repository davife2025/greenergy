import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { requireAuth } from "../lib/auth.js";
import { initializeTransaction } from "../lib/payment-collection.js";
import { MARKETPLACE_COMMISSION_RATE } from "../lib/pricing.js";
import {
  createTransferRecipient,
  initiateTransfer,
  isSupportedPayoutProvider,
} from "../lib/payout-provider.js";

const createRequestSchema = z.object({
  solarProfileId: z.string().uuid(),
});

export async function energyRequestsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.post("/energy-requests", async (request, reply) => {
    const parsed = createRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        status: "error",
        message: "Invalid request body",
        detail: parsed.error.flatten(),
      });
    }

    const { solarProfileId } = parsed.data;

    const { data: profile, error: profileError } = await supabase
      .from("solar_profiles")
      .select("id, user_id, is_listed, excess_kwh, price_per_session_ngn")
      .eq("id", solarProfileId)
      .single();

    if (profileError || !profile) {
      return reply.status(404).send({ status: "error", message: "Listing not found." });
    }

    if (!profile.is_listed || Number(profile.excess_kwh) <= 0) {
      return reply.status(400).send({ status: "error", message: "This listing isn't available." });
    }

    if (profile.user_id === request.userId) {
      return reply.status(400).send({ status: "error", message: "You can't book your own listing." });
    }

    const amountNgn = Number(profile.price_per_session_ngn);
    const platformCommissionNgn = Number((amountNgn * MARKETPLACE_COMMISSION_RATE).toFixed(2));
    const hostPayoutNgn = Number((amountNgn - platformCommissionNgn).toFixed(2));

    const { data: energyRequest, error: insertError } = await supabase
      .from("energy_requests")
      .insert({
        seeker_id: request.userId,
        host_id: profile.user_id,
        solar_profile_id: profile.id,
        amount_ngn: amountNgn,
        platform_commission_ngn: platformCommissionNgn,
        host_payout_ngn: hostPayoutNgn,
        status: "pending_payment",
      })
      .select()
      .single();

    if (insertError || !energyRequest) {
      return reply.status(500).send({ status: "error", message: insertError?.message ?? "Could not create request." });
    }

    const { data: seeker } = await supabase
      .from("users")
      .select("email, phone_number")
      .eq("id", request.userId)
      .single();

    // Paystack requires an email. Most users here only signed up with a
    // phone number (OTP-only auth) — this placeholder is a real
    // compromise, not a solved problem. No receipt email actually
    // arrives for users without a real one on file.
    const email = seeker?.email ?? `${(seeker?.phone_number ?? energyRequest.id).replace(/\D/g, "")}@users.greenenergy.ng`;

    try {
      const paymentReference = `energyreq_${energyRequest.id}`;

      const { authorizationUrl, reference } = await initializeTransaction({
        email,
        amountNgn,
        reference: paymentReference,
        metadata: { energyRequestId: energyRequest.id },
      });

      await supabase
        .from("energy_requests")
        .update({ paystack_reference: reference })
        .eq("id", energyRequest.id);

      return reply.status(201).send({
        status: "ok",
        requestId: energyRequest.id,
        authorizationUrl,
        reference,
      });
    } catch (err) {
      // Don't leave a phantom pending_payment row if we couldn't even
      // start the checkout.
      await supabase.from("energy_requests").delete().eq("id", energyRequest.id);

      return reply.status(502).send({
        status: "error",
        message: err instanceof Error ? err.message : "Could not start payment.",
      });
    }
  });

  app.get("/energy-requests", async (request, reply) => {
    const { data, error } = await supabase
      .from("energy_requests")
      .select("*, solar_profiles(location_text)")
      .or(`seeker_id.eq.${request.userId},host_id.eq.${request.userId}`)
      .order("created_at", { ascending: false });

    if (error) {
      return reply.status(500).send({ status: "error", message: error.message });
    }

    return { data };
  });

  // The seeker confirms they actually received the charge/energy access.
  // This is the trust gate — the host is only paid out AFTER this, not
  // the moment payment clears, so a host who never shows up can't walk
  // away with money for a session that didn't happen.
  app.post("/energy-requests/:id/confirm", async (request, reply) => {
    const { id } = request.params as { id: string };

    const { data: energyRequest, error: fetchError } = await supabase
      .from("energy_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !energyRequest) {
      return reply.status(404).send({ status: "error", message: "Request not found." });
    }

    if (energyRequest.seeker_id !== request.userId) {
      return reply.status(403).send({ status: "error", message: "Only the seeker can confirm this." });
    }

    if (energyRequest.status !== "paid") {
      return reply.status(400).send({
        status: "error",
        message: `Can't confirm a request in status "${energyRequest.status}".`,
      });
    }

    await supabase
      .from("energy_requests")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("id", id);

    // Attempt the host payout immediately. If it fails or the host has
    // no payout method yet, the request stays "confirmed" — same
    // partial-failure pattern as the carbon-credit payout flow
    // (Session 5), reconciled manually for now.
    const { data: host } = await supabase
      .from("users")
      .select("phone_number, mobile_money_provider, mobile_money_identifier")
      .eq("id", energyRequest.host_id)
      .single();

    if (!host?.mobile_money_provider || !host?.mobile_money_identifier) {
      return {
        status: "ok",
        message: "Confirmed. Host has no payout method on file yet — payout pending.",
      };
    }

    if (!isSupportedPayoutProvider(host.mobile_money_provider)) {
      return { status: "ok", message: "Confirmed. Host's payout provider isn't supported yet." };
    }

    try {
      const recipient = await createTransferRecipient({
        name: host.phone_number ?? "Greenenergy host",
        provider: host.mobile_money_provider,
        accountNumber: host.mobile_money_identifier,
      });

      await initiateTransfer({
        recipientCode: recipient.recipientCode,
        amountNgn: Number(energyRequest.host_payout_ngn),
        reason: "Greenenergy excess energy payout",
        reference: `energyreq_payout_${energyRequest.id}`,
      });

      await supabase.from("energy_requests").update({ status: "paid_out" }).eq("id", id);

      return { status: "ok", message: "Confirmed and host paid out." };
    } catch (err) {
      return {
        status: "ok",
        message: "Confirmed, but host payout failed — needs manual reconciliation.",
        payoutError: err instanceof Error ? err.message : "Unknown error.",
      };
    }
  });
}
