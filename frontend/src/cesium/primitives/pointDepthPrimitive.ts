import * as Cesium from 'cesium';
import type { OceanVariable, ColorScaleName } from '@/types/ocean';
import { evaluateColorRgb } from '@/lib/ocean/colorScales';
import {
  CylinderGeometryProvider,
  CuboidGeometryProvider,
  type GeometryProvider,
  type DepthColumnConfig,
} from './geometryProviders';

export interface PointDepthRenderOptions {
  centerLon: number;
  centerLat: number;
  /** Approximate seafloor depth in meters at this point */
  bathymetryDepth: number;
  activeDepth: number;
  verticalExaggeration: number;
  opacity: number;
  colorScale: ColorScaleName;
  showIsoPlanes: boolean;
  variable: OceanVariable;
  geometryType: 'cylinder' | 'cuboid';
  /** Theme color (defaults to cyan if not provided) */
  themeColor?: string;
}

/**
 * Reusable 3D depth-column primitive for any arbitrary clicked point.
 * Supports cylinder and cuboid geometry via pluggable GeometryProviders.
 */
export class PointDepthPrimitive {
  private viewer: Cesium.Viewer;
  private primitiveCollection: Cesium.PrimitiveCollection;
  private labelCollection: Cesium.LabelCollection;
  private currentKey: string | null = null;
  private animationProgress = 0.0;
  private animationFrameId: number | null = null;

