// GLSL Shaders for Scientific Ocean Colormaps
// Written for GLSL ES 1.0 (WebGL 1.0) — Cesium's material system target

// All colormap index comparisons use float (GLSL ES 1.0 does not support
// integer parameters in user-defined functions)

export const GLSL_COLORMAPS = `
// Fast polynomial Turbo colormap
vec3 colormapTurbo(float x) {
  x = clamp(x, 0.0, 1.0);
  vec3 r = vec3(
    0.13572138 + 4.61539260*x - 42.66032258*x*x + 132.13108234*x*x*x - 152.94239396*x*x*x*x + 59.28637943*x*x*x*x*x,
    0.09140261 + 2.19418839*x + 4.84296658*x*x - 14.18503333*x*x*x + 4.27729857*x*x*x*x + 2.82956604*x*x*x*x*x,
    0.10667330 + 12.64194608*x - 60.58204836*x*x + 110.36276771*x*x*x - 89.90310912*x*x*x*x + 27.34824973*x*x*x*x*x
  );
  return clamp(r, 0.0, 1.0);
}

// Thermal palette (deep indigo -> crimson -> orange -> yellow)
vec3 colormapThermal(float x) {
  x = clamp(x, 0.0, 1.0);
  vec3 a, b;
  float t;
  if (x < 0.25) {
    t = x / 0.25;
    a = vec3(0.05, 0.05, 0.25);
    b = vec3(0.25, 0.05, 0.55);
  } else if (x < 0.5) {
    t = (x - 0.25) / 0.25;
    a = vec3(0.25, 0.05, 0.55);
    b = vec3(0.85, 0.15, 0.2);
  } else if (x < 0.75) {
    t = (x - 0.5) / 0.25;
    a = vec3(0.85, 0.15, 0.2);
    b = vec3(1.0, 0.6, 0.05);
  } else {
    t = (x - 0.75) / 0.25;
    a = vec3(1.0, 0.6, 0.05);
    b = vec3(1.0, 0.98, 0.7);
  }
  return mix(a, b, t);
}

// Haline palette (freshwater cyan -> turquoise -> navy)
vec3 colormapHaline(float x) {
  x = clamp(x, 0.0, 1.0);
  vec3 a, b;
  float t;
  if (x < 0.33) {
    t = x / 0.33;
    a = vec3(0.7, 0.95, 0.95);
    b = vec3(0.0, 0.8, 0.75);
  } else if (x < 0.66) {
    t = (x - 0.33) / 0.33;
    a = vec3(0.0, 0.8, 0.75);
    b = vec3(0.05, 0.4, 0.8);
  } else {
    t = (x - 0.66) / 0.34;
    a = vec3(0.05, 0.4, 0.8);
    b = vec3(0.02, 0.1, 0.45);
  }
  return mix(a, b, t);
}

// Viridis colormap
vec3 colormapViridis(float x) {
  x = clamp(x, 0.0, 1.0);
  vec3 a, b;
  float t;
  if (x < 0.33) {
    t = x / 0.33;
    a = vec3(0.267, 0.004, 0.329);
    b = vec3(0.190, 0.407, 0.556);
  } else if (x < 0.66) {
    t = (x - 0.33) / 0.33;
    a = vec3(0.190, 0.407, 0.556);
    b = vec3(0.208, 0.718, 0.472);
  } else {
    t = (x - 0.66) / 0.34;
    a = vec3(0.208, 0.718, 0.472);
    b = vec3(0.993, 0.906, 0.144);
  }
  return mix(a, b, t);
}

// Chlorophyll palette (deep blue -> cyan -> green -> gold)
vec3 colormapChlorophyll(float x) {
  x = clamp(x, 0.0, 1.0);
  vec3 a, b;
  float t;
  if (x < 0.25) {
    t = x / 0.25;
    a = vec3(0.02, 0.08, 0.35);
    b = vec3(0.05, 0.4, 0.6);
  } else if (x < 0.5) {
    t = (x - 0.25) / 0.25;
    a = vec3(0.05, 0.4, 0.6);
    b = vec3(0.1, 0.75, 0.4);
  } else if (x < 0.75) {
    t = (x - 0.5) / 0.25;
    a = vec3(0.1, 0.75, 0.4);
    b = vec3(0.7, 0.9, 0.1);
  } else {
    t = (x - 0.75) / 0.25;
    a = vec3(0.7, 0.9, 0.1);
    b = vec3(1.0, 0.65, 0.0);
  }
  return mix(a, b, t);
}

// Unified colormap dispatch — uses float index to stay GLSL ES 1.0 compatible
// 0.0=turbo  1.0=thermal  2.0=haline  3.0=viridis  4.0=chlorophyll
vec4 evaluateOceanColor(float normalizedVal, float colormapIdx, float opacity) {
  if (normalizedVal < 0.0) {
    return vec4(0.0, 0.0, 0.0, 0.0);
  }
  vec3 rgb;
  if (colormapIdx < 0.5) {
    rgb = colormapTurbo(normalizedVal);
  } else if (colormapIdx < 1.5) {
    rgb = colormapThermal(normalizedVal);
  } else if (colormapIdx < 2.5) {
    rgb = colormapHaline(normalizedVal);
  } else if (colormapIdx < 3.5) {
    rgb = colormapViridis(normalizedVal);
  } else {
    rgb = colormapChlorophyll(normalizedVal);
  }
  return vec4(rgb, opacity);
}
`;
