import type { FastifyInstance } from "fastify";
import { supabase } from "../lib/supabase.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    return { status: "ok", service: "greenenergy-api", time: new Date().toISOString() };
  });

  app.get("/health/db", async (_req, reply) => {
    const { error } = await supabase.from("users").select("id").limit(1);

    if (error) {
      return reply.status(503).send({
        status: "error",
        message: "Could not reach Supabase — check SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY and that the schema has been applied.",
        detail: error.message,
      });
    }

    return { status: "ok", database: "connected" };
  });
}