  private cylinderProvider = new CylinderGeometryProvider(32);
  private cuboidProvider = new CuboidGeometryProvider();

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
    this.primitiveCollection = new Cesium.PrimitiveCollection();
    this.labelCollection = new Cesium.LabelCollection({ scene: viewer.scene });
    this.viewer.scene.primitives.add(this.primitiveCollection);
    this.viewer.scene.primitives.add(this.labelCollection);
  }

  private getProvider(type: 'cylinder' | 'cuboid'): GeometryProvider {
    return type === 'cuboid' ? this.cuboidProvider : this.cylinderProvider;
  }

  public update(options: PointDepthRenderOptions, animateEnter = false) {
    const key = `${options.centerLon.toFixed(3)}_${options.centerLat.toFixed(3)}_${options.geometryType}`;
    if (this.currentKey !== key || animateEnter) {
      this.currentKey = key;
      this.animationProgress = 0.0;
      this.startEnterAnimation(options);
    } else {
      this.clearAndRebuild(options, this.animationProgress);
    }
  }

  private startEnterAnimation(options: PointDepthRenderOptions) {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    const startTime = performance.now();
    const duration = 1200;

    const animate = (now: number) => {
      const t = Math.min(1.0, (now - startTime) / duration);
      // Spring-like ease-out with slight overshoot
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

  private clearAndRebuild(options: PointDepthRenderOptions, progress: number) {
    this.primitiveCollection.removeAll();
    this.labelCollection.removeAll();
    if (progress < 0.02) return;

    try {
      this.buildGeometry(options, progress);
    } catch (err) {
      console.warn('[PointDepthPrimitive] Geometry build error:', err);
    }
  }

  private buildGeometry(options: PointDepthRenderOptions, progress: number) {
    const {
      centerLon, centerLat, bathymetryDepth, activeDepth,
      verticalExaggeration, opacity, colorScale, showIsoPlanes,
      variable, geometryType, themeColor = '#00d2ff'
    } = options;

    const maxDepth = bathymetryDepth || 2000;
    // Planetary scale: column stands beside the Earth at ~4,600 km altitude, height ~4,000 km
    const popOutAltitude = 4600000.0 * progress;
    // Displace clearly to the right side of India and the shifted Earth
    const lateralLonOffset = 18.5 * progress;
    const lateralLatOffset = 2.0 * progress;

    const provider = this.getProvider(geometryType);

    const config: DepthColumnConfig = {
      centerLon,
      centerLat,
      sizeDeg: geometryType === 'cylinder' ? 3.8 : 4.2,
      maxDepth,
      activeDepth,
      verticalExaggeration,
      opacity,
      colorScale,
      showIsoPlanes,
      progress,
      popOutAltitude,
      lateralOffset: { lon: lateralLonOffset, lat: lateralLatOffset },
      themeColor,
    };

    const geometry = provider.generate(config);

    // ── 1. GROUND FOOTPRINT ────────────────────────────────────────────────
    const footprintPrimitive = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.PolygonGeometry({
          polygonHierarchy: new Cesium.PolygonHierarchy(geometry.footprintPositions),
          height: 2000,
        }),
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(
            Cesium.Color.fromCssColorString('#021a38').withAlpha(0.7 * progress)
          ),
        },
      }),
      appearance: new Cesium.PerInstanceColorAppearance({ translucent: true }),
      asynchronous: false,
    });
    this.primitiveCollection.add(footprintPrimitive);

    // Footprint outline
    const outlinePositions = [...geometry.footprintPositions, geometry.footprintPositions[0]];
    const footprintOutline = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.PolylineGeometry({
          positions: outlinePositions,
          width: 3.0,
        }),
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(
            Cesium.Color.fromCssColorString(themeColor).withAlpha(0.9 * progress)
          ),
        },
      }),
      appearance: new Cesium.PerInstanceColorAppearance({ translucent: true }),
      asynchronous: false,
    });
    this.primitiveCollection.add(footprintOutline);

    // Center marker pin on the footprint
    const pinPrimitive = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.PolylineGeometry({
          positions: [
            Cesium.Cartesian3.fromDegrees(centerLon, centerLat, 2000),
            Cesium.Cartesian3.fromDegrees(centerLon, centerLat, 150000 * progress),
          ],
          width: 3.5,
        }),
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(
            Cesium.Color.fromCssColorString('#ffd700').withAlpha(0.95 * progress)
          ),
        },
      }),
      appearance: new Cesium.PerInstanceColorAppearance({ translucent: true }),
      asynchronous: false,
    });
    this.primitiveCollection.add(pinPrimitive);

    // ── 2. WALLS (Solid high-opacity) ──────────────────────────────────────
    for (const wallInstance of geometry.wallInstances) {
      this.primitiveCollection.add(
        new Cesium.Primitive({
          geometryInstances: wallInstance,
          appearance: new Cesium.PerInstanceColorAppearance({ translucent: false, closed: true }),
          asynchronous: false,
        })
      );
    }

    // ── 3. TOP SURFACE CAP (Solid azure water surface) ─────────────────────
    this.primitiveCollection.add(
      new Cesium.Primitive({
        geometryInstances: geometry.topCapInstance,
        appearance: new Cesium.PerInstanceColorAppearance({ translucent: false, closed: true }),
        asynchronous: false,
      })
    );

    // ── 4. ACTIVE DEPTH PLANE ──────────────────────────────────────────────
    if (geometry.depthHighlightInstance) {
      this.primitiveCollection.add(
        new Cesium.Primitive({
          geometryInstances: geometry.depthHighlightInstance,
          appearance: new Cesium.PerInstanceColorAppearance({ translucent: false }),
          asynchronous: false,
        })
      );
    }

    // ── 5. ISO-PLANES ──────────────────────────────────────────────────────
    for (const isoInstance of geometry.isoPlaneInstances) {
      this.primitiveCollection.add(
        new Cesium.Primitive({
          geometryInstances: isoInstance,
          appearance: new Cesium.PerInstanceColorAppearance({ translucent: false }),
          asynchronous: false,
        })
      );
    }

    // ── 6. BOTTOM SEABED CAP (Solid dark bedrock) ──────────────────────────
    this.primitiveCollection.add(
      new Cesium.Primitive({
        geometryInstances: geometry.bottomCapInstance,
        appearance: new Cesium.PerInstanceColorAppearance({ translucent: false, closed: true }),
        asynchronous: false,
      })
    );

    // ── 7. SOLID EDGE WIREFRAMES & ILLUMINATED BOUNDARY RINGS ──────────────
    for (const edgeInstance of geometry.edgeInstances) {
      this.primitiveCollection.add(
        new Cesium.Primitive({
          geometryInstances: edgeInstance,
          appearance: new Cesium.PerInstanceColorAppearance({ translucent: false }),
          asynchronous: false,
        })
      );
    }

    // ── 7. TETHER GUIDE-LINES ──────────────────────────────────────────────
    if (progress > 0.25) {
      const fLen = geometry.footprintPositions.length;
      const step = Math.max(1, Math.floor(fLen / 6));
      for (let i = 0; i < fLen; i += step) {
        const pGround = geometry.footprintPositions[i];
        const pFloat = Cesium.Cartesian3.fromDegrees(
          Cesium.Math.toDegrees(Cesium.Cartographic.fromCartesian(geometry.poppedPositions[i]).longitude),
          Cesium.Math.toDegrees(Cesium.Cartographic.fromCartesian(geometry.poppedPositions[i]).latitude),
          popOutAltitude - geometry.columnDepthMeters
        );

        this.primitiveCollection.add(
          new Cesium.Primitive({
            geometryInstances: new Cesium.GeometryInstance({
              geometry: new Cesium.PolylineGeometry({
                positions: [pGround, pFloat],
                width: 1.2,
              }),
              attributes: {
                color: Cesium.ColorGeometryInstanceAttribute.fromColor(
                  Cesium.Color.fromCssColorString(themeColor).withAlpha(0.35 * progress)
                ),
              },
            }),
            appearance: new Cesium.PerInstanceColorAppearance({ translucent: true }),
            asynchronous: false,
          })
        );
      }
    }

    // ── 8. DEPTH LABELS ────────────────────────────────────────────────────
    if (progress > 0.5) {
      const poppedCenterLon = centerLon + lateralLonOffset;
      const poppedCenterLat = centerLat + lateralLatOffset;
      // Offset label to the left of the model (planetary scale)
      const labelLon = poppedCenterLon - (geometryType === 'cuboid' ? 5.2 : 4.8);

      const addLabel = (height: number, text: string, color: string) => {
        this.labelCollection.add({
          position: Cesium.Cartesian3.fromDegrees(labelLon, poppedCenterLat, height),
          text,
          font: 'bold 14px Outfit, Inter, sans-serif',
          fillColor: Cesium.Color.fromCssColorString(color),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 4,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.RIGHT,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        });
      };

      addLabel(popOutAltitude, `0 m  ▶ Sea Surface`, '#00ffff');

      if (activeDepth > 0) {
        const depthRatio = activeDepth / maxDepth;
        const activeH = popOutAltitude - geometry.columnDepthMeters * depthRatio;
        addLabel(activeH, `◀ -${activeDepth} m  Active`, '#ffd700');
      }

      if (maxDepth >= 1500) {
        const mid1000H = popOutAltitude - geometry.columnDepthMeters * (1000 / maxDepth);
        addLabel(mid1000H, '-1,000 m  Mesopelagic', '#a0c0e0');
      }

      const floorH = popOutAltitude - geometry.columnDepthMeters;
      addLabel(floorH, `-${maxDepth} m  Seabed`, '#607090');

      // Shape type indicator
      const shapeLabel = geometryType === 'cylinder' ? '⬡ 3D Cylinder Column' : '▬ 3D Cuboid Column';
      addLabel(popOutAltitude + 180000, shapeLabel, '#ffd700');
    }
  }

  public hide() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.primitiveCollection.removeAll();
    this.labelCollection.removeAll();
    this.currentKey = null;
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
