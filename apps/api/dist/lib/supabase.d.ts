/**
 * Server-side Supabase client using the service role key.
 * This bypasses row-level security — only ever use it in trusted
 * backend code (this service), never send this key to apps/web.
 */
export declare const supabase: import("@supabase/supabase-js").SupabaseClient<any, "public", "public", any, any>;
