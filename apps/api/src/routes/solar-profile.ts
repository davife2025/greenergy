import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { requireAuth } from "../lib/auth.js";

// Nigeria average peak sun hours — a documented, reasonable assumption,
// not a precise irradiance calculation (that would need real weather/geo
// data, out of scope for a fast MVP). Users who know their actual daily
// generation better can enter it directly instead of via wattage.
const ASSUMED_PEAK_SUN_HOURS = 5;

const profileSchema = z.object({
  panelWatts: z.number().min(0).optional(),
  dailyGenerationKwh: z.number().min(0).optional(),
  dailyConsumptionKwh: z.number().min(0),
  locationText: z.string().min(3),
  pricePerSessionNgn: z.number().min(1),
  isListed: z.boolean().default(false),
});

export async function solarProfileRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/solar-profile", async (request, reply) => {
    const { data, error } = await supabase
      .from("solar_profiles")
      .select("*")
      .eq("user_id", request.userId)
      .maybeSingle();

    if (error) {
      return reply.status(500).send({ status: "error", message: error.message });
    }

    return { data };
  });

  app.put("/solar-profile", async (request, reply) => {
    const parsed = profileSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        status: "error",
        message: "Invalid request body",
        detail: parsed.error.flatten(),
      });
    }

    const { panelWatts, dailyConsumptionKwh, locationText, pricePerSessionNgn, isListed } =
      parsed.data;

    // Either a direct generation figure, or estimate from panel wattage.
    // At least one of the two must be provided.
    let dailyGenerationKwh = parsed.data.dailyGenerationKwh;
    if (dailyGenerationKwh === undefined) {
      if (panelWatts === undefined) {
        return reply.status(400).send({
          status: "error",
          message: "Provide either dailyGenerationKwh directly, or panelWatts to estimate it.",
        });
      }
      dailyGenerationKwh = Number(((panelWatts * ASSUMED_PEAK_SUN_HOURS) / 1000).toFixed(3));
    }

    const { data, error } = await supabase
      .from("solar_profiles")
      .upsert(
        {
          user_id: request.userId,
          panel_watts: panelWatts ?? null,
          daily_generation_kwh: dailyGenerationKwh,
          daily_consumption_kwh: dailyConsumptionKwh,
          location_text: locationText,
          price_per_session_ngn: pricePerSessionNgn,
          is_listed: isListed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) {
      return reply.status(500).send({ status: "error", message: error.message });
    }

    return { status: "ok", data, estimatedFromWattage: parsed.data.dailyGenerationKwh === undefined };
  });
}
