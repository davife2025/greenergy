"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.energyLinksRoutes = energyLinksRoutes;
const zod_1 = require("zod");
const supabase_js_1 = require("../lib/supabase.js");
const auth_js_1 = require("../lib/auth.js");
const linkBodySchema = zod_1.z.object({
    provider: zod_1.z.enum(["m_kopa", "sun_king", "bboxx", "manual"]),
    externalAccountId: zod_1.z.string().min(1),
});
async function energyLinksRoutes(app) {
    app.addHook("preHandler", auth_js_1.requireAuth);
    app.get("/energy-links", async (request, reply) => {
        const { data, error } = await supabase_js_1.supabase
            .from("energy_provider_links")
            .select("*")
            .eq("user_id", request.userId);
        if (error) {
            return reply.status(500).send({ status: "error", message: error.message });
        }
        return { data };
    });
    app.post("/energy-links", async (request, reply) => {
        const parsed = linkBodySchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                status: "error",
                message: "Invalid request body",
                detail: parsed.error.flatten(),
            });
        }
        const { provider, externalAccountId } = parsed.data;
        const { data, error } = await supabase_js_1.supabase
            .from("energy_provider_links")
            .insert({
            user_id: request.userId,
            provider,
            external_account_id: externalAccountId,
        })
            .select()
            .single();
        if (error) {
            return reply.status(500).send({ status: "error", message: error.message });
        }
        return reply.status(201).send({ data });
    });
}
