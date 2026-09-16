import * as Cesium from 'cesium';
import { GLSL_COLORMAPS } from '../../shaders/oceanColorMap.glsl';

let isMaterialRegistered = false;

export function registerOceanMaterials() {
  if (isMaterialRegistered) return;
  isMaterialRegistered = true;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const materialCache = (Cesium.Material as unknown as any)._materialCache;
  if (!materialCache) return;

  // ------------------------------------------------------------------
  // OceanDepthWall — applied to WallGeometry (perimeter of water column)
  // u_colormap: float 0-4 selects palette (turbo/thermal/haline/viridis/chloro)
  // u_activeDepthRatio: 0.0 at surface, 1.0 at seabed — draws active depth ring
  // ------------------------------------------------------------------
  materialCache.addMaterial('OceanDepthWall', {
    fabric: {
      type: 'OceanDepthWall',
      uniforms: {
        u_colormap: 1.0,        // float — thermal by default
        u_opacity: 0.85,
        u_activeDepthRatio: 0.0,
      },
      source: `
        ${GLSL_COLORMAPS}

        czm_material czm_getMaterial(czm_materialInput materialInput) {
          czm_material material = czm_getDefaultMaterial(materialInput);

          // st.t runs 1.0 at the top (sea surface) down to 0.0 at the wall bottom
          float depthProgress = 1.0 - materialInput.st.t;

          // Scientific value: warmer/higher at surface, drops with depth
          float val = clamp(1.0 - pow(depthProgress, 0.7), 0.0, 1.0);

          // Subtle depth contour lines every 10%
          float contourT = fract(depthProgress * 10.0);
          float contour = smoothstep(0.0, 0.06, contourT) * (1.0 - smoothstep(0.94, 1.0, contourT));

          // Active depth indicator ring
          float activeDiff = abs(depthProgress - u_activeDepthRatio);
          float activeLine = 1.0 - smoothstep(0.0, 0.014, activeDiff);

          vec4 col = evaluateOceanColor(val, u_colormap, u_opacity);
          vec3 rgb = col.rgb;

          // Blend contour lines (subtle white)
          rgb = mix(rgb, vec3(0.7, 0.85, 1.0), (1.0 - contour) * 0.3);
          // Active depth ring — bright gold
          rgb = mix(rgb, vec3(1.0, 0.92, 0.2), activeLine * 0.85);

          material.diffuse = rgb;
          material.alpha = clamp(u_opacity + activeLine * 0.15, 0.0, 1.0);
          material.emission = rgb * 0.2;
          return material;
        }
      `,
    },
    translucent: () => true,
  });

  // ------------------------------------------------------------------
  // OceanSliceSurface — applied to the top polygon (geographic footprint)
  // ------------------------------------------------------------------
  materialCache.addMaterial('OceanSliceSurface', {
    fabric: {
      type: 'OceanSliceSurface',
      uniforms: {
        u_colormap: 1.0,
        u_opacity: 0.8,
        u_time: 0.0,
      },
      source: `
        ${GLSL_COLORMAPS}

        czm_material czm_getMaterial(czm_materialInput materialInput) {
          czm_material material = czm_getDefaultMaterial(materialInput);

          vec2 st = materialInput.st;

          // Subtle animated caustic ripple
          float wave = sin(st.s * 36.0 + u_time * 1.8) * cos(st.t * 36.0 + u_time * 1.4) * 0.04;

          // Radial falloff from center
          float dist = distance(st, vec2(0.5, 0.5));
          float val = clamp(0.75 - dist * 0.6 + wave, 0.0, 1.0);

          vec4 col = evaluateOceanColor(val, u_colormap, u_opacity);

          material.diffuse = col.rgb;
          material.alpha = u_opacity;
          material.emission = col.rgb * 0.18;
          return material;
        }
      `,
    },
    translucent: () => true,
  });
}
