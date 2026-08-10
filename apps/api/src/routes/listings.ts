import type { FastifyInstance } from "fastify";
import { supabase } from "../lib/supabase.js";
import { requireAuth } from "../lib/auth.js";

export async function listingsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  // Simple text search on location — no maps/geocoding for the MVP.
  // Excludes the requester's own listing (can't buy your own excess).
  app.get("/listings", async (request, reply) => {
    const { q } = request.query as { q?: string };

    let query = supabase
      .from("solar_profiles")
      .select("id, user_id, excess_kwh, location_text, price_per_session_ngn, updated_at")
      .eq("is_listed", true)
      .gt("excess_kwh", 0)
      .neq("user_id", request.userId)
      .order("updated_at", { ascending: false });

    if (q && q.trim().length > 0) {
      query = query.ilike("location_text", `%${q.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      return reply.status(500).send({ status: "error", message: error.message });
    }

    return { data };
  });
}
