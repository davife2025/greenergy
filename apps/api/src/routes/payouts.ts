import type { FastifyInstance } from "fastify";
import { requireAdminSecret } from "../lib/admin-auth.js";
import { runPayoutProcessing } from "../lib/payout-processing.js";

export async function payoutsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdminSecret);

  // Manual trigger for the same logic the scheduler (Session 12) runs
  // automatically — see lib/payout-processing.ts for the implementation.
  app.post("/admin/payouts/process", async (_request, reply) => {
    const result = await runPayoutProcessing();

    if (!result.ok) {
      return reply.status(500).send({ status: "error", message: result.message });
    }

    return reply.status(200).send({ status: "ok", ...result });
  });
}
