"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const linkExpired = searchParams.get("error") === "link_expired_or_invalid";

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}`,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-gray/40 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-black/5 bg-white p-8 shadow-lg shadow-brand-charcoal/5">
        {sent ? (
          <>
            <h1 className="font-display text-2xl font-bold text-brand-charcoal">
              Check your inbox
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              We sent a login link to <strong>{email}</strong>. Open it on
              this device to log in — no code needed.
            </p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="mt-6 w-full text-center text-sm text-neutral-500 hover:text-brand-charcoal"
            >
              Use a different email
            </button>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold text-brand-charcoal">
              Log in or sign up
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              We'll email you a login link — no password needed.
            </p>
            {linkExpired && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                That link expired or was already used. Request a new one below.
              </p>
            )}

            <form onSubmit={sendLink} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="text-sm font-medium text-brand-charcoal">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-brand-green px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-green-deep disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send login link"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
