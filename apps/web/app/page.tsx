import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function LeafMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path
        d="M 50 14 C 22 24 8 52 50 96 C 92 52 78 24 50 14 Z"
        fill="none"
        stroke="#1D9E75"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 32 80 L 46 50 L 38 40 L 66 16"
        fill="none"
        stroke="#2C2C2A"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M 66 16 L 52 20 L 62 30 Z" fill="#2C2C2A" />
    </svg>
  );
}

function ListingCard() {
  return (
    <div className="relative mx-auto w-full max-w-sm rotate-2 rounded-2xl border border-black/5 bg-white p-6 shadow-xl shadow-brand-charcoal/10 sm:rotate-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-widest text-neutral-400">
          Excess energy sold
        </span>
        <LeafMark className="h-6 w-6" />
      </div>

      <p className="mt-6 font-display text-4xl font-bold text-brand-charcoal">
        ₦200
      </p>
      <p className="mt-1 text-sm text-neutral-500">
        Paid instantly via Paystack · neighbor 300m away
      </p>

      <div className="mt-6 flex items-end gap-1">
        {[18, 26, 22, 34, 30, 44, 40, 56].map((h, i) => (
          <span
            key={i}
            className="w-full rounded-sm bg-brand-green/20"
            style={{ height: `${h}px` }}
          />
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-black/5 pt-4 text-sm">
        <span className="text-neutral-500">Near Shoprite, Ikeja</span>
        <span className="font-medium text-brand-green">1.8 kWh shared</span>
      </div>
    </div>
  );
}

const steps = [
  {
    number: "01",
    title: "List your excess energy",
    body: "Tell us your solar panel's output and your home's usage. We work out what's spare and list it for you.",
  },
  {
    number: "02",
    title: "Someone nearby finds you",
    body: "People searching for a charge nearby see your listing by location and request access.",
  },
  {
    number: "03",
    title: "Get paid instantly",
    body: "They pay through Paystack before showing up. You get your share the moment they confirm they got their charge.",
  },
];

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const primaryCta = user
    ? { href: "/dashboard", label: "Go to dashboard" }
    : { href: "/login", label: "Get started" };

  return (
    <main className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <LeafMark className="h-7 w-7" />
          <span className="font-display text-lg font-bold tracking-tight text-brand-charcoal">
            greenenergy
          </span>
        </div>
        <Link
          href={primaryCta.href}
          className="rounded-full bg-brand-charcoal px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
        >
          {primaryCta.label}
        </Link>
      </header>

      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-6 py-16 sm:py-24 lg:grid-cols-2">
        <div>
          <span className="inline-block rounded-full bg-brand-gray px-3 py-1 text-xs font-medium uppercase tracking-widest text-neutral-500">
            Now piloting in Nigeria
          </span>
          <h1 className="mt-6 font-display text-4xl font-bold leading-tight tracking-tight text-brand-charcoal sm:text-5xl">
            You have solar power to spare.
            <span className="text-brand-green"> Someone nearby needs it.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-neutral-600">
            List your excess solar energy, get found by people nearby who
            need to charge a device, and get paid instantly through
            Paystack — no waiting, no middlemen.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href={primaryCta.href}
              className="rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-green-deep"
            >
              {primaryCta.label}
            </Link>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-brand-charcoal underline decoration-neutral-300 underline-offset-4 hover:decoration-brand-charcoal"
            >
              See how it works
            </a>
            <Link
              href="/find-energy"
              className="text-sm font-medium text-brand-charcoal underline decoration-neutral-300 underline-offset-4 hover:decoration-brand-charcoal"
            >
              Browse energy near you
            </Link>
          </div>
        </div>

        <ListingCard />
      </section>

      <section id="how-it-works" className="border-t border-black/5 bg-brand-gray/50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-display text-2xl font-bold text-brand-charcoal">
            How it works
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-10 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number}>
                <span className="font-display text-sm font-bold text-brand-green">
                  {step.number}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-brand-charcoal">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-16 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <LeafMark className="h-5 w-5" />
          <span className="text-sm text-neutral-500">
            © {new Date().getFullYear()} Greenenergy. Turning spare solar power into someone's next charge.
          </span>
        </div>
      </footer>
    </main>
  );
}
