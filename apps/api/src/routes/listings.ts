import type { FastifyInstance } from "fastify";
import { supabase } from "../lib/supabase.js";
import { optionalAuth } from "../lib/auth.js";

export async function listingsRoutes(app: FastifyInstance) {
  // Deliberately public — browsing the marketplace shouldn't require an
  // account. optionalAuth attaches request.userId IF the caller happens
  // to be logged in (so we can exclude their own listing), but never
  // rejects an anonymous request.
  app.addHook("preHandler", optionalAuth);

  app.get("/listings", async (request, reply) => {
    const { q } = request.query as { q?: string };

    let query = supabase
      .from("solar_profiles")
      .select("id, user_id, excess_kwh, location_text, price_per_session_ngn, updated_at")
      .eq("is_listed", true)
      .gt("excess_kwh", 0)
      .order("updated_at", { ascending: false });

    if (request.userId) {
      query = query.neq("user_id", request.userId);
    }

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
