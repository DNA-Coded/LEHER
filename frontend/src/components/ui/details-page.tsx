import { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Compass, 
  ExternalLink, 
  Waves, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Gauge, 
  Activity,
  Droplets,
  Wind,
  Layers,
  Thermometer,
  Snowflake,
  Anchor,
  Clock
} from 'lucide-react';
import { 
  predictOceanState, 
  type OceanPredictionResult, 
  type OceanPredictionVariable 
} from '@/lib/api/oceanPredictionService';
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

// Streamlined, high-value operational points for maritime users
interface VariableGuidance {
  takeaway: string;
  action: string;
  baseline: string;
  icon: typeof Waves;
}

const getVariableGuidance = (v: OceanPredictionVariable, res: OceanPredictionResult): VariableGuidance => {
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
    case 'siconc':
      return {
        icon: Snowflake,
        takeaway: v.value === 0 
          ? "0.0% Ice Cover — 100% open navigable water."
          : `${v.formattedValue} surface ice concentration detected.`,
        action: v.value === 0 
          ? "Zero ice hazard. Standard commercial and naval navigation protocols apply."
          : "Polar Code compliance and ice-strengthened hull required in sector.",
        baseline: v.value === 0 ? "Status: Ice-Free Open Water" : "Status: Ice Advisory Active",
      };
    case 'sithick':
      return {
        icon: Snowflake,
        takeaway: v.value === 0 
          ? "0.0m Ice Thickness — completely clear navigational fairway."
          : `${v.formattedValue} ice floe thickness.`,
        action: v.value === 0 
          ? "Unrestricted transit; no icebreaker escort or hull reinforcement necessary."
          : "Exercise caution near floe margins; monitor radar for growlers.",
        baseline: v.value === 0 ? "Navigable Fairway: Clear" : "Restricted Fairway",
      };
    case 'chl':
      return {
        icon: Gauge,
        takeaway: `Chlorophyll-a concentration is ${v.formattedValue} (phytoplankton productivity index).`,
        action: "High optical water clarity and underwater visibility. Low risk of rapid hull intake biofouling.",
        baseline: "Biomass Level: Normal Open Ocean (0.1 – 0.8 mg/m³)",
      };
    default:
      return {
        icon: Waves,
        takeaway: `Measured value: ${v.formattedValue}.`,
        action: "Within standard operational margins for maritime transit.",
        baseline: "Status: Normal",
      };
  }
};

