import React from 'react';
import { OceanGlobe } from './components/Globe/OceanGlobe';
import { GlobeOverlay } from './components/Globe/GlobeOverlay';
import { DepthSlice } from './components/DepthSlice/DepthSlice';
import { ControlPanel } from './components/ControlPanel/ControlPanel';
import { ArgoFloatModal } from './components/Argo/ArgoFloatModal';
import { useOceanStore } from './store/useOceanStore';

export const App: React.FC = () => {
  const { globeOffset } = useOceanStore();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#020b18',
      }}
    >
      {/* 3D Cesium Globe — fills the viewport, shifts laterally on region select */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          transform: `translateX(${globeOffset * 8}vw)`,
          transition: 'transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <OceanGlobe />
      </div>

      {/* HUD Navigation Layer */}
      <GlobeOverlay />

      {/* 3D Depth Slice Analytical Panel */}
      <DepthSlice />

      {/* Argo Float Telemetry Modal */}
      <ArgoFloatModal />

      {/* Bottom Floating Control Dock */}
      <ControlPanel />
    </div>
  );
};

export default App;
