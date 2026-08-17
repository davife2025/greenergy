import { writeFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";
import { env } from "./env.js";

/**
 * Vertex AI (unlike the plain Gemini Developer API) needs Application
 * Default Credentials, not just an API key. On a non-GCP host like
 * Render/Fly, the standard pattern is: write the service account JSON
 * to the one reliably-writable path (/tmp), point
 * GOOGLE_APPLICATION_CREDENTIALS at it, and let the SDK's normal ADC
 * lookup find it from there — same code path as if this were actually
 * running on GCP.
 */
function buildClient(): GoogleGenAI | null {
  if (!env.GCP_SA_KEY || !env.GOOGLE_CLOUD_PROJECT) return null;

  try {
    const keyPath = "/tmp/gcp-sa-key.json";
    writeFileSync(keyPath, env.GCP_SA_KEY);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;

    return new GoogleGenAI({
      vertexai: true,
      project: env.GOOGLE_CLOUD_PROJECT,
      location: env.GOOGLE_CLOUD_LOCATION,
    });
  } catch (err) {
    console.error("Failed to initialize Vertex AI client:", err);
    return null;
  }
}

const client = buildClient();

export interface SolarProfileReview {
  plausible: boolean;
  note: string;
}

export interface SolarProfileReviewInput {
  panelWatts: number | null;
  dailyGenerationKwh: number;
  dailyConsumptionKwh: number;
}

/**
 * Asks Gemini (via Vertex AI) whether a host's self-reported solar
 * generation/consumption figures look realistic for a small home solar
 * setup. This is the ONLY verification layer solar_profiles has —
 * unlike telemetry_readings (which gets Session 6's statistical anomaly
 * detection), self-reported listing data had no plausibility check at
 * all until this. Purely advisory: never blocks saving a profile, only
 * attaches a note the host and any reviewer can see.
 *
 * Returns null (skips cleanly) if GCP credentials aren't configured —
 * same resilience pattern as the Kimi K2 review layer.
 */
export async function reviewSolarProfile(
  input: SolarProfileReviewInput
): Promise<SolarProfileReview | null> {
  if (!client) return null;

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `A user is listing excess solar energy on a marketplace app in Nigeria. Sanity-check these self-reported numbers for a small home solar setup:

- Panel wattage: ${input.panelWatts ?? "not provided"}
- Claimed daily generation: ${input.dailyGenerationKwh} kWh
- Claimed daily home consumption: ${input.dailyConsumptionKwh} kWh

Respond with ONLY a JSON object, no other text, no markdown fences: {"plausible": true or false, "note": "<one short plain sentence explaining your assessment>"}`,
    });

    const text = response.text;
    if (!text) return null;

    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
    const parsed = JSON.parse(cleaned);

    return {
      plausible: parsed.plausible !== false,
      note: typeof parsed.note === "string" ? parsed.note : "",
    };
  } catch (err) {
    console.error("Gemini solar profile review failed, continuing without it:", err);
    return null;
  }
}
