"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function SolarProfilePage() {
  const [panelWatts, setPanelWatts] = useState("");
  const [dailyGenerationKwh, setDailyGenerationKwh] = useState("");
  const [dailyConsumptionKwh, setDailyConsumptionKwh] = useState("");
  const [locationText, setLocationText] = useState("");
  const [pricePerSessionNgn, setPricePerSessionNgn] = useState("200");
  const [isListed, setIsListed] = useState(true);
  const [excessPreview, setExcessPreview] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [aiNote, setAiNote] = useState<{ plausible: boolean; note: string } | null>(null);

  useEffect(() => {
    apiFetch("/solar-profile")
      .then(({ data }) => {
        if (!data) return;
        if (data.panel_watts) setPanelWatts(String(data.panel_watts));
        setDailyGenerationKwh(String(data.daily_generation_kwh));
        setDailyConsumptionKwh(String(data.daily_consumption_kwh));
        setLocationText(data.location_text ?? "");
        setPricePerSessionNgn(String(data.price_per_session_ngn));
        setIsListed(data.is_listed);
        setExcessPreview(Number(data.excess_kwh));
      })
      .catch(() => {
        // No profile yet — fine, form starts empty.
      })
      .finally(() => setLoadingInitial(false));
  }, []);

  useEffect(() => {
    const gen = Number(dailyGenerationKwh);
    const con = Number(dailyConsumptionKwh);
    if (!Number.isNaN(gen) && !Number.isNaN(con)) {
      setExcessPreview(Math.max(gen - con, 0));
    }
  }, [dailyGenerationKwh, dailyConsumptionKwh]);

  function estimateFromWatts(watts: string) {
    setPanelWatts(watts);
    const w = Number(watts);
    if (!Number.isNaN(w) && w > 0) {
      // 5 peak sun hours/day — a documented Nigeria-average assumption,
      // not precise. Editable below if the user knows their real figure.
      setDailyGenerationKwh(((w * 5) / 1000).toFixed(2));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    try {
      const result = await apiFetch("/solar-profile", {
        method: "PUT",
        body: JSON.stringify({
          panelWatts: panelWatts ? Number(panelWatts) : undefined,
          dailyGenerationKwh: Number(dailyGenerationKwh),
          dailyConsumptionKwh: Number(dailyConsumptionKwh),
          locationText,
          pricePerSessionNgn: Number(pricePerSessionNgn),
          isListed,
        }),
      });
      setSaved(true);
      if (result.data?.ai_review_note) {
        setAiNote({ plausible: result.data.ai_plausible !== false, note: result.data.ai_review_note });
      } else {
        setAiNote(null);
      }
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
        Your excess energy listing
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        Tell us what your solar system makes and what your home uses — we'll
        work out what's spare, and you decide whether to list it.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="watts" className="text-sm font-medium text-brand-charcoal">
            Panel wattage (optional — estimates generation for you)
          </label>
          <input
            id="watts"
            type="number"
            min="0"
            placeholder="e.g. 400"
            value={panelWatts}
            onChange={(e) => estimateFromWatts(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
          />
        </div>

        <div>
          <label htmlFor="gen" className="text-sm font-medium text-brand-charcoal">
            Daily generation (kWh)
          </label>
          <input
            id="gen"
            type="number"
            step="0.01"
            min="0"
            required
            value={dailyGenerationKwh}
            onChange={(e) => setDailyGenerationKwh(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
          />
          <p className="mt-1 text-xs text-neutral-400">
            Estimated from panel wattage above (5 peak sun hours/day, a Nigeria-average
            assumption) — edit if you know your real figure.
          </p>
        </div>

        <div>
          <label htmlFor="con" className="text-sm font-medium text-brand-charcoal">
            Daily home consumption (kWh)
          </label>
          <input
            id="con"
            type="number"
            step="0.01"
            min="0"
            required
            value={dailyConsumptionKwh}
            onChange={(e) => setDailyConsumptionKwh(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
          />
        </div>

        {excessPreview !== null && (
          <div className="rounded-xl bg-brand-green/10 px-4 py-3 text-sm text-brand-green">
            Excess available to list: <strong>{excessPreview.toFixed(2)} kWh/day</strong>
          </div>
        )}

        <div>
          <label htmlFor="location" className="text-sm font-medium text-brand-charcoal">
            Location (area/landmark — not your exact address)
          </label>
          <input
            id="location"
            type="text"
            required
            placeholder="e.g. Near Shoprite, Ikeja"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
          />
          <p className="mt-1 text-xs text-neutral-400">
            For safety, use a public landmark near you, not your home address.
          </p>
        </div>

        <div>
          <label htmlFor="price" className="text-sm font-medium text-brand-charcoal">
            Price per charging session (₦)
          </label>
          <input
            id="price"
            type="number"
            min="1"
            required
            value={pricePerSessionNgn}
            onChange={(e) => setPricePerSessionNgn(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-brand-charcoal">
          <input
            type="checkbox"
            checked={isListed}
            onChange={(e) => setIsListed(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300"
          />
          List my excess energy publicly (on by default — uncheck to hide it)
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && (
          <div className="rounded-lg bg-brand-green/10 px-3 py-2 text-sm text-brand-green">
            <p className="font-medium">Saved.</p>
            {isListed ? (
              <p className="mt-1 text-brand-charcoal/70">
                Your listing is live and visible to others searching "{locationText}".
                You won't see it yourself on Find Energy — the marketplace hides your
                own listing from your own search, same as you can't buy your own excess.
              </p>
            ) : (
              <p className="mt-1 text-brand-charcoal/70">
                This listing is saved but hidden — check "List my excess energy
                publicly" above and save again to make it visible.
              </p>
            )}
          </div>
        )}
        {aiNote && (
          <p
            className={`rounded-lg px-3 py-2 text-sm ${
              aiNote.plausible ? "bg-brand-green/10 text-brand-green" : "bg-amber-50 text-amber-700"
            }`}
          >
            {aiNote.plausible ? "✓ " : "⚠ "}
            {aiNote.note}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-brand-green px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-green-deep disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save listing"}
        </button>
      </form>
    </main>
  );
}
