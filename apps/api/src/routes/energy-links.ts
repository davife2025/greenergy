import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { requireAuth } from "../lib/auth.js";

const linkBodySchema = z.object({
  provider: z.enum(["m_kopa", "sun_king", "bboxx", "manual"]),
  externalAccountId: z.string().min(1),
});

export async function energyLinksRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/energy-links", async (request, reply) => {
    const { data, error } = await supabase
      .from("energy_provider_links")
      .select("*")
      .eq("user_id", request.userId);

    if (error) {
      return reply.status(500).send({ status: "error", message: error.message });
    }
    return { data };
  });

  app.post("/energy-links", async (request, reply) => {
    const parsed = linkBodySchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        status: "error",
        message: "Invalid request body",
        detail: parsed.error.flatten(),
      });
    }

    const { provider, externalAccountId } = parsed.data;

    const { data, error } = await supabase
      .from("energy_provider_links")
      .insert({
        user_id: request.userId,
        provider,
        external_account_id: externalAccountId,
      })
      .select()
      .single();

    if (error) {
      return reply.status(500).send({ status: "error", message: error.message });
    }

    return reply.status(201).send({ data });
  });
}
