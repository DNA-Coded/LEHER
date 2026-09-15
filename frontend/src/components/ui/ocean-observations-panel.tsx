import React, { useState } from 'react';
import { 
  Radio, 
  Navigation, 
  BatteryCharging, 
  Clock, 
  MapPin, 
  Activity, 
  Thermometer, 
  Droplets, 
  Compass, 
  Layers, 
  ChevronRight,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  DEMO_ARGO_FLOATS, 
  DEMO_GLIDERS, 
  type ArgoObservation, 
  type GliderObservation,
  type ProfilePoint
} from '@/lib/types/operational-types';

interface OceanObservationsPanelProps {
  onSelectCoordinates?: (lat: number, lon: number) => void;
}

export function OceanObservationsPanel({ onSelectCoordinates }: OceanObservationsPanelProps) {
  const [activeTab, setActiveTab] = useState<'argo' | 'glider'>('argo');
  const [selectedArgoId, setSelectedArgoId] = useState<string>(DEMO_ARGO_FLOATS[0].id);
  const [selectedGliderId, setSelectedGliderId] = useState<string>(DEMO_GLIDERS[0].id);

  const selectedArgo = DEMO_ARGO_FLOATS.find(f => f.id === selectedArgoId) || DEMO_ARGO_FLOATS[0];
  const selectedGlider = DEMO_GLIDERS.find(g => g.id === selectedGliderId) || DEMO_GLIDERS[0];

  const currentItem = activeTab === 'argo' ? selectedArgo : selectedGlider;

  // SVG Chart Dimensions for Depth Profile
  const chartWidth = 320;
  const chartHeight = 180;
  const padding = { top: 15, right: 25, bottom: 25, left: 45 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Depth range: 0 to maxDepth
  const maxDepth = Math.max(...currentItem.profile.map(p => p.depth), 2000);
  const minTemp = 0;
  const maxTemp = 32;
  const minSal = 32;
  const maxSal = 38;

  // Helper coordinate mapper
  const getY = (depth: number) => padding.top + (depth / maxDepth) * innerHeight;
  const getTempX = (t: number) => padding.left + ((t - minTemp) / (maxTemp - minTemp)) * innerWidth;
  const getSalX = (s: number) => padding.left + ((s - minSal) / (maxSal - minSal)) * innerWidth;

  // Generate SVG path for Temperature
  const tempPath = currentItem.profile.reduce((acc, point, index) => {
    const x = getTempX(point.temperature);
    const y = getY(point.depth);
    return `${acc} ${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }, '');

  // Generate SVG path for Salinity
  const salPath = currentItem.profile.reduce((acc, point, index) => {
    const x = getSalX(point.salinity);
    const y = getY(point.depth);
    return `${acc} ${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }, '');

  const handleCenterMap = () => {
    if (onSelectCoordinates) {
      onSelectCoordinates(currentItem.lat, currentItem.lon);
    }
  };

  return (
    <div className="space-y-5 text-white">
      {/* 1. TOP TABS: ARGO PROFILING FLOATS VS AUTONOMOUS GLIDERS */}
      <div className="bg-[#121212] border border-[#222222] rounded-2xl p-1.5 flex gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('argo')}
          className={cn(
            "flex-1 py-2 px-3 rounded-xl text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all cursor-pointer",
            activeTab === 'argo'
              ? "bg-cyan-400 text-black font-bold shadow-md"
              : "text-[#888888] hover:text-white hover:bg-white/[0.04]"
          )}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Argo Profilers ({DEMO_ARGO_FLOATS.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('glider')}
          className={cn(
            "flex-1 py-2 px-3 rounded-xl text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all cursor-pointer",
            activeTab === 'glider'
              ? "bg-cyan-400 text-black font-bold shadow-md"
              : "text-[#888888] hover:text-white hover:bg-white/[0.04]"
          )}
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Underwater Gliders ({DEMO_GLIDERS.length})</span>
        </button>
      </div>

      {/* 2. PLATFORM SELECTOR LIST */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-[#888888]">
          <span>AVAILABLE IN-SITU ASSETS</span>
          <span className="text-cyan-400">SELECT TO INSPECT</span>
        </div>

        <div className="grid grid-cols-1 gap-1.5">
          {activeTab === 'argo' ? (
            DEMO_ARGO_FLOATS.map((float) => {
              const isSelected = float.id === selectedArgoId;
              return (
                <button
                  key={float.id}
                  type="button"
                  onClick={() => setSelectedArgoId(float.id)}
                  className={cn(
                    "w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer",
                    isSelected
                      ? "bg-[#161f28] border-cyan-500/60 shadow-sm"
                      : "bg-[#121212] border-[#222222] hover:border-[#333333] hover:bg-[#161616]"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center font-mono text-[10px] font-bold border",
                      isSelected
                        ? "bg-cyan-400 text-black border-cyan-300"
                        : "bg-[#1c1c1c] text-[#888888] border-[#2e2e2e]"
                    )}>
                      ◆
                    </div>
                    <div>
                      <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                        <span>{float.id}</span>
                        <span className="text-[10px] font-normal text-cyan-400 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/40">
                          Cycle #{float.cycleNumber}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#888888] mt-0.5">
                        {float.basin} • {float.depth}m profile
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={cn("w-4 h-4 transition-transform", isSelected ? "text-cyan-400 translate-x-0.5" : "text-[#555555]")} />
                </button>
              );
            })
          ) : (
            DEMO_GLIDERS.map((glider) => {
              const isSelected = glider.id === selectedGliderId;
              return (
                <button
                  key={glider.id}
                  type="button"
                  onClick={() => setSelectedGliderId(glider.id)}
                  className={cn(
                    "w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer",
                    isSelected
                      ? "bg-[#161f28] border-cyan-500/60 shadow-sm"
                      : "bg-[#121212] border-[#222222] hover:border-[#333333] hover:bg-[#161616]"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center font-mono text-[10px] font-bold border",
                      isSelected
                        ? "bg-cyan-400 text-black border-cyan-300"
                        : "bg-[#1c1c1c] text-[#888888] border-[#2e2e2e]"
                    )}>
                      ▲
                    </div>
                    <div>
                      <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                        <span>{glider.id}</span>
                        <span className="text-[10px] font-normal text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/40">
                          {glider.batteryPercent}% Bat
                        </span>
                      </div>
                      <div className="text-[11px] text-[#888888] mt-0.5">
                        {glider.missionName}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={cn("w-4 h-4 transition-transform", isSelected ? "text-cyan-400 translate-x-0.5" : "text-[#555555]")} />
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 3. SELECTED ASSET METRICS & GROUND TRUTH DETAILS */}
      <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 space-y-3.5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-semibold">
                {activeTab === 'argo' ? 'Profiling Float' : 'Autonomous Ocean Glider'}
              </span>
              <span className="text-[10px] font-mono text-[#888888] bg-[#1a1a1a] px-2 py-0.5 rounded border border-[#262626]">
                {activeTab === 'argo' ? (selectedArgo as ArgoObservation).platformType : 'Slocum Autonomous Glider'}
              </span>
            </div>
            <h3 className="text-base font-bold font-mono text-white mt-1">
              {currentItem.id}
            </h3>
            <p className="text-xs text-[#888888] mt-0.5 flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-cyan-400" />
              <span>{currentItem.basin} ({currentItem.lat >= 0 ? `${currentItem.lat}°N` : `${Math.abs(currentItem.lat)}°S`}, {currentItem.lon >= 0 ? `${currentItem.lon}°E` : `${Math.abs(currentItem.lon)}°W`})</span>
            </p>
          </div>

          <button
            type="button"
            onClick={handleCenterMap}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 border border-white/10 text-[11px] font-mono text-[#cccccc] hover:text-white transition-colors cursor-pointer shrink-0"
            title="Focus on coordinates in 3D Earth"
          >
            Center on Map
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-[#181818] border border-[#282828] rounded-xl p-2.5">
            <span className="text-[#888888] text-[10px] block font-mono">SURFACE TEMP</span>
            <span className="text-white font-mono font-bold text-sm">
              {currentItem.temperature.toFixed(1)}°C
            </span>
          </div>

          <div className="bg-[#181818] border border-[#282828] rounded-xl p-2.5">
            <span className="text-[#888888] text-[10px] block font-mono">SURFACE SALINITY</span>
            <span className="text-white font-mono font-bold text-sm">
              {currentItem.salinity.toFixed(1)} PSU
            </span>
          </div>

          <div className="bg-[#181818] border border-[#282828] rounded-xl p-2.5">
            <span className="text-[#888888] text-[10px] block font-mono">MAX DEPTH</span>
            <span className="text-white font-mono font-bold text-sm">
              {currentItem.depth}m
            </span>
          </div>
        </div>

        {/* Glider Specific Mission & Bearing */}
        {activeTab === 'glider' && (
          <div className="bg-[#181818] border border-[#282828] rounded-xl p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#888888]">ACTIVE MISSION</span>
              <span className="text-cyan-400">{(selectedGlider as GliderObservation).missionName}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#888888]">HEADING / BEARING</span>
              <span className="text-white">{(selectedGlider as GliderObservation).currentBearing}° Compass</span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#888888]">SURFACE WAYPOINTS</span>
              <span className="text-[#aaaaaa]">{(selectedGlider as GliderObservation).track.length} recorded surfacings</span>
            </div>
          </div>
        )}
      </div>

      {/* 4. SCIENTIFIC DEPTH PROFILE VISUALIZATION (SVG CHART) */}
      <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Vertical CTD Depth Profile
            </h4>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-1 bg-cyan-400 inline-block rounded-full" />
              <span className="text-cyan-400">Temp (°C)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-1 bg-amber-400 inline-block rounded-full" />
              <span className="text-amber-400">Salinity (PSU)</span>
            </span>
          </div>
        </div>

        {/* SVG Container */}
        <div className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl p-2 flex justify-center">
          <svg 
            width="100%" 
            height={chartHeight} 
            viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
            className="overflow-visible"
            role="img"
            aria-label={`Depth Profile chart for ${currentItem.id}`}
          >
            {/* Horizontal Grid lines (Depth) */}
            {[0, 500, 1000, 1500, 2000].map((d) => {
              if (d > maxDepth) return null;
              const y = getY(d);
              return (
                <g key={d}>
                  <line 
                    x1={padding.left} 
                    y1={y} 
                    x2={chartWidth - padding.right} 
                    y2={y} 
                    stroke="#222222" 
                    strokeDasharray="2,2" 
                  />
                  <text 
                    x={padding.left - 6} 
                    y={y + 3} 
                    textAnchor="end" 
                    className="text-[9px] fill-[#666666] font-mono"
                  >
                    {d}m
                  </text>
                </g>
              );
            })}

            {/* Vertical Axes Labels */}
            <text 
              x={padding.left} 
              y={chartHeight - 6} 
              className="text-[8px] fill-[#777777] font-mono"
            >
              0°C / 32PSU
            </text>
            <text 
              x={chartWidth - padding.right} 
              y={chartHeight - 6} 
              textAnchor="end" 
              className="text-[8px] fill-[#777777] font-mono"
            >
              32°C / 38PSU
            </text>

            {/* Temperature Curve (Cyan) */}
            <path 
              d={tempPath} 
              fill="none" 
              stroke="#22d3ee" 
              strokeWidth="2.2" 
              strokeLinecap="round" 
            />

            {/* Salinity Curve (Amber) */}
            <path 
              d={salPath} 
              fill="none" 
              stroke="#fbbf24" 
              strokeWidth="1.8" 
              strokeDasharray="3,3" 
              strokeLinecap="round" 
            />

            {/* Points on curve */}
            {currentItem.profile.map((p, i) => (
              <g key={i}>
                <circle 
                  cx={getTempX(p.temperature)} 
                  cy={getY(p.depth)} 
                  r="2.5" 
                  fill="#22d3ee" 
                />
                <circle 
                  cx={getSalX(p.salinity)} 
                  cy={getY(p.depth)} 
                  r="2" 
                  fill="#fbbf24" 
                />
              </g>
            ))}
          </svg>
        </div>

        <div className="flex items-start gap-2 text-[11px] text-[#888888] leading-relaxed bg-[#161616] p-2.5 rounded-xl border border-[#242424]">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
          <span>
            Thermocline gradient detected between 50m and 180m depth. Bottom waters stabilize below 4.0°C in the abyssopelagic zone.
          </span>
        </div>
      </div>
    </div>
  );
}

export default OceanObservationsPanel;
