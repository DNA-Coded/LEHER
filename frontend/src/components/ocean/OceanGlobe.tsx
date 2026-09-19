import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { oceanViewerManager } from '@/cesium/viewerManager';
import { useOceanStore } from '@/store/useOceanStore';
import { OCEAN_REGIONS, getRegionById } from '@/lib/ocean/regions';
import { MOCK_ARGO_FLOATS } from '@/services/mockOceanData';
import { fetchHazardEvents, type HazardEvent } from '@/services/oceanApi';

// Track whether Cesium has been initialized in this page session
let cesiumInitialized = false;

export const OceanGlobe: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const entitiesAdded = useRef(false);
  const {
    selectedRegion,
    setSelectedRegion,
    hoveredRegionId,
    setHoveredRegion,
    showArgoMarkers,
    setActiveArgoFloatId,
    setClickedLocation,
    clickedLocation,
    isPointDepthOpen,
    openPointDepth,
  } = useOceanStore();

  useEffect(() => {
    if (!containerRef.current || cesiumInitialized) return;
    cesiumInitialized = true;

    // Initialize Cesium Viewer
    const viewer = oceanViewerManager.initViewer({
      container: containerRef.current,
    });

    // Add Selectable Ocean Regions as interactive Cesium Entities — only once
    if (!entitiesAdded.current) {
      entitiesAdded.current = true;

      for (const region of OCEAN_REGIONS) {
        const flatCoords: number[] = [];
        for (const pt of region.polygon) {
          flatCoords.push(pt[0], pt[1]);
        }

        const baseColor = Cesium.Color.fromCssColorString(region.themeColor).withAlpha(0.45);
        const outlineColor = Cesium.Color.fromCssColorString(region.themeColor).withAlpha(0.95);

        viewer.entities.add({
          id: `region-${region.id}`,
          name: region.name,
          polygon: {
            hierarchy: new Cesium.PolygonHierarchy(
              Cesium.Cartesian3.fromDegreesArray(flatCoords)
            ),
            material: new Cesium.ColorMaterialProperty(baseColor),
            height: 1000,
            outline: true,
            outlineColor: new Cesium.ConstantProperty(outlineColor),
            outlineWidth: 4,
          },
          properties: {
            regionId: region.id,
            regionType: 'ocean-region',
          },
        });

        // Floating region label
        viewer.entities.add({
          id: `label-${region.id}`,
          position: Cesium.Cartesian3.fromDegrees(region.center.lon, region.center.lat, 25000),
          label: {
            text: `${region.name}\n${region.hindiName}`,
            font: 'bold 15px Outfit, Inter, sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 4,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(200000, 12000000),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
      }

      // Add Argo profiling float markers
      for (const float of MOCK_ARGO_FLOATS) {
        viewer.entities.add({
          id: `argo-${float.floatId}`,
          name: `Argo Profiler #${float.wmoNumber}`,
          position: Cesium.Cartesian3.fromDegrees(float.lon, float.lat, 15000),
          point: {
            pixelSize: 10,
            color: Cesium.Color.fromCssColorString('#ffd700'),
            outlineColor: Cesium.Color.fromCssColorString('#020b18'),
            outlineWidth: 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: `▲ Argo #${float.wmoNumber}`,
            font: '11px Inter, sans-serif',
            fillColor: Cesium.Color.fromCssColorString('#ffd700'),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -18),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(50000, 5000000),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          properties: {
            floatId: float.floatId,
            regionType: 'argo-float',
          },
        });
      }

      // Add Live Rakshak ML Hazard Markers (Cyclones, Storm Surges, Extreme Tides)
      fetchHazardEvents().then((hazards) => {
        for (const hazard of hazards.slice(0, 50)) { // Display active alerts
          const isCyclone = hazard.type === 'cyclone';
          const isSurge = hazard.type === 'storm_surge';
          const colorHex = isCyclone ? '#ff1744' : isSurge ? '#ff9100' : '#00e5ff';
          const symbol = isCyclone ? '🔴' : isSurge ? '🌊' : '⚓';
          const labelText = isCyclone 
            ? `${symbol} Cyclone ${hazard.event_id}\nP: ${(hazard.probability ? hazard.probability * 100 : 80).toFixed(0)}%`
            : `${symbol} Surge ${hazard.event_id}\n+${hazard.surge_height_m || 1.8}m`;

          viewer.entities.add({
            id: `hazard-${hazard.event_id}`,
            name: `${hazard.type.toUpperCase()}: ${hazard.event_id}`,
            position: Cesium.Cartesian3.fromDegrees(hazard.longitude, hazard.latitude, 20000),
            point: {
              pixelSize: 12,
              color: Cesium.Color.fromCssColorString(colorHex),
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
            label: {
              text: labelText,
              font: 'bold 10px Inter, sans-serif',
              fillColor: Cesium.Color.fromCssColorString(colorHex),
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 3,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, -22),
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(50000, 8000000),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
            properties: {
              hazardId: hazard.event_id,
              hazardType: hazard.type,
              regionType: 'hazard-event',
            },
          });
        }
      });
    }

    // Setup Cesium ScreenSpaceEventHandler for Hover and Click/Tap interactions
    const handler = oceanViewerManager.getHandler();
    if (handler) {
      handler.setInputAction((movement: { endPosition: Cesium.Cartesian2 }) => {
        const picked = viewer.scene.pick(movement.endPosition);
        if (Cesium.defined(picked) && picked.id) {
          const entity = picked.id as Cesium.Entity;
          const props = entity.properties;
          if (props && props.regionType) {
            const type = props.regionType.getValue();
            if (type === 'ocean-region') {
              setHoveredRegion(props.regionId.getValue());
              viewer.canvas.style.cursor = 'pointer';
              return;
            } else if (type === 'argo-float') {
              viewer.canvas.style.cursor = 'pointer';
              return;
            }
          }
        }
        setHoveredRegion(null);
        viewer.canvas.style.cursor = 'default';
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

      // Reliable tap/click-to-get-location in EVERY globe layout / state
      handler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
        // 1. Raycast to determine exact surface coordinates clicked
        let lon: number | null = null;
        let lat: number | null = null;

        const ray = viewer.camera.getPickRay(click.position);
        const cartesian = ray
          ? viewer.scene.globe.pick(ray, viewer.scene) || viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid)
          : viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid);

        if (cartesian) {
          const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
          lon = Cesium.Math.toDegrees(cartographic.longitude);
          lat = Cesium.Math.toDegrees(cartographic.latitude);
        }

        // 2. Check if a specific entity was picked
        const picked = viewer.scene.pick(click.position);
        if (Cesium.defined(picked) && picked.id) {
          const entity = picked.id as Cesium.Entity;
          const props = entity.properties;
          if (props && props.regionType) {
            const type = props.regionType.getValue();
            if (type === 'ocean-region') {
              const regId = props.regionId.getValue();
              setSelectedRegion(regId);
              const region = getRegionById(regId);
              if (region) oceanViewerManager.flyToRegion(region, true);

              if (lon !== null && lat !== null) {
                setClickedLocation({
                  lon: Number(lon.toFixed(4)),
                  lat: Number(lat.toFixed(4)),
                  regionName: region ? region.name : undefined,
                });
                openPointDepth();
              }
              return;
            } else if (type === 'argo-float') {
              const fId = props.floatId.getValue();
              setActiveArgoFloatId(fId);
              const float = MOCK_ARGO_FLOATS.find((f) => f.floatId === fId);
              if (float) {
                setClickedLocation({
                  lon: float.lon,
                  lat: float.lat,
                  regionName: `Argo Profiler #${float.wmoNumber}`,
                });
                openPointDepth();
              }
              return;
            }
          }
        }

        // 3. Bare globe surface clicked: update click-to-get-location and open depth slice
        if (lon !== null && lat !== null) {
          // Normalize longitude to [-180, 180]
          let normLon = ((lon + 180) % 360 + 360) % 360 - 180;
          setClickedLocation({
            lon: Number(normLon.toFixed(4)),
            lat: Number(lat.toFixed(4)),
          });
          openPointDepth();
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    }

    // ResizeObserver to handle container size changes smoothly without stretching
    const container = containerRef.current;
    let resizeObserver: ResizeObserver | null = null;
    if (container && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        const v = oceanViewerManager.getViewer();
        if (v && !v.isDestroyed()) {
          v.resize();
        }
      });
      resizeObserver.observe(container);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update hover styling on region entities
  useEffect(() => {
    const viewer = oceanViewerManager.getViewer();
    if (!viewer) return;

    for (const region of OCEAN_REGIONS) {
      const entity = viewer.entities.getById(`region-${region.id}`);
      if (entity && entity.polygon) {
        const isHovered = hoveredRegionId === region.id;
        const isSelected = selectedRegion === region.id;
        const alpha = isSelected ? 0.70 : isHovered ? 0.58 : 0.45;
        entity.polygon.material = new Cesium.ColorMaterialProperty(
          Cesium.Color.fromCssColorString(region.themeColor).withAlpha(alpha)
        );
        const outlineAlpha = isSelected ? 1.0 : isHovered ? 0.98 : 0.85;
        entity.polygon.outlineColor = new Cesium.ConstantProperty(
          Cesium.Color.fromCssColorString(region.themeColor).withAlpha(outlineAlpha)
        );
      }
    }
  }, [hoveredRegionId, selectedRegion]);

  // Toggle Argo float visibility
  useEffect(() => {
    const viewer = oceanViewerManager.getViewer();
    if (!viewer) return;
    for (const float of MOCK_ARGO_FLOATS) {
      const entity = viewer.entities.getById(`argo-${float.floatId}`);
      if (entity) entity.show = showArgoMarkers;
    }
  }, [showArgoMarkers]);

  // Render and update the clicked location 3D marker beacon on the Cesium globe
  useEffect(() => {
    const viewer = oceanViewerManager.getViewer();
    if (!viewer) return;

    const markerId = 'clicked-location-beacon';
    const beaconLineId = 'clicked-location-beacon-line';
    const pulseRingId = 'clicked-location-pulse-ring';

    if (clickedLocation && isPointDepthOpen) {
      const { lon, lat } = clickedLocation;
      const position = Cesium.Cartesian3.fromDegrees(lon, lat, 1500);

      // 1. Point Marker & High-Contrast Label
      let entity = viewer.entities.getById(markerId);
      if (!entity) {
        viewer.entities.add({
          id: markerId,
          name: 'Active Depth Column Location',
          position,
          point: {
            pixelSize: 14,
            color: Cesium.Color.fromCssColorString('#00f5a0'),
            outlineColor: Cesium.Color.fromCssColorString('#020b18'),
            outlineWidth: 3,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: `📍 ${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E\n[Active Depth Slice]`,
            font: 'bold 12px Outfit, Inter, sans-serif',
            fillColor: Cesium.Color.fromCssColorString('#ffffff'),
            outlineColor: Cesium.Color.fromCssColorString('#020b18'),
            outlineWidth: 4,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -36),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(1000, 15000000),
          },
        });
      } else {
        entity.position = new Cesium.ConstantPositionProperty(position);
        if (entity.label) {
          entity.label.text = new Cesium.ConstantProperty(
            `📍 ${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E\n[Active Depth Slice]`
          );
        }
        entity.show = true;
      }

      // 2. Vertical Glowing Laser Beam extending upwards from the clicked point
      let beaconLine = viewer.entities.getById(beaconLineId);
      const linePositions = Cesium.Cartesian3.fromDegreesArrayHeights([
        lon, lat, 0,
        lon, lat, 350000,
      ]);
      if (!beaconLine) {
        viewer.entities.add({
          id: beaconLineId,
          polyline: {
            positions: linePositions,
            width: 4,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.35,
              color: Cesium.Color.fromCssColorString('#00f5a0'),
            }),
          },
        });
      } else {
        if (beaconLine.polyline) {
          beaconLine.polyline.positions = new Cesium.ConstantProperty(linePositions);
        }
        beaconLine.show = true;
      }

      // 3. Surface Target Ring Circle around the clicked point
      let pulseRing = viewer.entities.getById(pulseRingId);
      if (!pulseRing) {
        viewer.entities.add({
          id: pulseRingId,
          position: Cesium.Cartesian3.fromDegrees(lon, lat, 500),
          ellipse: {
            semiMinorAxis: 45000,
            semiMajorAxis: 45000,
            material: new Cesium.ColorMaterialProperty(
              Cesium.Color.fromCssColorString('#00f5a0').withAlpha(0.25)
            ),
            outline: true,
            outlineColor: new Cesium.ConstantProperty(
              Cesium.Color.fromCssColorString('#00f5a0').withAlpha(0.9)
            ),
            outlineWidth: 3,
          },
        });
      } else {
        pulseRing.position = new Cesium.ConstantPositionProperty(
          Cesium.Cartesian3.fromDegrees(lon, lat, 500)
        );
        pulseRing.show = true;
      }
    } else {
      // Hide marker and beam when depth slice is not active
      const entity = viewer.entities.getById(markerId);
      if (entity) entity.show = false;
      const beaconLine = viewer.entities.getById(beaconLineId);
      if (beaconLine) beaconLine.show = false;
      const pulseRing = viewer.entities.getById(pulseRingId);
      if (pulseRing) pulseRing.show = false;
    }
  }, [clickedLocation, isPointDepthOpen]);

  return (
    <div
      ref={containerRef}
      id="cesium-globe-container"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
      }}
    />
  );
};
