"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const env_js_1 = require("./lib/env.js");
const health_js_1 = require("./routes/health.js");
const energy_links_js_1 = require("./routes/energy-links.js");
const telemetry_js_1 = require("./routes/telemetry.js");
const carbon_batches_js_1 = require("./routes/carbon-batches.js");
const users_js_1 = require("./routes/users.js");
const payouts_js_1 = require("./routes/payouts.js");
const admin_review_js_1 = require("./routes/admin-review.js");
const solar_profile_js_1 = require("./routes/solar-profile.js");
const listings_js_1 = require("./routes/listings.js");
const energy_requests_js_1 = require("./routes/energy-requests.js");
const webhooks_js_1 = require("./routes/webhooks.js");
const scheduler_js_1 = require("./lib/scheduler.js");
async function main() {
    const app = (0, fastify_1.default)({
        logger: {
            level: env_js_1.env.NODE_ENV === "development" ? "info" : "warn",
        },
    });
    await app.register(cors_1.default, {
        origin: env_js_1.env.API_CORS_ORIGIN,
    });
    // Captures the raw request body alongside normal JSON parsing.
    // Signature verification (webhooks.ts) MUST hash the exact raw bytes
    // Paystack sent — re-serializing a parsed object can silently change
    // whitespace/key order and break the signature. Every other route
    // still gets `request.body` parsed exactly as before.
    app.addContentTypeParser("application/json", { parseAs: "buffer" }, (request, body, done) => {
        request.rawBody = body;
        try {
            const json = body.length ? JSON.parse(body.toString("utf8")) : {};
            done(null, json);
        }
        catch (err) {
            done(err, undefined);
        }
    });
    await app.register(health_js_1.healthRoutes);
    await app.register(energy_links_js_1.energyLinksRoutes);
    await app.register(telemetry_js_1.telemetryRoutes);
    await app.register(carbon_batches_js_1.carbonBatchesRoutes);
    await app.register(users_js_1.usersRoutes);
    await app.register(payouts_js_1.payoutsRoutes);
    await app.register(admin_review_js_1.adminReviewRoutes);
    await app.register(solar_profile_js_1.solarProfileRoutes);
    await app.register(listings_js_1.listingsRoutes);
    await app.register(energy_requests_js_1.energyRequestsRoutes);
    await app.register(webhooks_js_1.webhooksRoutes);
    try {
        await app.listen({ port: env_js_1.env.PORT, host: "0.0.0.0" });
        app.log.info(`greenenergy-api listening on port ${env_js_1.env.PORT}`);
        (0, scheduler_js_1.startScheduler)();
    }
    catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}
main();
