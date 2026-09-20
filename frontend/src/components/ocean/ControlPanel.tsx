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
      className="fixed sm:absolute bottom-3 sm:bottom-[22px] left-1/2 -translate-x-1/2 flex flex-col gap-2 sm:gap-3 rounded-2xl p-2.5 sm:p-4 shadow-2xl z-20 max-w-[calc(100vw-24px)] sm:max-w-[calc(100vw-40px)] transition-all duration-300"
      style={{
        background: 'rgba(5, 14, 28, 0.88)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 220, 255, 0.28)',
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.75), 0 0 24px rgba(0, 200, 255, 0.12)',
      }}
    >
      {/* Primary Row: Variable, Depth, Time */}
      <div
        className="flex items-center gap-2.5 sm:gap-5 flex-wrap justify-center"
      >
        <VariableSelector />

        <div className="hidden sm:block w-[1px] h-8 bg-white/15" />

        <DepthSlider />

        <div className="hidden sm:block w-[1px] h-8 bg-white/15" />

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
