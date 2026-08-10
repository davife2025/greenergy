interface SyntheticReading {
    reading_start: string;
    reading_end: string;
    kwh: number;
}
/**
 * Generates `days` worth of daily kWh readings ending today, with mild
 * random noise and occasional "cloudy day" dips so the resulting chart
 * looks like real solar usage rather than a flat synthetic line.
 *
 * This exists purely so the product has something real to render before
 * Session 7 wires up an actual energy-provider integration.
 */
export declare function generateSyntheticReadings(days?: number): SyntheticReading[];
export {};
