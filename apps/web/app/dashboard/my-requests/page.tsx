"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api";

interface EnergyRequestRow {
  id: string;
  seeker_id: string;
  host_id: string;
  amount_ngn: number;
  host_payout_ngn: number;
  status: string;
  created_at: string;
  solar_profiles: { location_text: string } | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid — awaiting confirmation",
  confirmed: "Confirmed",
  paid_out: "Complete",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

export default function MyRequestsPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [requests, setRequests] = useState<EnergyRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      const { data } = await apiFetch("/energy-requests");
      setRequests(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirmReceived(id: string) {
    setConfirmingId(id);
    setError(null);
    try {
      await apiFetch(`/energy-requests/${id}/confirm`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm.");
    } finally {
      setConfirmingId(null);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-sm text-neutral-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-2xl font-bold text-brand-charcoal">My requests</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Everything you've bought or sold on the excess energy marketplace.
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {requests.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-neutral-300 p-8 text-center">
          <p className="text-sm text-neutral-500">No requests yet.</p>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-neutral-100 rounded-xl border border-neutral-100">
          {requests.map((r) => {
            const isSeeker = r.seeker_id === userId;
            return (
              <li key={r.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-brand-charcoal">
                    {r.solar_profiles?.location_text ?? "Unknown location"}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {isSeeker ? "You're buying" : "You're hosting"} · ₦
                    {Number(isSeeker ? r.amount_ngn : r.host_payout_ngn).toLocaleString("en-NG")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-brand-gray px-3 py-1 text-xs font-medium text-neutral-600">
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                  {isSeeker && r.status === "paid" && (
                    <button
                      onClick={() => confirmReceived(r.id)}
                      disabled={confirmingId === r.id}
                      className="rounded-full bg-brand-green px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-green-deep disabled:opacity-50"
                    >
                      {confirmingId === r.id ? "Confirming…" : "Confirm received"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
