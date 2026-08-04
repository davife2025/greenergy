import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: links } = await supabase
    .from("energy_provider_links")
    .select("id, provider, external_account_id, status, linked_at")
    .eq("user_id", user.id)
    .order("linked_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-2xl font-bold text-brand-charcoal">
        Your dashboard
      </h1>
      <p className="mt-1 text-sm text-neutral-500">{user.phone}</p>

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

      <section className="mt-12 rounded-xl bg-brand-gray/60 p-6">
        <p className="text-sm text-neutral-600">
          Earnings and payout history will appear here once your usage data
          starts flowing in — that's Session 3 and beyond.
        </p>
      </section>
    </main>
  );
}
