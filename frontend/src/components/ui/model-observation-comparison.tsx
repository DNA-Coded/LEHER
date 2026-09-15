import React from 'react';
import { 
  GitCompare, 
  Thermometer, 
  Droplets, 
  Wind, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEMO_MODEL_COMPARISON, type ModelObservationComparison } from '@/lib/types/operational-types';

interface ModelObservationComparisonPanelProps {
  comparisonData?: ModelObservationComparison;
}

export function ModelObservationComparisonPanel({
  comparisonData = DEMO_MODEL_COMPARISON,
}: ModelObservationComparisonPanelProps) {
  const { location, depth, timestamp, metrics } = comparisonData;

  return (
    <div className="space-y-5 text-white">
      {/* 1. HEADER & DEMONSTRATION NOTICE */}
      <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Model vs Observation Validation
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
            DEMONSTRATION BENCHMARK
          </span>
        </div>

        <p className="text-xs text-[#888888] leading-relaxed">
          Compares numerical ocean reanalysis simulations against ground-truth in-situ CTD sensors and drifting profilers.
        </p>

        <div className="bg-[#181818] border border-[#262626] rounded-xl p-2.5 flex items-center justify-between text-xs font-mono text-[#aaaaaa]">
          <div>
            <span className="text-[#666666] block text-[10px]">VERIFICATION SECTOR</span>
            <span className="text-white font-semibold">{location.name}</span>
          </div>
          <div className="text-right">
            <span className="text-[#666666] block text-[10px]">COORDINATES & DEPTH</span>
            <span className="text-white font-semibold">
              {location.lat}°N, {location.lon}°E @ {depth}m
            </span>
          </div>
        </div>
      </div>

      {/* 2. SIDE-BY-SIDE METRICS COMPARISON CARDS */}
      <div className="space-y-3">
        {/* Temperature Comparison Card */}
        <div className="bg-[#121212] border border-[#222222] rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
              <Thermometer className="w-3.5 h-3.5 text-rose-400" />
              <span>Conservative Temperature (thetao)</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
              <CheckCircle2 className="w-3 h-3" />
              <span>{metrics.temperature.status}</span>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-[#181818] border border-[#262626] rounded-lg p-2">
              <span className="text-[10px] text-[#888888] block font-mono">PHYSICS MODEL</span>
              <span className="text-white font-mono font-bold text-sm">
                {metrics.temperature.model.toFixed(1)} {metrics.temperature.unit}
              </span>
            </div>

            <div className="bg-[#181818] border border-[#262626] rounded-lg p-2">
              <span className="text-[10px] text-[#888888] block font-mono">IN-SITU SENSOR</span>
              <span className="text-white font-mono font-bold text-sm">
                {metrics.temperature.observation.toFixed(1)} {metrics.temperature.unit}
              </span>
            </div>

            <div className="bg-[#181818] border border-[#262626] rounded-lg p-2">
              <span className="text-[10px] text-[#888888] block font-mono">VARIANCE (Δ)</span>
              <span className={cn(
                "font-mono font-bold text-sm",
                Math.abs(metrics.temperature.diff) <= 0.5 ? "text-emerald-400" : "text-amber-400"
              )}>
                {metrics.temperature.diff > 0 ? `+${metrics.temperature.diff.toFixed(1)}` : metrics.temperature.diff.toFixed(1)} {metrics.temperature.unit}
              </span>
            </div>
          </div>

          {/* Deviation bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-[#666666]">
              <span>Sensor (-0.3°C)</span>
              <span>Nominal Tolerance ±0.5°C</span>
              <span>Model (+0.3°C)</span>
            </div>
            <div className="w-full bg-[#1c1c1c] h-1.5 rounded-full overflow-hidden relative">
              <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/40" />
              <div 
                className="h-full bg-cyan-400 rounded-full"
                style={{ 
                  width: `${Math.min(100, Math.abs(metrics.temperature.diff) * 60)}%`,
                  marginLeft: metrics.temperature.diff < 0 ? `${50 - Math.min(50, Math.abs(metrics.temperature.diff) * 60)}%` : '50%'
                }}
              />
            </div>
          </div>
        </div>

        {/* Salinity Comparison Card */}
        <div className="bg-[#121212] border border-[#222222] rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
              <Droplets className="w-3.5 h-3.5 text-blue-400" />
              <span>Absolute Salinity (so)</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
              <CheckCircle2 className="w-3 h-3" />
              <span>{metrics.salinity.status}</span>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-[#181818] border border-[#262626] rounded-lg p-2">
              <span className="text-[10px] text-[#888888] block font-mono">PHYSICS MODEL</span>
              <span className="text-white font-mono font-bold text-sm">
                {metrics.salinity.model.toFixed(1)} {metrics.salinity.unit}
              </span>
            </div>

            <div className="bg-[#181818] border border-[#262626] rounded-lg p-2">
              <span className="text-[10px] text-[#888888] block font-mono">IN-SITU SENSOR</span>
              <span className="text-white font-mono font-bold text-sm">
                {metrics.salinity.observation.toFixed(1)} {metrics.salinity.unit}
              </span>
            </div>

            <div className="bg-[#181818] border border-[#262626] rounded-lg p-2">
              <span className="text-[10px] text-[#888888] block font-mono">VARIANCE (Δ)</span>
              <span className={cn(
                "font-mono font-bold text-sm",
                Math.abs(metrics.salinity.diff) <= 0.4 ? "text-emerald-400" : "text-amber-400"
              )}>
                {metrics.salinity.diff > 0 ? `+${metrics.salinity.diff.toFixed(1)}` : metrics.salinity.diff.toFixed(1)} {metrics.salinity.unit}
              </span>
            </div>
          </div>

          {/* Deviation bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-[#666666]">
              <span>Sensor (-0.4 PSU)</span>
              <span>Nominal Tolerance ±0.4 PSU</span>
              <span>Model (+0.4 PSU)</span>
            </div>
            <div className="w-full bg-[#1c1c1c] h-1.5 rounded-full overflow-hidden relative">
              <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/40" />
              <div 
                className="h-full bg-blue-400 rounded-full"
                style={{ 
                  width: `${Math.min(100, Math.abs(metrics.salinity.diff) * 80)}%`,
                  marginLeft: metrics.salinity.diff < 0 ? `${50 - Math.min(50, Math.abs(metrics.salinity.diff) * 80)}%` : '50%'
                }}
              />
            </div>
          </div>
        </div>

        {/* Current Speed Comparison Card */}
        <div className="bg-[#121212] border border-[#222222] rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
              <Wind className="w-3.5 h-3.5 text-cyan-400" />
              <span>Current Flow Velocity (Speed)</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
              <CheckCircle2 className="w-3 h-3" />
              <span>{metrics.currentSpeed.status}</span>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-[#181818] border border-[#262626] rounded-lg p-2">
              <span className="text-[10px] text-[#888888] block font-mono">PHYSICS MODEL</span>
              <span className="text-white font-mono font-bold text-sm">
                {metrics.currentSpeed.model.toFixed(2)} {metrics.currentSpeed.unit}
              </span>
            </div>

            <div className="bg-[#181818] border border-[#262626] rounded-lg p-2">
              <span className="text-[10px] text-[#888888] block font-mono">IN-SITU DRIFTER</span>
              <span className="text-white font-mono font-bold text-sm">
                {metrics.currentSpeed.observation.toFixed(2)} {metrics.currentSpeed.unit}
              </span>
            </div>

            <div className="bg-[#181818] border border-[#262626] rounded-lg p-2">
              <span className="text-[10px] text-[#888888] block font-mono">VARIANCE (Δ)</span>
              <span className={cn(
                "font-mono font-bold text-sm",
                Math.abs(metrics.currentSpeed.diff) <= 0.15 ? "text-emerald-400" : "text-amber-400"
              )}>
                {metrics.currentSpeed.diff > 0 ? `+${metrics.currentSpeed.diff.toFixed(2)}` : metrics.currentSpeed.diff.toFixed(2)} {metrics.currentSpeed.unit}
              </span>
            </div>
          </div>

          {/* Deviation bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-[#666666]">
              <span>Sensor (-0.15 m/s)</span>
              <span>Nominal Tolerance ±0.15 m/s</span>
              <span>Model (+0.15 m/s)</span>
            </div>
            <div className="w-full bg-[#1c1c1c] h-1.5 rounded-full overflow-hidden relative">
              <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/40" />
              <div 
                className="h-full bg-emerald-400 rounded-full"
                style={{ 
                  width: `${Math.min(100, Math.abs(metrics.currentSpeed.diff) * 120)}%`,
                  marginLeft: metrics.currentSpeed.diff < 0 ? `${50 - Math.min(50, Math.abs(metrics.currentSpeed.diff) * 120)}%` : '50%'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. SCIENTIFIC CONCORDANCE EXPLANATION */}
      <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            Oceanographic Validation Notes
          </h4>
        </div>
        <p className="text-xs text-[#cccccc] leading-relaxed">
          Physical numerical models calculate grid-cell averages (1/12° spatial resolution, ~9 km), whereas in-situ Argo profilers record point-source physical measurements. The observed variance of Δ0.3°C and Δ0.2 PSU remains well within standard oceanographic assimilation tolerances.
        </p>
      </div>
    </div>
  );
}

export default ModelObservationComparisonPanel;
