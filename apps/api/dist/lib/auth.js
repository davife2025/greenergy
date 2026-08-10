"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const supabase_js_1 = require("./supabase.js");
/**
 * Fastify preHandler hook. Expects `Authorization: Bearer <supabase-access-token>`.
 * Validates the token against Supabase Auth and attaches the resulting
 * user id to `request.userId` for downstream handlers.
 */
async function requireAuth(request, reply) {
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
        return reply.status(401).send({ status: "error", message: "Missing Authorization header." });
    }
    const { data, error } = await supabase_js_1.supabase.auth.getUser(token);
    if (error || !data.user) {
        return reply.status(401).send({ status: "error", message: "Invalid or expired token." });
    }
    request.userId = data.user.id;
}
