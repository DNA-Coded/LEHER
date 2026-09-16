import * as Cesium from 'cesium';
import type { ColorScaleName } from '@/types/ocean';
import { evaluateColorRgb } from '@/lib/ocean/colorScales';

/**
 * Configuration for generating depth-column geometry at any arbitrary point
 */
export interface DepthColumnConfig {
  centerLon: number;
  centerLat: number;
  /** Radius in degrees for cylinder, half-width for cuboid */
  sizeDeg: number;
  maxDepth: number;
  activeDepth: number;
  verticalExaggeration: number;
  opacity: number;
  colorScale: ColorScaleName;
  showIsoPlanes: boolean;
  /** Animation progress 0.0 → 1.0 */
  progress: number;
  /** Pop-out altitude in meters above the globe */
  popOutAltitude: number;
  /** Lateral offset in degrees (lon, lat) for the pop-out displacement */
  lateralOffset: { lon: number; lat: number };
  /** Theme color CSS string */
  themeColor: string;
}

/**
 * Result of geometry generation — arrays of Cesium GeometryInstances
 * ready to be added to a PrimitiveCollection
 */
export interface DepthColumnGeometry {
  /** Wall geometry instances (the vertical sides) */
  wallInstances: Cesium.GeometryInstance[];
  /** Top surface cap */
  topCapInstance: Cesium.GeometryInstance;
  /** Bottom seabed cap */
  bottomCapInstance: Cesium.GeometryInstance;
  /** Active depth highlight plane (if activeDepth > 0) */
  depthHighlightInstance: Cesium.GeometryInstance | null;
  /** Stratification iso-planes at 200m, 1000m, etc. */
  isoPlaneInstances: Cesium.GeometryInstance[];
  /** Crisp boundary edge wireframe / ring instances for solid high-contrast look */
  edgeInstances: Cesium.GeometryInstance[];
  /** Positions on the globe surface for the extraction footprint */
  footprintPositions: Cesium.Cartesian3[];
  /** Popped-out positions (for tether endpoints) */
  poppedPositions: Cesium.Cartesian3[];
  /** Column depth in meters (after exaggeration) */
  columnDepthMeters: number;
}

/**
 * Interface for geometry providers — strategy pattern
 */
export interface GeometryProvider {
  readonly type: 'cylinder' | 'cuboid';
  generate(config: DepthColumnConfig): DepthColumnGeometry;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function computeColumnDepth(maxDepth: number, verticalExaggeration: number): number {
  // Planetary scale: column height matches globe scale (~3,500 - 4,800 km)
  const baseScale = 850000.0; // 850 km per 1000m depth
  return Math.max(2500000.0, (maxDepth / 1000) * baseScale * Math.min(2.0, Math.max(0.5, verticalExaggeration * 0.1)));
}

function makeColorAttr(cssColor: string, alpha: number): Cesium.ColorGeometryInstanceAttribute {
  return Cesium.ColorGeometryInstanceAttribute.fromColor(
    Cesium.Color.fromCssColorString(cssColor).withAlpha(alpha)
  );
}

function depthColorAttr(colorScale: ColorScaleName, ratio: number, alpha: number): Cesium.ColorGeometryInstanceAttribute {
  const [r, g, b] = evaluateColorRgb(colorScale, 1.0 - ratio);
  return Cesium.ColorGeometryInstanceAttribute.fromColor(
    new Cesium.Color(r / 255, g / 255, b / 255, alpha)
  );
}

// ─── CYLINDER GEOMETRY PROVIDER ─────────────────────────────────────────────

export class CylinderGeometryProvider implements GeometryProvider {
  readonly type = 'cylinder' as const;

  /** Number of segments around the cylinder circumference */
  private segments: number;

  constructor(segments: number = 36) {
    this.segments = segments;
  }

