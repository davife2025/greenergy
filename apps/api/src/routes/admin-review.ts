import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { requireAdminSecret } from "../lib/admin-auth.js";

const resolveSchema = z.object({
  decision: z.enum(["approve", "reject"]),
});

export async function adminReviewRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdminSecret);

  // Readings currently sitting in the queue — flagged, and not yet
  // reviewed. Includes the parent link's provider/account so a reviewer
  // has some context without exposing full user records.
  app.get("/admin/flagged-readings", async (_request, reply) => {
    const { data, error } = await supabase
      .from("telemetry_readings")
      .select(
        "id, kwh, reading_start, reading_end, source, flag_reason, ingested_at, energy_provider_links(provider, external_account_id)"
      )
      .eq("flagged", true)
      .eq("review_status", "pending")
      .order("ingested_at", { ascending: true });

    if (error) {
      return reply.status(500).send({ status: "error", message: error.message });
    }

    return { data };
  });

  // A reviewer's decision on a flagged reading:
  // - "approve": unflag it — it becomes eligible for the next aggregation
  //   run, same as any normal reading.
  // - "reject": keep it flagged permanently (review_status moves to
  //   'rejected') — it will never be reconsidered.
  app.patch("/admin/flagged-readings/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = resolveSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        status: "error",
        message: "Invalid request body",
        detail: parsed.error.flatten(),
      });
    }

    const update =
      parsed.data.decision === "approve"
        ? { flagged: false, review_status: "approved" as const }
        : { review_status: "rejected" as const };

    const { data, error } = await supabase
      .from("telemetry_readings")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return reply.status(500).send({ status: "error", message: error.message });
    }

    if (!data) {
      return reply.status(404).send({ status: "error", message: "Reading not found." });
    }

    return { status: "ok", data };
  });
}
