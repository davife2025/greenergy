import type { FastifyInstance } from "fastify";
import { supabase } from "../lib/supabase.js";
import { requireAdminSecret } from "../lib/admin-auth.js";
import { runAggregation } from "../lib/aggregation.js";

export async function carbonBatchesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdminSecret);

  // Manual trigger for the same logic the scheduler (Session 12) runs
  // automatically — see lib/aggregation.ts for the actual implementation.
  app.post("/admin/carbon-batches/aggregate", async (_request, reply) => {
    const result = await runAggregation();

    if (!result.ok) {
      return reply.status(500).send({ status: "error", message: result.message });
    }

    return reply.status(result.created ? 201 : 200).send({ status: "ok", ...result });
  });

  app.get("/admin/carbon-batches", async (_request, reply) => {
    const { data, error } = await supabase
      .from("carbon_batches")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return reply.status(500).send({ status: "error", message: error.message });
    }

    return { data };
  });
}
