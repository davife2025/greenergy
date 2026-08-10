"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listingsRoutes = listingsRoutes;
const supabase_js_1 = require("../lib/supabase.js");
const auth_js_1 = require("../lib/auth.js");
async function listingsRoutes(app) {
    app.addHook("preHandler", auth_js_1.requireAuth);
    // Simple text search on location — no maps/geocoding for the MVP.
    // Excludes the requester's own listing (can't buy your own excess).
    app.get("/listings", async (request, reply) => {
        const { q } = request.query;
        let query = supabase_js_1.supabase
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
