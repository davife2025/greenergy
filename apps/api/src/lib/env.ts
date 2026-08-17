import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  API_CORS_ORIGIN: z.string().default("http://localhost:3000"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // Protects system/cron-triggered endpoints that operate across all users'
  // data (e.g. carbon batch aggregation) rather than a single user's own data.
  ADMIN_JOB_SECRET: z.string().min(16, "ADMIN_JOB_SECRET should be a long random string"),
  PAYSTACK_SECRET_KEY: z.string().min(1),
  // Optional — if unset, batches rely on deterministic checks alone.
  // Hugging Face access token (from huggingface.co/settings/tokens),
  // used to call Kimi K2 via HF's Inference Providers router.
  HF_TOKEN: z.string().optional(),
  // Model id, optionally suffixed with :<provider> to pin a specific
  // backend (e.g. "moonshotai/Kimi-K2-Instruct-0905:together"). Omit the
  // suffix to let HF pick the fastest available provider.
  HF_INFERENCE_MODEL: z.string().default("moonshotai/Kimi-K2-Instruct-0905"),
  // Optional — enables the Gemini (via Vertex AI) solar-profile
  // plausibility check. GCP_SA_KEY is the full service account JSON key
  // content (not a file path) — paste the whole file's contents as the
  // env var value. All three must be set together, or the feature
  // no-ops cleanly.
  GCP_SA_KEY: z.string().optional(),
  GOOGLE_CLOUD_PROJECT: z.string().optional(),
  GOOGLE_CLOUD_LOCATION: z.string().default("us-central1"),
  // "false" disables the scheduler entirely — anything else (including
  // unset, which defaults to "true") enables it. Deliberately not
  // z.coerce.boolean(), which treats ANY non-empty string as true.
  SCHEDULER_ENABLED: z.string().default("true").transform((v) => v !== "false"),
  // Standard 5-field cron expression, UTC. Default: daily at 02:00 UTC.
  SCHEDULER_CRON: z.string().default("0 2 * * *"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Missing or invalid environment variables. Check apps/api/.env against .env.example.");
}

export const env = parsed.data;
