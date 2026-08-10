import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";

const NAV_LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/find-energy", label: "Find energy" },
  { href: "/dashboard/solar-profile", label: "My listing" },
  { href: "/dashboard/my-requests", label: "My requests" },
  { href: "/dashboard/link-account", label: "Link account" },
  { href: "/dashboard/report-usage", label: "Report usage" },
  { href: "/dashboard/payout-method", label: "Payout method" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-black/5">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="font-display text-lg font-bold text-brand-charcoal">
            greenenergy
          </Link>
          <nav className="flex items-center gap-5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-neutral-500 hover:text-brand-charcoal"
              >
                {link.label}
              </Link>
            ))}
            <LogoutButton />
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
