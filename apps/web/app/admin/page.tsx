"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface FlaggedReading {
  id: string;
  kwh: number;
  reading_start: string;
  reading_end: string;
  source: string;
  flag_reason: "implausible_value" | "statistical_anomaly";
  ingested_at: string;
  energy_provider_links: { provider: string; external_account_id: string } | null;
}

const REASON_LABEL: Record<string, string> = {
  implausible_value: "Outside plausible range",
  statistical_anomaly: "Deviates from this meter's history",
};

export default function AdminReviewPage() {
  const [secret, setSecret] = useState("");
  const [readings, setReadings] = useState<FlaggedReading[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  async function loadQueue() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/admin/flagged-readings`, {
        headers: { "x-admin-secret": secret },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `Request failed (${res.status})`);
      }
      const body = await res.json();
      setReadings(body.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setReadings(null);
    } finally {
      setLoading(false);
    }
  }

  async function resolve(id: string, decision: "approve" | "reject") {
    setActingOn(id);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/admin/flagged-readings/${id}`, {
        method: "PATCH",
        headers: { "x-admin-secret": secret, "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `Request failed (${res.status})`);
      }
      setReadings((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setActingOn(null);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-2xl font-bold text-brand-charcoal">
        Flagged reading review queue
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        Internal tool — not linked from the main app. Readings excluded
        from a carbon batch land here instead of disappearing silently.
      </p>

      <div className="mt-6 flex gap-2">
        <input
          type="password"
          placeholder="Admin secret"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
        />
        <button
          onClick={loadQueue}
          disabled={loading || !secret}
          className="rounded-full bg-brand-charcoal px-4 py-2 text-sm font-medium text-white transition hover:bg-black disabled:opacity-50"
        >
          {loading ? "Loading…" : "Load queue"}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {readings && readings.length === 0 && (
        <p className="mt-8 text-sm text-neutral-500">Queue is empty — nothing pending review.</p>
      )}

      {readings && readings.length > 0 && (
        <ul className="mt-8 divide-y divide-neutral-100 rounded-xl border border-neutral-100">
          {readings.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-sm font-medium text-brand-charcoal">
                  {r.kwh} kWh — {r.reading_start.slice(0, 10)}
                </p>
                <p className="text-xs text-neutral-500">
                  {r.energy_provider_links?.provider ?? "unknown provider"} ·{" "}
                  {r.energy_provider_links?.external_account_id ?? "—"} · {r.source}
                </p>
                <p className="mt-1 text-xs font-medium text-brand-amber">
                  {REASON_LABEL[r.flag_reason] ?? r.flag_reason}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => resolve(r.id, "approve")}
                  disabled={actingOn === r.id}
                  className="rounded-full bg-brand-green px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-green-deep disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => resolve(r.id, "reject")}
                  disabled={actingOn === r.id}
                  className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
