import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env.js";

const anthropic = env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null;

export interface BatchReviewInput {
  readingCount: number;
  flaggedCount: number;
  totalKwh: number;
}

export interface BatchReviewResult {
  verdict: "approve" | "flag";
  summary: string;
}

/**
 * Asks Claude to write a short MRV-style review note for a pooled carbon
 * batch, given only aggregate statistics — no per-user data, no PII.
 *
 * This is a narrative/explanatory layer on top of the deterministic
 * checks in `anomaly-detection.ts` and `carbon.ts` — it can only add
 * caution (downgrade a batch to `pending`), never override a deterministic
 * rejection. If no ANTHROPIC_API_KEY is configured, this is skipped
 * entirely and batches rely on the deterministic checks alone.
 *
 * Not yet tested against a live API key in this environment — same
 * caveat as the untested Paystack integration in Session 5.
 */
export async function reviewBatch(input: BatchReviewInput): Promise<BatchReviewResult | null> {
  if (!anthropic) return null;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `You are doing a quick MRV (measurement, reporting, verification) sanity check on a pooled batch of household solar telemetry before it's submitted for carbon credits.

Stats for this batch:
- ${input.readingCount} readings pooled
- ${input.flaggedCount} already flagged by statistical anomaly detection
- ${input.totalKwh} total kWh

Respond with ONLY a JSON object, no other text: {"verdict": "approve" or "flag", "summary": "<one plain sentence explaining why>"}`,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;

    const parsed = JSON.parse(textBlock.text);
    return {
      verdict: parsed.verdict === "flag" ? "flag" : "approve",
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
    };
  } catch (err) {
    // AI review is a bonus layer, not a dependency — if it fails for any
    // reason (network, bad JSON, rate limit), fall back to deterministic
    // checks rather than blocking the whole aggregation.
    console.error("AI batch review failed, continuing without it:", err);
    return null;
  }
}