  generate(config: DepthColumnConfig): DepthColumnGeometry {
    const {
      centerLon, centerLat, sizeDeg, maxDepth, activeDepth,
      verticalExaggeration, opacity, colorScale, showIsoPlanes,
      progress, popOutAltitude, lateralOffset, themeColor
    } = config;

    const columnDepth = computeColumnDepth(maxDepth, verticalExaggeration);
    const depthRatio = Math.min(1.0, activeDepth / (maxDepth || 1));

    // Generate circular polygon points
    const groundCoords: [number, number][] = [];
    const poppedCoords: [number, number][] = [];

    for (let i = 0; i < this.segments; i++) {
      const angle = (i / this.segments) * 2 * Math.PI;
      const lon = centerLon + sizeDeg * Math.cos(angle);
      const lat = centerLat + sizeDeg * 0.7 * Math.sin(angle); // 0.7 to account for lat/lon aspect
      groundCoords.push([lon, lat]);
      poppedCoords.push([lon + lateralOffset.lon, lat + lateralOffset.lat]);
    }

    const groundFlat = groundCoords.flatMap(([lon, lat]) => [lon, lat]);
    const poppedFlat = poppedCoords.flatMap(([lon, lat]) => [lon, lat]);

    const footprintPositions = Cesium.Cartesian3.fromDegreesArray(groundFlat);
    const poppedPositions = Cesium.Cartesian3.fromDegreesArray(poppedFlat);

    const poppedTopCartesians = poppedCoords.map(([lon, lat]) =>
      Cesium.Cartesian3.fromDegrees(lon, lat, popOutAltitude)
    );
    const poppedBottomCartesians = poppedCoords.map(([lon, lat]) =>
      Cesium.Cartesian3.fromDegrees(lon, lat, popOutAltitude - columnDepth)
    );

    // Wall - SOLID, non-transparent
    const topHeights = new Array(poppedPositions.length).fill(popOutAltitude);
    const bottomHeights = new Array(poppedPositions.length).fill(popOutAltitude - columnDepth);

    const wallInstances = [
      new Cesium.GeometryInstance({
        geometry: new Cesium.WallGeometry({
          positions: poppedPositions,
          maximumHeights: topHeights,
          minimumHeights: bottomHeights,
        }),
        attributes: {
          color: makeColorAttr(themeColor, 0.98 * progress),
        },
      }),
    ];

    // Top cap - solid sea surface
    const topCapInstance = new Cesium.GeometryInstance({
      geometry: new Cesium.PolygonGeometry({
        polygonHierarchy: new Cesium.PolygonHierarchy(poppedPositions),
        height: popOutAltitude,
      }),
      attributes: {
        color: makeColorAttr('#00f0ff', 0.96 * progress),
      },
    });

    // Bottom cap - solid abyssal seabed rock
    const bottomCapInstance = new Cesium.GeometryInstance({
      geometry: new Cesium.PolygonGeometry({
        polygonHierarchy: new Cesium.PolygonHierarchy(poppedPositions),
        height: popOutAltitude - columnDepth,
      }),
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(
          new Cesium.Color(0.02, 0.08, 0.18, 1.0 * progress)
        ),
      },
    });

    // Solid Edge Outlines: Top Rim, Bottom Rim, Struts
    const edgeInstances: Cesium.GeometryInstance[] = [];

    // Top circular rim
    edgeInstances.push(
      new Cesium.GeometryInstance({
        geometry: new Cesium.PolylineGeometry({
          positions: [...poppedTopCartesians, poppedTopCartesians[0]],
          width: 3.5,
        }),
        attributes: {
          color: makeColorAttr('#00ffff', 0.95 * progress),
        },
      })
    );

    // Bottom circular rim
    edgeInstances.push(
      new Cesium.GeometryInstance({
        geometry: new Cesium.PolylineGeometry({
          positions: [...poppedBottomCartesians, poppedBottomCartesians[0]],
          width: 3.0,
        }),
        attributes: {
          color: makeColorAttr('#0055bb', 0.90 * progress),
        },
      })
    );

    // 4 vertical structural corner pillars
    const strutIndices = [
      0,
      Math.floor(this.segments / 4),
      Math.floor(this.segments / 2),
      Math.floor((3 * this.segments) / 4),
    ];
    for (const idx of strutIndices) {
      if (idx < poppedTopCartesians.length) {
        edgeInstances.push(
          new Cesium.GeometryInstance({
            geometry: new Cesium.PolylineGeometry({
              positions: [poppedTopCartesians[idx], poppedBottomCartesians[idx]],
              width: 2.5,
            }),
            attributes: {
              color: makeColorAttr('#00d2ff', 0.85 * progress),
            },
          })
        );
      }
    }

    // Active depth highlight
    let depthHighlightInstance: Cesium.GeometryInstance | null = null;
    if (activeDepth > 0 && progress > 0.2) {
      const activeHeight = popOutAltitude - columnDepth * depthRatio;
      depthHighlightInstance = new Cesium.GeometryInstance({
        geometry: new Cesium.PolygonGeometry({
          polygonHierarchy: new Cesium.PolygonHierarchy(poppedPositions),
          height: activeHeight,
        }),
        attributes: {
          color: depthColorAttr(colorScale, depthRatio, 0.95),
        },
      });

      // Highlight plane ring outline
      const highlightCartesians = poppedCoords.map(([lon, lat]) =>
        Cesium.Cartesian3.fromDegrees(lon, lat, activeHeight)
      );
      edgeInstances.push(
        new Cesium.GeometryInstance({
          geometry: new Cesium.PolylineGeometry({
            positions: [...highlightCartesians, highlightCartesians[0]],
            width: 3.0,
          }),
          attributes: {
            color: makeColorAttr('#ffff00', 0.90 * progress),
          },
        })
      );
    }

