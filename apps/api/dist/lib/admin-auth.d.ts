import type { FastifyReply, FastifyRequest } from "fastify";
/**
 * Fastify preHandler for endpoints that act across all users' data (e.g.
 * pooling telemetry into a carbon batch). These aren't tied to a single
 * user's session, so they're protected by a shared secret instead of a
 * Supabase JWT — meant to be called by a cron job / internal trigger,
 * never from apps/web directly.
 */
export declare function requireAdminSecret(request: FastifyRequest, reply: FastifyReply): Promise<undefined>;
