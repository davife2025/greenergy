"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payoutsRoutes = payoutsRoutes;
const admin_auth_js_1 = require("../lib/admin-auth.js");
const payout_processing_js_1 = require("../lib/payout-processing.js");
async function payoutsRoutes(app) {
    app.addHook("preHandler", admin_auth_js_1.requireAdminSecret);
    // Manual trigger for the same logic the scheduler (Session 12) runs
    // automatically — see lib/payout-processing.ts for the implementation.
    app.post("/admin/payouts/process", async (_request, reply) => {
        const result = await (0, payout_processing_js_1.runPayoutProcessing)();
        if (!result.ok) {
            return reply.status(500).send({ status: "error", message: result.message });
        }
        return reply.status(200).send({ status: "ok", ...result });
    });
}
