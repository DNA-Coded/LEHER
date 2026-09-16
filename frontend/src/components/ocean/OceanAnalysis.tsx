import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OceanGlobe } from './OceanGlobe';
import { GlobeOverlay } from './GlobeOverlay';
import { DepthSlice } from './DepthSlice';
import { ControlPanel } from './ControlPanel';
import { ArgoFloatModal } from './ArgoFloatModal';
import { LocationInspector } from './LocationInspector';
import { StandaloneDepthSliceViewer } from './depth-slice/StandaloneDepthSliceViewer';
import { DepthSliceSideTab } from './depth-slice/DepthSliceSideTab';
import { useOceanStore } from '@/store/useOceanStore';
import { oceanDataService } from '@/lib/api/oceanDataService';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

interface OceanAnalysisProps {
  onBackToLanding?: () => void;
}

export const OceanAnalysis: React.FC<OceanAnalysisProps> = ({ onBackToLanding }) => {
  const {
    isPointDepthOpen,
    clickedLocation,
    setDepthColumnData,
    setIsPointDataLoading,
  } = useOceanStore();

  // Reactive data pipeline: Fetch multi-layer predictions from backend ML model
  // whenever a point on the globe is clicked or updated
  useEffect(() => {
    if (!isPointDepthOpen || !clickedLocation) return;

    let isCancelled = false;
    setIsPointDataLoading(true);

    oceanDataService
      .predictDepthColumn(clickedLocation.lat, clickedLocation.lon)
      .then((data) => {
        if (!isCancelled) {
          setDepthColumnData(data);
          setIsPointDataLoading(false);
        }
      })
      .catch((err) => {
        console.warn('[OceanAnalysis] ML depth column fetch error:', err);
        if (!isCancelled) {
          setIsPointDataLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isPointDepthOpen, clickedLocation?.lat, clickedLocation?.lon, setDepthColumnData, setIsPointDataLoading]);

  return (
    <QueryClientProvider client={queryClient}>
      <div
        id="leher-ocean-analysis-lab"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          background: '#020b18',
          zIndex: 100,
        }}
      >
        {/* ── LEFT SIDE: Standalone Interactive Cesium Globe ────────────────── */}
        <div
          id="left-globe-viewport"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: isPointDepthOpen ? '50vw' : '100vw',
            height: '100vh',
            transition: 'width 0.65s cubic-bezier(0.16, 1, 0.3, 1)',
            zIndex: 1,
          }}
        >
          <OceanGlobe />
        </div>

        {/* ── RIGHT SIDE: Standalone 3D Depth-Slice Viewer & ML Sidetab ─────── */}
        {isPointDepthOpen && (
          <div
            id="right-depth-slice-viewport"
            style={{
              position: 'absolute',
              top: 0,
              left: '50vw',
              width: '50vw',
              height: '100vh',
              zIndex: 2,
              animation: 'fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            {/* Independent 3D Depth Slice Scene (Three.js with OrbitControls) */}
            <StandaloneDepthSliceViewer />

            {/* Sidetab Telemetry Panel showing all ML Predictions & Metrics */}
            <DepthSliceSideTab />
          </div>
        )}

        {/* HUD Navigation Layer (Header, Basin Quick-links, Back to Landing) */}
        <GlobeOverlay onBackToLanding={onBackToLanding} />

        {/* Optional Region Slice Overlay */}
        <DepthSlice />

        {/* Argo Profiling Float Telemetry Modal */}
        <ArgoFloatModal />

        {/* Click-to-Get-Location Quick Pin Badge (only when depth slice is closed) */}
        {!isPointDepthOpen && <LocationInspector />}

        {/* Bottom Floating Variable / Depth / Time Dock */}
        <ControlPanel />
      </div>
    </QueryClientProvider>
  );
};

export default OceanAnalysis;
