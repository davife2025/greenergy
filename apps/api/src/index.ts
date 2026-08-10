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
import { solarProfileRoutes } from "./routes/solar-profile.js";
import { listingsRoutes } from "./routes/listings.js";
import { energyRequestsRoutes } from "./routes/energy-requests.js";
import { webhooksRoutes } from "./routes/webhooks.js";
import { startScheduler } from "./lib/scheduler.js";

async function main() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "development" ? "info" : "warn",
    },
  });

  await app.register(cors, {
    origin: env.API_CORS_ORIGIN,
  });

  // Captures the raw request body alongside normal JSON parsing.
  // Signature verification (webhooks.ts) MUST hash the exact raw bytes
  // Paystack sent — re-serializing a parsed object can silently change
  // whitespace/key order and break the signature. Every other route
  // still gets `request.body` parsed exactly as before.
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (request, body, done) => {
      (request as { rawBody?: Buffer }).rawBody = body as Buffer;
      try {
        const json = body.length ? JSON.parse(body.toString("utf8")) : {};
        done(null, json);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  await app.register(healthRoutes);
  await app.register(energyLinksRoutes);
  await app.register(telemetryRoutes);
  await app.register(carbonBatchesRoutes);
  await app.register(usersRoutes);
  await app.register(payoutsRoutes);
  await app.register(adminReviewRoutes);
  await app.register(solarProfileRoutes);
  await app.register(listingsRoutes);
  await app.register(energyRequestsRoutes);
  await app.register(webhooksRoutes);

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    app.log.info(`greenenergy-api listening on port ${env.PORT}`);
    startScheduler();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
