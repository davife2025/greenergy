"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api";

interface Listing {
  id: string;
  excess_kwh: number;
  location_text: string;
  price_per_session_ngn: number;
}

function LeafMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path
        d="M 50 14 C 22 24 8 52 50 96 C 92 52 78 24 50 14 Z"
        fill="none"
        stroke="#1D9E75"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 32 80 L 46 50 L 38 40 L 66 16"
        fill="none"
        stroke="#2C2C2A"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M 66 16 L 52 20 L 62 30 Z" fill="#2C2C2A" />
    </svg>
  );
}

export default function FindEnergyPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [query, setQuery] = useState("");
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestingId, setRequestingId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(Boolean(session));
    });
    // Load listings immediately, no login required to browse.
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const params = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
      const { data } = await apiFetch(`/listings${params}`);
      setListings(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function requestAndPay(listingId: string) {
    if (!isLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent("/find-energy")}`);
      return;
    }

    setRequestingId(listingId);
    setError(null);
    try {
      const result = await apiFetch("/energy-requests", {
        method: "POST",
        body: JSON.stringify({ solarProfileId: listingId }),
      });
      window.location.href = result.authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start payment.");
      setRequestingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          <LeafMark className="h-6 w-6" />
          <span className="font-display text-base font-bold text-brand-charcoal">
            greenenergy
          </span>
        </Link>
        <Link
          href={isLoggedIn ? "/dashboard" : "/login"}
          className="text-sm font-medium text-brand-charcoal hover:underline"
        >
          {isLoggedIn ? "Dashboard" : "Log in"}
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-16">
        <h1 className="font-display text-2xl font-bold text-brand-charcoal">
          Find excess energy nearby
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Search by area or landmark to find someone with spare solar
          capacity to charge your device. No account needed to browse —
          you'll only need to log in when you're ready to pay.
        </p>

        <form onSubmit={search} className="mt-6 flex gap-2">
          <input
            type="text"
            placeholder="e.g. Ikeja, Lekki, near a market…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-brand-green px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-green-deep disabled:opacity-50"
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </form>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {listings && listings.length === 0 && (
          <p className="mt-8 text-sm text-neutral-500">
            No listings found{query ? ` for "${query}"` : ""}. Try a broader search.
          </p>
        )}

        {listings && listings.length > 0 && (
          <ul className="mt-8 divide-y divide-neutral-100 rounded-xl border border-neutral-100">
            {listings.map((l) => (
              <li key={l.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-brand-charcoal">{l.location_text}</p>
                  <p className="text-xs text-neutral-500">{l.excess_kwh} kWh available</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-brand-charcoal">
                    ₦{Number(l.price_per_session_ngn).toLocaleString("en-NG")}
                  </p>
                  <button
                    onClick={() => requestAndPay(l.id)}
                    disabled={requestingId === l.id}
                    className="rounded-full bg-brand-green px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-green-deep disabled:opacity-50"
                  >
                    {requestingId === l.id
                      ? "Starting…"
                      : isLoggedIn === false
                        ? "Log in to request"
                        : "Request & pay"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
