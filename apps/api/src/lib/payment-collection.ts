import { createHmac, timingSafeEqual } from "node:crypto";
import { paystackRequest } from "./paystack-client.js";
import { env } from "./env.js";

interface InitializeInput {
  email: string;
  amountNgn: number;
  reference: string;
  metadata?: Record<string, unknown>;
}

interface InitializeResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

/**
 * Starts a Paystack-hosted checkout for a seeker paying to access a
 * host's excess energy. Returns a URL the browser redirects to — card,
 * bank transfer, and USSD are all handled by Paystack's own page, not
 * built by us.
 *
 * Paystack requires an email. Most users here only have a phone number
 * (Session 2's OTP-only auth) — see routes/energy-requests.ts for the
 * fallback placeholder-email approach, which is a real UX compromise
 * (no receipt email will actually arrive), not something to treat as
 * fully solved.
 */
export async function initializeTransaction(input: InitializeInput): Promise<InitializeResult> {
  const amountKobo = Math.round(input.amountNgn * 100);

  const data = await paystackRequest<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: amountKobo,
      reference: input.reference,
      metadata: input.metadata,
    }),
  });

  return {
    authorizationUrl: data.authorization_url,
    accessCode: data.access_code,
    reference: data.reference,
  };
}

/**
 * Server-side re-check of a transaction's status — used as a fallback if
 * a webhook is ever missed, and worth calling before trusting a webhook
 * payload's amount in high-stakes paths. Never rely on client-reported
 * payment success alone.
 */
export async function verifyTransaction(
  reference: string
): Promise<{ status: string; amountKobo: number }> {
  const data = await paystackRequest<{ status: string; amount: number }>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    { method: "GET" }
  );

  return { status: data.status, amountKobo: data.amount };
}

/**
 * Verifies the `x-paystack-signature` header on an incoming webhook:
 * HMAC-SHA512 of the raw request body, keyed with the secret key.
 * MUST be computed over the exact raw bytes Paystack sent — re-serializing
 * a parsed JSON object can silently change whitespace/key order and
 * break the signature, which is why index.ts captures rawBody separately
 * from the parsed body.
 */
export function verifyPaystackSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!signatureHeader) return false;

  const expected = createHmac("sha512", env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");

  // Constant-time comparison — a plain `===` leaks timing information
  // that could theoretically help an attacker forge a valid signature.
  // Buffers must be equal length for timingSafeEqual, so check that first.
  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(signatureHeader, "utf8");

  if (expectedBuf.length !== providedBuf.length) return false;

  return timingSafeEqual(expectedBuf, providedBuf);
}
