import type { FastifyInstance } from "fastify";
import { supabase } from "../lib/supabase.js";
import { requireAdminSecret } from "../lib/admin-auth.js";
import { estimateTonsCo2e, isPlausibleReading } from "../lib/carbon.js";
import { detectStatisticalAnomalies } from "../lib/anomaly-detection.js";
import { reviewBatch } from "../lib/ai-review.js";

export async function carbonBatchesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdminSecret);

  // Pools every telemetry reading that hasn't been included in a batch yet,
  // runs it through two layers of verification, and creates a new
  // carbon_batch. Meant to run on a schedule once real telemetry volume
  // justifies it — called manually for now.
  //
  // Layer 1 (deterministic, always runs): a flat plausibility bound
  // (Session 4) plus per-link statistical anomaly detection (Session 6) —
  // flags readings that deviate from that specific meter's own history.
  // Layer 2 (optional, AI-assisted): if ANTHROPIC_API_KEY is configured,
  // Claude reviews the aggregate stats and can downgrade a batch to
  // "pending" for human review — it can add caution, never override a
  // deterministic rejection.
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
      .select("id, kwh, energy_provider_link_id");

    if (readingsError) {
      return reply.status(500).send({ status: "error", message: readingsError.message });
    }

    const unbatched = (readings ?? []).filter((r) => !batchedIds.has(r.id));

    if (unbatched.length === 0) {
      return reply.status(200).send({ status: "ok", message: "No unbatched readings to aggregate." });
    }

    // Per-link statistical anomaly check, run against each link's full
    // reading history (not just the unbatched subset) for a meaningful
    // baseline.
    const linkIds = new Set(unbatched.map((r) => r.energy_provider_link_id));
    const anomalyFlaggedIds = new Set<string>();

    for (const linkId of linkIds) {
      const { data: linkReadings, error: linkReadingsError } = await supabase
        .from("telemetry_readings")
        .select("id, kwh")
        .eq("energy_provider_link_id", linkId);

      if (linkReadingsError || !linkReadings) continue;

      const result = detectStatisticalAnomalies(
        linkReadings.map((r) => ({ id: r.id, kwh: Number(r.kwh) }))
      );
      for (const id of result.flaggedIds) anomalyFlaggedIds.add(id);
    }

    const included = unbatched.filter(
      (r) => isPlausibleReading(Number(r.kwh)) && !anomalyFlaggedIds.has(r.id)
    );
    const excluded = unbatched.filter(
      (r) => !isPlausibleReading(Number(r.kwh)) || anomalyFlaggedIds.has(r.id)
    );

    const totalKwh = included.reduce((sum, r) => sum + Number(r.kwh), 0);
    const estimatedTonsCo2e = estimateTonsCo2e(totalKwh);
    const deterministicallyClean = excluded.length === 0;

    const aiReview = await reviewBatch({
      readingCount: unbatched.length,
      flaggedCount: excluded.length,
      totalKwh: Number(totalKwh.toFixed(4)),
    });

    const finalStatus =
      deterministicallyClean && aiReview?.verdict !== "flag" ? "verified" : "pending";

    const { data: batch, error: batchError } = await supabase
      .from("carbon_batches")
      .insert({
        status: finalStatus,
        total_kwh: Number(totalKwh.toFixed(4)),
        estimated_tons_co2e: estimatedTonsCo2e,
        verified_at: finalStatus === "verified" ? new Date().toISOString() : null,
        review_notes: aiReview?.summary ?? null,
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
      aiReviewRan: aiReview !== null,
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
