import type { FastifyInstance } from "fastify";
import { supabase } from "../lib/supabase.js";
import { requireAuth } from "../lib/auth.js";
import { generateSyntheticReadings } from "../lib/telemetry-generator.js";

export async function telemetryRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  // Seeds 30 days of synthetic readings for every active link the user has.
  // Stand-in for real provider telemetry until Session 7.
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
        ...reading,
      }))
    );

    const { error: insertError } = await supabase.from("telemetry_readings").insert(rows);

    if (insertError) {
      return reply.status(500).send({ status: "error", message: insertError.message });
    }

    return reply.status(201).send({ status: "ok", inserted: rows.length });
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
