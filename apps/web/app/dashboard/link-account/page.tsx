"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

const PROVIDERS = [
  { value: "m_kopa", label: "M-KOPA" },
  { value: "sun_king", label: "Sun King" },
  { value: "bboxx", label: "BBOXX" },
  { value: "manual", label: "Other / manual entry" },
] as const;

export default function LinkAccountPage() {
  const router = useRouter();
  const [provider, setProvider] = useState<string>(PROVIDERS[0].value);
  const [externalAccountId, setExternalAccountId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiFetch("/energy-links", {
        method: "POST",
        body: JSON.stringify({ provider, externalAccountId }),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-2xl font-bold text-brand-charcoal">
        Link an energy account
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        This is a manual-entry stub for now — Session 7 replaces it with a
        real provider connection (OAuth or account-number lookup, depending
        on the partner).
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="provider" className="text-sm font-medium text-brand-charcoal">
            Provider
          </label>
          <select
            id="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="accountId" className="text-sm font-medium text-brand-charcoal">
            Account ID / meter number
          </label>
          <input
            id="accountId"
            type="text"
            required
            placeholder="e.g. MK-2291837"
            value={externalAccountId}
            onChange={(e) => setExternalAccountId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-brand-green px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-green-deep disabled:opacity-50"
        >
          {loading ? "Linking…" : "Link account"}
        </button>
      </form>
    </main>
  );
}
