import type { FastifyReply, FastifyRequest } from "fastify";
import { supabase } from "./supabase.js";

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
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return reply.status(401).send({ status: "error", message: "Missing Authorization header." });
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return reply.status(401).send({ status: "error", message: "Invalid or expired token." });
  }

  request.userId = data.user.id;
}
