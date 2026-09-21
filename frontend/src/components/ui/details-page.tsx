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
  Maximize2,
  ArrowLeftRight,
  FileText
} from 'lucide-react';
import { ModelVsObsComparator } from '@/components/ocean/ModelVsObsComparator';
import { downloadMissionDossierPdf } from '@/lib/export/missionDossierPdf';
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
  const [showModelVsObsModal, setShowModelVsObsModal] = useState<boolean>(false);

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
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-sky-500/20 selection:text-sky-200">
      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 h-16 bg-[#090c14]/80 backdrop-blur-md border-b border-white/[0.08] px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-lg shadow-black/30 transition-all duration-300">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToHome}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm"
            title="Return to Home"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Home</span>
          </button>

          <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <img 
              src="/logo.png" 
              alt="Leher Logo" 
              title="Leher" 
              className="h-6 sm:h-7 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(56,189,248,0.35)] shrink-0" 
            />
            <div className="min-w-0">
              <div className="font-bold text-xs sm:text-base text-white flex items-center gap-2 font-mono tracking-tight truncate">
                <span className="hidden md:inline">Maritime Hazard &amp; Environmental Intelligence Dossier</span>
                <span className="md:hidden">Hazard Dossier</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Clock */}
          <div className="hidden lg:flex items-center gap-2 font-mono text-xs text-slate-400 bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/[0.08]">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{realTimeClock}</span>
            <select
              value={selectedTimeZone}
              onChange={(e) => setSelectedTimeZone(e.target.value as TimeZone)}
              className="bg-[#10141f] text-slate-200 text-[11px] font-mono rounded px-1.5 py-0.5 border border-white/10 focus:outline-none cursor-pointer hover:border-slate-500 transition-colors ml-1"
            >
              {Object.entries(timeZoneMap).map(([tz, info]) => (
                <option key={tz} value={tz}>
                  {tz} ({info.offsetLabel})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowModelVsObsModal(true)}
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white text-xs font-mono font-medium transition-all cursor-pointer"
            title="Model vs. Observation Anomaly Engine"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="hidden xl:inline">Model vs Obs Bias</span>
          </button>

          <button
            onClick={() => downloadMissionDossierPdf({ 
              lat: params.lat, 
              lon: params.lon, 
              depth: params.depth,
              activeReadings: {
                temperature: predictionResult.variables.thetao?.value,
                salinity: predictionResult.variables.so?.value,
                currentSpeedMs: predictionResult.summary.currentSpeedMs,
                currentDirectionDeg: predictionResult.summary.currentDirectionDeg,
                currentDirectionCompass: predictionResult.summary.currentDirectionCompass,
                uo: predictionResult.variables.uo?.value,
                vo: predictionResult.variables.vo?.value,
                thermalContrast: predictionResult.summary.thermalContrastStr,
                chlorophyll: predictionResult.variables.chl?.value,
                density: seawaterDensity,
                soundSpeed: soundSpeed.toFixed(1),
                bottomT: predictionResult.variables.bottomT?.value,
                zos: predictionResult.variables.zos?.value,
                mlotst: predictionResult.variables.mlotst?.value,
                coastalProximity: (predictionResult.summary.coastalProximityKm / 100).toFixed(2),
                cycloneProbStr: cycloneData.probabilityStr,
                predictedSurgeStr: cycloneData.surgeHeightM ? `${cycloneData.surgeHeightM.toFixed(2)} meters` : '0.08 meters',
                fishingZoneStatus: safeZoneData.category,
                ecosystemScore: ecosystemData.overallScore,
                ecosystemStatus: ecosystemData.overallStatus,
                coralBleaching: `${ecosystemData.coralBleachingRisk}/100`,
                algalBloomRisk: `${ecosystemData.algalBloomRisk}/100`,
                fishStress: `${ecosystemData.fishStressIndex}/100`,
                hypoxiaRisk: `${ecosystemData.hypoxiaRisk}/100`,
              }
            })}
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white text-xs font-mono font-medium transition-all cursor-pointer"
            title="Export Official INCOIS Maritime Tactical Dossier (PDF)"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="hidden sm:inline">Export PDF</span>
          </button>

          <button
            onClick={handleOpenDepthSlice}
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white text-xs font-mono font-medium transition-all cursor-pointer"
            title="Open 3D Depth Slice"
          >
            <Maximize2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="hidden md:inline">3D Slice</span>
          </button>

          <button
            onClick={handleOpenOperations}
            className="flex items-center gap-1.5 p-2 sm:px-3.5 sm:py-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-950 font-semibold text-xs font-mono transition-all cursor-pointer shadow-sm"
            title="Return to Operations Console"
          >
            <Compass className="w-3.5 h-3.5 text-slate-950 shrink-0" />
            <span className="hidden md:inline">Operations</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* EXECUTIVE HAZARD STATUS BANNER */}
        <div className="p-5 sm:p-6 rounded-xl bg-[#0c0f18] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                TACTICAL SECTOR DOSSIER
              </span>
              <span className={cn(
                "text-[10px] font-mono px-2 py-0.5 rounded font-medium uppercase border flex items-center gap-1.5",
                safeZoneData.status === 'SAFE ZONE'
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : safeZoneData.status === 'CAUTION ZONE'
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              )}>
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  safeZoneData.status === 'SAFE ZONE' ? "bg-emerald-400" : safeZoneData.status === 'CAUTION ZONE' ? "bg-amber-400" : "bg-rose-400"
                )} />
                {safeZoneData.status}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white font-mono">
              {predictionResult.location.regionName} Maritime State
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-mono">
              Coordinates: <strong className="text-slate-200 font-semibold">{params.lat >= 0 ? `${params.lat.toFixed(2)}°N` : `${Math.abs(params.lat).toFixed(2)}°S`}, {params.lon >= 0 ? `${params.lon.toFixed(2)}°E` : `${Math.abs(params.lon).toFixed(2)}°W`}</strong> | Horizon: <strong className="text-slate-200 font-semibold">{params.depth}m</strong> Subsurface Depth | INCOIS &amp; CMEMS Proxies
            </p>
          </div>

          {/* 4 Executive Vital Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 shrink-0 w-full lg:w-auto">
            <div className="p-3 rounded-lg bg-[#111624] border border-white/[0.06] text-center min-w-0 sm:min-w-[115px]">
              <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Cyclone Threat</div>
              <div className={cn(
                "text-sm sm:text-base font-bold font-mono mt-0.5",
                cycloneData.threatLevel === 'LOW' ? 'text-slate-200' : cycloneData.threatLevel === 'MODERATE' ? 'text-amber-400' : 'text-rose-400'
              )}>
                {cycloneData.threatLevel}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                {cycloneData.tchp} kJ/cm²
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#111624] border border-white/[0.06] text-center min-w-0 sm:min-w-[115px]">
              <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Sea State</div>
              <div className="text-sm sm:text-base font-bold text-white font-mono mt-0.5">
                ~{cycloneData.waveHeight}m
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                {cycloneData.seaStateLabel.split(' ')[0]}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#111624] border border-white/[0.06] text-center min-w-0 sm:min-w-[115px]">
              <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">PFZ Fishing</div>
              <div className="text-sm sm:text-base font-bold text-white font-mono mt-0.5">
                {fishingData.rating}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                {params.depth}m Margin
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#111624] border border-white/[0.06] text-center min-w-0 sm:min-w-[115px]">
              <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Surface Drift</div>
              <div className="text-sm sm:text-base font-bold text-white font-mono mt-0.5">
                {predictionResult.summary.currentSpeedKnots} kts
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                {predictionResult.summary.currentDirectionCompass} ({predictionResult.summary.currentDirectionDeg}°)
              </div>
            </div>
          </div>
        </div>

        {/* DOMAIN NAVIGATION TABS */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-[#0c0f18] rounded-xl border border-white/[0.08] font-mono text-xs no-scrollbar">
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
                "px-3.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all cursor-pointer",
                activeTab === tab.id
                  ? "bg-white text-slate-900 font-bold shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04] font-medium"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* DETAILED HAZARD MODULES GRID */}
        <div className="space-y-4 sm:space-y-5">
          {/* MODULE 1: CYCLONE TRACKER & TROPICAL CYCLOGENESIS */}
          {(activeTab === 'all' || activeTab === 'cyclone') && (
            <div className="p-5 sm:p-6 rounded-xl bg-[#0c0f18] border border-white/[0.08] space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-slate-300">
                    <AlertTriangle className={cn(
                      "w-4 h-4",
                      cycloneData.threatLevel === 'LOW' ? 'text-slate-400' : cycloneData.threatLevel === 'MODERATE' ? 'text-amber-400' : 'text-rose-400'
                    )} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                      01 // CYCLONIC THREAT
                    </span>
                    <h3 className="text-base font-bold text-white font-mono uppercase tracking-wide">
                      Cyclone &amp; Tropical Cyclogenesis Hazard Tracker
                    </h3>
                    <p className="text-xs text-slate-400">
                      SST thermodynamic threshold (26.5°C) &amp; Tropical Cyclone Heat Potential (TCHP)
                    </p>
                  </div>
                </div>
                <span className={cn(
                  "px-2.5 py-1 rounded-md font-mono font-semibold text-xs border",
                  cycloneData.threatLevel === 'LOW'
                    ? "border-white/[0.08] bg-white/[0.03] text-slate-300"
                    : cycloneData.threatLevel === 'MODERATE'
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                )}>
                  {cycloneData.badgeText}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-lg bg-[#111624] border border-white/[0.05] space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Sea Surface Temperature</span>
                  <div className="text-lg font-bold font-mono text-white flex items-baseline gap-2">
                    <span>{cycloneData.sst}°C</span>
                    <span className="text-[10px] text-slate-400">Threshold: 26.5°C</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {parseFloat(cycloneData.sst) >= 28.5
                      ? 'Elevated heat content fueling atmospheric convection.'
                      : 'Thermal reservoir stable beneath cyclonic intensification threshold.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#111624] border border-white/[0.05] space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Tropical Cyclone Heat Potential</span>
                  <div className="text-lg font-bold font-mono text-white">
                    {cycloneData.tchp} <span className="text-xs font-normal text-slate-400">kJ/cm²</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {cycloneData.tchp > 60 ? 'Elevated energy reserve for deep atmospheric depression.' : 'Moderate to low cyclonic thermal reservoir across sector.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#111624] border border-white/[0.05] space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Evacuation &amp; Watch Horizon</span>
                  <div className="text-lg font-bold font-mono text-white">
                    {cycloneData.evacuationWindow}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Wind Shear: {cycloneData.windShearStatus}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#0e1320] border-l-2 border-sky-400/70 border-r border-t border-b border-white/[0.05] text-xs font-mono text-slate-300">
                <strong className="text-white">Advisory: </strong>{cycloneData.advisoryNote}
              </div>
            </div>
          )}

          {/* MODULE 2: MARINE ECOSYSTEM & CORAL BLEACHING */}
          {(activeTab === 'all' || activeTab === 'ecosystem') && (
            <div className="p-5 sm:p-6 rounded-xl bg-[#0c0f18] border border-white/[0.08] space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-slate-300">
                    <Leaf className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                      02 // ECOLOGICAL INTEGRITY
                    </span>
                    <h3 className="text-base font-bold text-white font-mono uppercase tracking-wide">
                      Marine Ecosystem Health &amp; Coral Bleaching Vulnerability
                    </h3>
                    <p className="text-xs text-slate-400">
                      Degree Heating Weeks (DHW), primary productivity, and hypoxia monitoring
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md font-mono font-semibold text-xs border border-white/[0.08] bg-white/[0.03] text-slate-300">
                  {ecosystemData.status} ({ecosystemData.score}/100)
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono text-slate-400">
                  <span>Composite Ecological Integrity Score</span>
                  <span className="text-slate-200 font-semibold">{ecosystemData.score} / 100</span>
                </div>
                <div className="w-full bg-[#111624] h-1.5 rounded-full overflow-hidden border border-white/[0.04]">
                  <div className="h-full bg-emerald-400/80 transition-all duration-500 rounded-full" style={{ width: `${ecosystemData.score}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-lg bg-[#111624] border border-white/[0.05] space-y-1">
                  <span className="text-slate-400 uppercase text-[10px] block tracking-wider">Coral Thermal Stress</span>
                  <span className="text-white font-bold text-sm block">{ecosystemData.dhw}</span>
                  <span className="text-slate-400 block text-[10px]">Bleaching Alert Level</span>
                </div>
                <div className="p-3.5 rounded-lg bg-[#111624] border border-white/[0.05] space-y-1">
                  <span className="text-slate-400 uppercase text-[10px] block tracking-wider">Primary Productivity</span>
                  <span className="text-white font-bold text-sm block">{ecosystemData.primaryProd}</span>
                  <span className="text-slate-400 block text-[10px]">Chlorophyll: {ecosystemData.chlorophyllProxy}</span>
                </div>
                <div className="p-3.5 rounded-lg bg-[#111624] border border-white/[0.05] space-y-1">
                  <span className="text-slate-400 uppercase text-[10px] block tracking-wider">Oxygen Saturation</span>
                  <span className="text-white font-bold text-sm block">{ecosystemData.hypoxiaStatus}</span>
                  <span className="text-slate-400 block text-[10px]">At {params.depth}m Horizon</span>
                </div>
                <div className="p-3.5 rounded-lg bg-[#111624] border border-white/[0.05] space-y-1">
                  <span className="text-slate-400 uppercase text-[10px] block tracking-wider">Estimated Ocean pH</span>
                  <span className="text-white font-bold text-sm block">{ecosystemData.phProxy}</span>
                  <span className="text-slate-400 block text-[10px]">Acidification Proxy</span>
                </div>
              </div>
            </div>
          )}

          {/* MODULE 3: COMMERCIAL FISHING & PFZ */}
          {(activeTab === 'all' || activeTab === 'fishing') && (
            <div className="p-5 sm:p-6 rounded-xl bg-[#0c0f18] border border-white/[0.08] space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-slate-300">
                    <Fish className="w-4 h-4 text-sky-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                      03 // FISHERY ADVISORY
                    </span>
                    <h3 className="text-base font-bold text-white font-mono uppercase tracking-wide">
                      Commercial Fishery &amp; Potential Fishing Zone (PFZ)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Nutrient upwelling boundaries, pelagic schooling, and thermal convergence
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md font-mono font-semibold text-xs border border-white/[0.08] bg-white/[0.03] text-slate-300">
                  PFZ: {fishingData.rating}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-lg bg-[#111624] border border-white/[0.05] space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Target Commercial Species</span>
                  <div className="text-sm font-bold text-white">{fishingData.species}</div>
                  <span className="text-slate-400 text-[11px] block">{fishingData.feedingAggregation}</span>
                </div>

                <div className="p-3.5 rounded-lg bg-[#111624] border border-white/[0.05] space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Optimal Casting Horizon</span>
                  <div className="text-sm font-bold text-white">{fishingData.optimalDepthHorizon}</div>
                  <span className="text-slate-400 text-[11px] block">Front: {fishingData.frontType}</span>
                </div>

                <div className="p-3.5 rounded-lg bg-[#111624] border border-white/[0.05] space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Deployment Strategy</span>
                  <div className="text-xs font-semibold text-slate-200">{fishingData.driftStrategy}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#0e1320] border-l-2 border-sky-400/70 border-r border-t border-b border-white/[0.05] text-xs font-mono text-slate-300">
                <strong className="text-white">Fishery Guidance: </strong>{fishingData.advisoryText}
              </div>
            </div>
          )}

          {/* MODULE 4: VESSEL NAVIGATION & DRIFT HAZARDS */}
          {(activeTab === 'all' || activeTab === 'navigation') && (
            <div className="p-5 sm:p-6 rounded-xl bg-[#0c0f18] border border-white/[0.08] space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-slate-300" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                      04 // NAVIGATION &amp; SEA STATE
                    </span>
                    <h3 className="text-base font-bold text-white font-mono uppercase tracking-wide">
                      Vessel Navigation, Sea State &amp; Drift Hazard Assessment
                    </h3>
                    <p className="text-xs text-slate-400">
                      Cross-track leeway rates, drift vectors, and vessel speed recommendations
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md font-mono font-semibold text-xs border border-white/[0.08] bg-white/[0.03] text-slate-300">
                  {safeZoneData.status} ({safeZoneData.safetyScore}/100)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-lg bg-[#111624] border border-white/[0.05] space-y-1">
                  <span className="text-slate-400 uppercase text-[10px] block tracking-wider">Leeway Drift Rate</span>
                  <span className="text-white font-bold text-base block">{safeZoneData.leewayRate}</span>
                  <span className="text-slate-400 block text-[10px]">Cross-Track Leeway</span>
                </div>

                <div className="p-3.5 rounded-lg bg-[#111624] border border-white/[0.05] space-y-1">
                  <span className="text-slate-400 uppercase text-[10px] block tracking-wider">Surface Drift Vector</span>
                  <span className="text-white font-bold text-sm block">{safeZoneData.driftVector}</span>
                  <span className="text-slate-400 block text-[10px]">Current Heading</span>
                </div>

                <div className="p-3.5 rounded-lg bg-[#111624] border border-white/[0.05] space-y-1">
                  <span className="text-slate-400 uppercase text-[10px] block tracking-wider">Recommended Speed</span>
                  <span className="text-white font-bold text-sm block">{safeZoneData.maxRecommendedSpeed}</span>
                  <span className="text-slate-400 block text-[10px]">Hydrodynamic Drag</span>
                </div>

                <div className="p-3.5 rounded-lg bg-[#111624] border border-white/[0.05] space-y-1">
                  <span className="text-slate-400 uppercase text-[10px] block tracking-wider">Craft Advisory</span>
                  <span className="text-white font-bold text-sm block">{safeZoneData.smallCraftAdvisory}</span>
                  <span className="text-slate-400 block text-[10px]">Coastal &amp; Artisanal Fleet</span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#0e1320] border-l-2 border-sky-400/70 border-r border-t border-b border-white/[0.05] text-xs font-mono text-slate-300">
                <strong className="text-white">Bridge Watch Advisory: </strong>{safeZoneData.vesselAdvisory}
              </div>
            </div>
          )}

          {/* MODULE 5: OCEAN ACOUSTICS & SUBSURFACE PHYSICS */}
          {(activeTab === 'all' || activeTab === 'acoustics') && (
            <div className="p-5 sm:p-6 rounded-xl bg-[#0c0f18] border border-white/[0.08] space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-slate-300">
                    <Gauge className="w-4 h-4 text-slate-300" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                      05 // SUBSURFACE PHYSICS &amp; ACOUSTICS
                    </span>
                    <h3 className="text-base font-bold text-white font-mono uppercase tracking-wide">
                      Ocean Acoustics &amp; Water Column Physics
                    </h3>
                    <p className="text-xs text-slate-400">
                      Mackenzie sound speed formula, seawater in-situ density, and SOFAR ducting
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md font-mono font-semibold text-xs border border-white/[0.08] bg-white/[0.03] text-slate-300">
                  {soundSpeed} m/s
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-lg bg-[#111624] border border-white/[0.05] space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Acoustic Sound Velocity</span>
                  <div className="text-xl font-bold text-white font-mono">{soundSpeed} m/s</div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Calculated via Mackenzie formulation based on {predictionResult.variables.thetao.formattedValue} &amp; {params.depth}m pressure.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#111624] border border-white/[0.05] space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Seawater In-Situ Density</span>
                  <div className="text-xl font-bold text-white font-mono">{seawaterDensity} kg/m³</div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    UNESCO equation of state proxy for vessel displacement, ballast, and submarine trim.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#111624] border border-white/[0.05] space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">SOFAR Sound Channel</span>
                  <div className="text-sm font-bold text-white font-mono">
                    {params.depth >= 600 && params.depth <= 1200 ? 'SOFAR Axis Active' : 'Surface Ducting Channel'}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Subsurface sonar and acoustic propagation optimal without surface reflection loss.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* MODULE 6: STANDARDIZED COPERNICUS MODEL PARAMETER MATRIX */}
          {(activeTab === 'all' || activeTab === 'copernicus') && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono text-slate-400 px-1 border-b border-white/[0.08] pb-2.5 gap-1">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>COPERNICUS MARINE OCEANOGRAPHIC MATRIX</span>
                  <span className="text-[10px] font-normal text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                    {Object.keys(predictionResult.variables).length} VARIABLES
                  </span>
                </span>
                <span className="text-slate-400 text-[11px]">Direct Navigational &amp; Scientific Takeaways</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {Object.values(predictionResult.variables).map((v) => {
                  const guidance = getVariableGuidance(v);
                  const IconComponent = guidance.icon;

                  return (
                    <div
                      key={v.variable}
                      className="p-4 sm:p-5 rounded-xl bg-[#0c0f18] border border-white/[0.08] hover:border-white/[0.16] transition-all space-y-3.5 shadow-sm"
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-slate-300">
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                              {v.variable} · {v.category}
                            </div>
                            <h4 className="text-sm font-bold text-white tracking-tight">
                              {v.commonName}
                            </h4>
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <div className="text-lg font-bold text-white">
                            {v.formattedValue}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {v.units || 'dimensionless'}
                          </div>
                        </div>
                      </div>

                      {/* Structured Operational Briefing Well */}
                      <div className="bg-[#111624] border border-white/[0.05] rounded-lg p-3 space-y-2 text-xs">
                        <div className="flex items-start gap-2">
                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06] shrink-0 mt-0.5">
                            ANALYSIS
                          </span>
                          <p className="text-slate-300 text-xs leading-relaxed font-sans">
                            {guidance.takeaway}
                          </p>
                        </div>

                        <div className="h-[1px] bg-white/[0.04]" />

                        <div className="flex items-start gap-2">
                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06] shrink-0 mt-0.5">
                            PROTOCOL
                          </span>
                          <p className="text-slate-300 text-xs leading-relaxed font-sans">
                            {guidance.action}
                          </p>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="pt-2 flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-white/[0.05]">
                        <span className="text-slate-400">{guidance.baseline}</span>
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
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
        <div className="py-8 flex flex-wrap justify-center items-center gap-3 border-t border-white/[0.08]">
          <button
            onClick={handleBackToHome}
            className="px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white font-mono text-xs flex items-center gap-2 border border-white/[0.08] transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>

          <button
            onClick={handleOpenDepthSlice}
            className="px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white font-mono text-xs flex items-center gap-2 border border-white/[0.08] transition-all cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
            <span>Inspect 3D Depth Slice ({params.depth}m)</span>
          </button>

          <button
            onClick={handleOpenOperations}
            className="px-5 py-2 rounded-lg bg-white hover:bg-slate-200 text-slate-950 font-semibold text-xs font-mono flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-[0.99]"
          >
            <Compass className="w-4 h-4 text-slate-950" />
            <span>Open Operations Console</span>
            <ExternalLink className="w-3.5 h-3.5 ml-0.5 text-slate-950" />
          </button>
        </div>
      </main>

      {/* ── MODEL VS. OBSERVED ANOMALY MODAL ── */}
      {showModelVsObsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto custom-scrollbar">
            <ModelVsObsComparator
              onClose={() => setShowModelVsObsModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
