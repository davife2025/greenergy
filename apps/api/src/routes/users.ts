import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { requireAuth } from "../lib/auth.js";
import { isSupportedPayoutProvider } from "../lib/payout-provider.js";

const payoutMethodSchema = z.object({
  mobileMoneyProvider: z.enum(["opay", "palmpay", "moniepoint", "mpesa"]),
  mobileMoneyIdentifier: z.string().min(5),
});

export async function usersRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/me", async (request, reply) => {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, phone_number, mobile_money_provider, mobile_money_identifier, created_at")
      .eq("id", request.userId)
      .single();

    if (error) {
      return reply.status(500).send({ status: "error", message: error.message });
    }

    return { data };
  });

  app.patch("/me/payout-method", async (request, reply) => {
    const parsed = payoutMethodSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        status: "error",
        message: "Invalid request body",
        detail: parsed.error.flatten(),
      });
    }

    const { mobileMoneyProvider, mobileMoneyIdentifier } = parsed.data;

    if (!isSupportedPayoutProvider(mobileMoneyProvider)) {
      return reply.status(400).send({
        status: "error",
        message: `${mobileMoneyProvider} isn't wired up for payouts yet — only opay, palmpay, and moniepoint are supported in this Nigeria pilot.`,
      });
    }

    const { data, error } = await supabase
      .from("users")
      .update({
        mobile_money_provider: mobileMoneyProvider,
        mobile_money_identifier: mobileMoneyIdentifier,
      })
      .eq("id", request.userId)
      .select()
      .single();

    if (error) {
      return reply.status(500).send({ status: "error", message: error.message });
    }

    return { data };
  });
}
