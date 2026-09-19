import { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Compass, 
  ExternalLink, 
  Waves, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Activity,
  Droplets,
  Layers,
  Thermometer,
  Anchor,
  Clock,
  Radio,
  Fish,
  Leaf,
  Gauge,
  LifeBuoy,
  Eye,
  Sliders,
  Maximize2
} from 'lucide-react';
import { 
  predictOceanState, 
  type OceanPredictionResult, 
  type OceanPredictionVariable 
} from '@/lib/api/oceanPredictionService';
import { 
  computeCycloneTrackerData, 
  computeEcosystemHealthData, 
  computeFishingAdvisoryData, 
  computeSafeZoneData, 
  computeSoundSpeed, 
  computeSeawaterDensity 
} from '@/lib/maritimeHazardAnalytics';
import { cn } from '@/lib/utils';
import RiskBadge from '@/components/ui/risk-badge';

// Timezones for the status bar
type TimeZone = 'IST' | 'UTC' | 'EST' | 'PST' | 'JST' | 'SGT';
const timeZoneMap: Record<TimeZone, { name: string; timeZone: string; offsetLabel: string }> = {
  IST: { name: 'IST (India Standard)', timeZone: 'Asia/Kolkata', offsetLabel: 'UTC+05:30' },
  UTC: { name: 'UTC / GMT (Universal)', timeZone: 'UTC', offsetLabel: 'UTC+00:00' },
  EST: { name: 'EST (US Eastern)', timeZone: 'America/New_York', offsetLabel: 'UTC-05:00' },
  PST: { name: 'PST (US Pacific)', timeZone: 'America/Los_Angeles', offsetLabel: 'UTC-08:00' },
  JST: { name: 'JST (Japan Standard)', timeZone: 'Asia/Tokyo', offsetLabel: 'UTC+09:00' },
  SGT: { name: 'SGT (Singapore)', timeZone: 'Asia/Singapore', offsetLabel: 'UTC+08:00' },
};

interface VariableGuidance {
  takeaway: string;
  action: string;
  baseline: string;
  icon: typeof Waves;
}

const getVariableGuidance = (v: OceanPredictionVariable): VariableGuidance => {
  switch (v.variable) {
    case 'thetao':
      return {
        icon: Thermometer,
        takeaway: `Conservative water temperature is ${v.formattedValue}. Stable thermal stratification across sector.`,
        action: "Normal engine seawater cooling efficiency. Sonar acoustic sound speed profile is nominal (~1,535 m/s).",
        baseline: "Safe Operating Range: 22.0°C – 31.0°C",
      };
    case 'so':
      return {
        icon: Droplets,
        takeaway: `Salinity measured at ${v.formattedValue}. Governs regional water mass density (${v.value > 36 ? 'higher density' : 'standard density'}).`,
        action: "Apply standard vessel draft marks (Plimsoll line) and buoyancy calculations for vessel trim.",
        baseline: "Standard Open Ocean Baseline: 33.0 – 37.0 PSU",
      };
    case 'uo':
      return {
        icon: Compass,
        takeaway: `Zonal eastward current velocity is ${v.formattedValue} (${v.value >= 0 ? 'flowing East' : 'flowing West'}).`,
        action: v.value >= 0 
          ? "Favorable tail-current for eastbound tracks; apply slight rudder port compensation for westbound transit."
          : "Favorable tail-current for westbound tracks; offset course-over-ground heading starboard.",
        baseline: "Drift Severity: Low (< 0.5 m/s)",
      };
    case 'vo':
      return {
        icon: Compass,
        takeaway: `Meridional northward velocity component is ${v.formattedValue} (${v.value >= 0 ? 'flowing North' : 'flowing South'}).`,
        action: "Account for cross-track leeway drift vector when calculating waypoint ETA and navigational heading.",
        baseline: "Cross-Track Impact: Minor Steering Offset",
      };
    case 'zos':
      return {
        icon: Layers,
        takeaway: `Sea surface dynamic height anomaly is ${v.formattedValue} relative to the oceanic geoid.`,
        action: v.value > 0.15 
          ? "Warm-core anticyclonic circulation with gentle downwelling. No hazardous rip-currents."
          : "Uniform sea surface dynamic topography with nominal mesoscale pressure gradients.",
        baseline: "Normal Geoid Deviation: ±0.30 m",
      };
    case 'mlotst':
      return {
        icon: Activity,
        takeaway: `Surface mixed layer extends to depth of ${v.formattedValue} before thermocline gradient onset.`,
        action: "Acoustic sound channel ducting is established at this depth. Subsurface sonar and sensors operate with optimal propagation.",
        baseline: "Typical Tropical MLD: 15m – 45m",
      };
    case 'bottomT':
      return {
        icon: Anchor,
        takeaway: `Abyssal sea-floor temperature is ${v.formattedValue} at benthic boundary.`,
        action: "Non-freezing abyssal state. Safe for subsea cables, underwater moorings, and deep remote vehicle deployment.",
        baseline: "Deep Oceanic Baseline: 1.2°C – 3.5°C",
      };
    default:
      return {
        icon: Waves,
        takeaway: `${v.commonName} is recorded at ${v.formattedValue}. Standard Copernicus biogeochemical state.`,
        action: "Incorporate into environmental monitoring and baseline marine impact assessments.",
        baseline: "Nominal Model Parameters",
      };
  }
};

