"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

const PROVIDERS = [
  { value: "opay", label: "OPay" },
  { value: "palmpay", label: "PalmPay" },
  { value: "moniepoint", label: "Moniepoint" },
] as const;

export default function PayoutMethodPage() {
  const router = useRouter();
  const [provider, setProvider] = useState<string>(PROVIDERS[0].value);
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch("/me")
      .then(({ data }) => {
        if (data?.mobile_money_provider) setProvider(data.mobile_money_provider);
        if (data?.mobile_money_identifier) setIdentifier(data.mobile_money_identifier);
      })
      .catch(() => {
        // Not fatal — just means we show the empty form.
      })
      .finally(() => setLoadingInitial(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    try {
      await apiFetch("/me/payout-method", {
        method: "PATCH",
        body: JSON.stringify({
          mobileMoneyProvider: provider,
          mobileMoneyIdentifier: identifier,
        }),
      });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (loadingInitial) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <p className="text-sm text-neutral-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-2xl font-bold text-brand-charcoal">
        Payout method
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        This is where your carbon revenue share gets sent. We currently
        support OPay, PalmPay, and Moniepoint.
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
          <label htmlFor="identifier" className="text-sm font-medium text-brand-charcoal">
            Account number (usually your phone number)
          </label>
          <input
            id="identifier"
            type="tel"
            required
            placeholder="0801 234 5678"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-brand-green">Saved.</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-brand-green px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-green-deep disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save payout method"}
        </button>
      </form>
    </main>
  );
}
