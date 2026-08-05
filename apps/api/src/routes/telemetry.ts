import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { requireAuth } from "../lib/auth.js";
import { generateSyntheticReadings } from "../lib/telemetry-generator.js";

const reportSchema = z.object({
  energyProviderLinkId: z.string().uuid(),
  kwh: z.number().min(0).max(50),
  readingStart: z.string().datetime(),
  readingEnd: z.string().datetime(),
  // A path within the private `usage-evidence` storage bucket
  // (e.g. "<userId>/1712345-meter-photo.jpg"), not a public URL —
  // signed URLs are generated on demand when displaying evidence.
  evidenceUrl: z.string().min(1).optional(),
});

export async function telemetryRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  // Seeds 30 days of synthetic demo readings for every active link the
  // user has. Useful for trying out the product before real usage data
  // exists — never mixed with real data (source: 'synthetic').
  app.post("/telemetry/seed", async (request, reply) => {
    const { data: links, error: linksError } = await supabase
      .from("energy_provider_links")
      .select("id")
      .eq("user_id", request.userId)
      .eq("status", "active");

    if (linksError) {
      return reply.status(500).send({ status: "error", message: linksError.message });
    }

    if (!links || links.length === 0) {
      return reply.status(400).send({
        status: "error",
        message: "Link an energy account before generating demo data.",
      });
    }

    const rows = links.flatMap((link) =>
      generateSyntheticReadings(30).map((reading) => ({
        energy_provider_link_id: link.id,
        source: "synthetic" as const,
        ...reading,
      }))
    );

    const { error: insertError } = await supabase.from("telemetry_readings").insert(rows);

    if (insertError) {
      return reply.status(500).send({ status: "error", message: insertError.message });
    }

    return reply.status(201).send({ status: "ok", inserted: rows.length });
  });

  // Self-reported real usage. This is the actual data-entry path for the
  // self-serve model (see Session 8) — no partner API exists, so the
  // user reports their own usage, optionally with photo evidence
  // (an evidence_url pointing at the private `usage-evidence` storage
  // bucket, uploaded client-side before this call).
  app.post("/telemetry/report", async (request, reply) => {
    const parsed = reportSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        status: "error",
        message: "Invalid request body",
        detail: parsed.error.flatten(),
      });
    }

    const { energyProviderLinkId, kwh, readingStart, readingEnd, evidenceUrl } = parsed.data;

    // Ownership check — a user must not be able to report readings
    // against someone else's link.
    const { data: link, error: linkError } = await supabase
      .from("energy_provider_links")
      .select("id, user_id")
      .eq("id", energyProviderLinkId)
      .single();

    if (linkError || !link || link.user_id !== request.userId) {
      return reply.status(403).send({
        status: "error",
        message: "This energy account doesn't belong to you.",
      });
    }

    const { data, error } = await supabase
      .from("telemetry_readings")
      .insert({
        energy_provider_link_id: energyProviderLinkId,
        kwh,
        reading_start: readingStart,
        reading_end: readingEnd,
        source: "self_reported",
        evidence_url: evidenceUrl ?? null,
      })
      .select()
      .single();

    if (error) {
      return reply.status(500).send({ status: "error", message: error.message });
    }

    return reply.status(201).send({ status: "ok", data });
  });

  // Daily kWh totals across all of the user's linked accounts, for charting.
  app.get("/telemetry/summary", async (request, reply) => {
    const { data: links, error: linksError } = await supabase
      .from("energy_provider_links")
      .select("id")
      .eq("user_id", request.userId);

    if (linksError) {
      return reply.status(500).send({ status: "error", message: linksError.message });
    }

    const linkIds = (links ?? []).map((l) => l.id);
    if (linkIds.length === 0) {
      return { data: [] };
    }

    const { data: readings, error: readingsError } = await supabase
      .from("telemetry_readings")
      .select("kwh, reading_start")
      .in("energy_provider_link_id", linkIds)
      .order("reading_start", { ascending: true });

    if (readingsError) {
      return reply.status(500).send({ status: "error", message: readingsError.message });
    }

    const byDay = new Map<string, number>();
    for (const r of readings ?? []) {
      const day = String(r.reading_start).slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + Number(r.kwh));
    }

    const data = Array.from(byDay.entries()).map(([date, kwh]) => ({
      date,
      kwh: Number(kwh.toFixed(3)),
    }));

    return { data };
  });
}
