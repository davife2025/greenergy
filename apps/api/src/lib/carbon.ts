/**
 * Nigeria grid emissions factor: 403.5 gCO2/kWh.
 *
 * Source: IEA, Emissions Factors 2025 (provisional 2024 electricity
 * generation data), as republished by ABB's 2025 Electricity Emission
 * Factors reference sheet. Cross-checked against the Climate Transparency
 * Report 2020 figure of 402 gCO2/kWh for Nigeria — the two are consistent.
 *
 * This should be revisited periodically (grid mix shifts as gas/renewable
 * share changes) and swapped for a live grid-operator API if one becomes
 * available, rather than left as a static constant indefinitely.
 */
export const NIGERIA_GRID_EMISSION_FACTOR_KG_PER_KWH = 0.4035;

export function estimateTonsCo2e(totalKwh: number): number {
  const kg = totalKwh * NIGERIA_GRID_EMISSION_FACTOR_KG_PER_KWH;
  return Number((kg / 1000).toFixed(6));
}

/**
 * Rule-based sanity check on a single reading, ahead of Session 6's
 * proper ML/AI-driven fraud + anomaly detection. Catches the obviously
 * wrong cases (negative, or implausibly large for a small home system)
 * so a single bad reading can't corrupt a whole batch.
 */
const MAX_PLAUSIBLE_DAILY_KWH = 15;

export function isPlausibleReading(kwh: number): boolean {
  return kwh >= 0 && kwh <= MAX_PLAUSIBLE_DAILY_KWH;
}
