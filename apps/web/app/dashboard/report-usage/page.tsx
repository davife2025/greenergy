"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api";

interface EnergyLink {
  id: string;
  provider: string;
  external_account_id: string;
}

export default function ReportUsagePage() {
  const router = useRouter();
  const supabase = createClient();

  const [links, setLinks] = useState<EnergyLink[]>([]);
  const [linkId, setLinkId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [kwh, setKwh] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/energy-links")
      .then(({ data }) => {
        setLinks(data ?? []);
        if (data?.[0]) setLinkId(data[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load your accounts."))
      .finally(() => setLoadingLinks(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let evidenceUrl: string | undefined;

      if (file) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not logged in.");

        const path = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("usage-evidence")
          .upload(path, file);

        if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);
        evidenceUrl = path;
      }

      const readingStart = new Date(`${date}T00:00:00.000Z`).toISOString();
      const readingEnd = new Date(new Date(readingStart).getTime() + 86_400_000).toISOString();

      await apiFetch("/telemetry/report", {
        method: "POST",
        body: JSON.stringify({
          energyProviderLinkId: linkId,
          kwh: Number(kwh),
          readingStart,
          readingEnd,
          evidenceUrl,
        }),
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
        Report your usage
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        There's no automatic connection to your provider yet, so this is how
        your usage counts toward carbon credits for now. A meter photo or
        app screenshot helps it get verified faster.
      </p>

      {loadingLinks ? (
        <p className="mt-8 text-sm text-neutral-500">Loading your accounts…</p>
      ) : links.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-neutral-300 p-8 text-center">
          <p className="text-sm text-neutral-500">
            Link an energy account first before reporting usage.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="link" className="text-sm font-medium text-brand-charcoal">
              Account
            </label>
            <select
              id="link"
              value={linkId}
              onChange={(e) => setLinkId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
            >
              {links.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.provider.replace("_", " ")} — {l.external_account_id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="date" className="text-sm font-medium text-brand-charcoal">
              Date
            </label>
            <input
              id="date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
            />
          </div>

          <div>
            <label htmlFor="kwh" className="text-sm font-medium text-brand-charcoal">
              Usage that day (kWh)
            </label>
            <input
              id="kwh"
              type="number"
              step="0.01"
              min="0"
              max="50"
              required
              placeholder="e.g. 1.4"
              value={kwh}
              onChange={(e) => setKwh(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
            />
          </div>

          <div>
            <label htmlFor="evidence" className="text-sm font-medium text-brand-charcoal">
              Evidence photo (optional)
            </label>
            <input
              id="evidence"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full text-sm text-neutral-600 file:mr-3 file:rounded-full file:border-0 file:bg-brand-gray file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-charcoal"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-brand-green px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-green-deep disabled:opacity-50"
          >
            {loading ? "Submitting…" : "Submit usage"}
          </button>
        </form>
      )}
    </main>
  );
}
