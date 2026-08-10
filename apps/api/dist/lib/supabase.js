"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const env_js_1 = require("./env.js");
/**
 * Server-side Supabase client using the service role key.
 * This bypasses row-level security — only ever use it in trusted
 * backend code (this service), never send this key to apps/web.
 */
exports.supabase = (0, supabase_js_1.createClient)(env_js_1.env.SUPABASE_URL, env_js_1.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
