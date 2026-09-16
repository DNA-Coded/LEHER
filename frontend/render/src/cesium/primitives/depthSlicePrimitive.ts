import * as Cesium from 'cesium';
import type { OceanRegion, OceanVariable, ColorScaleName } from '../../types/ocean';
import { evaluateColorRgb } from '../../utils/colorScales';

export interface DepthSliceRenderOptions {
  region: OceanRegion;
  variable: OceanVariable;
  activeDepth: number;
  maxDepth: number;
  verticalExaggeration: number;
  opacity: number;
  colorScale: ColorScaleName;
  showIsoPlanes: boolean;
}

// Map ColorScaleName → GLSL float index
// 0.0=turbo 1.0=thermal 2.0=haline 3.0=viridis 4.0=chlorophyll
function colormapToFloat(colorScale: ColorScaleName): number {
  switch (colorScale) {
    case 'turbo': return 0.0;
    case 'thermal': return 1.0;
    case 'haline': return 2.0;
    case 'viridis': return 3.0;
    case 'chlorophyll': return 4.0;
    default: return 1.0;
  }
}

export class DepthSlice3DPrimitive {
  private viewer: Cesium.Viewer;
  private primitiveCollection: Cesium.PrimitiveCollection;
  private labelCollection: Cesium.LabelCollection;
  private currentRegionId: string | null = null;
  private animationProgress = 0.0;
  private animationFrameId: number | null = null;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
    this.primitiveCollection = new Cesium.PrimitiveCollection();
    this.labelCollection = new Cesium.LabelCollection({ scene: viewer.scene });
    this.viewer.scene.primitives.add(this.primitiveCollection);
    this.viewer.scene.primitives.add(this.labelCollection);
  }

  public update(options: DepthSliceRenderOptions, animateEnter = false) {
    const { region } = options;
    if (this.currentRegionId !== region.id || animateEnter) {
      this.currentRegionId = region.id;
      this.animationProgress = 0.0;
      this.startEnterAnimation(options);
    } else {
      this.clearAndRebuild(options, this.animationProgress);
    }
  }

  private startEnterAnimation(options: DepthSliceRenderOptions) {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    const startTime = performance.now();
    const duration = 1400;

    const animate = (now: number) => {
      const t = Math.min(1.0, (now - startTime) / duration);
      // Cubic ease-out
      const eased = 1.0 - Math.pow(1.0 - t, 3);
      this.animationProgress = eased;
      this.clearAndRebuild(options, eased);
      if (t < 1.0) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.animationFrameId = null;
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  private clearAndRebuild(options: DepthSliceRenderOptions, progress: number) {
    this.primitiveCollection.removeAll();
    this.labelCollection.removeAll();
    if (progress < 0.02) return;

    try {
      this.buildGeometry(options, progress);
    } catch (err) {
      // Shader compile errors must NOT kill the Cesium render loop.
      // Log to console and fall back to a simple colored polygon.
      console.warn('[DepthSlice] Geometry build error — falling back to simple mode:', err);
      this.buildFallback(options, progress);
    }
  }

  private buildGeometry(options: DepthSliceRenderOptions, progress: number) {
    const { region, activeDepth, maxDepth, verticalExaggeration, opacity, colorScale, showIsoPlanes, variable } = options;

    const polyCoords = region.polygon;
    if (!polyCoords || polyCoords.length < 3) return;

    const flatCoords: number[] = polyCoords.flatMap(([lon, lat]) => [lon, lat]);
    const positions = Cesium.Cartesian3.fromDegreesArray(flatCoords);

    // Visual column parameters
    const baseLift = 50000.0; // 50km visual lift above geoid
    const columnDepth = (maxDepth / 1000) * (verticalExaggeration * 1200.0);
    const currentDepth = columnDepth * progress;
    const colormapIdx = colormapToFloat(colorScale);
    const depthRatio = Math.min(1.0, activeDepth / (maxDepth || 1));

    // ── 1. VERTICAL BATHYMETRIC WALLS ────────────────────────────────
    const topHeights = new Array<number>(positions.length).fill(baseLift);
    const bottomHeights = new Array<number>(positions.length).fill(baseLift - currentDepth);

    const wallGeometry = new Cesium.WallGeometry({
      positions,
      maximumHeights: topHeights,
      minimumHeights: bottomHeights,
    });

    let wallAppearance: Cesium.Appearance;
    try {
      const wallMaterial = Cesium.Material.fromType('OceanDepthWall', {
        u_colormap: colormapIdx,
        u_opacity: opacity * progress,
        u_activeDepthRatio: depthRatio,
      });
      wallAppearance = new Cesium.MaterialAppearance({
        material: wallMaterial,
        translucent: true,
        closed: false,
        faceForward: true,
      });
    } catch {
      // Fallback to simple color if custom material fails
      wallAppearance = new Cesium.PerInstanceColorAppearance({ translucent: true });
    }

    const wallPrimitive = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: wallGeometry,
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(
            Cesium.Color.fromCssColorString(region.themeColor).withAlpha(opacity * 0.8 * progress)
          ),
        },
      }),
      appearance: wallAppearance,
      asynchronous: false,
    });
    this.primitiveCollection.add(wallPrimitive);

    // ── 2. TOP SURFACE WATER POLYGON ─────────────────────────────────
    let surfaceAppearance: Cesium.Appearance;
    try {
      const surfaceMaterial = Cesium.Material.fromType('OceanSliceSurface', {
        u_colormap: colormapIdx,
        u_opacity: opacity * 0.9,
        u_time: performance.now() * 0.001,
      });
      surfaceAppearance = new Cesium.MaterialAppearance({
        material: surfaceMaterial,
        translucent: true,
        closed: false,
      });
    } catch {
      surfaceAppearance = new Cesium.PerInstanceColorAppearance({ translucent: true });
    }

    const surfacePolygon = new Cesium.PolygonGeometry({
      polygonHierarchy: new Cesium.PolygonHierarchy(positions),
      height: baseLift,
      perPositionHeight: false,
    });
    const surfacePrimitive = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: surfacePolygon,
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(
            Cesium.Color.fromCssColorString(region.themeColor).withAlpha(opacity * 0.7)
          ),
        },
      }),
      appearance: surfaceAppearance,
      asynchronous: false,
    });
    this.primitiveCollection.add(surfacePrimitive);

    // ── 3. ACTIVE DEPTH PLANE ─────────────────────────────────────────
    if (activeDepth > 0 && progress > 0.25) {
      const activeHeight = baseLift - currentDepth * depthRatio;
      const [r, g, b] = evaluateColorRgb(colorScale, 1.0 - depthRatio);
      const activeColor = new Cesium.Color(r / 255, g / 255, b / 255, opacity * 0.7);

      const depthPlane = new Cesium.Primitive({
        geometryInstances: new Cesium.GeometryInstance({
          geometry: new Cesium.PolygonGeometry({
            polygonHierarchy: new Cesium.PolygonHierarchy(positions),
            height: activeHeight,
          }),
          attributes: {
            color: Cesium.ColorGeometryInstanceAttribute.fromColor(activeColor),
          },
        }),
        appearance: new Cesium.PerInstanceColorAppearance({ translucent: true }),
        asynchronous: false,
      });
      this.primitiveCollection.add(depthPlane);
    }

    // ── 4. STRATIFICATION ISO-PLANES ─────────────────────────────────
    if (showIsoPlanes && progress > 0.5) {
      const isoLevels = [200, 1000].filter((d) => d < maxDepth);
      for (const isoDepth of isoLevels) {
        const ratio = isoDepth / maxDepth;
        const isoHeight = baseLift - currentDepth * ratio;
        const [r, g, b] = evaluateColorRgb(colorScale, 1.0 - ratio);
        const isoColor = new Cesium.Color(r / 255, g / 255, b / 255, opacity * 0.3);

        const isoPrimitive = new Cesium.Primitive({
          geometryInstances: new Cesium.GeometryInstance({
            geometry: new Cesium.PolygonGeometry({
              polygonHierarchy: new Cesium.PolygonHierarchy(positions),
              height: isoHeight,
            }),
            attributes: {
              color: Cesium.ColorGeometryInstanceAttribute.fromColor(isoColor),
            },
          }),
          appearance: new Cesium.PerInstanceColorAppearance({ translucent: true }),
          asynchronous: false,
        });
        this.primitiveCollection.add(isoPrimitive);
      }
    }

    // ── 5. ABYSSAL FLOOR ─────────────────────────────────────────────
    const floorColor = new Cesium.Color(0.01, 0.03, 0.08, opacity * 0.95);
    const floorPrimitive = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.PolygonGeometry({
          polygonHierarchy: new Cesium.PolygonHierarchy(positions),
          height: baseLift - currentDepth,
        }),
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(floorColor),
        },
      }),
      appearance: new Cesium.PerInstanceColorAppearance({ translucent: true }),
      asynchronous: false,
    });
    this.primitiveCollection.add(floorPrimitive);

    // ── 6. 3D DEPTH LABELS ───────────────────────────────────────────
    if (progress > 0.55) {
      this.addDepthLabels(region, baseLift, currentDepth, maxDepth, activeDepth, variable);
    }
  }

  private buildFallback(options: DepthSliceRenderOptions, progress: number) {
    // Simple solid-color extrusion when custom shaders fail
    const { region, maxDepth, verticalExaggeration, opacity } = options;
    const flatCoords: number[] = region.polygon.flatMap(([lon, lat]) => [lon, lat]);
    const positions = Cesium.Cartesian3.fromDegreesArray(flatCoords);
    const baseLift = 50000.0;
    const columnDepth = (maxDepth / 1000) * (verticalExaggeration * 1200.0);

    const wallPrimitive = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.WallGeometry({
          positions,
          maximumHeights: new Array<number>(positions.length).fill(baseLift),
          minimumHeights: new Array<number>(positions.length).fill(baseLift - columnDepth * progress),
        }),
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(
            Cesium.Color.fromCssColorString(region.themeColor).withAlpha(opacity * 0.75)
          ),
        },
      }),
      appearance: new Cesium.PerInstanceColorAppearance({ translucent: true }),
      asynchronous: false,
    });
    this.primitiveCollection.add(wallPrimitive);
  }

  private addDepthLabels(
    region: OceanRegion,
    baseLift: number,
    currentDepth: number,
    maxDepth: number,
    activeDepth: number,
    variable: OceanVariable
  ) {
    // Anchor at westernmost polygon vertex
    let anchorPt = region.polygon[0];
    for (const pt of region.polygon) {
      if (pt[0] < anchorPt[0]) anchorPt = pt;
    }
    const [aLon, aLat] = anchorPt;

    const addLabel = (lon: number, lat: number, height: number, text: string, color: string) => {
      this.labelCollection.add({
        position: Cesium.Cartesian3.fromDegrees(lon - 0.5, lat, height),
        text,
        font: 'bold 13px Inter, sans-serif',
        fillColor: Cesium.Color.fromCssColorString(color),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        horizontalOrigin: Cesium.HorizontalOrigin.RIGHT,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      });
    };

    addLabel(aLon, aLat, baseLift, `0 m  ▶ Surface [${variable.toUpperCase()}]`, '#00ffff');

    if (activeDepth > 0) {
      const activeH = baseLift - currentDepth * (activeDepth / maxDepth);
      addLabel(aLon, aLat, activeH, `◀ -${activeDepth} m (Active Level)`, '#ffd700');
    }

    if (maxDepth >= 1500) {
      const mid1000H = baseLift - currentDepth * (1000 / maxDepth);
      addLabel(aLon, aLat, mid1000H, '-1,000 m  Mesopelagic', '#a0c0e0');
    }

    const floorH = baseLift - currentDepth;
    addLabel(aLon, aLat, floorH, `-${maxDepth} m  Seabed`, '#607090');
  }

  public hide() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.primitiveCollection.removeAll();
    this.labelCollection.removeAll();
    this.currentRegionId = null;
    this.animationProgress = 0.0;
  }

  public destroy() {
    this.hide();
    if (!this.primitiveCollection.isDestroyed()) {
      this.viewer.scene.primitives.remove(this.primitiveCollection);
    }
    if (!this.labelCollection.isDestroyed()) {
      this.viewer.scene.primitives.remove(this.labelCollection);
    }
  }
}
