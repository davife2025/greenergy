"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Step = "phone" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({ phone });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStep("otp");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: "sms",
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-gray/40 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-black/5 bg-white p-8 shadow-lg shadow-brand-charcoal/5">
        <h1 className="font-display text-2xl font-bold text-brand-charcoal">
          {step === "phone" ? "Log in or sign up" : "Enter the code"}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          {step === "phone"
            ? "We'll text you a one-time code — no password needed."
            : `We sent a code to ${phone}.`}
        </p>

        {step === "phone" ? (
          <form onSubmit={sendCode} className="mt-6 space-y-4">
            <div>
              <label htmlFor="phone" className="text-sm font-medium text-brand-charcoal">
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                required
                placeholder="+234 801 234 5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-brand-green px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-green-deep disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="mt-6 space-y-4">
            <div>
              <label htmlFor="code" className="text-sm font-medium text-brand-charcoal">
                6-digit code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                required
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-brand-green px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-green-deep disabled:opacity-50"
            >
              {loading ? "Verifying…" : "Verify and continue"}
            </button>
            <button
              type="button"
              onClick={() => setStep("phone")}
              className="w-full text-center text-sm text-neutral-500 hover:text-brand-charcoal"
            >
              Use a different number
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
