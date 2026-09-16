import type { ColorScaleName } from '@/types/ocean';

export interface ColorStop {
  stop: number;
  color: string;
}

export const COLOR_SCALES: Record<ColorScaleName, ColorStop[]> = {
  turbo: [
    { stop: 0.0, color: '#30123b' },
    { stop: 0.2, color: '#4584f6' },
    { stop: 0.4, color: '#1ae4b6' },
    { stop: 0.6, color: '#a2fc3c' },
    { stop: 0.8, color: '#fb8022' },
    { stop: 1.0, color: '#7a0403' },
  ],
  thermal: [
    { stop: 0.0, color: '#0d0887' },
    { stop: 0.25, color: '#6a00a8' },
    { stop: 0.5, color: '#b12a90' },
    { stop: 0.75, color: '#e16462' },
    { stop: 0.9, color: '#fca636' },
    { stop: 1.0, color: '#f0f921' },
  ],
  haline: [
    { stop: 0.0, color: '#b2f0eb' },
    { stop: 0.33, color: '#2ec4b6' },
    { stop: 0.66, color: '#011627' },
    { stop: 1.0, color: '#010c1e' },
  ],
  viridis: [
    { stop: 0.0, color: '#440154' },
    { stop: 0.25, color: '#3b528b' },
    { stop: 0.5, color: '#21918c' },
    { stop: 0.75, color: '#5ec962' },
    { stop: 1.0, color: '#fde725' },
  ],
  chlorophyll: [
    { stop: 0.0, color: '#061c47' },
    { stop: 0.25, color: '#0e6ba8' },
    { stop: 0.5, color: '#00a878' },
    { stop: 0.75, color: '#a7e9af' },
    { stop: 1.0, color: '#ffe135' },
  ],
};

export function getCssGradient(scaleName: ColorScaleName): string {
  const stops = COLOR_SCALES[scaleName] || COLOR_SCALES.turbo;
  const parts = stops.map((s) => `${s.color} ${s.stop * 100}%`);
  return `linear-gradient(to right, ${parts.join(', ')})`;
}

// Convert [0..1] normalized value to RGB [r, g, b]
export function evaluateColorRgb(scaleName: ColorScaleName, t: number): [number, number, number] {
  const stops = COLOR_SCALES[scaleName] || COLOR_SCALES.turbo;
  const clampedT = Math.max(0, Math.min(1, t));

  // Find surrounding stops
  let lower = stops[0];
  let upper = stops[stops.length - 1];

  for (let i = 0; i < stops.length - 1; i++) {
    if (clampedT >= stops[i].stop && clampedT <= stops[i + 1].stop) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }

  const range = upper.stop - lower.stop || 1;
  const factor = (clampedT - lower.stop) / range;

  const hexToRgb = (hex: string): [number, number, number] => {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  };

  const [r1, g1, b1] = hexToRgb(lower.color);
  const [r2, g2, b2] = hexToRgb(upper.color);

  return [
    Math.round(r1 + (r2 - r1) * factor),
    Math.round(g1 + (g2 - g1) * factor),
    Math.round(b1 + (b2 - b1) * factor),
  ];
}
