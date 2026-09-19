import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Radio, 
  Battery, 
  CheckCircle2, 
  Compass, 
  Wind, 
  Waves, 
  Gauge, 
  Calendar, 
  Activity, 
  ExternalLink,
  Target,
  ArrowDown,
  Layers,
  Thermometer,
  Droplets,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InSituSensor } from '@/services/inSituSensorData';

interface InSituSensorModalProps {
  sensor: InSituSensor | null;
  isOpen: boolean;
  onClose: () => void;
  onTargetCoordinates: (lat: number, lon: number, depth?: number) => void;
}

export const InSituSensorModal: React.FC<InSituSensorModalProps> = ({
  sensor,
  isOpen,
  onClose,
  onTargetCoordinates,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'mission' | 'telemetry'>('profile');
  const [activeMetric, setActiveMetric] = useState<'temp' | 'sal' | 'oxygen' | 'chl'>('temp');

  if (!isOpen || !sensor) return null;

  const getTypeTheme = (type: InSituSensor['type']) => {
    switch (type) {
      case 'argo':
        return {
          label: 'ARGO PROFILING FLOAT',
          bg: 'bg-amber-500/10',
          text: 'text-amber-400',
          border: 'border-amber-500/30',
          glow: 'shadow-amber-500/20',
          badge: 'border-amber-500/40 text-amber-300 bg-amber-950/40',
        };
      case 'glider':
        return {
          label: 'AUTONOMOUS UNDERWATER GLIDER',
          bg: 'bg-cyan-500/10',
          text: 'text-cyan-400',
          border: 'border-cyan-500/30',
          glow: 'shadow-cyan-500/20',
          badge: 'border-cyan-500/40 text-cyan-300 bg-cyan-950/40',
        };
      case 'mooring':
        return {
          label: 'INCOIS OMNI MOORED BUOY',
          bg: 'bg-rose-500/10',
          text: 'text-rose-400',
          border: 'border-rose-500/30',
          glow: 'shadow-rose-500/20',
          badge: 'border-rose-500/40 text-rose-300 bg-rose-950/40',
        };
      case 'bgc':
        return {
          label: 'BIOGEOCHEMICAL (BGC) PROFILER',
          bg: 'bg-emerald-500/10',
          text: 'text-emerald-400',
          border: 'border-emerald-500/30',
          glow: 'shadow-emerald-500/20',
          badge: 'border-emerald-500/40 text-emerald-300 bg-emerald-950/40',
        };
    }
  };

  const theme = getTypeTheme(sensor.type);

  // SVG Chart Dimensions
  const chartWidth = 540;
  const chartHeight = 240;
  const padding = { top: 20, right: 30, bottom: 35, left: 55 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Calculate scales for profile
  const profile = sensor.profile;
  const maxD = sensor.maxDepth || 2000;

  // Temp min/max
  const temps = profile.map((p) => p.temperature);
  const minTemp = Math.min(...temps, 2);
  const maxTemp = Math.max(...temps, 30);

  // Salinity min/max
  const sals = profile.map((p) => p.salinity);
  const minSal = Math.min(...sals, 32);
  const maxSal = Math.max(...sals, 37);

  // Oxygen min/max (BGC)
  const oxygens = profile.filter((p) => p.dissolvedOxygen !== undefined).map((p) => p.dissolvedOxygen!);
  const minOxy = oxygens.length > 0 ? Math.min(...oxygens, 0) : 0;
  const maxOxy = oxygens.length > 0 ? Math.max(...oxygens, 220) : 220;

  // Temperature path generator (depth vs temperature)
  const tempPath = profile
    .map((p, idx) => {
      const x = padding.left + ((p.temperature - minTemp) / (maxTemp - minTemp || 1)) * innerWidth;
      const y = padding.top + (p.depth / maxD) * innerHeight;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  // Salinity path generator (depth vs salinity)
  const salPath = profile
    .map((p, idx) => {
      const x = padding.left + ((p.salinity - minSal) / (maxSal - minSal || 1)) * innerWidth;
      const y = padding.top + (p.depth / maxD) * innerHeight;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  // Dissolved Oxygen path generator (BGC)
  const oxyPath = profile
    .filter((p) => p.dissolvedOxygen !== undefined)
    .map((p, idx) => {
      const x = padding.left + ((p.dissolvedOxygen! - minOxy) / (maxOxy - minOxy || 1)) * innerWidth;
      const y = padding.top + (p.depth / maxD) * innerHeight;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={cn(
          "w-full max-w-3xl bg-[#0e0e0e] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-white",
          theme.glow
        )}
      >
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-[#222222] bg-[#121212] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={cn("text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider", theme.badge)}>
                {theme.label}
              </span>
              <span className="text-[10px] font-mono text-neutral-400">
                {sensor.wmoId}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40 flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                QC: {sensor.qcFlag.split(' ')[0]}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>{sensor.name}</span>
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-neutral-400">
              <span className="flex items-center gap-1 text-white">
                <MapPin className="w-3 h-3 text-neutral-400" />
                {sensor.lat >= 0 ? `${sensor.lat.toFixed(2)}°N` : `${Math.abs(sensor.lat).toFixed(2)}°S`},{' '}
                {sensor.lon >= 0 ? `${sensor.lon.toFixed(2)}°E` : `${Math.abs(sensor.lon).toFixed(2)}°W`}
              </span>
              <span className="text-neutral-600">·</span>
              <span>{sensor.basin}</span>
              <span className="text-neutral-600">·</span>
              <span className="flex items-center gap-1">
                <Battery className="w-3 h-3 text-emerald-400" />
                {sensor.batteryPercent}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => {
                onTargetCoordinates(sensor.lat, sensor.lon, 0);
                onClose();
              }}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black font-bold text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Lock these coordinates into the operations console"
            >
              <Target className="w-3.5 h-3.5 text-black" />
              <span>Target On Map</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white bg-[#1a1a1a] hover:bg-[#252525] border border-[#333333] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex border-b border-[#222222] bg-[#111111] px-4 shrink-0 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={cn(
              "py-2.5 px-4 font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2",
              activeTab === 'profile'
                ? "border-white text-white"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            )}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Vertical Depth Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mission')}
            className={cn(
              "py-2.5 px-4 font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2",
              activeTab === 'mission'
                ? "border-white text-white"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            )}
          >
            {sensor.type === 'glider' ? (
              <>
                <Waves className="w-3.5 h-3.5 text-cyan-400" />
                <span>Sawtooth Dive Cycle</span>
              </>
            ) : sensor.type === 'mooring' ? (
              <>
                <Wind className="w-3.5 h-3.5 text-rose-400" />
                <span>Surface Weather &amp; Chain</span>
              </>
            ) : (
              <>
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                <span>30-Day Drift Trajectory</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('telemetry')}
            className={cn(
              "py-2.5 px-4 font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2",
              activeTab === 'telemetry'
                ? "border-white text-white"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            )}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>QC &amp; Provenance</span>
          </button>
        </div>

        {/* MODAL CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 font-sans">
          {/* TAB 1: VERTICAL DEPTH PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {/* Profile Metrics Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-[#141414] border border-[#222222] rounded-xl p-2.5 space-y-0.5">
                  <div className="text-[10px] font-mono text-neutral-400">SURFACE TEMP</div>
                  <div className="text-base font-bold font-mono text-white flex items-baseline gap-1">
                    <span>{sensor.surfaceTemp.toFixed(2)}</span>
                    <span className="text-xs font-normal text-neutral-400">°C</span>
                  </div>
                  <div className="text-[9px] text-neutral-500">Depth: 0m photic</div>
                </div>

                <div className="bg-[#141414] border border-[#222222] rounded-xl p-2.5 space-y-0.5">
                  <div className="text-[10px] font-mono text-neutral-400">SURFACE SALINITY</div>
                  <div className="text-base font-bold font-mono text-white flex items-baseline gap-1">
                    <span>{sensor.surfaceSalinity.toFixed(2)}</span>
                    <span className="text-xs font-normal text-neutral-400">PSU</span>
                  </div>
                  <div className="text-[9px] text-neutral-500">Evaporation balance</div>
                </div>

                <div className="bg-[#141414] border border-[#222222] rounded-xl p-2.5 space-y-0.5">
                  <div className="text-[10px] font-mono text-neutral-400">MAX CAST DEPTH</div>
                  <div className="text-base font-bold font-mono text-white flex items-baseline gap-1">
                    <span>{sensor.maxDepth}</span>
                    <span className="text-xs font-normal text-neutral-400">m</span>
                  </div>
                  <div className="text-[9px] text-neutral-500">Pressure: ~{(sensor.maxDepth * 1.02).toFixed(0)} dbar</div>
                </div>

                <div className="bg-[#141414] border border-[#222222] rounded-xl p-2.5 space-y-0.5">
                  <div className="text-[10px] font-mono text-neutral-400">DEEP WATER TEMP</div>
                  <div className="text-base font-bold font-mono text-white flex items-baseline gap-1">
                    <span>{profile[profile.length - 1]?.temperature.toFixed(2)}</span>
                    <span className="text-xs font-normal text-neutral-400">°C</span>
                  </div>
                  <div className="text-[9px] text-neutral-500">Abyssal boundary</div>
                </div>
              </div>

              {/* Variable Toggle for Chart */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
                  CTD SENSOR SOUNDING (DEPTH vs MEASUREMENT)
                </span>
                <div className="flex items-center gap-1 bg-[#141414] p-1 rounded-lg border border-[#222222]">
                  <button
                    type="button"
                    onClick={() => setActiveMetric('temp')}
                    className={cn(
                      "px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1",
                      activeMetric === 'temp' ? "bg-white text-black" : "text-neutral-400 hover:text-white"
                    )}
                  >
                    <Thermometer className="w-3 h-3" />
                    <span>Temp (°C)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMetric('sal')}
                    className={cn(
                      "px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1",
                      activeMetric === 'sal' ? "bg-white text-black" : "text-neutral-400 hover:text-white"
                    )}
                  >
                    <Droplets className="w-3 h-3" />
                    <span>Salinity (PSU)</span>
                  </button>
                  {sensor.type === 'bgc' && (
                    <button
                      type="button"
                      onClick={() => setActiveMetric('oxygen')}
                      className={cn(
                        "px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1",
                        activeMetric === 'oxygen' ? "bg-emerald-400 text-black font-bold" : "text-emerald-400 hover:text-white"
                      )}
                    >
                      <Activity className="w-3 h-3" />
                      <span>Oxygen (DO)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Profile Chart Container */}
              <div className="bg-[#121212] border border-[#222222] rounded-xl p-3 relative overflow-hidden">
                <svg 
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                  className="w-full h-56 select-none font-mono"
                >
                  {/* Depth Grid Lines */}
                  {[0, 250, 500, 1000, 1500, 2000].filter(d => d <= maxD).map((d) => {
                    const y = padding.top + (d / maxD) * innerHeight;
                    return (
                      <g key={d}>
                        <line
                          x1={padding.left}
                          y1={y}
                          x2={chartWidth - padding.right}
                          y2={y}
                          stroke="#222222"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={padding.left - 8}
                          y={y + 3}
                          textAnchor="end"
                          fill="#666666"
                          fontSize="9"
                        >
                          {d}m
                        </text>
                      </g>
                    );
                  })}

                  {/* Vertical Axis Line */}
                  <line
                    x1={padding.left}
                    y1={padding.top}
                    x2={padding.left}
                    y2={padding.top + innerHeight}
                    stroke="#333333"
                  />

                  {/* Horizontal Bottom Axis */}
                  <line
                    x1={padding.left}
                    y1={padding.top + innerHeight}
                    x2={chartWidth - padding.right}
                    y2={padding.top + innerHeight}
                    stroke="#333333"
                  />

                  {/* Metric X-Axis Labels */}
                  {activeMetric === 'temp' && (
                    <>
                      {[minTemp, (minTemp + maxTemp) / 2, maxTemp].map((val, i) => {
                        const x = padding.left + (i / 2) * innerWidth;
                        return (
                          <text
                            key={val}
                            x={x}
                            y={chartHeight - 12}
                            textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}
                            fill="#888888"
                            fontSize="9"
                          >
                            {val.toFixed(1)}°C
                          </text>
                        );
                      })}
                      {/* Temperature Profile Curve */}
                      <path
                        d={tempPath}
                        fill="none"
                        stroke="#00e5ff"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* Data Point Dots */}
                      {profile.map((p) => {
                        const cx = padding.left + ((p.temperature - minTemp) / (maxTemp - minTemp || 1)) * innerWidth;
                        const cy = padding.top + (p.depth / maxD) * innerHeight;
                        return (
                          <circle
                            key={p.depth}
                            cx={cx}
                            cy={cy}
                            r="3"
                            fill="#00e5ff"
                            stroke="#0e0e0e"
                            strokeWidth="1"
                          />
                        );
                      })}
                    </>
                  )}

                  {activeMetric === 'sal' && (
                    <>
                      {[minSal, (minSal + maxSal) / 2, maxSal].map((val, i) => {
                        const x = padding.left + (i / 2) * innerWidth;
                        return (
                          <text
                            key={val}
                            x={x}
                            y={chartHeight - 12}
                            textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}
                            fill="#888888"
                            fontSize="9"
                          >
                            {val.toFixed(1)} PSU
                          </text>
                        );
                      })}
                      {/* Salinity Profile Curve */}
                      <path
                        d={salPath}
                        fill="none"
                        stroke="#00f5a0"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {profile.map((p) => {
                        const cx = padding.left + ((p.salinity - minSal) / (maxSal - minSal || 1)) * innerWidth;
                        const cy = padding.top + (p.depth / maxD) * innerHeight;
                        return (
                          <circle
                            key={p.depth}
                            cx={cx}
                            cy={cy}
                            r="3"
                            fill="#00f5a0"
                            stroke="#0e0e0e"
                            strokeWidth="1"
                          />
                        );
                      })}
                    </>
                  )}

                  {activeMetric === 'oxygen' && sensor.type === 'bgc' && (
                    <>
                      {[minOxy, (minOxy + maxOxy) / 2, maxOxy].map((val, i) => {
                        const x = padding.left + (i / 2) * innerWidth;
                        return (
                          <text
                            key={val}
                            x={x}
                            y={chartHeight - 12}
                            textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}
                            fill="#00f5a0"
                            fontSize="9"
                          >
                            {val.toFixed(0)} μmol/kg
                          </text>
                        );
                      })}
                      {/* Dissolved Oxygen Curve */}
                      <path
                        d={oxyPath}
                        fill="none"
                        stroke="#76ff03"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {profile.filter(p => p.dissolvedOxygen !== undefined).map((p) => {
                        const cx = padding.left + ((p.dissolvedOxygen! - minOxy) / (maxOxy - minOxy || 1)) * innerWidth;
                        const cy = padding.top + (p.depth / maxD) * innerHeight;
                        return (
                          <circle
                            key={p.depth}
                            cx={cx}
                            cy={cy}
                            r="3"
                            fill="#76ff03"
                            stroke="#0e0e0e"
                            strokeWidth="1"
                          />
                        );
                      })}
                    </>
                  )}
                </svg>

                {/* Subsurface Phenonemon Annotation */}
                <div className="mt-2 pt-2 border-t border-[#1c1c1c] flex items-center justify-between text-[11px] font-mono text-neutral-400">
                  <span>Stratification Layer: <strong className="text-white">Thermocline (~75m–250m)</strong></span>
                  <span className="text-neutral-500">Instrument: Sea-Bird SBE 41CP CTD</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GLIDER SAWTOOTH / MOORING WEATHER / DRIFT */}
          {activeTab === 'mission' && (
            <div className="space-y-4">
              {sensor.type === 'glider' && sensor.gliderDives && (
                <div className="space-y-3">
                  <div className="border border-[#222222] rounded-xl p-3 bg-[#121212] space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Waves className="w-4 h-4 text-cyan-400" />
                        10-DAY SAWTOOTH DIVE-CLIMB TRANSECT (0m – 1000m)
                      </span>
                      <span className="text-cyan-400 font-mono text-[10px]">IFREMER GLIDER V2</span>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Continuous undulating sawtooth trajectory. The glider alternates between negative buoyancy (descent) and positive buoyancy (ascent), measuring fine-scale physical and biological ocean stratification across the Bay of Bengal.
                    </p>

                    {/* Sawtooth SVG Graphic */}
                    <div className="bg-[#090909] border border-[#1f1f1f] rounded-lg p-3">
                      <svg viewBox="0 0 500 160" className="w-full h-40 font-mono text-[9px]">
                        {/* Depth guidelines */}
                        {[0, 250, 500, 750, 1000].map((d) => {
                          const y = 20 + (d / 1000) * 110;
                          return (
                            <g key={d}>
                              <line x1="45" y1={y} x2="480" y2={y} stroke="#222" strokeDasharray="2 2" />
                              <text x="38" y={y + 3} fill="#666" textAnchor="end">{d}m</text>
                            </g>
                          );
                        })}

                        {/* Sawtooth path */}
                        <path
                          d={sensor.gliderDives.map((d, i) => {
                            const x = 50 + (d.timeStepHours / 32) * 420;
                            const y = 20 + (d.depth / 1000) * 110;
                            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                          }).join(' ')}
                          fill="none"
                          stroke="#00e5ff"
                          strokeWidth="2"
                        />

                        {/* Sawtooth data points */}
                        {sensor.gliderDives.map((d) => {
                          const x = 50 + (d.timeStepHours / 32) * 420;
                          const y = 20 + (d.depth / 1000) * 110;
                          return (
                            <g key={d.timeStepHours}>
                              <circle cx={x} cy={y} r="3.5" fill={d.depth === 0 ? "#00f5a0" : "#00e5ff"} />
                            </g>
                          );
                        })}

                        {/* X-Axis label */}
                        <text x="260" y="152" fill="#888" textAnchor="middle">Mission Time Elapsed (0 to 32 Hours)</text>
                      </svg>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono text-[11px]">
                      <div className="p-2 rounded bg-[#161616] border border-[#222]">
                        <div className="text-neutral-500 text-[9px]">SURFACE PINGS</div>
                        <div className="text-white font-bold">Every 4–6 Hours</div>
                      </div>
                      <div className="p-2 rounded bg-[#161616] border border-[#222]">
                        <div className="text-neutral-500 text-[9px]">SUB-SURFACE VELOCITY</div>
                        <div className="text-white font-bold">~0.25–0.35 m/s</div>
                      </div>
                      <div className="p-2 rounded bg-[#161616] border border-[#222]">
                        <div className="text-neutral-500 text-[9px]">PITCH / GLIDE ANGLE</div>
                        <div className="text-white font-bold">±16° – 20°</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {sensor.type === 'mooring' && sensor.surfaceMeteorology && (
                <div className="space-y-3">
                  <div className="border border-[#222222] rounded-xl p-3 bg-[#121212] space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Wind className="w-4 h-4 text-rose-400" />
                        INCOIS OMNI METEOROLOGICAL &amp; WAVE TELEMETRY
                      </span>
                      <span className="text-rose-400 font-mono text-[10px]">NIOT / MoES BUOY</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div className="bg-[#161616] border border-[#222] rounded-lg p-2.5 space-y-0.5">
                        <div className="text-[10px] text-neutral-400 font-mono">WIND SPEED</div>
                        <div className="text-base font-bold font-mono text-white flex items-baseline gap-1">
                          <span>{sensor.surfaceMeteorology.windSpeedKnots}</span>
                          <span className="text-xs text-neutral-400">kts</span>
                        </div>
                        <div className="text-[9px] text-neutral-500">Dir: {sensor.surfaceMeteorology.windDirectionDeg}° True</div>
                      </div>

                      <div className="bg-[#161616] border border-[#222] rounded-lg p-2.5 space-y-0.5">
                        <div className="text-[10px] text-neutral-400 font-mono">SIGNIFICANT WAVE HT</div>
                        <div className="text-base font-bold font-mono text-white flex items-baseline gap-1">
                          <span>{sensor.surfaceMeteorology.waveHeightM}</span>
                          <span className="text-xs text-neutral-400">m</span>
                        </div>
                        <div className="text-[9px] text-neutral-500">Moderate Sea State</div>
                      </div>

                      <div className="bg-[#161616] border border-[#222] rounded-lg p-2.5 space-y-0.5">
                        <div className="text-[10px] text-neutral-400 font-mono">BAROMETRIC PRESSURE</div>
                        <div className="text-base font-bold font-mono text-white flex items-baseline gap-1">
                          <span>{sensor.surfaceMeteorology.barometricPressureHpa}</span>
                          <span className="text-xs text-neutral-400">hPa</span>
                        </div>
                        <div className="text-[9px] text-neutral-500">Nominal pressure</div>
                      </div>

                      <div className="bg-[#161616] border border-[#222] rounded-lg p-2.5 space-y-0.5">
                        <div className="text-[10px] text-neutral-400 font-mono">AIR TEMPERATURE</div>
                        <div className="text-base font-bold font-mono text-white flex items-baseline gap-1">
                          <span>{sensor.surfaceMeteorology.airTempC}</span>
                          <span className="text-xs text-neutral-400">°C</span>
                        </div>
                        <div className="text-[9px] text-neutral-500">RH: {sensor.surfaceMeteorology.humidityPercent}%</div>
                      </div>

                      <div className="bg-[#161616] border border-[#222] rounded-lg p-2.5 space-y-0.5">
                        <div className="text-[10px] text-neutral-400 font-mono">SEA SURFACE TEMP</div>
                        <div className="text-base font-bold font-mono text-white flex items-baseline gap-1">
                          <span>{sensor.surfaceTemp}</span>
                          <span className="text-xs text-neutral-400">°C</span>
                        </div>
                        <div className="text-[9px] text-neutral-500">Subsurface anchor</div>
                      </div>

                      <div className="bg-[#161616] border border-[#222] rounded-lg p-2.5 space-y-0.5">
                        <div className="text-[10px] text-neutral-400 font-mono">MOORING STATUS</div>
                        <div className="text-base font-bold font-mono text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>ON STATION</span>
                        </div>
                        <div className="text-[9px] text-neutral-500">Watch circle &lt; 500m</div>
                      </div>
                    </div>

                    {/* Subsurface Thermistor Chain */}
                    {sensor.mooringChain && (
                      <div className="mt-3 pt-3 border-t border-[#1c1c1c] space-y-1.5">
                        <span className="text-[10px] font-mono text-neutral-400 uppercase">
                          IN-SITU THERMISTOR CHAIN STRATIFICATION (5m to 500m)
                        </span>
                        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
                          {sensor.mooringChain.map((tc) => (
                            <div key={tc.depth} className="bg-[#181818] p-1.5 rounded border border-[#262626] text-center font-mono">
                              <div className="text-[9px] text-neutral-400">{tc.depth}m</div>
                              <div className="text-xs font-bold text-white">{tc.temperature.toFixed(1)}°</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(sensor.type === 'argo' || sensor.type === 'bgc') && sensor.driftHistory && (
                <div className="space-y-3">
                  <div className="border border-[#222222] rounded-xl p-3 bg-[#121212] space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Compass className="w-4 h-4 text-amber-400" />
                        30-DAY DRIFT TRAJECTORY &amp; SURFACING LOG
                      </span>
                      <span className="text-neutral-400 text-[10px]">10-DAY CYCLE</span>
                    </div>

                    <div className="space-y-1.5">
                      {sensor.driftHistory.map((dh, i) => (
                        <div key={dh.daysAgo} className="flex items-center justify-between p-2 rounded-lg bg-[#161616] border border-[#222] text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className={cn("w-2 h-2 rounded-full", i === 0 ? "bg-emerald-400 animate-pulse" : "bg-neutral-600")} />
                            <span className="text-white font-bold">{i === 0 ? "CURRENT SURFACE FIX" : `Cycle ${sensor.driftHistory!.length - i}`}</span>
                            <span className="text-neutral-500 text-[10px]">({dh.daysAgo === 0 ? "Today" : `${dh.daysAgo} days ago`})</span>
                          </div>
                          <span className="text-neutral-300">
                            {dh.lat.toFixed(2)}°N, {dh.lon.toFixed(2)}°E
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TELEMETRY & QC METADATA */}
          {activeTab === 'telemetry' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="bg-[#121212] border border-[#222222] rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  SCIENTIFIC DATA PROVENANCE &amp; QC
                </h4>

                <div className="space-y-2 text-neutral-300 divide-y divide-[#1f1f1f]">
                  <div className="flex justify-between py-1.5">
                    <span className="text-neutral-400">Managing Agency:</span>
                    <span className="text-white font-semibold">{sensor.institution}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-neutral-400">WMO Identification:</span>
                    <span className="text-white">{sensor.wmoId}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-neutral-400">Quality Control Flag:</span>
                    <span className="text-emerald-400 font-bold">{sensor.qcFlag} (Real-time Automated QC)</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-neutral-400">Satellite Telemetry:</span>
                    <span className="text-white">Iridium SBD / Argos-3 Two-Way Transmission</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-neutral-400">Last Surface Sync:</span>
                    <span className="text-white">{sensor.lastPingTimestamp.replace('T', ' ').substring(0, 19)} UTC</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-neutral-400">Battery Reserve:</span>
                    <span className="text-white">{sensor.batteryPercent}% (Nominal Lithium Battery Pack)</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1f1f1f]">
                  <span className="text-[10px] text-neutral-400 uppercase block mb-1">Operational Mandate:</span>
                  <p className="text-xs text-neutral-300 font-sans leading-relaxed">
                    {sensor.operationalRole}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-3 sm:p-4 border-t border-[#222222] bg-[#121212] flex items-center justify-between shrink-0 font-mono text-xs">
          <span className="text-[10px] text-neutral-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            GDAC LINK: VERIFIED ACTIVE
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-[#1f1f1f] hover:bg-[#2a2a2a] text-neutral-200 hover:text-white font-medium transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onTargetCoordinates(sensor.lat, sensor.lon, 0);
                onClose();
              }}
              className="px-4 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow"
            >
              <Target className="w-3.5 h-3.5 text-black" />
              <span>Target Coordinates</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InSituSensorModal;