export default function DetailsPage() {
  // Read coordinates and depth from URL query parameters (or fallback to defaults)
  const [params] = useState(() => {
    const search = new URLSearchParams(window.location.search);
    const lat = parseFloat(search.get('lat') || '15.4');
    const lon = parseFloat(search.get('lon') || '71.2');
    const depth = parseInt(search.get('depth') || '0', 10);
    return {
      lat: isNaN(lat) ? 15.4 : lat,
      lon: isNaN(lon) ? 71.2 : lon,
      depth: isNaN(depth) ? 0 : depth,
    };
  });

  const [selectedTimeZone, setSelectedTimeZone] = useState<TimeZone>('IST');
  const [realTimeClock, setRealTimeClock] = useState<string>('');

  // Compute prediction results
  const predictionResult: OceanPredictionResult = useMemo(() => {
    return predictOceanState(params.lat, params.lon, params.depth);
  }, [params.lat, params.lon, params.depth]);

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
    const url = `/operations?lat=${params.lat}&lon=${params.lon}&depth=${params.depth}`;
    window.location.href = url;
  };

  return (
    <div className="min-h-screen bg-[#06070a] text-white flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 h-16 bg-[#0a0d14]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
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
              <div className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <span>Oceanographic Parameter Dossier</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Primary Navigation */}
        <div className="hidden lg:flex items-center gap-1 text-xs font-medium">
          <a
            href="/"
            className="px-3 py-1.5 rounded-xl text-[#888899] hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            Home
          </a>
          <a
            href="/about"
            className="px-3 py-1.5 rounded-xl text-[#888899] hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            About
          </a>
          <a
            href="/operations"
            className="px-3 py-1.5 rounded-xl text-[#888899] hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            Explore / Platform
          </a>
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
            onClick={handleOpenOperations}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-300 text-xs font-semibold transition-all cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.15)]"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Open Directions &amp; Operations</span>
            <ExternalLink className="w-3 h-3 opacity-70 ml-0.5" />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* EXECUTIVE VITAL SIGNS BANNER */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#0b0e14]/70 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1 max-w-2xl">
            <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider font-semibold">
              <span>Target Maritime Sector Profile</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {predictionResult.location.regionName} Maritime State
            </h1>
            <p className="text-xs sm:text-sm text-[#888899] font-mono">
              Coordinates: <strong className="text-white">{params.lat >= 0 ? `${params.lat.toFixed(2)}°N` : `${Math.abs(params.lat).toFixed(2)}°S`}, {params.lon >= 0 ? `${params.lon.toFixed(2)}°E` : `${Math.abs(params.lon).toFixed(2)}°W`}</strong> | Level: <strong className="text-white">{params.depth}m</strong> Depth | Standardized CMEMS Ocean Model
            </p>
          </div>

          {/* Key Metric Pills */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-center min-w-[100px] sm:min-w-[125px]">
              <div className="text-[10px] text-[#888899] font-mono uppercase">Current Speed</div>
              <div className="text-base sm:text-lg font-bold text-white mt-0.5 font-mono">
                {predictionResult.summary.currentSpeedMs} <span className="text-xs font-normal text-[#888899]">m/s</span>
              </div>
              <div className="text-[11px] text-cyan-400 font-mono font-semibold">
                {predictionResult.summary.currentSpeedKnots} kts
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-center min-w-[100px] sm:min-w-[125px]">
              <div className="text-[10px] text-[#888899] font-mono uppercase">Flow Direction</div>
              <div className="text-base sm:text-lg font-bold text-white mt-0.5 font-mono">
                {predictionResult.summary.currentDirectionCompass}
              </div>
              <div className="text-[11px] text-[#aaaaaa] font-mono font-semibold">
                {predictionResult.summary.currentDirectionDeg}° Bearing
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col items-center justify-center min-w-[120px] sm:min-w-[140px] space-y-1">
              <div className="text-[10px] text-[#888899] font-mono uppercase">Safety Status</div>
              <RiskBadge
                level={
                  predictionResult.summary.riskStatus === 'SAFE' 
                    ? 'SAFE' 
                    : predictionResult.summary.riskStatus === 'ADVISORY' 
                    ? 'CAUTION' 
                    : 'DANGER'
                }
                size="sm"
              />
              <div className="text-[10px] text-[#888899] font-mono">
                Operational Tier
              </div>
            </div>
          </div>
        </div>

        {/* STREAMLINED PARAMETER CARDS (Reduced text, direct operational points) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-[#888899] px-1">
            <span>KEY PARAMETER INTELLIGENCE ({Object.keys(predictionResult.variables).length} VARIABLES)</span>
            <span className="text-cyan-400">Actionable Maritime Takeaways Only</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {Object.values(predictionResult.variables).map((v) => {
              const guidance = getVariableGuidance(v, predictionResult);
              const IconComponent = guidance.icon;

              return (
                <div 
                  key={v.variable}
                  className="rounded-2xl bg-[#0a0d14]/50 backdrop-blur-xl border border-white/10 p-4 sm:p-5 space-y-3.5 hover:border-cyan-400/40 transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.4)] group"
                >
                  {/* Card Header: Variable name, category tag, and measured value */}
                  <div className="flex justify-between items-start border-b border-white/10 pb-3 gap-2">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-white/[0.05] border border-white/10 text-cyan-400 group-hover:text-cyan-300 transition-colors">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm sm:text-base font-bold text-white tracking-tight">
                            {v.commonName}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#777788] font-mono mt-0.5">
                          CMEMS Code: <strong className="text-[#cccccc]">{v.variable}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Measured Value */}
                    <div className="text-right shrink-0 bg-white/[0.04] border border-white/10 px-3 py-1.5 rounded-xl">
                      <div className="text-[9px] text-[#888899] uppercase font-mono">MEASURED VALUE</div>
                      <div className="text-sm sm:text-base font-extrabold text-white font-mono tracking-tight">
                        {v.formattedValue}
                      </div>
                    </div>
                  </div>

                  {/* Concise Operational Takeaway (No walls of text!) */}
                  <div className="space-y-2 text-xs">
                    {/* Operational Meaning */}
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

                    {/* Navigational Action */}
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

                  {/* Baseline / Threshold Footer */}
                  <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-[#888899] border-t border-white/5">
                    <span>{guidance.baseline}</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Verified Valid
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
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
            onClick={handleOpenOperations}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.3)]"
          >
            <Compass className="w-4 h-4" />
            <span>Open 3D Operations &amp; Directions Console</span>
            <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>
      </main>
    </div>
  );
}
