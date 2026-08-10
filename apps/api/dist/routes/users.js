"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRoutes = usersRoutes;
const zod_1 = require("zod");
const supabase_js_1 = require("../lib/supabase.js");
const auth_js_1 = require("../lib/auth.js");
const payout_provider_js_1 = require("../lib/payout-provider.js");
const payoutMethodSchema = zod_1.z.object({
    mobileMoneyProvider: zod_1.z.enum(["opay", "palmpay", "moniepoint", "mpesa"]),
    mobileMoneyIdentifier: zod_1.z.string().min(5),
});
async function usersRoutes(app) {
    app.addHook("preHandler", auth_js_1.requireAuth);
    app.get("/me", async (request, reply) => {
        const { data, error } = await supabase_js_1.supabase
            .from("users")
            .select("id, email, phone_number, mobile_money_provider, mobile_money_identifier, created_at")
            .eq("id", request.userId)
            .single();
        if (error) {
            return reply.status(500).send({ status: "error", message: error.message });
        }
        return { data };
    });
    app.patch("/me/payout-method", async (request, reply) => {
        const parsed = payoutMethodSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                status: "error",
                message: "Invalid request body",
                detail: parsed.error.flatten(),
            });
        }
        const { mobileMoneyProvider, mobileMoneyIdentifier } = parsed.data;
        if (!(0, payout_provider_js_1.isSupportedPayoutProvider)(mobileMoneyProvider)) {
            return reply.status(400).send({
                status: "error",
                message: `${mobileMoneyProvider} isn't wired up for payouts yet — only opay, palmpay, and moniepoint are supported in this Nigeria pilot.`,
            });
        }
        const { data, error } = await supabase_js_1.supabase
            .from("users")
            .update({
            mobile_money_provider: mobileMoneyProvider,
            mobile_money_identifier: mobileMoneyIdentifier,
        })
            .eq("id", request.userId)
            .select()
            .single();
        if (error) {
            return reply.status(500).send({ status: "error", message: error.message });
        }
        return { data };
    });
}
