import * as Cesium from 'cesium';
import type { OceanRegion, OceanVariable, ColorScaleName } from '@/types/ocean';
import { evaluateColorRgb } from '@/lib/ocean/colorScales';

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
    const duration = 1200; // 1.2s smooth pop-out extraction

    const animate = (now: number) => {
      const t = Math.min(1.0, (now - startTime) / duration);
      // Elastic / overshoot cubic ease-out for dramatic extraction feel
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
      console.warn('[DepthSlice] Geometry build error — falling back to simple mode:', err);
      this.buildFallback(options, progress);
    }
  }

  private buildGeometry(options: DepthSliceRenderOptions, progress: number) {
    const { region, activeDepth, maxDepth, verticalExaggeration, opacity, colorScale, showIsoPlanes, variable } = options;

    const polyCoords = region.polygon;
    if (!polyCoords || polyCoords.length < 3) return;

    // Ground footprint positions (on the sea surface)
    const groundFlatCoords: number[] = polyCoords.flatMap(([lon, lat]) => [lon, lat]);
    const groundPositions = Cesium.Cartesian3.fromDegreesArray(groundFlatCoords);

    // ── 1. GROUND CAVITY FOOTPRINT (Where the cake-slice was extracted from) ───
    const cavityPolygon = new Cesium.PolygonGeometry({
      polygonHierarchy: new Cesium.PolygonHierarchy(groundPositions),
      height: 2000,
    });
    const cavityPrimitive = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: cavityPolygon,
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(
            Cesium.Color.fromCssColorString('#020b18').withAlpha(0.65 * progress)
          ),
        },
      }),
      appearance: new Cesium.PerInstanceColorAppearance({ translucent: true }),
      asynchronous: false,
    });
    this.primitiveCollection.add(cavityPrimitive);

    // Outline for the cavity socket
    const cavityOutline = new Cesium.PolylineGeometry({
      positions: [...groundPositions, groundPositions[0]],
      width: 2.0,
    });
    const cavityOutlinePrimitive = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: cavityOutline,
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(
            Cesium.Color.fromCssColorString(region.themeColor).withAlpha(0.7 * progress)
          ),
        },
      }),
      appearance: new Cesium.PerInstanceColorAppearance({ translucent: true }),
      asynchronous: false,
    });
    this.primitiveCollection.add(cavityOutlinePrimitive);

    // ── 2. POPPED-OUT 3D EXTRACTION DISPLACEMENT ────────────────────────────
    // Displace outward into the sky and laterally aside towards open viewing angle
    const popOutAltitude = 320000.0 * progress; // Levitate 320km above the Earth
    const lateralLonOffset = (region.id === 'arabian-sea' ? -3.0 : region.id === 'bay-of-bengal' ? 3.0 : -1.5) * progress;
    const lateralLatOffset = 1.2 * progress;

    const poppedFlatCoords = polyCoords.flatMap(([lon, lat]) => [
      lon + lateralLonOffset,
      lat + lateralLatOffset,
    ]);
    const poppedPositions = Cesium.Cartesian3.fromDegreesArray(poppedFlatCoords);

    const columnDepth = (maxDepth / 1000) * (verticalExaggeration * 1300.0);
    const colormapIdx = colormapToFloat(colorScale);
    const depthRatio = Math.min(1.0, activeDepth / (maxDepth || 1));

    // ── 3. VERTICAL BATHYMETRIC WALLS (Extruded cake-slice water column) ─────
    const topHeights = new Array<number>(poppedPositions.length).fill(popOutAltitude);
    const bottomHeights = new Array<number>(poppedPositions.length).fill(popOutAltitude - columnDepth);

    const wallGeometry = new Cesium.WallGeometry({
      positions: poppedPositions,
      maximumHeights: topHeights,
      minimumHeights: bottomHeights,
    });

    let wallAppearance: Cesium.Appearance;
    try {
      const wallMaterial = Cesium.Material.fromType('OceanDepthWall', {
        u_colormap: colormapIdx,
        u_opacity: 0.98 * progress,
        u_activeDepthRatio: depthRatio,
      });
      wallAppearance = new Cesium.MaterialAppearance({
        material: wallMaterial,
        translucent: false,
        closed: true,
        faceForward: true,
      });
    } catch {
      wallAppearance = new Cesium.PerInstanceColorAppearance({ translucent: false, closed: true });
    }

    const wallPrimitive = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: wallGeometry,
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(
            Cesium.Color.fromCssColorString(region.themeColor).withAlpha(0.98 * progress)
          ),
        },
      }),
      appearance: wallAppearance,
      asynchronous: false,
    });
    this.primitiveCollection.add(wallPrimitive);

    // ── 4. TOP SURFACE WATER POLYGON ───────────────────────────────────────
    let surfaceAppearance: Cesium.Appearance;
    try {
      const surfaceMaterial = Cesium.Material.fromType('OceanSliceSurface', {
        u_colormap: colormapIdx,
        u_opacity: 0.96 * progress,
        u_time: performance.now() * 0.001,
      });
      surfaceAppearance = new Cesium.MaterialAppearance({
        material: surfaceMaterial,
        translucent: false,
        closed: true,
      });
    } catch {
      surfaceAppearance = new Cesium.PerInstanceColorAppearance({ translucent: false, closed: true });
    }

    const surfacePolygon = new Cesium.PolygonGeometry({
      polygonHierarchy: new Cesium.PolygonHierarchy(poppedPositions),
      height: popOutAltitude,
      perPositionHeight: false,
    });
    const surfacePrimitive = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: surfacePolygon,
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(
            Cesium.Color.fromCssColorString('#00f0ff').withAlpha(0.96 * progress)
          ),
        },
      }),
      appearance: surfaceAppearance,
      asynchronous: false,
    });
    this.primitiveCollection.add(surfacePrimitive);

    // ── 5. ACTIVE DEPTH CUT-PLANE ──────────────────────────────────────────
    if (activeDepth > 0 && progress > 0.2) {
      const activeHeight = popOutAltitude - columnDepth * depthRatio;
      const [r, g, b] = evaluateColorRgb(colorScale, 1.0 - depthRatio);
      const activeColor = new Cesium.Color(r / 255, g / 255, b / 255, opacity * 0.75);

      const depthPlane = new Cesium.Primitive({
        geometryInstances: new Cesium.GeometryInstance({
          geometry: new Cesium.PolygonGeometry({
            polygonHierarchy: new Cesium.PolygonHierarchy(poppedPositions),
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

    // ── 6. STRATIFICATION ISO-PLANES ───────────────────────────────────────
    if (showIsoPlanes && progress > 0.4) {
      const isoLevels = [200, 1000].filter((d) => d < maxDepth);
      for (const isoDepth of isoLevels) {
        const ratio = isoDepth / maxDepth;
        const isoHeight = popOutAltitude - columnDepth * ratio;
        const [r, g, b] = evaluateColorRgb(colorScale, 1.0 - ratio);
        const isoColor = new Cesium.Color(r / 255, g / 255, b / 255, opacity * 0.35);

        const isoPrimitive = new Cesium.Primitive({
          geometryInstances: new Cesium.GeometryInstance({
            geometry: new Cesium.PolygonGeometry({
              polygonHierarchy: new Cesium.PolygonHierarchy(poppedPositions),
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

    // ── 7. ABYSSAL SEABED FLOOR ────────────────────────────────────────────
    const floorColor = new Cesium.Color(0.01, 0.04, 0.1, opacity * 0.95);
    const floorPrimitive = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.PolygonGeometry({
          polygonHierarchy: new Cesium.PolygonHierarchy(poppedPositions),
          height: popOutAltitude - columnDepth,
        }),
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(floorColor),
        },
      }),
      appearance: new Cesium.PerInstanceColorAppearance({ translucent: true }),
      asynchronous: false,
    });
    this.primitiveCollection.add(floorPrimitive);

    // ── 8. CORNER TETHER GUIDE-LINES (Visual link to the Earth socket) ─────
    if (progress > 0.25) {
      // Pick corner vertices evenly distributed around the polygon
      const step = Math.max(1, Math.floor(polyCoords.length / 5));
      for (let i = 0; i < polyCoords.length; i += step) {
        const [origLon, origLat] = polyCoords[i];
        const [popLon, popLat] = [origLon + lateralLonOffset, origLat + lateralLatOffset];

        const pGround = Cesium.Cartesian3.fromDegrees(origLon, origLat, 2000);
        const pSlice = Cesium.Cartesian3.fromDegrees(popLon, popLat, popOutAltitude - columnDepth);

        const tetherLine = new Cesium.PolylineGeometry({
          positions: [pGround, pSlice],
          width: 1.5,
        });

        const tetherPrimitive = new Cesium.Primitive({
          geometryInstances: new Cesium.GeometryInstance({
            geometry: tetherLine,
            attributes: {
              color: Cesium.ColorGeometryInstanceAttribute.fromColor(
                Cesium.Color.fromCssColorString(region.themeColor).withAlpha(0.45 * progress)
              ),
            },
          }),
          appearance: new Cesium.PerInstanceColorAppearance({ translucent: true }),
          asynchronous: false,
        });
        this.primitiveCollection.add(tetherPrimitive);
      }
    }

    // ── 9. 3D DEPTH LABELS ─────────────────────────────────────────────────
    if (progress > 0.5) {
      this.addDepthLabels(
        polyCoords,
        lateralLonOffset,
        lateralLatOffset,
        popOutAltitude,
        columnDepth,
        maxDepth,
        activeDepth,
        variable
      );
    }
  }

  private buildFallback(options: DepthSliceRenderOptions, progress: number) {
    const { region, maxDepth, verticalExaggeration, opacity } = options;
    const popOutAltitude = 320000.0 * progress;
    const lateralLonOffset = (region.id === 'arabian-sea' ? -3.0 : 3.0) * progress;
    const lateralLatOffset = 1.0 * progress;

    const flatCoords = region.polygon.flatMap(([lon, lat]) => [
      lon + lateralLonOffset,
      lat + lateralLatOffset,
    ]);
    const positions = Cesium.Cartesian3.fromDegreesArray(flatCoords);
    const columnDepth = (maxDepth / 1000) * (verticalExaggeration * 1200.0);

    const wallPrimitive = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.WallGeometry({
          positions,
          maximumHeights: new Array<number>(positions.length).fill(popOutAltitude),
          minimumHeights: new Array<number>(positions.length).fill(popOutAltitude - columnDepth),
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
    polyCoords: [number, number][],
    lateralLonOffset: number,
    lateralLatOffset: number,
    popOutAltitude: number,
    columnDepth: number,
    maxDepth: number,
    activeDepth: number,
    variable: OceanVariable
  ) {
    // Anchor at westernmost vertex
    let anchorPt = polyCoords[0];
    for (const pt of polyCoords) {
      if (pt[0] < anchorPt[0]) anchorPt = pt;
    }
    const aLon = anchorPt[0] + lateralLonOffset;
    const aLat = anchorPt[1] + lateralLatOffset;

    const addLabel = (lon: number, lat: number, height: number, text: string, color: string) => {
      this.labelCollection.add({
        position: Cesium.Cartesian3.fromDegrees(lon - 0.6, lat, height),
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

    addLabel(aLon, aLat, popOutAltitude, `0 m  ▶ Surface [${variable.toUpperCase()}]`, '#00ffff');

    if (activeDepth > 0) {
      const activeH = popOutAltitude - columnDepth * (activeDepth / maxDepth);
      addLabel(aLon, aLat, activeH, `◀ -${activeDepth} m (Active Level)`, '#ffd700');
    }

    if (maxDepth >= 1500) {
      const mid1000H = popOutAltitude - columnDepth * (1000 / maxDepth);
      addLabel(aLon, aLat, mid1000H, '-1,000 m  Mesopelagic', '#a0c0e0');
    }

    const floorH = popOutAltitude - columnDepth;
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
