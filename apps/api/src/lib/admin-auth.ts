import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "./env.js";

/**
 * Fastify preHandler for endpoints that act across all users' data (e.g.
 * pooling telemetry into a carbon batch). These aren't tied to a single
 * user's session, so they're protected by a shared secret instead of a
 * Supabase JWT — meant to be called by a cron job / internal trigger,
 * never from apps/web directly.
 */
export async function requireAdminSecret(request: FastifyRequest, reply: FastifyReply) {
  const provided = request.headers["x-admin-secret"];

  if (provided !== env.ADMIN_JOB_SECRET) {
    return reply.status(401).send({ status: "error", message: "Invalid or missing admin secret." });
  }
}
