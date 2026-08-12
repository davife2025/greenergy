"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewBatch = reviewBatch;
const openai_1 = __importDefault(require("openai"));
const env_js_1 = require("./env.js");
// Hugging Face's Inference Providers expose an OpenAI-compatible API at
// this base URL, so the standard OpenAI SDK works directly against it —
// no HF-specific client needed. Model selection (Kimi K2) happens via
// the `model` field, not the base URL.
const client = env_js_1.env.HF_TOKEN
    ? new openai_1.default({ baseURL: "https://router.huggingface.co/v1", apiKey: env_js_1.env.HF_TOKEN })
    : null;
/**
 * Asks Kimi K2 (via Hugging Face Inference Providers) to write a short
 * MRV-style review note for a pooled carbon batch, given only aggregate
 * statistics — no per-user data, no PII.
 *
 * This is a narrative/explanatory layer on top of the deterministic
 * checks in `anomaly-detection.ts` and `carbon.ts` — it can only add
 * caution (downgrade a batch to `pending`), never override a
 * deterministic rejection. If no HF_TOKEN is configured, this is
 * skipped entirely and batches rely on the deterministic checks alone.
 *
 * Not yet tested against a live HF token in this environment — same
 * caveat as the untested Paystack integration in earlier sessions.
 */
async function reviewBatch(input) {
    if (!client)
        return null;
    try {
        const completion = await client.chat.completions.create({
            model: env_js_1.env.HF_INFERENCE_MODEL,
            max_tokens: 200,
            temperature: 0.6, // Moonshot AI's recommended temperature for Kimi K2 Instruct
            messages: [
                {
                    role: "user",
                    content: `You are doing a quick MRV (measurement, reporting, verification) sanity check on a pooled batch of household solar telemetry before it's submitted for carbon credits.

Stats for this batch:
- ${input.readingCount} readings pooled
- ${input.flaggedCount} already flagged by statistical anomaly detection
- ${input.totalKwh} total kWh

Respond with ONLY a JSON object, no other text, no markdown code fences: {"verdict": "approve" or "flag", "summary": "<one plain sentence explaining why>"}`,
                },
            ],
        });
        const text = completion.choices[0]?.message?.content;
        if (!text)
            return null;
        // Models occasionally wrap JSON in markdown fences despite
        // instructions not to — strip them defensively before parsing.
        const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
        const parsed = JSON.parse(cleaned);
        return {
            verdict: parsed.verdict === "flag" ? "flag" : "approve",
            summary: typeof parsed.summary === "string" ? parsed.summary : "",
        };
    }
    catch (err) {
        // AI review is a bonus layer, not a dependency — if it fails for any
        // reason (network, bad JSON, rate limit), fall back to deterministic
        // checks rather than blocking the whole aggregation.
        console.error("AI batch review failed, continuing without it:", err);
        return null;
    }
}