type HazardTab = 'all' | 'cyclone' | 'ecosystem' | 'fishing' | 'navigation' | 'acoustics' | 'copernicus';

export default function DetailsPage() {
  const [params] = useState(() => {
    const search = new URLSearchParams(window.location.search);
    const lat = parseFloat(search.get('lat') || '15.4');
    const lon = parseFloat(search.get('lon') || '71.2');
    const depth = parseInt(search.get('depth') || '150', 10);
    return {
      lat: isNaN(lat) ? 15.4 : lat,
      lon: isNaN(lon) ? 71.2 : lon,
      depth: isNaN(depth) ? 150 : depth,
    };
  });

  const [activeTab, setActiveTab] = useState<HazardTab>('all');
  const [selectedTimeZone, setSelectedTimeZone] = useState<TimeZone>('IST');
  const [realTimeClock, setRealTimeClock] = useState<string>('');

  // Compute prediction results
  const predictionResult: OceanPredictionResult = useMemo(() => {
    return predictOceanState(params.lat, params.lon, params.depth);
  }, [params.lat, params.lon, params.depth]);

  // Compute comprehensive maritime hazard analytics
  const cycloneData = useMemo(() => {
    return computeCycloneTrackerData(predictionResult);
  }, [predictionResult]);

  const ecosystemData = useMemo(() => {
    return computeEcosystemHealthData(predictionResult, params.depth);
  }, [predictionResult, params.depth]);

  const fishingData = useMemo(() => {
    return computeFishingAdvisoryData(predictionResult, params.depth);
  }, [predictionResult, params.depth]);

  const safeZoneData = useMemo(() => {
    return computeSafeZoneData(predictionResult, cycloneData);
  }, [predictionResult, cycloneData]);

  const soundSpeed = useMemo(() => {
    return computeSoundSpeed(
      predictionResult.variables.thetao.value,
      predictionResult.variables.so.value,
      params.depth
    );
  }, [predictionResult, params.depth]);

  const seawaterDensity = useMemo(() => {
    return computeSeawaterDensity(
      predictionResult.variables.thetao.value,
      predictionResult.variables.so.value,
      params.depth
    );
  }, [predictionResult, params.depth]);

  // Real-time clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      try {
        const options: Intl.DateTimeFormatOptions = {
          timeZone: timeZoneMap[selectedTimeZone].timeZone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        };
        const formatter = new Intl.DateTimeFormat('en-CA', options);
        const formatted = formatter.format(now).replace(', ', ' ');
        setRealTimeClock(`${formatted} ${selectedTimeZone}`);
      } catch {
        setRealTimeClock(`${now.toISOString().substring(0, 19).replace('T', ' ')} ${selectedTimeZone}`);
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [selectedTimeZone]);

  const handleBackToHome = () => {
    window.location.href = '/';
  };

  const handleOpenOperations = () => {
    sessionStorage.setItem('leher_ops_returned_from_subscreen', 'true');
    window.location.href = `/operations?lat=${params.lat}&lon=${params.lon}&depth=${params.depth}&from=details`;
  };

  const handleOpenDepthSlice = () => {
    window.location.href = `/depth-slice?lat=${params.lat}&lon=${params.lon}&depth=${params.depth}`;
  };

  return (
    <div className="min-h-screen bg-[#050608] text-white flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 h-16 bg-[#060608]/25 backdrop-blur-2xl border-b border-white/[0.08] px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-lg shadow-black/20 transition-all duration-300">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToHome}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs font-mono text-[#cccccc] hover:text-white transition-all cursor-pointer shadow-sm"
            title="Return to Home"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Home</span>
          </button>

          <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <img 
              src="/logo.png" 
              alt="Leher Logo" 
              title="Leher" 
              className="h-7 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(56,189,248,0.35)]" 
            />
            <div>
              <div className="font-bold text-sm sm:text-base text-white flex items-center gap-2 font-mono tracking-tight">
                <span>Maritime Hazard &amp; Environmental Intelligence Dossier</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Clock */}
          <div className="hidden md:flex items-center gap-2 font-mono text-xs text-[#888899] bg-white/[0.04] px-3 py-1.5 rounded-xl border border-white/10">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{realTimeClock}</span>
            <select
              value={selectedTimeZone}
              onChange={(e) => setSelectedTimeZone(e.target.value as TimeZone)}
              className="bg-[#141419] text-white text-[11px] font-mono rounded px-1.5 py-0.5 border border-white/15 focus:outline-none cursor-pointer hover:border-cyan-400 transition-colors ml-1"
            >
              {Object.entries(timeZoneMap).map(([tz, info]) => (
                <option key={tz} value={tz}>
                  {tz} ({info.offsetLabel})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleOpenDepthSlice}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 text-xs font-semibold transition-all cursor-pointer font-mono"
            title="Open 3D Depth Slice"
          >
            <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">3D Depth Slice</span>
          </button>

          <button
            onClick={handleOpenOperations}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-semibold transition-all cursor-pointer font-mono"
            title="Return to Operations Console"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Operations Console</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* EXECUTIVE HAZARD STATUS BANNER */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#090b10]/80 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1">
                <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                TACTICAL SECTOR DOSSIER
              </span>
              <span className={cn(
                "text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase border",
                safeZoneData.statusColor,
                safeZoneData.statusBg
              )}>
                {safeZoneData.status}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
              {predictionResult.location.regionName} Maritime State
            </h1>
            <p className="text-xs sm:text-sm text-[#888899] font-mono">
              Coordinates: <strong className="text-white">{params.lat >= 0 ? `${params.lat.toFixed(2)}°N` : `${Math.abs(params.lat).toFixed(2)}°S`}, {params.lon >= 0 ? `${params.lon.toFixed(2)}°E` : `${Math.abs(params.lon).toFixed(2)}°W`}</strong> | Horizon: <strong className="text-white">{params.depth}m</strong> Subsurface Depth | INCOIS &amp; CMEMS Physics Grid
            </p>
          </div>

          {/* 4 Executive Vital Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-center min-w-[110px]">
              <div className="text-[10px] text-[#888899] font-mono uppercase">Cyclone Threat</div>
              <div className={cn("text-base font-bold font-mono mt-0.5", cycloneData.riskColor)}>
                {cycloneData.threatLevel}
              </div>
              <div className="text-[10px] text-neutral-400 font-mono">
                {cycloneData.tchp} kJ/cm²
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-center min-w-[110px]">
              <div className="text-[10px] text-[#888899] font-mono uppercase">Sea State</div>
              <div className="text-base font-bold text-white font-mono mt-0.5">
                ~{cycloneData.waveHeight}m
              </div>
              <div className="text-[10px] text-[#aaaaaa] font-mono truncate">
                {cycloneData.seaStateLabel.split(' ')[0]}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-center min-w-[110px]">
              <div className="text-[10px] text-[#888899] font-mono uppercase">PFZ Fishing</div>
              <div className={cn("text-base font-bold font-mono mt-0.5", fishingData.ratingColor)}>
                {fishingData.rating}
              </div>
              <div className="text-[10px] text-cyan-400 font-mono">
                {params.depth}m Margin
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-center min-w-[110px]">
              <div className="text-[10px] text-[#888899] font-mono uppercase">Surface Drift</div>
              <div className="text-base font-bold text-cyan-300 font-mono mt-0.5">
                {predictionResult.summary.currentSpeedKnots} kts
              </div>
              <div className="text-[10px] text-[#888899] font-mono">
                {predictionResult.summary.currentDirectionCompass} ({predictionResult.summary.currentDirectionDeg}°)
              </div>
            </div>
          </div>
        </div>

        {/* DOMAIN NAVIGATION TABS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-white/10 font-mono text-xs">
          {[
            { id: 'all', label: 'All Intelligence Modules' },
            { id: 'cyclone', label: 'Cyclone & TCHP' },
            { id: 'ecosystem', label: 'Ecosystem & Coral' },
            { id: 'fishing', label: 'PFZ Fishery Advisory' },
            { id: 'navigation', label: 'Navigation & Drift' },
            { id: 'acoustics', label: 'Acoustics & Physics' },
            { id: 'copernicus', label: 'Copernicus Model Matrix' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as HazardTab)}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                activeTab === tab.id
                  ? "bg-white text-black shadow-md font-bold"
                  : "bg-white/[0.03] text-neutral-400 hover:text-white border border-white/5 hover:border-white/15"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* DETAILED HAZARD MODULES GRID */}
        <div className="space-y-6">
          {/* MODULE 1: CYCLONE TRACKER & TROPICAL CYCLOGENESIS */}
          {(activeTab === 'all' || activeTab === 'cyclone') && (
            <div className="p-5 sm:p-6 rounded-2xl bg-[#0b0e14] border border-[#222] space-y-4">
              <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-3">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className={cn("w-5 h-5", cycloneData.riskColor)} />
                  <div>
                    <h3 className="text-base font-bold text-white font-mono uppercase tracking-wide">
                      Cyclone &amp; Tropical Cyclogenesis Hazard Tracker
                    </h3>
                    <p className="text-xs text-neutral-400">
                      SST thermodynamic threshold (26.5°C) &amp; Tropical Cyclone Heat Potential (TCHP)
                    </p>
                  </div>
                </div>
                <span className={cn("px-3 py-1 rounded-lg font-mono font-bold text-xs border", cycloneData.riskBg, cycloneData.riskColor)}>
                  {cycloneData.badgeText}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[#141418] border border-[#242424] space-y-1">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase">Sea Surface Temperature</span>
                  <div className="text-lg font-bold font-mono text-white flex items-baseline gap-2">
                    <span>{cycloneData.sst}°C</span>
                    <span className="text-[10px] text-neutral-400">Threshold: 26.5°C</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    {parseFloat(cycloneData.sst) >= 28.5
                      ? 'Elevated heat content fueling atmospheric convection.'
                      : 'Thermal reservoir stable beneath cyclonic intensification.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#141418] border border-[#242424] space-y-1">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase">Tropical Cyclone Heat Potential</span>
                  <div className="text-lg font-bold font-mono text-white">
                    {cycloneData.tchp} <span className="text-xs font-normal text-neutral-400">kJ/cm²</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    {cycloneData.tchp > 60 ? 'Extreme energy reserve for deep atmospheric depression.' : 'Moderate to low cyclonic thermal reservoir.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#141418] border border-[#242424] space-y-1">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase">Evacuation &amp; Watch Horizon</span>
                  <div className="text-lg font-bold font-mono text-white">
                    {cycloneData.evacuationWindow}
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Wind Shear: {cycloneData.windShearStatus}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#141722] border border-[#232a3d] text-xs font-mono text-cyan-200">
                <strong>Advisory Note: </strong>{cycloneData.advisoryNote}
              </div>
            </div>
          )}

          {/* MODULE 2: MARINE ECOSYSTEM & CORAL BLEACHING */}
          {(activeTab === 'all' || activeTab === 'ecosystem') && (
            <div className="p-5 sm:p-6 rounded-2xl bg-[#0b0e14] border border-[#222] space-y-4">
              <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-3">
                <div className="flex items-center gap-2.5">
                  <Leaf className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="text-base font-bold text-white font-mono uppercase tracking-wide">
                      Marine Ecosystem Health &amp; Coral Bleaching Vulnerability
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Degree Heating Weeks (DHW), primary productivity, and hypoxia monitoring
                    </p>
                  </div>
                </div>
                <span className={cn("px-3 py-1 rounded-lg font-mono font-bold text-xs border border-emerald-800/50 bg-emerald-950/40", ecosystemData.statusColor)}>
                  {ecosystemData.status} ({ecosystemData.score}/100)
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono text-neutral-400">
                  <span>Composite Ecological Integrity Score</span>
                  <span className={ecosystemData.statusColor}>{ecosystemData.score} / 100</span>
                </div>
                <div className="w-full bg-[#18181c] h-2 rounded-full overflow-hidden">
                  <div className={cn("h-full transition-all duration-500", ecosystemData.barColor)} style={{ width: `${ecosystemData.score}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-[#141418] border border-[#242424] space-y-1">
                  <span className="text-neutral-500 uppercase text-[10px] block">Coral Thermal Stress</span>
                  <span className="text-white font-bold text-sm">{ecosystemData.dhw}</span>
                  <span className="text-neutral-400 block text-[10px]">Bleaching Alert Level</span>
                </div>
                <div className="p-3 rounded-xl bg-[#141418] border border-[#242424] space-y-1">
                  <span className="text-neutral-500 uppercase text-[10px] block">Primary Productivity</span>
                  <span className="text-white font-bold text-sm">{ecosystemData.primaryProd}</span>
                  <span className="text-neutral-400 block text-[10px]">Chlorophyll: {ecosystemData.chlorophyllProxy}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#141418] border border-[#242424] space-y-1">
                  <span className="text-neutral-500 uppercase text-[10px] block">Oxygen Saturation</span>
                  <span className="text-white font-bold text-sm">{ecosystemData.hypoxiaStatus}</span>
                  <span className="text-neutral-400 block text-[10px]">At {params.depth}m Horizon</span>
                </div>
                <div className="p-3 rounded-xl bg-[#141418] border border-[#242424] space-y-1">
                  <span className="text-neutral-500 uppercase text-[10px] block">Estimated Ocean pH</span>
                  <span className="text-white font-bold text-sm">{ecosystemData.phProxy}</span>
                  <span className="text-neutral-400 block text-[10px]">Acidification Proxy</span>
                </div>
              </div>
            </div>
          )}

          {/* MODULE 3: COMMERCIAL FISHING & PFZ */}
          {(activeTab === 'all' || activeTab === 'fishing') && (
            <div className="p-5 sm:p-6 rounded-2xl bg-[#0b0e14] border border-[#222] space-y-4">
              <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-3">
                <div className="flex items-center gap-2.5">
                  <Fish className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h3 className="text-base font-bold text-white font-mono uppercase tracking-wide">
                      Commercial Fishery &amp; Potential Fishing Zone (PFZ)
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Nutrient upwelling boundaries, pelagic schooling, and thermal convergence
                    </p>
                  </div>
                </div>
                <span className={cn("px-3 py-1 rounded-lg font-mono font-bold text-xs border", fishingData.ratingBg, fishingData.ratingColor)}>
                  PFZ: {fishingData.rating}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-xl bg-[#141418] border border-[#242424] space-y-1">
                  <span className="text-[10px] text-neutral-500 uppercase">Target Commercial Species</span>
                  <div className="text-sm font-bold text-white">{fishingData.species}</div>
                  <span className="text-neutral-400 text-[11px] block">{fishingData.feedingAggregation}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#141418] border border-[#242424] space-y-1">
                  <span className="text-[10px] text-neutral-500 uppercase">Optimal Casting Horizon</span>
                  <div className="text-sm font-bold text-white">{fishingData.optimalDepthHorizon}</div>
                  <span className="text-neutral-400 text-[11px] block">Front: {fishingData.frontType}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#141418] border border-[#242424] space-y-1">
                  <span className="text-[10px] text-neutral-500 uppercase">Deployment Strategy</span>
                  <div className="text-xs font-semibold text-cyan-300">{fishingData.driftStrategy}</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#141418] border border-[#262626] text-xs font-mono text-neutral-300">
                <strong>Fishery Advisory: </strong>{fishingData.advisoryText}
              </div>
            </div>
          )}

          {/* MODULE 4: VESSEL NAVIGATION & DRIFT HAZARDS */}
          {(activeTab === 'all' || activeTab === 'navigation') && (
            <div className="p-5 sm:p-6 rounded-2xl bg-[#0b0e14] border border-[#222] space-y-4">
              <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-3">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="text-base font-bold text-white font-mono uppercase tracking-wide">
                      Vessel Navigation, Sea State &amp; Drift Hazard Assessment
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Cross-track leeway rates, drift vectors, and vessel speed recommendations
                    </p>
                  </div>
                </div>
                <span className={cn("px-3 py-1 rounded-lg font-mono font-bold text-xs border", safeZoneData.statusBg, safeZoneData.statusColor)}>
                  {safeZoneData.status} ({safeZoneData.safetyScore}/100)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-[#141418] border border-[#242424] space-y-1">
                  <span className="text-neutral-500 uppercase text-[10px] block">Leeway Drift Rate</span>
                  <span className="text-white font-bold text-base">{safeZoneData.leewayRate}</span>
                  <span className="text-neutral-400 block text-[10px]">Cross-Track Leeway</span>
                </div>

                <div className="p-3 rounded-xl bg-[#141418] border border-[#242424] space-y-1">
                  <span className="text-neutral-500 uppercase text-[10px] block">Surface Drift Vector</span>
                  <span className="text-white font-bold text-sm">{safeZoneData.driftVector}</span>
                  <span className="text-neutral-400 block text-[10px]">Current Heading</span>
                </div>

                <div className="p-3 rounded-xl bg-[#141418] border border-[#242424] space-y-1">
                  <span className="text-neutral-500 uppercase text-[10px] block">Recommended Speed</span>
                  <span className="text-white font-bold text-sm">{safeZoneData.maxRecommendedSpeed}</span>
                  <span className="text-neutral-400 block text-[10px]">Hydrodynamic Drag</span>
                </div>

                <div className="p-3 rounded-xl bg-[#141418] border border-[#242424] space-y-1">
                  <span className="text-neutral-500 uppercase text-[10px] block">Craft Advisory</span>
                  <span className="text-white font-bold text-sm">{safeZoneData.smallCraftAdvisory}</span>
                  <span className="text-neutral-400 block text-[10px]">Coastal &amp; Artisanal Fleet</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#12141a] border border-[#222838] text-xs font-mono text-neutral-200">
                <strong>Bridge Watch Advisory: </strong>{safeZoneData.vesselAdvisory}
              </div>
            </div>
          )}

          {/* MODULE 5: OCEAN ACOUSTICS & SUBSURFACE PHYSICS */}
          {(activeTab === 'all' || activeTab === 'acoustics') && (
            <div className="p-5 sm:p-6 rounded-2xl bg-[#0b0e14] border border-[#222] space-y-4">
              <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-3">
                <div className="flex items-center gap-2.5">
                  <Gauge className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h3 className="text-base font-bold text-white font-mono uppercase tracking-wide">
                      Ocean Acoustics &amp; Water Column Physics
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Mackenzie sound speed formula, seawater in-situ density, and SOFAR ducting
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-lg font-mono font-bold text-xs border border-cyan-800/50 bg-cyan-950/40 text-cyan-300">
                  {soundSpeed} m/s
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-xl bg-[#141418] border border-[#242424] space-y-1">
                  <span className="text-[10px] text-neutral-500 uppercase">Acoustic Sound Velocity</span>
                  <div className="text-xl font-bold text-cyan-300 font-mono">{soundSpeed} m/s</div>
                  <p className="text-[11px] text-neutral-400">
                    Calculated via Mackenzie formulation based on {predictionResult.variables.thetao.formattedValue} &amp; {params.depth}m pressure.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#141418] border border-[#242424] space-y-1">
                  <span className="text-[10px] text-neutral-500 uppercase">Seawater In-Situ Density</span>
                  <div className="text-xl font-bold text-white font-mono">{seawaterDensity} kg/m³</div>
                  <p className="text-[11px] text-neutral-400">
                    UNESCO equation of state proxy for vessel displacement, ballast, and submarine trim.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#141418] border border-[#242424] space-y-1">
                  <span className="text-[10px] text-neutral-500 uppercase">SOFAR Sound Channel</span>
                  <div className="text-sm font-bold text-emerald-400 font-mono">
                    {params.depth >= 600 && params.depth <= 1200 ? 'SOFAR Axis Active' : 'Surface Ducting Channel'}
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Subsurface sonar and acoustic propagation optimal without surface reflection loss.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* MODULE 6: STANDARDIZED COPERNICUS MODEL PARAMETER MATRIX */}
          {(activeTab === 'all' || activeTab === 'copernicus') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-[#888899] px-1 border-b border-white/10 pb-2">
                <span className="font-bold text-white uppercase tracking-wider">
                  COPERNICUS MARINE OCEANOGRAPHIC PARAMETER MATRIX ({Object.keys(predictionResult.variables).length} VARIABLES)
                </span>
                <span className="text-cyan-400">Direct Navigational &amp; Scientific Takeaways</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {Object.values(predictionResult.variables).map((v) => {
                  const guidance = getVariableGuidance(v);
                  const IconComponent = guidance.icon;

                  return (
                    <div
                      key={v.variable}
                      className="p-4 sm:p-5 rounded-2xl bg-[#0b0e14]/90 border border-white/10 hover:border-white/20 transition-all space-y-3 shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-white/[0.05] border border-white/10 text-cyan-400">
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-[10px] font-mono text-[#888899] uppercase tracking-wider">
                              {v.variable} · {v.category}
                            </div>
                            <h4 className="text-sm font-bold text-white tracking-tight">
                              {v.commonName}
                            </h4>
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <div className="text-base font-bold text-white">
                            {v.formattedValue}
                          </div>
                          <div className="text-[10px] text-[#888899]">
                            {v.units || 'dimensionless'}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-cyan-300 font-mono text-[11px] block">
                              Operational Meaning:
                            </span>
                            <p className="text-[#d0d0dc] leading-relaxed mt-0.5">
                              {guidance.takeaway}
                            </p>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/10 flex items-start gap-2.5">
                          <Compass className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-amber-300 font-mono text-[11px] block">
                              Vessel / Navigation Action:
                            </span>
                            <p className="text-[#bbbbcc] leading-relaxed mt-0.5">
                              {guidance.action}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-[#888899] border-t border-white/5">
                        <span>{guidance.baseline}</span>
                        <span className="text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Validated QC-1
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="py-8 flex flex-wrap justify-center items-center gap-4 border-t border-white/10">
          <button
            onClick={handleBackToHome}
            className="px-5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-white font-mono text-xs flex items-center gap-2 border border-white/15 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>

          <button
            onClick={handleOpenDepthSlice}
            className="px-5 py-2.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 font-mono text-xs font-semibold flex items-center gap-2 border border-cyan-800/50 transition-all cursor-pointer shadow-md"
          >
            <Maximize2 className="w-4 h-4" />
            <span>Inspect 3D Depth Slice ({params.depth}m)</span>
          </button>

          <button
            onClick={handleOpenOperations}
            className="px-6 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold text-xs font-mono flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-[0.99]"
          >
            <Compass className="w-4 h-4 text-black" />
            <span>Open Operations Console</span>
            <ExternalLink className="w-3.5 h-3.5 ml-0.5 text-black" />
          </button>
        </div>
      </main>
    </div>
  );
}
