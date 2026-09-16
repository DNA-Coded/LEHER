import React from 'react';
import { useOceanStore } from '../../store/useOceanStore';
import { OCEAN_REGIONS, getRegionById } from '../../utils/regions';
import { oceanViewerManager } from '../../cesium/viewerManager';
import { Waves, RotateCcw } from 'lucide-react';

export const GlobeOverlay: React.FC = () => {
  const {
    hoveredRegionId,
    selectedRegion,
    setSelectedRegion,
    closeRegion,
  } = useOceanStore();

  const hoveredRegion = hoveredRegionId ? getRegionById(hoveredRegionId) : null;

  return (
    <>
      {/* Top Navigation Bar */}
      <header
        style={{
          position: 'absolute',
          top: '20px',
          left: '28px',
          right: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        {/* Brand & Subtitle */}
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            background: 'rgba(5, 15, 30, 0.85)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(0, 220, 255, 0.25)',
            borderRadius: '16px',
            padding: '10px 20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #00d2ff, #0055ff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 0 16px rgba(0, 210, 255, 0.5)',
            }}
          >
            <Waves size={22} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: 800,
                  letterSpacing: '1.5px',
                  background: 'linear-gradient(90deg, #ffffff, #80d8ff)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                LEHER
              </h1>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#00e5ff',
                  fontFamily: 'system-ui, sans-serif',
                }}
              >
                लहर
              </span>
              <span
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '12px',
                  background: 'rgba(0, 245, 160, 0.18)',
                  color: '#00f5a0',
                  border: '1px solid rgba(0, 245, 160, 0.3)',
                  fontWeight: 600,
                }}
              >
                3D WebGL
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#90b4d4', letterSpacing: '0.4px' }}>
              Indian Ocean 3D Analytical Dynamics Platform
            </div>
          </div>
        </div>

        {/* Region Quick Select Pills & Overview Camera Reset */}
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(5, 15, 30, 0.85)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '14px',
            padding: '6px 12px',
          }}
        >
          <span style={{ fontSize: '11px', color: '#7bb0dc', marginRight: '4px' }}>Regions:</span>
          {OCEAN_REGIONS.map((r) => {
            const isSelected = selectedRegion === r.id;
            return (
              <button
                key={r.id}
                onClick={() => {
                  if (isSelected) {
                    closeRegion();
                    oceanViewerManager.flyToIndiaOverview(1.8);
                  } else {
                    setSelectedRegion(r.id);
                    oceanViewerManager.flyToRegion(r, true);
                  }
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: isSelected
                    ? `1px solid ${r.themeColor}`
                    : '1px solid rgba(255,255,255,0.08)',
                  background: isSelected
                    ? `${r.themeColor}33`
                    : 'rgba(255,255,255,0.04)',
                  color: isSelected ? '#ffffff' : '#a0c0e0',
                  fontSize: '11.5px',
                  fontWeight: isSelected ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {r.name}
              </button>
            );
          })}

          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

          <button
            onClick={() => {
              closeRegion();
              oceanViewerManager.flyToIndiaOverview(2.0);
            }}
            title="Reset camera to India & Indian Ocean overview"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#d0e5ff',
              fontSize: '11.5px',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={12} />
            <span>Reset View</span>
          </button>
        </div>
      </header>

      {/* Hover Region Tooltip (when user hovers over region on globe without selecting) */}
      {hoveredRegion && !selectedRegion && (
        <div
          style={{
            position: 'absolute',
            bottom: '120px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(5, 15, 30, 0.92)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${hoveredRegion.themeColor}`,
            borderRadius: '12px',
            padding: '12px 20px',
            color: '#e2f1ff',
            zIndex: 12,
            boxShadow: `0 8px 28px rgba(0,0,0,0.6), 0 0 16px ${hoveredRegion.themeColor}40`,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            animation: 'fadeIn 0.2s ease-in-out',
          }}
        >
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: hoveredRegion.themeColor,
              boxShadow: `0 0 8px ${hoveredRegion.themeColor}`,
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '15px', color: '#ffffff' }}>{hoveredRegion.name}</strong>
              <span style={{ fontSize: '12px', color: '#88b4d8' }}>({hoveredRegion.hindiName})</span>
            </div>
            <div style={{ fontSize: '11px', color: '#7ab2dc', marginTop: '2px' }}>
              Click to inspect 3D water-column depth slice & analytical profiles
            </div>
          </div>
          <div style={{ paddingLeft: '10px', borderLeft: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', color: '#9fc7ea' }}>
            <div>Max Depth: <strong>{hoveredRegion.maxSupportedDepth}m</strong></div>
            <div>SST: <strong>{hoveredRegion.stats.meanTemperatureC}°C</strong></div>
          </div>
        </div>
      )}
    </>
  );
};
