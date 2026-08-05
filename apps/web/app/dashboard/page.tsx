import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UsageChart } from "@/components/UsageChart";
import { SeedDemoDataButton } from "@/components/SeedDemoDataButton";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const [{ data: links }, { data: profile }, { data: payouts }] = await Promise.all([
    supabase
      .from("energy_provider_links")
      .select("id, provider, external_account_id, status, linked_at")
      .eq("user_id", user.id)
      .order("linked_at", { ascending: false }),
    supabase
      .from("users")
      .select("mobile_money_provider, mobile_money_identifier")
      .eq("id", user.id)
      .single(),
    supabase
      .from("payouts")
      .select("id, amount, currency, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  let usage: { date: string; kwh: number }[] = [];
  if (session) {
    const res = await fetch(`${API_URL}/telemetry/summary`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });
    if (res.ok) {
      const body = await res.json();
      usage = body.data ?? [];
    }
  }

  const hasPayoutMethod = Boolean(profile?.mobile_money_provider && profile?.mobile_money_identifier);
  const totalPaid = (payouts ?? [])
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-2xl font-bold text-brand-charcoal">
        Your dashboard
      </h1>
      <p className="mt-1 text-sm text-neutral-500">{user.phone}</p>

      {!hasPayoutMethod && (
        <div className="mt-6 flex items-center justify-between rounded-xl bg-brand-amber/15 px-5 py-4">
          <p className="text-sm text-brand-charcoal">
            Add a payout method so we know where to send your earnings.
          </p>
          <Link
            href="/dashboard/payout-method"
            className="rounded-full bg-brand-charcoal px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
          >
            Add payout method
          </Link>
        </div>
      )}

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-charcoal">
            Linked energy accounts
          </h2>
          <Link
            href="/dashboard/link-account"
            className="rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-green-deep"
          >
            + Link an account
          </Link>
        </div>

        {!links || links.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-neutral-300 p-8 text-center">
            <p className="text-sm text-neutral-500">
              No energy accounts linked yet. Link one to start earning from
              your clean energy use.
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-100 rounded-xl border border-neutral-100">
            {links.map((link) => (
              <li
                key={link.id}
                className="flex items-center justify-between px-5 py-4"
              >
                <div>
                  <p className="text-sm font-medium capitalize text-brand-charcoal">
                    {link.provider.replace("_", " ")}
                  </p>
                  <p className="text-xs text-neutral-500">
                    Account {link.external_account_id}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                    link.status === "active"
                      ? "bg-brand-green/10 text-brand-green"
                      : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {link.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-charcoal">
            Usage, last 30 days
          </h2>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/report-usage"
              className="rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-green-deep"
            >
              Report usage
            </Link>
            {links && links.length > 0 && <SeedDemoDataButton />}
          </div>
        </div>
        <div className="mt-4">
          <UsageChart data={usage} />
        </div>
        {usage.length > 0 && (
          <p className="mt-2 text-xs text-neutral-400">
            Synthetic demo data — Session 7 replaces this with real provider telemetry.
          </p>
        )}
      </section>

      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-charcoal">Earnings</h2>
          <Link
            href="/dashboard/payout-method"
            className="text-sm font-medium text-neutral-500 underline decoration-neutral-300 underline-offset-4 hover:text-brand-charcoal hover:decoration-brand-charcoal"
          >
            {hasPayoutMethod ? "Update payout method" : "Add payout method"}
          </Link>
        </div>

        <p className="mt-2 font-display text-3xl font-bold text-brand-charcoal">
          ₦{totalPaid.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-neutral-400">Total paid out so far</p>

        {!payouts || payouts.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-neutral-300 p-8 text-center">
            <p className="text-sm text-neutral-500">
              No payouts yet. These appear once your usage has been pooled
              into a verified carbon batch and processed.
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-100 rounded-xl border border-neutral-100">
            {payouts.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-brand-charcoal">
                    ₦{Number(p.amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {new Date(p.created_at).toLocaleDateString("en-NG", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                    p.status === "paid"
                      ? "bg-brand-green/10 text-brand-green"
                      : p.status === "failed"
                        ? "bg-red-50 text-red-600"
                        : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {p.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
