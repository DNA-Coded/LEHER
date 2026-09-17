import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { oceanViewerManager } from '../../cesium/viewerManager';
import { useOceanStore } from '../../store/useOceanStore';
import { OCEAN_REGIONS, getRegionById } from '../../utils/regions';
import { MOCK_ARGO_FLOATS } from '../../services/mockOceanData';

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
  } = useOceanStore();

  const selectedRegionRef = useRef(selectedRegion);
  selectedRegionRef.current = selectedRegion;

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

        const baseColor = Cesium.Color.fromCssColorString(region.themeColor).withAlpha(0.18);
        const outlineColor = Cesium.Color.fromCssColorString(region.themeColor).withAlpha(0.85);

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
            outlineWidth: 3,
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
    }

    // Setup Cesium ScreenSpaceEventHandler for Hover and Click interactions
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

      handler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
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
              return;
            } else if (type === 'argo-float') {
              setActiveArgoFloatId(props.floatId.getValue());
              return;
            }
          }
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    }

    // NOTE: no cleanup destroy — the viewer is a page-lifetime singleton.
    // Destroying it on unmount would break hot-reload in dev.
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
        const alpha = isSelected ? 0.38 : isHovered ? 0.32 : 0.16;
        entity.polygon.material = new Cesium.ColorMaterialProperty(
          Cesium.Color.fromCssColorString(region.themeColor).withAlpha(alpha)
        );
        const outlineAlpha = isSelected ? 1.0 : isHovered ? 0.95 : 0.65;
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
