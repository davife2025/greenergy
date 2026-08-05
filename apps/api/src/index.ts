import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./lib/env.js";
import { healthRoutes } from "./routes/health.js";
import { energyLinksRoutes } from "./routes/energy-links.js";
import { telemetryRoutes } from "./routes/telemetry.js";
import { carbonBatchesRoutes } from "./routes/carbon-batches.js";
import { usersRoutes } from "./routes/users.js";
import { payoutsRoutes } from "./routes/payouts.js";
import { adminReviewRoutes } from "./routes/admin-review.js";

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
  await app.register(energyLinksRoutes);
  await app.register(telemetryRoutes);
  await app.register(carbonBatchesRoutes);
  await app.register(usersRoutes);
  await app.register(payoutsRoutes);
  await app.register(adminReviewRoutes);

  // Future route groups will register here, e.g.:
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
