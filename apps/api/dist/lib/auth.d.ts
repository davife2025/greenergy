import type { FastifyReply, FastifyRequest } from "fastify";
declare module "fastify" {
    interface FastifyRequest {
        userId?: string;
    }
}
/**
 * Fastify preHandler hook. Expects `Authorization: Bearer <supabase-access-token>`.
 * Validates the token against Supabase Auth and attaches the resulting
 * user id to `request.userId` for downstream handlers.
 */
export declare function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<undefined>;
