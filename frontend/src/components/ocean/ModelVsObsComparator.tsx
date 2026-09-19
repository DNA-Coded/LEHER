import React, { useState, useMemo, useEffect } from 'react';
import {
  Activity,
  Layers,
  Waves,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Info,
  Shield,
  ArrowLeftRight,
  Compass,
  X,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { IN_SITU_SENSORS, type InSituSensor } from '@/services/inSituSensorData';
import { computeModelVsObsAnomaly, type ModelVsObsResult, type AnomalyProfilePoint } from '@/lib/ocean/anomalyEngine';
import { fetchBackendStatus } from '@/services/oceanApi';

interface ModelVsObsComparatorProps {
  initialSensorId?: string;
  onClose?: () => void;
  onTargetCoordinates?: (lat: number, lon: number, depth: number) => void;
  className?: string;
}

export const ModelVsObsComparator: React.FC<ModelVsObsComparatorProps> = ({
  initialSensorId,
  onClose,
  onTargetCoordinates,
  className,
}) => {
  // Currently selected sensor
  const [selectedSensorId, setSelectedSensorId] = useState<string>(
    initialSensorId || IN_SITU_SENSORS[0].id
  );

  // Active variable toggle: Temperature vs Salinity
  const [activeMetric, setActiveMetric] = useState<'temp' | 'sal'>('temp');

  // Hovered depth index for interactive cross-inspection
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Live Backend & DuckDB Catalog connectivity
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [duckdbActive, setDuckdbActive] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    fetchBackendStatus().then((status) => {
      if (isMounted && status) {
        setIsBackendConnected(true);
        setDuckdbActive(status.catalog_initialized);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Find sensor
  const sensor = useMemo(() => {
    return IN_SITU_SENSORS.find((s) => s.id === selectedSensorId) || IN_SITU_SENSORS[0];
  }, [selectedSensorId]);

  // Compute anomaly results
  const result: ModelVsObsResult = useMemo(() => {
    return computeModelVsObsAnomaly(sensor);
  }, [sensor]);

  const { points, metrics } = result;

  // Chart Dimensions & Ranges
  const isTemp = activeMetric === 'temp';
  const unit = isTemp ? '°C' : 'PSU';

  const allVals = isTemp
    ? points.flatMap((p) => [p.modelTemp, p.obsTemp])
    : points.flatMap((p) => [p.modelSal, p.obsSal]);
  
  const minVal = Math.floor(Math.min(...allVals) * 0.95);
  const maxVal = Math.ceil(Math.max(...allVals) * 1.05);
  const valRange = maxVal - minVal || 1;

  const maxDepth = points[points.length - 1]?.depth || 2000;

  // SVG dimensions for vertical profile chart
  const width = 460;
  const height = 300;
  const padding = { top: 25, right: 30, bottom: 35, left: 50 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const getX = (val: number) => padding.left + ((val - minVal) / valRange) * innerW;
  const getY = (d: number) => padding.top + (d / maxDepth) * innerH;

  // SVG Paths
  const modelPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(isTemp ? p.modelTemp : p.modelSal).toFixed(1)} ${getY(p.depth).toFixed(1)}`)
    .join(' ');

  const obsPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(isTemp ? p.obsTemp : p.obsSal).toFixed(1)} ${getY(p.depth).toFixed(1)}`)
    .join(' ');

  // Anomaly Difference Bar Chart Ranges
  const allDiffs = points.map((p) => (isTemp ? p.tempDiff : p.salDiff));
  const maxAbsDiff = Math.max(0.5, ...allDiffs.map(Math.abs));

  return (
    <div
      className={cn(
        'bg-[#0c0c0e] border border-[#222226] rounded-2xl p-4 sm:p-5 text-white font-sans shadow-2xl flex flex-col gap-4',
        className
      )}
    >
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1f1f24] pb-3.5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ArrowLeftRight className="w-3 h-3" />
              MODEL VS. OBSERVED VALIDATION
            </span>
            <span className={cn(
              "text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1",
              isBackendConnected
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-amber-500/10 text-amber-400 border-amber-500/30"
            )}>
              <span className={cn("w-1.5 h-1.5 rounded-full", isBackendConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400")} />
              {isBackendConnected ? (duckdbActive ? 'DuckDB Catalog Active' : 'Backend Connected') : 'Local Model Engine'}
            </span>
            <span className="text-[10px] font-mono text-neutral-400">
              {sensor.wmoId}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>Hydrodynamic Bias Engine</span>
            <span className="text-xs font-normal font-mono text-neutral-500">
              (GLORYS12V1 vs {sensor.type.toUpperCase()})
            </span>
          </h3>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {/* Sensor Selector */}
          <select
            value={selectedSensorId}
            onChange={(e) => setSelectedSensorId(e.target.value)}
            className="bg-[#141418] border border-[#2a2a30] text-neutral-200 text-xs font-mono rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer"
          >
            {IN_SITU_SENSORS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.basin})
              </option>
            ))}
          </select>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#18181c] hover:bg-[#25252c] border border-[#2a2a30] text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── KEY SCIENTIFIC KPI METRICS RIBBON ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono">
        {/* Metric 1: Temp RMSE */}
        <div className="bg-[#121216] border border-[#202026] rounded-xl p-2.5 space-y-0.5">
          <div className="text-[9px] text-neutral-400 uppercase">WATER COLUMN RMSE</div>
          <div className="text-base font-bold text-white flex items-baseline gap-1">
            <span>{metrics.tempRmse}</span>
            <span className="text-xs font-normal text-neutral-400">°C</span>
          </div>
          <div className="text-[8px] text-neutral-500">Salinity: {metrics.salRmse} PSU</div>
        </div>

        {/* Metric 2: Mean Temp Bias */}
        <div className="bg-[#121216] border border-[#202026] rounded-xl p-2.5 space-y-0.5">
          <div className="text-[9px] text-neutral-400 uppercase">MEAN TEMP BIAS</div>
          <div
            className={cn(
              'text-base font-bold flex items-baseline gap-1',
              metrics.tempMeanBias > 0 ? 'text-rose-400' : metrics.tempMeanBias < 0 ? 'text-cyan-400' : 'text-emerald-400'
            )}
          >
            <span>{metrics.tempMeanBias > 0 ? `+${metrics.tempMeanBias}` : metrics.tempMeanBias}</span>
            <span className="text-xs font-normal">°C</span>
          </div>
          <div className="text-[8px] text-neutral-500">
            {metrics.tempMeanBias > 0 ? 'Warm model bias' : 'Cold model bias'}
          </div>
        </div>

        {/* Metric 3: MLD Bias */}
        <div className="bg-[#121216] border border-[#202026] rounded-xl p-2.5 space-y-0.5">
          <div className="text-[9px] text-neutral-400 uppercase">ΔMLD (MIXED LAYER)</div>
          <div className="text-base font-bold text-white flex items-baseline gap-1">
            <span className={metrics.mldDiff !== 0 ? 'text-amber-400' : 'text-emerald-400'}>
              {metrics.mldDiff > 0 ? `+${metrics.mldDiff}` : metrics.mldDiff}
            </span>
            <span className="text-xs font-normal text-neutral-400">m</span>
          </div>
          <div className="text-[8px] text-neutral-500">
            Model: {metrics.mldModel}m | Obs: {metrics.mldObs}m
          </div>
        </div>

        {/* Metric 4: D20 Thermocline Error */}
        <div className="bg-[#121216] border border-[#202026] rounded-xl p-2.5 space-y-0.5">
          <div className="text-[9px] text-neutral-400 uppercase">D20 ISOTHERM (TCHP)</div>
          <div className="text-base font-bold text-white flex items-baseline gap-1">
            <span className={metrics.d20Diff !== 0 ? 'text-cyan-400' : 'text-emerald-400'}>
              {metrics.d20Diff > 0 ? `+${metrics.d20Diff}` : metrics.d20Diff}
            </span>
            <span className="text-xs font-normal text-neutral-400">m</span>
          </div>
          <div className="text-[8px] text-neutral-500">
            Model: {metrics.d20Model}m | Obs: {metrics.d20Obs}m
          </div>
        </div>

        {/* Metric 5: Profile Correlation */}
        <div className="bg-[#121216] border border-[#202026] rounded-xl p-2.5 space-y-0.5 col-span-2 sm:col-span-1">
          <div className="text-[9px] text-neutral-400 uppercase">PEARSON CORRELATION</div>
          <div className="text-base font-bold text-emerald-400 flex items-baseline gap-1">
            <span>r = {metrics.tempCorrelation}</span>
          </div>
          <div className="text-[8px] text-neutral-500">Water column coherence</div>
        </div>
      </div>

      {/* ── VARIABLE SWITCHER & LEGEND ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex bg-[#141418] p-1 rounded-lg border border-[#222228]">
          <button
            type="button"
            onClick={() => setActiveMetric('temp')}
            className={cn(
              'px-3 py-1 rounded transition-all cursor-pointer font-semibold flex items-center gap-1.5',
              isTemp ? 'bg-white text-black shadow' : 'text-neutral-400 hover:text-white'
            )}
          >
            <Waves className="w-3.5 h-3.5" />
            <span>Temperature Profile (°C)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('sal')}
            className={cn(
              'px-3 py-1 rounded transition-all cursor-pointer font-semibold flex items-center gap-1.5',
              !isTemp ? 'bg-white text-black shadow' : 'text-neutral-400 hover:text-white'
            )}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Salinity Profile (PSU)</span>
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 bg-cyan-400 rounded-full" />
            <span className="text-neutral-300 font-semibold">GLORYS Model</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 bg-emerald-400 rounded-full border-t border-dashed border-emerald-300" />
            <span className="text-neutral-300 font-semibold">In-Situ Observation</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-gradient-to-r from-cyan-500 to-rose-500" />
            <span className="text-neutral-300 font-semibold">Signed Anomaly (Δ)</span>
          </span>
        </div>
      </div>

      {/* ── CHARTS CONTAINER (SPLIT: CURVES + ANOMALY BARS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left: Dual Vertical Profile Curve (2 cols) */}
        <div className="lg:col-span-2 bg-[#121216] border border-[#202026] rounded-xl p-3 relative flex flex-col">
          <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400 mb-1">
            <span>SOUNDING DEPTH (0 to {maxDepth}m)</span>
            <span>{isTemp ? 'TEMPERATURE (°C)' : 'PRACTICAL SALINITY (PSU)'}</span>
          </div>

          <div className="relative w-full flex-1 flex items-center justify-center">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto max-h-[320px] select-none"
            >
              <defs>
                <linearGradient id="gridLine" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#222" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#181818" stopOpacity="0.2" />
                </linearGradient>
              </defs>

              {/* Depth horizontal grid lines */}
              {[0, 200, 500, 1000, 1500, 2000].map((d) => {
                if (d > maxDepth) return null;
                const y = getY(d);
                return (
                  <g key={d}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={width - padding.right}
                      y2={y}
                      stroke="#24242a"
                      strokeWidth="1"
                      strokeDasharray="2,2"
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 3}
                      textAnchor="end"
                      fill="#666"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {d}m
                    </text>
                  </g>
                );
              })}

              {/* Value vertical grid lines */}
              {[minVal, minVal + valRange * 0.25, minVal + valRange * 0.5, minVal + valRange * 0.75, maxVal].map((v) => {
                const x = getX(v);
                return (
                  <g key={v}>
                    <line
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={height - padding.bottom}
                      stroke="#1e1e24"
                      strokeWidth="1"
                    />
                    <text
                      x={x}
                      y={height - padding.bottom + 14}
                      textAnchor="middle"
                      fill="#666"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {v.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {/* MLD Indicator Line */}
              {metrics.mldObs <= maxDepth && (
                <g>
                  <line
                    x1={padding.left}
                    y1={getY(metrics.mldObs)}
                    x2={width - padding.right}
                    y2={getY(metrics.mldObs)}
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeDasharray="4,4"
                  />
                  <text
                    x={width - padding.right - 4}
                    y={getY(metrics.mldObs) - 4}
                    textAnchor="end"
                    fill="#f59e0b"
                    fontSize="8"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    MLD (Obs): {metrics.mldObs}m
                  </text>
                </g>
              )}

              {/* D20 Isotherm Line (if Temp) */}
              {isTemp && metrics.d20Obs <= maxDepth && (
                <g>
                  <line
                    x1={padding.left}
                    y1={getY(metrics.d20Obs)}
                    x2={width - padding.right}
                    y2={getY(metrics.d20Obs)}
                    stroke="#06b6d4"
                    strokeWidth="1.5"
                    strokeDasharray="3,3"
                  />
                  <text
                    x={width - padding.right - 4}
                    y={getY(metrics.d20Obs) + 11}
                    textAnchor="end"
                    fill="#06b6d4"
                    fontSize="8"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    D20: {metrics.d20Obs}m
                  </text>
                </g>
              )}

              {/* Model Profile Line (Cyan) */}
              <path
                d={modelPath}
                fill="none"
                stroke="#00e5ff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* In-Situ Observation Line (Emerald Dashed) */}
              <path
                d={obsPath}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeDasharray="5,4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Interactive Data Dots */}
              {points.map((p, i) => {
                const mX = getX(isTemp ? p.modelTemp : p.modelSal);
                const oX = getX(isTemp ? p.obsTemp : p.obsSal);
                const y = getY(p.depth);
                const isHovered = hoveredIdx === i;

                return (
                  <g
                    key={p.depth}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="cursor-pointer"
                  >
                    {/* Connecting line between model and obs */}
                    <line
                      x1={mX}
                      y1={y}
                      x2={oX}
                      y2={y}
                      stroke={p.tempDiff > 0 ? '#f43f5e' : '#06b6d4'}
                      strokeWidth={isHovered ? 2.5 : 1}
                      strokeOpacity={0.6}
                    />

                    {/* Model Dot */}
                    <circle
                      cx={mX}
                      cy={y}
                      r={isHovered ? 4.5 : 3}
                      fill="#00e5ff"
                      stroke="#0c0c0e"
                      strokeWidth="1.5"
                    />

                    {/* Obs Dot */}
                    <circle
                      cx={oX}
                      cy={y}
                      r={isHovered ? 4.5 : 3}
                      fill="#10b981"
                      stroke="#0c0c0e"
                      strokeWidth="1.5"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredIdx !== null && points[hoveredIdx] && (
              <div className="absolute top-2 left-14 bg-[#181820]/95 border border-[#333340] rounded-xl p-2.5 text-[10px] font-mono shadow-xl backdrop-blur-md space-y-1">
                <div className="text-white font-bold border-b border-[#2a2a34] pb-1">
                  Depth: {points[hoveredIdx].depth}m Sounding
                </div>
                <div className="flex justify-between gap-4 text-cyan-400">
                  <span>Model:</span>
                  <span className="font-bold">
                    {isTemp ? `${points[hoveredIdx].modelTemp}°C` : `${points[hoveredIdx].modelSal} PSU`}
                  </span>
                </div>
                <div className="flex justify-between gap-4 text-emerald-400">
                  <span>In-Situ:</span>
                  <span className="font-bold">
                    {isTemp ? `${points[hoveredIdx].obsTemp}°C` : `${points[hoveredIdx].obsSal} PSU`}
                  </span>
                </div>
                <div className="flex justify-between gap-4 border-t border-[#2a2a34] pt-1 font-bold">
                  <span className="text-neutral-400">Anomaly (Δ):</span>
                  <span
                    className={
                      (isTemp ? points[hoveredIdx].tempDiff : points[hoveredIdx].salDiff) > 0
                        ? 'text-rose-400'
                        : 'text-cyan-400'
                    }
                  >
                    {(isTemp ? points[hoveredIdx].tempDiff : points[hoveredIdx].salDiff) > 0 ? '+' : ''}
                    {isTemp ? `${points[hoveredIdx].tempDiff}°C` : `${points[hoveredIdx].salDiff} PSU`}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Depth-by-Depth Signed Bias Bars (1 col) */}
        <div className="bg-[#121216] border border-[#202026] rounded-xl p-3 flex flex-col font-mono text-[10px]">
          <div className="flex justify-between items-center text-neutral-400 pb-2 border-b border-[#1f1f24]">
            <span className="font-bold text-white uppercase tracking-wider">DEPTH-WISE BIAS (Δ)</span>
            <span className="text-[9px]">±{maxAbsDiff.toFixed(2)} {unit}</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pt-2 custom-scrollbar max-h-[300px]">
            {points.map((p, idx) => {
              const diff = isTemp ? p.tempDiff : p.salDiff;
              const isPositive = diff > 0;
              const barWidthPct = Math.min(100, (Math.abs(diff) / maxAbsDiff) * 50);

              return (
                <div
                  key={p.depth}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className={cn(
                    'p-1.5 rounded-lg transition-all cursor-pointer flex flex-col gap-1',
                    hoveredIdx === idx ? 'bg-[#1e1e26] border border-[#333340]' : 'hover:bg-[#16161c]'
                  )}
                >
                  <div className="flex justify-between text-[9px]">
                    <span className="text-neutral-400">{p.depth}m</span>
                    <span
                      className={cn(
                        'font-bold',
                        isPositive ? 'text-rose-400' : diff < 0 ? 'text-cyan-400' : 'text-neutral-400'
                      )}
                    >
                      {isPositive ? `+${diff.toFixed(2)}` : diff.toFixed(2)} {unit}
                    </span>
                  </div>

                  {/* Dual-sided center zero-bar */}
                  <div className="h-1.5 w-full bg-[#1c1c22] rounded-full relative flex items-center">
                    {/* Center line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-neutral-600 z-10" />

                    {/* Bar */}
                    {isPositive ? (
                      <div
                        className="absolute left-1/2 h-full bg-rose-500 rounded-r-full transition-all"
                        style={{ width: `${barWidthPct}%` }}
                      />
                    ) : (
                      <div
                        className="absolute right-1/2 h-full bg-cyan-500 rounded-l-full transition-all"
                        style={{ width: `${barWidthPct}%` }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-[#1f1f24] flex justify-between text-[8px] text-neutral-500">
            <span>← Cold / Fresh Bias</span>
            <span>0</span>
            <span>Warm / Saline Bias →</span>
          </div>
        </div>
      </div>

      {/* ── SCIENTIFIC INTERPRETATION & TACTICAL IMPACT CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Physical Oceanography Rationale */}
        <div className="bg-[#121216] border border-[#202026] rounded-xl p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-cyan-400 font-mono font-bold text-[11px] uppercase tracking-wider">
            <Info className="w-3.5 h-3.5" />
            <span>Scientific Oceanographic Rationale</span>
          </div>
          <p className="text-neutral-300 leading-relaxed font-sans text-xs">
            {metrics.scientificExplanation}
          </p>
        </div>

        {/* Maritime Tactical Sonar & Safety Impact */}
        <div className="bg-[#121216] border border-[#202026] rounded-xl p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-amber-400 font-mono font-bold text-[11px] uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            <span>Maritime & Sonar Operational Impact</span>
          </div>
          <p className="text-neutral-300 leading-relaxed font-sans text-xs">
            {metrics.tacticalImpact}
          </p>
          {onTargetCoordinates && (
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => onTargetCoordinates(sensor.lat, sensor.lon, 0)}
                className="px-3 py-1 rounded bg-white hover:bg-neutral-200 text-black font-mono font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow"
              >
                <Target className="w-3 h-3 text-black" />
                <span>Target Float Location</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelVsObsComparator;
