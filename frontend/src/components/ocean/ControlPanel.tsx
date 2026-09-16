import React from 'react';
import { VariableSelector } from './VariableSelector';
import { DepthSlider } from './DepthSlider';
import { TimeSlider } from './TimeSlider';
import { OpacityControls } from './OpacityControls';
import { useOceanStore } from '@/store/useOceanStore';

export const ControlPanel: React.FC = () => {
  const { selectedRegion } = useOceanStore();

  return (
    <div
      id="leher-control-dock"
      style={{
        position: 'absolute',
        bottom: '22px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        background: 'rgba(5, 14, 28, 0.88)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 220, 255, 0.28)',
        borderRadius: '18px',
        padding: '14px 22px',
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.75), 0 0 24px rgba(0, 200, 255, 0.12)',
        zIndex: 20,
        maxWidth: 'calc(100vw - 40px)',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Primary Row: Variable, Depth, Time */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <VariableSelector />

        <div style={{ width: '1px', height: '32px', background: 'rgba(255, 255, 255, 0.12)' }} />

        <DepthSlider />

        <div style={{ width: '1px', height: '32px', background: 'rgba(255, 255, 255, 0.12)' }} />

        <TimeSlider />
      </div>

      {/* Secondary Row: Opacity, Exaggeration & Layer Toggles (Visible when region slice is active) */}
      {selectedRegion && (
        <div
          style={{
            paddingTop: '8px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <OpacityControls />
        </div>
      )}
    </div>
  );
};