    // Iso-planes
    const isoPlaneInstances: Cesium.GeometryInstance[] = [];
    if (showIsoPlanes && progress > 0.4) {
      const isoLevels = [200, 1000].filter(d => d < maxDepth);
      for (const isoDepth of isoLevels) {
        const ratio = isoDepth / maxDepth;
        const isoHeight = popOutAltitude - columnDepth * ratio;
        isoPlaneInstances.push(
          new Cesium.GeometryInstance({
            geometry: new Cesium.PolygonGeometry({
              polygonHierarchy: new Cesium.PolygonHierarchy(poppedPositions),
              height: isoHeight,
            }),
            attributes: {
              color: depthColorAttr(colorScale, ratio, 0.65),
            },
          })
        );

        const isoCartesians = poppedCoords.map(([lon, lat]) =>
          Cesium.Cartesian3.fromDegrees(lon, lat, isoHeight)
        );
        edgeInstances.push(
          new Cesium.GeometryInstance({
            geometry: new Cesium.PolylineGeometry({
              positions: [...isoCartesians, isoCartesians[0]],
              width: 2.0,
            }),
            attributes: {
              color: makeColorAttr('#7ad1ff', 0.75 * progress),
            },
          })
        );
      }
    }

    return {
      wallInstances,
      topCapInstance,
      bottomCapInstance,
      depthHighlightInstance,
      isoPlaneInstances,
      edgeInstances,
      footprintPositions,
      poppedPositions,
      columnDepthMeters: columnDepth,
    };
  }
}

// ─── CUBOID GEOMETRY PROVIDER ───────────────────────────────────────────────

export class CuboidGeometryProvider implements GeometryProvider {
  readonly type = 'cuboid' as const;

  generate(config: DepthColumnConfig): DepthColumnGeometry {
    const {
      centerLon, centerLat, sizeDeg, maxDepth, activeDepth,
      verticalExaggeration, opacity, colorScale, showIsoPlanes,
      progress, popOutAltitude, lateralOffset, themeColor
    } = config;

    const columnDepth = computeColumnDepth(maxDepth, verticalExaggeration);
    const depthRatio = Math.min(1.0, activeDepth / (maxDepth || 1));

    // Rectangular corners (cuboid)
    const halfW = sizeDeg;
    const halfH = sizeDeg * 0.7; // lat aspect correction

    const groundCoords: [number, number][] = [
      [centerLon - halfW, centerLat - halfH],
      [centerLon + halfW, centerLat - halfH],
      [centerLon + halfW, centerLat + halfH],
      [centerLon - halfW, centerLat + halfH],
    ];

    const poppedCoords: [number, number][] = groundCoords.map(([lon, lat]) => [
      lon + lateralOffset.lon,
      lat + lateralOffset.lat,
    ]);

    const groundFlat = groundCoords.flatMap(([lon, lat]) => [lon, lat]);
    const poppedFlat = poppedCoords.flatMap(([lon, lat]) => [lon, lat]);

    const footprintPositions = Cesium.Cartesian3.fromDegreesArray(groundFlat);
    const poppedPositions = Cesium.Cartesian3.fromDegreesArray(poppedFlat);

    const poppedTopCartesians = poppedCoords.map(([lon, lat]) =>
      Cesium.Cartesian3.fromDegrees(lon, lat, popOutAltitude)
    );
    const poppedBottomCartesians = poppedCoords.map(([lon, lat]) =>
      Cesium.Cartesian3.fromDegrees(lon, lat, popOutAltitude - columnDepth)
    );

    // Wall — use wall geometry around 4 corners + close
    const wallPositions = [...poppedPositions, poppedPositions[0]];
    const topHeights = new Array(wallPositions.length).fill(popOutAltitude);
    const bottomHeights = new Array(wallPositions.length).fill(popOutAltitude - columnDepth);

    const wallInstances = [
      new Cesium.GeometryInstance({
        geometry: new Cesium.WallGeometry({
          positions: wallPositions,
          maximumHeights: topHeights,
          minimumHeights: bottomHeights,
        }),
        attributes: {
          color: makeColorAttr(themeColor, 0.98 * progress),
        },
      }),
    ];

    // Top cap - solid sea surface
    const topCapInstance = new Cesium.GeometryInstance({
      geometry: new Cesium.PolygonGeometry({
        polygonHierarchy: new Cesium.PolygonHierarchy(poppedPositions),
        height: popOutAltitude,
      }),
      attributes: {
        color: makeColorAttr('#00f0ff', 0.96 * progress),
      },
    });

    // Bottom cap - solid seabed rock
    const bottomCapInstance = new Cesium.GeometryInstance({
      geometry: new Cesium.PolygonGeometry({
        polygonHierarchy: new Cesium.PolygonHierarchy(poppedPositions),
        height: popOutAltitude - columnDepth,
      }),
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(
          new Cesium.Color(0.02, 0.08, 0.18, 1.0 * progress)
        ),
      },
    });

