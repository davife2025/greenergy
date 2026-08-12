import "dotenv/config";

// Deliberately does NOT import ./lib/env.js — that module throws on the
// first missing variable, which is exactly wrong for a checklist that
// should report everything wrong in one run, not just the first thing.

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

const results: CheckResult[] = [];

function check(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
}

async function main() {
  console.log("Running Greenenergy API preflight check...\n");

  // ── 1. Package manager sanity ──────────────────────────────
  const fs = await import("node:fs");
  const path = await import("node:path");
  const repoRoot = path.resolve(process.cwd(), "../..");

  const hasPnpmLock = fs.existsSync(path.join(repoRoot, "pnpm-lock.yaml"));
  const hasNpmLock = fs.existsSync(path.join(repoRoot, "package-lock.json"));
  const hasYarnLock = fs.existsSync(path.join(repoRoot, "yarn.lock"));

  check(
    "Using pnpm (not npm/yarn)",
    hasPnpmLock && !hasNpmLock && !hasYarnLock,
    hasNpmLock
      ? "Found package-lock.json — this repo uses pnpm workspaces (workspace:* deps), npm will not install correctly. Delete package-lock.json and node_modules, then `pnpm install`."
      : hasYarnLock
        ? "Found yarn.lock — use pnpm instead. Delete yarn.lock and node_modules, then `pnpm install`."
        : hasPnpmLock
          ? "pnpm-lock.yaml found."
          : "No lockfile found yet — run `pnpm install` first."
  );

  // ── 2. Node version ─────────────────────────────────────────
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  check(
    "Node.js version >= 20",
    nodeMajor >= 20,
    `Running Node ${process.versions.node}${nodeMajor < 20 ? " — this repo requires Node 20+" : ""}`
  );

  // ── 3. Required env vars present ────────────────────────────
  const required = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ADMIN_JOB_SECRET",
    "PAYSTACK_SECRET_KEY",
  ];
  const optional = ["HF_TOKEN"];

  for (const key of required) {
    const value = process.env[key];
    check(`${key} is set`, Boolean(value && value.length > 0), value ? "present" : "MISSING — check apps/api/.env against .env.example");
  }
  for (const key of optional) {
    const value = process.env[key];
    check(`${key} is set (optional)`, true, value ? "present — AI review layer enabled" : "not set — AI review layer will be skipped, that's fine");
  }

  // ── 4. Real Supabase connectivity ───────────────────────────
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/users?select=id&limit=1`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        signal: AbortSignal.timeout(8000),
      });
      if (res.status === 404 || res.status >= 500) {
        check("Supabase reachable", false, `Got HTTP ${res.status} — project URL may be wrong, or migrations haven't been run yet (users table missing).`);
      } else {
        check("Supabase reachable", true, `HTTP ${res.status} — connection works, service role key is valid.`);
      }
    } catch (err) {
      check("Supabase reachable", false, `Could not reach ${supabaseUrl} — ${err instanceof Error ? err.message : "unknown error"}. Check the URL is correct and you have internet access.`);
    }
  } else {
    check("Supabase reachable", false, "Skipped — SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set.");
  }

  // ── 5. Real Paystack key validity ───────────────────────────
  const paystackKey = process.env.PAYSTACK_SECRET_KEY;
  if (paystackKey) {
    try {
      const res = await fetch("https://api.paystack.co/bank?currency=NGN", {
        headers: { Authorization: `Bearer ${paystackKey}` },
        signal: AbortSignal.timeout(8000),
      });
      if (res.status === 401 || res.status === 403) {
        check("Paystack key valid", false, `HTTP ${res.status} — this secret key is invalid, revoked, or malformed.`);
      } else if (!res.ok) {
        check("Paystack key valid", false, `HTTP ${res.status} — unexpected response, check Paystack's status page.`);
      } else {
        const isTestKey = paystackKey.startsWith("sk_test_");
        check(
          "Paystack key valid",
          true,
          `Key works. ${isTestKey ? "This is a TEST key — no real money will move. Switch to sk_live_... when ready for real transactions." : "⚠ This is a LIVE key — real money WILL move."}`
        );
      }
    } catch (err) {
      check("Paystack key valid", false, `Could not reach Paystack — ${err instanceof Error ? err.message : "unknown error"}.`);
    }
  } else {
    check("Paystack key valid", false, "Skipped — PAYSTACK_SECRET_KEY not set.");
  }

  // ── Report ───────────────────────────────────────────────────
  const width = Math.max(...results.map((r) => r.name.length)) + 2;
  for (const r of results) {
    const icon = r.ok ? "✅" : "❌";
    console.log(`${icon} ${r.name.padEnd(width)} ${r.detail}`);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);

  if (failed.length > 0) {
    console.log("\nFix the ❌ items above before running `pnpm dev` — each one explains what's wrong.");
    process.exit(1);
  } else {
    console.log("\nEverything checks out. Safe to run `pnpm dev`.");
  }
}

main().catch((err) => {
  console.error("Preflight check crashed unexpectedly:", err);
  process.exit(1);
});
