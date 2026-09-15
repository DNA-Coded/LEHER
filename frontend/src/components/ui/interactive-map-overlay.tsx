import React, { useState } from 'react';
import { 
  Compass, 
  Layers, 
  MapPin, 
  Radio, 
  Navigation, 
  AlertTriangle, 
  Route, 
  ShieldCheck, 
  Maximize2, 
  Minimize2, 
  Eye, 
  Check,
  ChevronRight,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  DEMO_ARGO_FLOATS, 
  DEMO_GLIDERS, 
  DEMO_ROUTE_COMPARISON,
  type RiskLevel 
} from '@/lib/types/operational-types';
import { RiskBadge } from '@/components/ui/risk-badge';

interface InteractiveMapOverlayProps {
  targetLat: number;
  targetLon: number;
  targetDepth: number;
  activeTab: 'location' | 'observations' | 'model-vs-obs' | 'route';
  onTabChange: (tab: 'location' | 'observations' | 'model-vs-obs' | 'route') => void;
  onSelectCoordinates: (lat: number, lon: number) => void;
  isSidePanelOpen: boolean;
  onToggleSidePanel: () => void;
  activeRouteView?: 'original' | 'safer' | 'compare';
}

export function InteractiveMapOverlay({
  targetLat,
  targetLon,
  targetDepth,
  activeTab,
  onTabChange,
  onSelectCoordinates,
  isSidePanelOpen,
  onToggleSidePanel,
  activeRouteView = 'compare',
}: InteractiveMapOverlayProps) {
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [visibleLayers, setVisibleLayers] = useState({
    reticle: true,
    argo: true,
    gliders: true,
    hazards: true,
    routes: true,
  });

  const [showRouteChartModal, setShowRouteChartModal] = useState(false);

  const toggleLayer = (layerKey: keyof typeof visibleLayers) => {
    setVisibleLayers(prev => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {/* 1. TOP-LEFT FLOATING WORKSPACE STATUS & QUICK LAYER TOGGLES */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-auto">
        <div className="flex items-center gap-1.5 bg-[#050505]/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs font-mono shadow-xl text-white">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-bold tracking-wider uppercase text-[11px]">LEHER WORKBENCH</span>
          <span className="text-[#666666]">|</span>
          <span className="text-cyan-400 font-medium capitalize text-[11px]">
            {activeTab.replace('-', ' ')}
          </span>
        </div>

        {/* Floating Layer Controls Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="flex items-center gap-2 bg-[#050505]/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs font-mono text-[#aaaaaa] hover:text-white transition-colors cursor-pointer shadow-lg"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Map Layers</span>
            <span className="text-[10px] bg-white/10 px-1.5 rounded text-white">
              {Object.values(visibleLayers).filter(Boolean).length} Active
            </span>
          </button>

          {showLayerMenu && (
            <div className="absolute top-full left-0 mt-1.5 w-56 bg-[#0c0c0c]/95 backdrop-blur-xl border border-[#262626] rounded-xl p-2 shadow-2xl space-y-1 text-xs font-mono">
              <div className="text-[10px] text-[#777777] uppercase px-2 py-1">Visible Overlays</div>
              
              <button
                type="button"
                onClick={() => toggleLayer('reticle')}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-left text-white"
              >
                <div className="flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Target Reticle</span>
                </div>
                {visibleLayers.reticle && <Check className="w-3.5 h-3.5 text-cyan-400" />}
              </button>

              <button
                type="button"
                onClick={() => toggleLayer('argo')}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-left text-white"
              >
                <div className="flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Argo Floats</span>
                </div>
                {visibleLayers.argo && <Check className="w-3.5 h-3.5 text-cyan-400" />}
              </button>

              <button
                type="button"
                onClick={() => toggleLayer('gliders')}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-left text-white"
              >
                <div className="flex items-center gap-2">
                  <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Glider Tracks</span>
                </div>
                {visibleLayers.gliders && <Check className="w-3.5 h-3.5 text-cyan-400" />}
              </button>

              <button
                type="button"
                onClick={() => toggleLayer('hazards')}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-left text-white"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Hazard Zones</span>
                </div>
                {visibleLayers.hazards && <Check className="w-3.5 h-3.5 text-cyan-400" />}
              </button>

              <button
                type="button"
                onClick={() => toggleLayer('routes')}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-left text-white"
              >
                <div className="flex items-center gap-2">
                  <Route className="w-3.5 h-3.5 text-amber-400" />
                  <span>Corridor Routes</span>
                </div>
                {visibleLayers.routes && <Check className="w-3.5 h-3.5 text-cyan-400" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. TOP-RIGHT PANEL EXPAND / COLLAPSE TOGGLE (DESKTOP) */}
      <div className="absolute top-4 right-4 hidden lg:flex items-center gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={onToggleSidePanel}
          className="flex items-center gap-2 bg-[#050505]/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 text-xs font-mono text-[#cccccc] hover:text-white transition-all cursor-pointer shadow-xl hover:bg-white/10"
          title={isSidePanelOpen ? "Collapse Analytics Panel" : "Expand Analytics Panel"}
        >
          {isSidePanelOpen ? (
            <>
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Maximize Globe</span>
            </>
          ) : (
            <>
              <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Show Operations Deck</span>
            </>
          )}
        </button>
      </div>

      {/* 3. SCIENTIFIC ASSETS CALLOUT CHIPS (FLOAT & GLIDER SHORTCUTS) */}
      {visibleLayers.argo && (
        <div className="absolute top-20 left-4 hidden md:flex flex-col gap-1.5 pointer-events-auto max-w-xs">
          <span className="text-[10px] font-mono text-[#777777] uppercase tracking-wider pl-1">
            Profiling Floats in View
          </span>
          {DEMO_ARGO_FLOATS.map((float) => (
            <button
              key={float.id}
              type="button"
              onClick={() => {
                onSelectCoordinates(float.lat, float.lon);
                onTabChange('observations');
              }}
              className="bg-[#050505]/80 hover:bg-[#111111] backdrop-blur-md border border-white/10 hover:border-cyan-500/60 p-2 rounded-xl text-left transition-all cursor-pointer shadow-md group flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-xs font-mono font-bold text-white group-hover:text-cyan-400">
                  {float.id}
                </span>
                <span className="text-[10px] font-mono text-[#888888]">
                  {float.basin}
                </span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#555555] group-hover:text-cyan-400 transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
      )}

      {/* 4. ROUTE VISUALIZATION PREVIEW BAR (WHEN ON ROUTE TAB) */}
      {activeTab === 'route' && visibleLayers.routes && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto hidden sm:block">
          <div className="bg-[#050505]/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15 shadow-2xl flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-rose-300 font-bold">Direct Route: 540 NM (DANGER)</span>
            </div>
            <span className="text-[#555555]">vs</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-cyan-300 font-bold">Safer Bypass: 568 NM (SAFE)</span>
            </div>
            <button
              type="button"
              onClick={() => setShowRouteChartModal(true)}
              className="px-2.5 py-1 rounded-lg bg-cyan-400 text-black font-bold text-[11px] hover:bg-cyan-300 transition-colors cursor-pointer ml-1"
            >
              Inspect Route Chart
            </button>
          </div>
        </div>
      )}

      {/* 5. ROUTE CHART MODAL OVERLAY */}
      {showRouteChartModal && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto z-50">
          <div className="bg-[#0e0e0e] border border-[#2e2e2e] rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl text-white font-sans">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <div className="flex items-center gap-2">
                <Route className="w-5 h-5 text-cyan-400" />
                <h3 className="font-mono font-bold text-sm uppercase tracking-wider text-white">
                  West Coast Maritime Corridor: Route Comparison Chart
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRouteChartModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-[#888888] hover:text-white flex items-center justify-center font-mono text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Nautical Chart SVG */}
            <div className="bg-[#050505] border border-[#222222] rounded-2xl p-4 flex flex-col items-center">
              <svg 
                viewBox="0 0 500 240" 
                className="w-full h-auto max-h-56"
                role="img"
                aria-label="Route comparison between Mumbai and Kochi"
              >
                {/* Background Grid */}
                <line x1="50" y1="40" x2="450" y2="40" stroke="#1c1c1c" strokeDasharray="2,2" />
                <line x1="50" y1="120" x2="450" y2="120" stroke="#1c1c1c" strokeDasharray="2,2" />
                <line x1="50" y1="200" x2="450" y2="200" stroke="#1c1c1c" strokeDasharray="2,2" />

                {/* Coastline Representation (Schematic) */}
                <path 
                  d="M 280 20 Q 320 100 360 160 T 400 220" 
                  fill="none" 
                  stroke="#333333" 
                  strokeWidth="3" 
                />
                <text x="370" y="70" className="text-[10px] fill-[#666666] font-mono">Indian Coastline</text>

                {/* Active Storm Hazard Zone (Crimson Polygon) */}
                <polygon 
                  points="260,110 350,110 360,165 240,165" 
                  fill="rgba(244, 63, 94, 0.18)" 
                  stroke="#f43f5e" 
                  strokeWidth="1.5" 
                  strokeDasharray="4,3" 
                />
                <text x="250" y="140" className="text-[10px] fill-rose-400 font-mono font-bold">
                  CONVECTIVE SQUALL ZONE (3.8m Waves)
                </text>

                {/* Direct Route (Crimson Line) */}
                <path 
                  d="M 275 30 L 305 85 L 325 140 L 375 210" 
                  fill="none" 
                  stroke="#f43f5e" 
                  strokeWidth="2.5" 
                />

                {/* Safer Alternative Route (Cyan Line - Offshore Bypass) */}
                <path 
                  d="M 275 30 L 220 85 L 205 140 L 300 195 L 375 210" 
                  fill="none" 
                  stroke="#22d3ee" 
                  strokeWidth="3" 
                  strokeDasharray="6,3" 
                />

                {/* Departure: Mumbai */}
                <circle cx="275" cy="30" r="5" fill="#10b981" />
                <text x="285" y="34" className="text-[10px] fill-white font-mono font-bold">Mumbai Port (0 NM)</text>

                {/* Destination: Kochi */}
                <circle cx="375" cy="210" r="5" fill="#22d3ee" />
                <text x="385" y="214" className="text-[10px] fill-white font-mono font-bold">Kochi Harbour (540 NM)</text>

                {/* Deep shelf label */}
                <text x="70" y="110" className="text-[10px] fill-[#777777] font-mono">
                  Deep Basin (&gt;1500m)
                </text>
                <text x="70" y="125" className="text-[9px] fill-cyan-400 font-mono">
                  Offshore Safer Bypass (+28 NM)
                </text>
              </svg>

              <div className="flex items-center justify-between w-full mt-3 text-xs font-mono border-t border-[#1a1a1a] pt-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-1 bg-rose-500 rounded" />
                  <span className="text-[#aaaaaa]">Direct Route (Crosses hazard in Sector 3)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-1 bg-cyan-400 rounded" />
                  <span className="text-cyan-300 font-bold">Safer Route (Bypasses hazard westward)</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowRouteChartModal(false)}
                className="px-4 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-[#eeeeee] transition-colors cursor-pointer"
              >
                Close Route Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. BOTTOM FLOATING COORDINATE RETICLE HUD */}
      {visibleLayers.reticle && (
        <div className="absolute bottom-4 left-4 right-4 lg:right-auto pointer-events-none">
          <div className="bg-[#050505]/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-xs font-mono text-[#aaaaaa] flex items-center justify-between sm:justify-start gap-3 pointer-events-auto shadow-2xl">
            <div className="flex items-center gap-2.5">
              <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                Target: <strong className="text-white">{targetLat >= 0 ? `${targetLat.toFixed(2)}°N` : `${Math.abs(targetLat).toFixed(2)}°S`}, {targetLon >= 0 ? `${targetLon.toFixed(2)}°E` : `${Math.abs(targetLon).toFixed(2)}°W`}</strong> @ {targetDepth}m
              </span>
            </div>
            <span className="text-cyan-400 hidden sm:inline">• Click on 3D Earth to inspect any point</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default InteractiveMapOverlay;
