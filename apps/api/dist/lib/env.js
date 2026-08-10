"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "production", "test"]).default("development"),
    PORT: zod_1.z.coerce.number().default(4000),
    API_CORS_ORIGIN: zod_1.z.string().default("http://localhost:3000"),
    SUPABASE_URL: zod_1.z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string().min(1),
    // Protects system/cron-triggered endpoints that operate across all users'
    // data (e.g. carbon batch aggregation) rather than a single user's own data.
    ADMIN_JOB_SECRET: zod_1.z.string().min(16, "ADMIN_JOB_SECRET should be a long random string"),
    PAYSTACK_SECRET_KEY: zod_1.z.string().min(1),
    // Optional — if unset, batches rely on deterministic checks alone.
    ANTHROPIC_API_KEY: zod_1.z.string().optional(),
    // "false" disables the scheduler entirely — anything else (including
    // unset, which defaults to "true") enables it. Deliberately not
    // z.coerce.boolean(), which treats ANY non-empty string as true.
    SCHEDULER_ENABLED: zod_1.z.string().default("true").transform((v) => v !== "false"),
    // Standard 5-field cron expression, UTC. Default: daily at 02:00 UTC.
    SCHEDULER_CRON: zod_1.z.string().default("0 2 * * *"),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Missing or invalid environment variables. Check apps/api/.env against .env.example.");
}
exports.env = parsed.data;
