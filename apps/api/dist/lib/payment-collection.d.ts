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
export declare function initializeTransaction(input: InitializeInput): Promise<InitializeResult>;
/**
 * Server-side re-check of a transaction's status — used as a fallback if
 * a webhook is ever missed, and worth calling before trusting a webhook
 * payload's amount in high-stakes paths. Never rely on client-reported
 * payment success alone.
 */
export declare function verifyTransaction(reference: string): Promise<{
    status: string;
    amountKobo: number;
}>;
/**
 * Verifies the `x-paystack-signature` header on an incoming webhook:
 * HMAC-SHA512 of the raw request body, keyed with the secret key.
 * MUST be computed over the exact raw bytes Paystack sent — re-serializing
 * a parsed JSON object can silently change whitespace/key order and
 * break the signature, which is why index.ts captures rawBody separately
 * from the parsed body.
 */
export declare function verifyPaystackSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean;
export {};
