"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

interface Listing {
  id: string;
  excess_kwh: number;
  location_text: string;
  price_per_session_ngn: number;
}

export default function FindEnergyPage() {
  const [query, setQuery] = useState("");
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestingId, setRequestingId] = useState<string | null>(null);

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
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-2xl font-bold text-brand-charcoal">
        Find excess energy nearby
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        Search by area or landmark to find someone with spare solar capacity
        to charge your device.
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
                  {requestingId === l.id ? "Starting…" : "Request & pay"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
