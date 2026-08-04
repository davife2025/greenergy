import { env } from "./env.js";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

/**
 * Nigerian fintech/mobile-money wallets are NUBAN accounts under the hood
 * (a phone number acts as the account number), so Paystack's standard
 * bank-transfer recipient type ("nuban") works for them directly — no
 * separate "mobile money" recipient type needed here (that Paystack
 * feature is Ghana/Kenya-only, not applicable to this Nigeria pilot).
 *
 * Codes confirmed against Paystack's List Banks endpoint as of this
 * session — re-verify via that endpoint before going live, since these
 * can occasionally change.
 */
const BANK_CODES: Record<string, string> = {
  opay: "999992",
  palmpay: "999991",
  moniepoint: "50515",
};

interface CreateRecipientInput {
  name: string;
  provider: string;
  accountNumber: string;
}

interface InitiateTransferInput {
  recipientCode: string;
  amountNgn: number;
  reason: string;
  reference: string;
}

async function paystackRequest<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const body = (await res.json()) as { status: boolean; message?: string; data: T };

  if (!res.ok || body.status === false) {
    throw new Error(body.message ?? `Paystack request to ${path} failed (${res.status})`);
  }

  return body.data as T;
}

export function isSupportedPayoutProvider(provider: string): boolean {
  return provider in BANK_CODES;
}

export async function createTransferRecipient(
  input: CreateRecipientInput
): Promise<{ recipientCode: string }> {
  const bankCode = BANK_CODES[input.provider];
  if (!bankCode) {
    throw new Error(
      `Unsupported mobile money provider: ${input.provider}. Only opay, palmpay, and moniepoint are wired up for this Nigeria pilot.`
    );
  }

  const data = await paystackRequest<{ recipient_code: string }>("/transferrecipient", {
    method: "POST",
    body: JSON.stringify({
      type: "nuban",
      name: input.name,
      account_number: input.accountNumber,
      bank_code: bankCode,
      currency: "NGN",
    }),
  });

  return { recipientCode: data.recipient_code };
}

export async function initiateTransfer(
  input: InitiateTransferInput
): Promise<{ status: string; paystackReference: string }> {
  // Paystack amounts are in kobo (1 NGN = 100 kobo).
  const amountKobo = Math.round(input.amountNgn * 100);

  const data = await paystackRequest<{ status: string; reference: string }>("/transfer", {
    method: "POST",
    body: JSON.stringify({
      source: "balance",
      amount: amountKobo,
      recipient: input.recipientCode,
      reason: input.reason,
      reference: input.reference,
    }),
  });

  return { status: data.status, paystackReference: data.reference };
}
