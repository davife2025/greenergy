import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./lib/env.js";
import { healthRoutes } from "./routes/health.js";

async function main() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "development" ? "info" : "warn",
    },
  });

  await app.register(cors, {
    origin: env.API_CORS_ORIGIN,
  });

  await app.register(healthRoutes);

  // Future route groups will register here, e.g.:
  // await app.register(energyLinksRoutes, { prefix: "/energy-links" });
  // await app.register(payoutsRoutes, { prefix: "/payouts" });

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    app.log.info(`greenenergy-api listening on port ${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
