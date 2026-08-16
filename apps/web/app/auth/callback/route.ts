import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Where a clicked magic link actually lands. Supabase redirects here with
 * a `?code=...` query param (PKCE flow); we exchange it for a real
 * session (setting the auth cookies via the server client) and send the
 * user on to wherever they were headed.
 *
 * This only works if the link is clicked in the SAME browser that
 * requested it — the PKCE code_verifier is stored in a cookie set at
 * request time. That's standard behavior for every magic-link system,
 * not a bug specific to this app; email clients that pre-fetch/scan
 * links (some corporate security scanners do this) can occasionally
 * cause a one-time link to get "used" before the real user clicks it —
 * a known industry-wide magic-link caveat, not something to chase here.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirect_to") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=link_expired_or_invalid`);
}
