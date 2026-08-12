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
export declare function detectStatisticalAnomalies(readings: ReadingWithId[], zThreshold?: number): AnomalyResult;
