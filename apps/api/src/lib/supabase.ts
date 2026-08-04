import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

/**
 * Server-side Supabase client using the service role key.
 * This bypasses row-level security — only ever use it in trusted
 * backend code (this service), never send this key to apps/web.
 */
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
