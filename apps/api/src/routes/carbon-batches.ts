import type { FastifyInstance } from "fastify";
import { supabase } from "../lib/supabase.js";
import { requireAdminSecret } from "../lib/admin-auth.js";
import { estimateTonsCo2e, isPlausibleReading } from "../lib/carbon.js";

export async function carbonBatchesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdminSecret);

  // Pools every telemetry reading that hasn't been included in a batch yet,
  // runs a rule-based sanity check on each, and creates a new carbon_batch.
  // Meant to run on a schedule (e.g. daily/weekly cron) once real telemetry
  // volume justifies it — called manually for now.
  app.post("/admin/carbon-batches/aggregate", async (_request, reply) => {
    const { data: alreadyBatched, error: batchedError } = await supabase
      .from("carbon_batch_readings")
      .select("telemetry_reading_id");

    if (batchedError) {
      return reply.status(500).send({ status: "error", message: batchedError.message });
    }

    const batchedIds = new Set((alreadyBatched ?? []).map((r) => r.telemetry_reading_id));

    const { data: readings, error: readingsError } = await supabase
      .from("telemetry_readings")
      .select("id, kwh");

    if (readingsError) {
      return reply.status(500).send({ status: "error", message: readingsError.message });
    }

    const unbatched = (readings ?? []).filter((r) => !batchedIds.has(r.id));

    if (unbatched.length === 0) {
      return reply.status(200).send({ status: "ok", message: "No unbatched readings to aggregate." });
    }

    const included = unbatched.filter((r) => isPlausibleReading(Number(r.kwh)));
    const excluded = unbatched.filter((r) => !isPlausibleReading(Number(r.kwh)));

    const totalKwh = included.reduce((sum, r) => sum + Number(r.kwh), 0);
    const estimatedTonsCo2e = estimateTonsCo2e(totalKwh);

    // If every reading in this pool passed the sanity check, there's nothing
    // for a human/AI reviewer to look at — go straight to "verified". Session 6
    // replaces this rule-based pass with real ML-based fraud/anomaly detection.
    const allClean = excluded.length === 0;

    const { data: batch, error: batchError } = await supabase
      .from("carbon_batches")
      .insert({
        status: allClean ? "verified" : "pending",
        total_kwh: Number(totalKwh.toFixed(4)),
        estimated_tons_co2e: estimatedTonsCo2e,
        verified_at: allClean ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (batchError) {
      return reply.status(500).send({ status: "error", message: batchError.message });
    }

    const joinRows = included.map((r) => ({
      carbon_batch_id: batch.id,
      telemetry_reading_id: r.id,
    }));

    const { error: joinError } = await supabase.from("carbon_batch_readings").insert(joinRows);

    if (joinError) {
      return reply.status(500).send({ status: "error", message: joinError.message });
    }

    return reply.status(201).send({
      status: "ok",
      batch,
      readingsIncluded: included.length,
      readingsExcluded: excluded.length,
      excludedReadingIds: excluded.map((r) => r.id),
    });
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
