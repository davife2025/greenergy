"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.carbonBatchesRoutes = carbonBatchesRoutes;
const supabase_js_1 = require("../lib/supabase.js");
const admin_auth_js_1 = require("../lib/admin-auth.js");
const aggregation_js_1 = require("../lib/aggregation.js");
async function carbonBatchesRoutes(app) {
    app.addHook("preHandler", admin_auth_js_1.requireAdminSecret);
    // Manual trigger for the same logic the scheduler (Session 12) runs
    // automatically — see lib/aggregation.ts for the actual implementation.
    app.post("/admin/carbon-batches/aggregate", async (_request, reply) => {
        const result = await (0, aggregation_js_1.runAggregation)();
        if (!result.ok) {
            return reply.status(500).send({ status: "error", message: result.message });
        }
        return reply.status(result.created ? 201 : 200).send({ status: "ok", ...result });
    });
    app.get("/admin/carbon-batches", async (_request, reply) => {
        const { data, error } = await supabase_js_1.supabase
            .from("carbon_batches")
            .select("*")
            .order("created_at", { ascending: false });
        if (error) {
            return reply.status(500).send({ status: "error", message: error.message });
        }
        return { data };
    });
}
