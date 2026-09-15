import React from 'react';
import { 
  Compass, 
  Thermometer, 
  Droplets, 
  Wind, 
  AlertTriangle, 
  ShieldCheck, 
  AlertOctagon, 
  ArrowUpRight, 
  Layers, 
  Info,
  RefreshCw,
  Locate
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RiskBadge } from '@/components/ui/risk-badge';
import { ShinyButton } from '@/components/ui/shiny-button';
import { SpinningBorderButton } from '@/components/ui/spinning-border-button';
import type { LocationAssessmentData } from '@/lib/types/operational-types';

interface LocationAssessmentPanelProps {
  data: LocationAssessmentData;
  workbenchDepth: number;
  onDepthChange: (depth: number) => void;
  inputLat: number;
  inputLon: number;
  onLatChange: (lat: number) => void;
  onLonChange: (lon: number) => void;
  onLocateMe: () => void;
  isLocating: boolean;
  onPredict: () => void;
  isPredicting: boolean;
  presets: Array<{ label: string; lat: number; lon: number }>;
}

export function LocationAssessmentPanel({
  data,
  workbenchDepth,
  onDepthChange,
  inputLat,
  inputLon,
  onLatChange,
  onLonChange,
  onLocateMe,
  isLocating,
  onPredict,
  isPredicting,
  presets,
}: LocationAssessmentPanelProps) {
  const DEPTH_PRESETS = [0, 50, 150, 500, 1000, 2000];

  return (
    <div className="space-y-5 text-white">
      {/* 1. SECTOR HEADER & RISK SUMMARY */}
      <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
              Selected Sector
            </span>
            <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
              {data.regionName}
            </h2>
            <p className="text-xs font-mono text-[#888888] mt-0.5">
              {data.lat >= 0 ? `${data.lat.toFixed(2)}°N` : `${Math.abs(data.lat).toFixed(2)}°S`},{' '}
              {data.lon >= 0 ? `${data.lon.toFixed(2)}°E` : `${Math.abs(data.lon).toFixed(2)}°W`}
            </p>
          </div>
          <RiskBadge 
            level={data.riskStatus} 
            size="md"
            subtext={data.riskStatus === 'SAFE' ? 'Nominal' : data.riskStatus === 'CAUTION' ? 'Elevated' : 'High Risk'}
          />
        </div>

        {/* Risk Rationale description */}
        <div className="bg-[#181818] border border-[#262626] rounded-xl p-3 text-xs text-[#cccccc] leading-relaxed flex items-start gap-2.5">
          {data.riskStatus === 'SAFE' && (
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
          )}
          {data.riskStatus === 'CAUTION' && (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
          )}
          {data.riskStatus === 'DANGER' && (
            <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
          )}
          <span>{data.riskRationale}</span>
        </div>
      </div>

      {/* 2. PRIMARY OCEAN PARAMETERS (SST, CURRENTS, SALINITY) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Sea Surface Temperature */}
        <div className="bg-[#121212] border border-[#222222] hover:border-[#333333] rounded-xl p-3 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#888888] text-[11px]">
            <span className="font-medium">Sea Temp (SST)</span>
            <Thermometer className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />
          </div>
          <div className="my-2">
            <div className="text-xl font-bold font-mono text-white tracking-tight">
              {data.sst.value.toFixed(1)} <span className="text-xs font-normal text-[#888888]">{data.sst.unit}</span>
            </div>
            <div className="text-[10px] text-[#666666] font-mono mt-0.5">
              Depth: {workbenchDepth}m
            </div>
          </div>
          <div className="text-[10px] text-[#888888] border-t border-[#1e1e1e] pt-1.5 flex items-center justify-between">
            <span>Thermal Layer</span>
            <span className="text-cyan-400 font-mono">
              {workbenchDepth < 50 ? 'Mixed Layer' : workbenchDepth < 500 ? 'Thermocline' : 'Deep Cold'}
            </span>
          </div>
        </div>

        {/* Current Speed & Vector */}
        <div className="bg-[#121212] border border-[#222222] hover:border-[#333333] rounded-xl p-3 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#888888] text-[11px]">
            <span className="font-medium">Current Speed</span>
            <Wind className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
          </div>
          <div className="my-2">
            <div className="text-xl font-bold font-mono text-white tracking-tight">
              {data.currentSpeed.value.toFixed(2)} <span className="text-xs font-normal text-[#888888]">{data.currentSpeed.unit}</span>
            </div>
            <div className="text-[10px] text-[#aaaaaa] font-mono mt-0.5">
              {data.currentSpeed.knots.toFixed(1)} kts • {data.currentSpeed.directionCompass} ({data.currentSpeed.directionDeg}°)
            </div>
          </div>
          <div className="text-[10px] text-[#888888] border-t border-[#1e1e1e] pt-1.5 flex items-center justify-between">
            <span>Drift Impact</span>
            <span className={cn(
              "font-mono font-medium",
              data.currentSpeed.value > 0.8 ? "text-rose-400" : data.currentSpeed.value > 0.4 ? "text-amber-400" : "text-emerald-400"
            )}>
              {data.currentSpeed.value > 0.8 ? 'Strong Head-Drift' : data.currentSpeed.value > 0.4 ? 'Moderate Drift' : 'Light Drift'}
            </span>
          </div>
        </div>

        {/* Salinity */}
        <div className="bg-[#121212] border border-[#222222] hover:border-[#333333] rounded-xl p-3 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#888888] text-[11px]">
            <span className="font-medium">Salinity (so)</span>
            <Droplets className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
          </div>
          <div className="my-2">
            <div className="text-xl font-bold font-mono text-white tracking-tight">
              {data.salinity.value.toFixed(1)} <span className="text-xs font-normal text-[#888888]">{data.salinity.unit}</span>
            </div>
            <div className="text-[10px] text-[#666666] font-mono mt-0.5">
              Standard Ref: 35.0 PSU
            </div>
          </div>
          <div className="text-[10px] text-[#888888] border-t border-[#1e1e1e] pt-1.5 flex items-center justify-between">
            <span>Density Impact</span>
            <span className="text-cyan-400 font-mono">
              {data.salinity.value > 36.0 ? 'High Salinity' : data.salinity.value < 33.5 ? 'River Inflow' : 'Equilibrium'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. HAZARD DETECTION & DETAILS */}
      <div className={cn(
        "rounded-xl border p-3.5 space-y-2.5 transition-all",
        data.hazard.hasHazard
          ? data.hazard.severity === 'EXTREME' || data.hazard.severity === 'SEVERE'
            ? "bg-rose-950/20 border-rose-800/40"
            : "bg-amber-950/20 border-amber-800/40"
          : "bg-[#121212] border-[#222222]"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {data.hazard.hasHazard ? (
              <AlertTriangle className={cn(
                "w-4 h-4 shrink-0",
                data.hazard.severity === 'SEVERE' || data.hazard.severity === 'EXTREME' ? "text-rose-400" : "text-amber-400"
              )} />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              {data.hazard.hasHazard ? 'Maritime Hazard Advisory' : 'Hazard Assessment Status'}
            </span>
          </div>
          {data.hazard.hasHazard && data.hazard.status && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {data.hazard.status}
            </span>
          )}
        </div>

        {data.hazard.hasHazard ? (
          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="bg-black/40 rounded-lg p-2 border border-white/5">
                <span className="text-[#888888] block text-[10px]">HAZARD TYPE</span>
                <span className="text-white font-semibold">{data.hazard.type || 'OCEAN CONDITIONS'}</span>
              </div>
              <div className="bg-black/40 rounded-lg p-2 border border-white/5">
                <span className="text-[#888888] block text-[10px]">SEVERITY</span>
                <span className={cn(
                  "font-semibold",
                  data.hazard.severity === 'SEVERE' || data.hazard.severity === 'EXTREME' ? "text-rose-400" : "text-amber-400"
                )}>
                  {data.hazard.severity || 'MODERATE'}
                </span>
              </div>
            </div>
            {data.hazard.details && (
              <p className="text-[#cccccc] text-xs leading-relaxed bg-black/30 p-2.5 rounded-lg border border-white/5">
                {data.hazard.details}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-[#888888] leading-relaxed">
            No active maritime hazard advisories, cyclonic depressions, or storm surge warnings identified for this sector within current forecast horizon.
          </p>
        )}
      </div>

      {/* 4. COORDINATE CONTROLS & GEOLOCATION */}
      <div className="bg-[#121212] border border-[#222222] rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-[#888888] text-[11px]">COORDINATE INSPECTION</span>
          <SpinningBorderButton
            type="button"
            onClick={onLocateMe}
            disabled={isLocating}
            hideArrow
            className="text-[11px] py-1 px-3"
          >
            <Locate className={cn("w-3 h-3 mr-1", isLocating && "animate-spin")} />
            <span>{isLocating ? 'Locating...' : 'Locate Vessel'}</span>
          </SpinningBorderButton>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Latitude */}
          <div className="bg-[#181818] border border-[#282828] rounded-xl px-3 py-2 flex items-center justify-between focus-within:border-cyan-400/80 transition-colors">
            <label htmlFor="lat-input" className="text-[#888888] text-xs">Lat</label>
            <div className="flex items-center gap-1.5">
              <input
                id="lat-input"
                type="number"
                step="0.01"
                min="-90"
                max="90"
                value={inputLat}
                onChange={(e) => onLatChange(parseFloat(e.target.value) || 0)}
                className="w-16 bg-transparent text-white font-bold text-xs text-right focus:outline-none font-mono"
              />
              <span className="text-[#666666] font-mono text-xs w-5 text-right">
                {inputLat >= 0 ? "°N" : "°S"}
              </span>
            </div>
          </div>

          {/* Longitude */}
          <div className="bg-[#181818] border border-[#282828] rounded-xl px-3 py-2 flex items-center justify-between focus-within:border-cyan-400/80 transition-colors">
            <label htmlFor="lon-input" className="text-[#888888] text-xs">Lon</label>
            <div className="flex items-center gap-1.5">
              <input
                id="lon-input"
                type="number"
                step="0.01"
                min="-180"
                max="180"
                value={inputLon}
                onChange={(e) => onLonChange(parseFloat(e.target.value) || 0)}
                className="w-16 bg-transparent text-white font-bold text-xs text-right focus:outline-none font-mono"
              />
              <span className="text-[#666666] font-mono text-xs w-5 text-right">
                {inputLon >= 0 ? "°E" : "°W"}
              </span>
            </div>
          </div>
        </div>

        {/* Presets */}
        <div className="space-y-1">
          <span className="text-[10px] text-[#666666] font-mono uppercase tracking-wider block">
            Regional Presets
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {presets.map((loc) => {
              const isSelected = Math.abs(inputLat - loc.lat) < 0.1 && Math.abs(inputLon - loc.lon) < 0.1;
              return (
                <button
                  key={loc.label}
                  type="button"
                  onClick={() => {
                    onLatChange(loc.lat);
                    onLonChange(loc.lon);
                  }}
                  className={cn(
                    "px-1.5 py-1.5 rounded-lg text-[10px] font-mono border transition-all cursor-pointer text-center truncate",
                    isSelected
                      ? "bg-white text-black font-bold border-white shadow-sm"
                      : "bg-[#161616] border-[#262626] text-[#888888] hover:text-white hover:border-[#383838]"
                  )}
                  title={`${loc.label} (${loc.lat}°, ${loc.lon}°)`}
                >
                  {loc.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. DEPTH PROFILE SLIDER & PRESETS */}
      <div className="bg-[#121212] border border-[#222222] rounded-xl p-3.5 space-y-3">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium text-[#cccccc]">Inspection Depth</span>
          </div>
          <span className="text-white font-mono font-bold bg-[#1a1a1a] px-2 py-0.5 rounded border border-[#2a2a2a] text-xs">
            {workbenchDepth}m
          </span>
        </div>

        <input 
          type="range" 
          min="0" 
          max="2000" 
          step="10" 
          value={workbenchDepth} 
          onChange={(e) => onDepthChange(Number(e.target.value))} 
          className="w-full accent-cyan-400 h-1.5 bg-[#222222] rounded-lg appearance-none cursor-pointer"
          aria-label="Inspection Depth in meters"
        />

        <div className="grid grid-cols-6 gap-1 text-center">
          {DEPTH_PRESETS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onDepthChange(d)}
              className={cn(
                "py-1.5 rounded-lg text-[10px] font-mono border transition-all cursor-pointer",
                workbenchDepth === d
                  ? "bg-cyan-400 text-black font-bold border-cyan-400 shadow-sm"
                  : "bg-[#181818] border-[#262626] text-[#777777] hover:text-white hover:border-[#363636]"
              )}
            >
              {d === 0 ? 'Surface' : `${d}m`}
            </button>
          ))}
        </div>
      </div>

      {/* 6. PRIMARY CTA: PREDICT OCEAN STATE & OPEN 3D DEPTH SLICE */}
      <div className="pt-1">
        <ShinyButton
          type="button"
          onClick={onPredict}
          disabled={isPredicting}
          className="w-full py-3 px-4 text-xs font-bold shadow-lg"
        >
          {isPredicting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-300" />
              <span>Generating 3D Depth Slice...</span>
            </>
          ) : (
            <>
              <span>Predict Ocean State &amp; Open 3D Depth Slice</span>
              <ArrowUpRight className="w-4 h-4 text-cyan-400" />
            </>
          )}
        </ShinyButton>
        <p className="text-[10px] text-center text-[#666666] font-mono mt-2">
          Calculates vertical water column across 10 depth horizons (0–2000m)
        </p>
      </div>
    </div>
  );
}

export default LocationAssessmentPanel;