    // Solid Edge Outlines for Cuboid (4 top edges, 4 bottom edges, 4 vertical pillars)
    const edgeInstances: Cesium.GeometryInstance[] = [];

    // Top rectangular rim
    edgeInstances.push(
      new Cesium.GeometryInstance({
        geometry: new Cesium.PolylineGeometry({
          positions: [...poppedTopCartesians, poppedTopCartesians[0]],
          width: 3.5,
        }),
        attributes: {
          color: makeColorAttr('#00ffff', 0.95 * progress),
        },
      })
    );

    // Bottom rectangular rim
    edgeInstances.push(
      new Cesium.GeometryInstance({
        geometry: new Cesium.PolylineGeometry({
          positions: [...poppedBottomCartesians, poppedBottomCartesians[0]],
          width: 3.0,
        }),
        attributes: {
          color: makeColorAttr('#0055bb', 0.90 * progress),
        },
      })
    );

    // 4 vertical corner struts
    for (let i = 0; i < 4; i++) {
      edgeInstances.push(
        new Cesium.GeometryInstance({
          geometry: new Cesium.PolylineGeometry({
            positions: [poppedTopCartesians[i], poppedBottomCartesians[i]],
            width: 2.5,
          }),
          attributes: {
            color: makeColorAttr('#00d2ff', 0.85 * progress),
          },
        })
      );
    }

    // Active depth highlight
    let depthHighlightInstance: Cesium.GeometryInstance | null = null;
    if (activeDepth > 0 && progress > 0.2) {
      const activeHeight = popOutAltitude - columnDepth * depthRatio;
      depthHighlightInstance = new Cesium.GeometryInstance({
        geometry: new Cesium.PolygonGeometry({
          polygonHierarchy: new Cesium.PolygonHierarchy(poppedPositions),
          height: activeHeight,
        }),
        attributes: {
          color: depthColorAttr(colorScale, depthRatio, 0.95),
        },
      });

      const highlightCartesians = poppedCoords.map(([lon, lat]) =>
        Cesium.Cartesian3.fromDegrees(lon, lat, activeHeight)
      );
      edgeInstances.push(
        new Cesium.GeometryInstance({
          geometry: new Cesium.PolylineGeometry({
            positions: [...highlightCartesians, highlightCartesians[0]],
            width: 3.0,
          }),
          attributes: {
            color: makeColorAttr('#ffff00', 0.90 * progress),
          },
        })
      );
    }

    // Iso-planes
    const isoPlaneInstances: Cesium.GeometryInstance[] = [];
    if (showIsoPlanes && progress > 0.4) {
      const isoLevels = [200, 1000].filter(d => d < maxDepth);
      for (const isoDepth of isoLevels) {
        const ratio = isoDepth / maxDepth;
        const isoHeight = popOutAltitude - columnDepth * ratio;
        isoPlaneInstances.push(
          new Cesium.GeometryInstance({
            geometry: new Cesium.PolygonGeometry({
              polygonHierarchy: new Cesium.PolygonHierarchy(poppedPositions),
              height: isoHeight,
            }),
            attributes: {
              color: depthColorAttr(colorScale, ratio, 0.65),
            },
          })
        );

        const isoCartesians = poppedCoords.map(([lon, lat]) =>
          Cesium.Cartesian3.fromDegrees(lon, lat, isoHeight)
        );
        edgeInstances.push(
          new Cesium.GeometryInstance({
            geometry: new Cesium.PolylineGeometry({
              positions: [...isoCartesians, isoCartesians[0]],
              width: 2.0,
            }),
            attributes: {
              color: makeColorAttr('#7ad1ff', 0.75 * progress),
            },
          })
        );
      }
    }

    return {
      wallInstances,
      topCapInstance,
      bottomCapInstance,
      depthHighlightInstance,
      isoPlaneInstances,
      edgeInstances,
      footprintPositions,
      poppedPositions,
      columnDepthMeters: columnDepth,
    };
  }
}
