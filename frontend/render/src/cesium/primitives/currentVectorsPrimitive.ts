import * as Cesium from 'cesium';
import type { CurrentVector } from '../../types/ocean';
import { evaluateColorRgb } from '../../utils/colorScales';

export class CurrentVectors3DPrimitive {
  private viewer: Cesium.Viewer;
  private polylines: Cesium.PolylineCollection;
  private pointCollection: Cesium.PointPrimitiveCollection;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
    this.polylines = new Cesium.PolylineCollection();
    this.pointCollection = new Cesium.PointPrimitiveCollection();
    this.viewer.scene.primitives.add(this.polylines);
    this.viewer.scene.primitives.add(this.pointCollection);
  }

  public update(vectors: CurrentVector[], altitude = 42000.0, show = true) {
    this.clear();
    if (!show || !vectors || vectors.length === 0) return;

    for (const vec of vectors) {
      const { lon, lat, magnitude, directionDeg } = vec;

      // Color based on velocity magnitude (0.0 to 1.5 m/s)
      const normSpeed = Math.min(1.0, magnitude / 1.5);
      const [r, g, b] = evaluateColorRgb('turbo', normSpeed);
      const cesiumColor = new Cesium.Color(r / 255, g / 255, b / 255, 0.85);

      // Arrow length proportional to speed (e.g. 0.3° to 1.0° degrees)
      const arrowLen = 0.25 + normSpeed * 0.45;
      const rad = Cesium.Math.toRadians(directionDeg);
      const endLon = lon + Math.sin(rad) * arrowLen;
      const endLat = lat + Math.cos(rad) * arrowLen;

      const p1 = Cesium.Cartesian3.fromDegrees(lon, lat, altitude);
      const p2 = Cesium.Cartesian3.fromDegrees(endLon, endLat, altitude);

      // Velocity streamline polyline
      this.polylines.add({
        positions: [p1, p2],
        width: 3.0,
        material: Cesium.Material.fromType('Color', {
          color: cesiumColor,
        }),
      });

      // Arrowhead point indicator
      this.pointCollection.add({
        position: p2,
        pixelSize: 6,
        color: cesiumColor,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 1,
      });
    }
  }

  public clear() {
    this.polylines.removeAll();
    this.pointCollection.removeAll();
  }

  public destroy() {
    this.clear();
    if (!this.polylines.isDestroyed()) {
      this.viewer.scene.primitives.remove(this.polylines);
    }
    if (!this.pointCollection.isDestroyed()) {
      this.viewer.scene.primitives.remove(this.pointCollection);
    }
  }
}
