"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSyntheticReadings = generateSyntheticReadings;
/**
 * Generates `days` worth of daily kWh readings ending today, with mild
 * random noise and occasional "cloudy day" dips so the resulting chart
 * looks like real solar usage rather than a flat synthetic line.
 *
 * This exists purely so the product has something real to render before
 * Session 7 wires up an actual energy-provider integration.
 */
function generateSyntheticReadings(days = 30) {
    const readings = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
        const start = new Date(today);
        start.setUTCHours(0, 0, 0, 0);
        start.setUTCDate(start.getUTCDate() - i);
        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 1);
        const base = 1.4; // kWh/day for a typical small solar-home-system
        const noise = (Math.random() - 0.5) * 0.8;
        const isCloudyDay = Math.random() < 0.15;
        const kwh = isCloudyDay
            ? Math.max(0, base * 0.2 + noise * 0.2)
            : Math.max(0.1, base + noise);
        readings.push({
            reading_start: start.toISOString(),
            reading_end: end.toISOString(),
            kwh: Number(kwh.toFixed(3)),
        });
    }
    return readings;
}
