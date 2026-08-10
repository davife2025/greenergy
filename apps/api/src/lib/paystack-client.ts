import { env } from "./env.js";

export const PAYSTACK_BASE_URL = "https://api.paystack.co";

export async function paystackRequest<T>(path: string, init: RequestInit): Promise<T> {
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
