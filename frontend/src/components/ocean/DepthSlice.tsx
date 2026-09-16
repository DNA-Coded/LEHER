import React, { useEffect, useRef } from 'react';
import { oceanViewerManager } from '@/cesium/viewerManager';
import { DepthSlice3DPrimitive } from '@/cesium/primitives/depthSlicePrimitive';
import { CurrentVectors3DPrimitive } from '@/cesium/primitives/currentVectorsPrimitive';
import { useOceanStore } from '@/store/useOceanStore';
import { getRegionById } from '@/lib/ocean/regions';
import { useOceanSlice, useCurrentVectors } from '@/services/useOceanQueries';
import { X, Layers, Activity, Compass, Droplets } from 'lucide-react';
import { DepthSliceLegend } from './DepthSliceLegend';

export const DepthSlice: React.FC = () => {
  const {
    selectedRegion,
    variable,
    depth,
    time,
    opacity,
    verticalExaggeration,
    colorScale,
    showDepthIsoPlanes,
    showCurrentVectors,
    animationState,
    closeRegion,
  } = useOceanStore();

  const slicePrimitiveRef = useRef<DepthSlice3DPrimitive | null>(null);
  const vectorPrimitiveRef = useRef<CurrentVectors3DPrimitive | null>(null);

  // TanStack Query for ocean slice data and velocity vectors
  const { data: sliceData, isLoading: isSliceLoading } = useOceanSlice(
    selectedRegion,
    variable,
    depth,
    time,
    Boolean(selectedRegion)
  );

  const { data: vectorData } = useCurrentVectors(
    selectedRegion,
    depth,
    time,
    Boolean(selectedRegion && showCurrentVectors)
  );

  const activeRegion = selectedRegion ? getRegionById(selectedRegion) : null;

  // Initialize Cesium primitives once viewer is ready
  useEffect(() => {
    const viewer = oceanViewerManager.getViewer();
    if (!viewer) return;

    if (!slicePrimitiveRef.current) {
      slicePrimitiveRef.current = new DepthSlice3DPrimitive(viewer);
    }
    if (!vectorPrimitiveRef.current) {
      vectorPrimitiveRef.current = new CurrentVectors3DPrimitive(viewer);
    }

    return () => {
      if (slicePrimitiveRef.current) {
        slicePrimitiveRef.current.destroy();
        slicePrimitiveRef.current = null;
      }
      if (vectorPrimitiveRef.current) {
        vectorPrimitiveRef.current.destroy();
        vectorPrimitiveRef.current = null;
      }
    };
  }, []);

  // Update 3D Depth Slice geometry when region, depth, variable, or styling parameters change
  useEffect(() => {
    if (!slicePrimitiveRef.current) return;

    if (activeRegion && animationState !== 'idle' && animationState !== 'closing') {
      slicePrimitiveRef.current.update(
        {
          region: activeRegion,
          variable,
          activeDepth: depth,
          maxDepth: activeRegion.maxSupportedDepth,
          verticalExaggeration,
          opacity,
          colorScale,
          showIsoPlanes: showDepthIsoPlanes,
        },
        animationState === 'opening'
      );
    } else {
      slicePrimitiveRef.current.hide();
    }
  }, [
    activeRegion,
    variable,
    depth,
    verticalExaggeration,
    opacity,
    colorScale,
    showDepthIsoPlanes,
    animationState,
    sliceData,
  ]);

  // Update 3D current vectors
  useEffect(() => {
    if (!vectorPrimitiveRef.current) return;

    if (activeRegion && showCurrentVectors && vectorData && animationState !== 'idle' && animationState !== 'closing') {
      vectorPrimitiveRef.current.update(vectorData, 42000.0, true);
    } else {
      vectorPrimitiveRef.current.clear();
    }
  }, [activeRegion, showCurrentVectors, vectorData, animationState]);

  if (!activeRegion || animationState === 'idle') {
    return null;
  }

  const isOpening = animationState === 'opening';

  return (
    <>
      {/* 3D Depth Slice Legend */}
      <DepthSliceLegend />

      {/* Floating Region Detail Badge & Close Control */}
      <div
        className={`depth-slice-card ${isOpening ? 'fade-in-up' : 'fade-in'}`}
        style={{
          position: 'absolute',
          top: '80px',
          left: '28px',
          width: '380px',
          maxHeight: 'calc(100vh - 220px)',
          overflowY: 'auto',
          zIndex: 15,
          background: 'rgba(5, 15, 30, 0.82)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(0, 220, 255, 0.25)',
          borderRadius: '16px',
          padding: '22px',
          color: '#e2f1ff',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.65), 0 0 20px rgba(0, 180, 255, 0.15)',
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: activeRegion.themeColor,
                  boxShadow: `0 0 10px ${activeRegion.themeColor}`,
                }}
              />
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.2px', color: '#7ad1ff' }}>
                3D Ocean Column Slice
              </span>
            </div>
            <h2 style={{ margin: '6px 0 2px 0', fontSize: '22px', fontWeight: 700, color: '#ffffff' }}>
              {activeRegion.name}
            </h2>
            <div style={{ fontSize: '13px', color: '#90b4d4' }}>{activeRegion.hindiName}</div>
          </div>

          <button
            onClick={() => {
              closeRegion();
              oceanViewerManager.flyToIndiaOverview(1.8);
            }}
            title="Return to full Indian Ocean globe"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 70, 70, 0.35)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Description */}
        <p style={{ margin: '14px 0', fontSize: '12.5px', lineHeight: '1.55', color: '#b5d0e8' }}>
          {activeRegion.description}
        </p>

        {/* Oceanographic Key Metrics */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            margin: '16px 0',
          }}
        >
          <div
            style={{
              background: 'rgba(0, 30, 60, 0.5)',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid rgba(0, 200, 255, 0.12)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#7ad1ff' }}>
              <Layers size={13} />
              <span>Max Depth</span>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 600, marginTop: '4px', color: '#ffffff' }}>
              {activeRegion.maxSupportedDepth.toLocaleString()} m
            </div>
          </div>

          <div
            style={{
              background: 'rgba(0, 30, 60, 0.5)',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid rgba(0, 200, 255, 0.12)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#7ad1ff' }}>
              <Droplets size={13} />
              <span>Mean Salinity</span>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 600, marginTop: '4px', color: '#ffffff' }}>
              {activeRegion.stats.meanSalinityPsu} PSU
            </div>
          </div>

          <div
            style={{
              background: 'rgba(0, 30, 60, 0.5)',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid rgba(0, 200, 255, 0.12)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#7ad1ff' }}>
              <Activity size={13} />
              <span>Surface SST</span>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 600, marginTop: '4px', color: '#ffffff' }}>
              {activeRegion.stats.meanTemperatureC} °C
            </div>
          </div>

          <div
            style={{
              background: 'rgba(0, 30, 60, 0.5)',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid rgba(0, 200, 255, 0.12)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#7ad1ff' }}>
              <Compass size={13} />
              <span>Surface Area</span>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 600, marginTop: '4px', color: '#ffffff' }}>
              {(activeRegion.stats.surfaceAreaKm2 / 1000000).toFixed(2)} M km²
            </div>
          </div>
        </div>

        {/* Monsoon Dynamics Note */}
        <div
          style={{
            background: 'rgba(0, 150, 255, 0.08)',
            borderLeft: '3px solid #00d2ff',
            padding: '10px 12px',
            borderRadius: '0 8px 8px 0',
            fontSize: '11.5px',
            lineHeight: '1.45',
            color: '#aed9ff',
            marginBottom: '14px',
          }}
        >
          <strong style={{ color: '#ffffff' }}>Monsoon Dynamic: </strong>
          {activeRegion.stats.monsoonInfluence}
        </div>

        {/* Status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#6892b5' }}>
          <span>Active Depth Level: -{depth} m</span>
          <span>{isSliceLoading ? '⚡ Decoding worker...' : '✓ GPU Ingested'}</span>
        </div>
      </div>
    </>
  );
};
