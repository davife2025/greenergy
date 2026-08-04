export interface ReadingWithId {
  id: string;
  kwh: number;
}

export interface AnomalyResult {
  flaggedIds: Set<string>;
  mean: number;
  stdDev: number;
}

/**
 * Per-link statistical anomaly detection: flags any reading whose kWh
 * value is more than `zThreshold` standard deviations from that SAME
 * link's own historical mean.
 *
 * This is deliberately per-link rather than across all pooled users —
 * a 3 kWh/day system and a 0.5 kWh/day system are both normal, just for
 * different households. What's actually suspicious is a single meter's
 * reading suddenly jumping far outside its own history. That's a
 * behavioral check a flat 0–15 kWh bound (Session 4's
 * `isPlausibleReading`) can't catch on its own.
 */
export function detectStatisticalAnomalies(
  readings: ReadingWithId[],
  zThreshold = 2.5
): AnomalyResult {
  if (readings.length < 4) {
    // Not enough history for a link to say anything meaningful yet —
    // don't flag based on too little data.
    return { flaggedIds: new Set(), mean: 0, stdDev: 0 };
  }

  const values = readings.map((r) => r.kwh);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  const flaggedIds = new Set<string>();
  if (stdDev > 0) {
    for (const r of readings) {
      const z = Math.abs(r.kwh - mean) / stdDev;
      if (z > zThreshold) flaggedIds.add(r.id);
    }
  }

  return {
    flaggedIds,
    mean: Number(mean.toFixed(4)),
    stdDev: Number(stdDev.toFixed(4)),
  };
}
