import type { ColorScaleName } from '@/types/ocean';

export interface ColorStop {
  stop: number;
  color: string;
}

// ─── 6 Verified Oceanographic Colormaps ────────────────────────────────────

export const COLOR_SCALES: Record<ColorScaleName, ColorStop[]> = {
  /** Deep Navy → Cyan → Yellow → Crimson — Sea Temperature */
  thermal: [
    { stop: 0.00, color: '#04071a' },
    { stop: 0.12, color: '#0a1f6e' },
    { stop: 0.25, color: '#0055d4' },
    { stop: 0.38, color: '#00b8ff' },
    { stop: 0.50, color: '#00e5d4' },
    { stop: 0.62, color: '#76ff03' },
    { stop: 0.75, color: '#ffd000' },
    { stop: 0.88, color: '#ff7a00' },
    { stop: 1.00, color: '#d60036' },
  ],

  /** Fresh Blue → Emerald → Amber → Magenta — Practical Salinity */
  haline: [
    { stop: 0.00, color: '#040c33' },
    { stop: 0.20, color: '#003db3' },
    { stop: 0.40, color: '#0088ff' },
    { stop: 0.55, color: '#00e5c0' },
    { stop: 0.70, color: '#00f576' },
    { stop: 0.83, color: '#ffaa00' },
    { stop: 0.92, color: '#ff3b30' },
    { stop: 1.00, color: '#ff1a88' },
  ],

  /** High-contrast Google Turbo rainbow — Velocity / general scalar */
  turbo: [
    { stop: 0.00, color: '#30123b' },
    { stop: 0.12, color: '#4145ab' },
    { stop: 0.25, color: '#4584f6' },
    { stop: 0.38, color: '#1ae4b6' },
    { stop: 0.50, color: '#a2fc3c' },
    { stop: 0.62, color: '#fbe300' },
    { stop: 0.75, color: '#fb8022' },
    { stop: 0.88, color: '#d93806' },
    { stop: 1.00, color: '#7a0403' },
  ],

  /** Perceptually uniform, colorblind-safe */
  viridis: [
    { stop: 0.00, color: '#440154' },
    { stop: 0.13, color: '#481f70' },
    { stop: 0.25, color: '#3b528b' },
    { stop: 0.38, color: '#2c718e' },
    { stop: 0.50, color: '#21908d' },
    { stop: 0.63, color: '#28ae80' },
    { stop: 0.75, color: '#5ec962' },
    { stop: 0.88, color: '#addc30' },
    { stop: 1.00, color: '#fde725' },
  ],

  /** Deep Indigo → Aquamarine → Neon Lime → Forest Green — Chlorophyll-a */
  chlorophyll: [
    { stop: 0.00, color: '#06081c' },
    { stop: 0.15, color: '#1e164d' },
    { stop: 0.28, color: '#004c9e' },
    { stop: 0.42, color: '#00a8ff' },
    { stop: 0.55, color: '#00e5bb' },
    { stop: 0.68, color: '#00c853' },
    { stop: 0.80, color: '#76ff03' },
    { stop: 0.90, color: '#00ff55' },
    { stop: 1.00, color: '#b9f500' },
  ],

  /** Balanced divergent ±anomaly — cool blue ↔ warm red */
  coolwarm: [
    { stop: 0.00, color: '#053061' },
    { stop: 0.15, color: '#2166ac' },
    { stop: 0.30, color: '#74add1' },
    { stop: 0.42, color: '#abd9e9' },
    { stop: 0.50, color: '#f7f7f7' },
    { stop: 0.58, color: '#fee090' },
    { stop: 0.70, color: '#fdae61' },
    { stop: 0.85, color: '#d73027' },
    { stop: 1.00, color: '#67001f' },
  ],
};

// ─── Gradient CSS helper ────────────────────────────────────────────────────

export function getCssGradient(scaleName: ColorScaleName): string {
  const stops = COLOR_SCALES[scaleName] ?? COLOR_SCALES.thermal;
  const parts = stops.map((s) => `${s.color} ${s.stop * 100}%`);
  return `linear-gradient(to right, ${parts.join(', ')})`;
}

// ─── Internal hex→rgb helper ────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// ─── Normalized [0..1] → RGB interpolation ──────────────────────────────────

export function interpolateNormalizedColor(
  t: number,
  stops: ColorStop[],
): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  let lower = stops[0];
  let upper = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (clamped >= stops[i].stop && clamped <= stops[i + 1].stop) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }
  const range = upper.stop - lower.stop || 1;
  const factor = (clamped - lower.stop) / range;
  const [r1, g1, b1] = hexToRgb(lower.color);
  const [r2, g2, b2] = hexToRgb(upper.color);
  return [
    Math.round(r1 + (r2 - r1) * factor),
    Math.round(g1 + (g2 - g1) * factor),
    Math.round(b1 + (b2 - b1) * factor),
  ];
}

/** Linear [min..max] → RGB using the given colormap */
export function getLinearColor(
  value: number,
  minVal: number,
  maxVal: number,
  scaleName: ColorScaleName,
): [number, number, number] {
  const stops = COLOR_SCALES[scaleName] ?? COLOR_SCALES.thermal;
  const range = maxVal - minVal || 1;
  const t = (value - minVal) / range;
  return interpolateNormalizedColor(t, stops);
}

/** Log₁₀ [minVal..maxVal] → RGB — keeps low Chlorophyll values visible */
export function getLogColor(
  value: number,
  minVal = 0.01,
  maxVal = 10.0,
  scaleName: ColorScaleName = 'chlorophyll',
): [number, number, number] {
  const stops = COLOR_SCALES[scaleName] ?? COLOR_SCALES.chlorophyll;
  const clamped = Math.max(minVal, Math.min(maxVal, value));
  const logMin = Math.log10(minVal);
  const logMax = Math.log10(maxVal);
  const t = (Math.log10(clamped) - logMin) / (logMax - logMin || 1);
  return interpolateNormalizedColor(t, stops);
}

// ─── Legacy evaluateColorRgb (kept for backwards compatibility) ─────────────

export function evaluateColorRgb(
  scaleName: ColorScaleName,
  t: number,
): [number, number, number] {
  return interpolateNormalizedColor(
    t,
    COLOR_SCALES[scaleName] ?? COLOR_SCALES.thermal,
  );
}

export type OceanVariable = 'temperature' | 'salinity' | 'currents' | 'chlorophyll';

export interface ColorbarState {
  colormap: ColorScaleName;
  scaleMode: 'linear' | 'log';
  minVal: number;
  maxVal: number;
  vExaggeration: number;
}

export const VARIABLE_DEFAULTS: Record<
  OceanVariable,
  { min: number; max: number; step: number; unit: string; colormap: ColorScaleName }
> = {
  temperature: { min: 2,    max: 32,   step: 0.5, unit: '°C',    colormap: 'thermal' },
  salinity:    { min: 33.0, max: 37.0, step: 0.1, unit: 'PSU',   colormap: 'haline'  },
  currents:    { min: 0,    max: 0.5,  step: 0.01, unit: 'm/s',  colormap: 'turbo'   },
  chlorophyll: { min: 0.01, max: 5.0,  step: 0.01, unit: 'mg/m³', colormap: 'chlorophyll' },
};

