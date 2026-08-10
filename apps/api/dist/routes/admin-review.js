"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminReviewRoutes = adminReviewRoutes;
const zod_1 = require("zod");
const supabase_js_1 = require("../lib/supabase.js");
const admin_auth_js_1 = require("../lib/admin-auth.js");
const resolveSchema = zod_1.z.object({
    decision: zod_1.z.enum(["approve", "reject"]),
});
async function adminReviewRoutes(app) {
    app.addHook("preHandler", admin_auth_js_1.requireAdminSecret);
    // Readings currently sitting in the queue — flagged, and not yet
    // reviewed. Includes the parent link's provider/account so a reviewer
    // has some context without exposing full user records.
    app.get("/admin/flagged-readings", async (_request, reply) => {
        const { data, error } = await supabase_js_1.supabase
            .from("telemetry_readings")
            .select("id, kwh, reading_start, reading_end, source, flag_reason, ingested_at, energy_provider_links(provider, external_account_id)")
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
        const { id } = request.params;
        const parsed = resolveSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                status: "error",
                message: "Invalid request body",
                detail: parsed.error.flatten(),
            });
        }
        const update = parsed.data.decision === "approve"
            ? { flagged: false, review_status: "approved" }
            : { review_status: "rejected" };
        const { data, error } = await supabase_js_1.supabase
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
