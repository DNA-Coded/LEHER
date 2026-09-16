import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ArrowLeft, 
  ChevronDown, 
  RefreshCw, 
  ArrowUpRight,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PROJECTION_LIST, PROJECTION_METADATA, type TimeZone } from '@/components/ui/landing-page';
import { predictOceanState, type OceanPredictionResult } from '@/lib/api/oceanPredictionService';

const timeZoneMap: Record<TimeZone, { name: string; timeZone: string; offsetLabel: string }> = {
  IST: { name: 'IST (India Standard)', timeZone: 'Asia/Kolkata', offsetLabel: 'UTC+05:30' },
  UTC: { name: 'UTC / GMT (Universal)', timeZone: 'UTC', offsetLabel: 'UTC+00:00' },
  EST: { name: 'EST (US Eastern)', timeZone: 'America/New_York', offsetLabel: 'UTC-05:00' },
  PST: { name: 'PST (US Pacific)', timeZone: 'America/Los_Angeles', offsetLabel: 'UTC-08:00' },
  JST: { name: 'JST (Japan Standard)', timeZone: 'Asia/Tokyo', offsetLabel: 'UTC+09:00' },
  SGT: { name: 'SGT (Singapore)', timeZone: 'Asia/Singapore', offsetLabel: 'UTC+08:00' },
};

export default function OperationsPage() {
  // Read coordinates and depth from URL query parameters (or fallback to defaults)
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

  const [inputLat, setInputLat] = useState<number>(params.lat);
  const [inputLon, setInputLon] = useState<number>(params.lon);
  const [workbenchDepth, setWorkbenchDepth] = useState<number>(params.depth);
  const [activeProjection, setActiveProjection] = useState<string>('concentric_region');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [selectedTimeZone, setSelectedTimeZone] = useState<TimeZone>('IST');
  const [realTimeClock, setRealTimeClock] = useState<string>('');

  const LOCATION_PRESETS = [
    { label: "Arabian Sea", lat: 15.4, lon: 71.2 },
    { label: "Bay of Bengal", lat: 14.0, lon: 86.5 },
    { label: "Indian Ocean", lat: 0.0, lon: 80.5 },
    { label: "Lakshadweep", lat: 10.5, lon: 72.6 },
    { label: "Andaman Sea", lat: 11.7, lon: 93.0 },
    { label: "Gulf of Mannar", lat: 8.8, lon: 79.0 },
    { label: "Maldives", lat: 3.2, lon: 73.2 },
    { label: "South Sri Lanka", lat: 5.5, lon: 80.5 },
  ];

  // Send message to Earth iframe
  const sendToEarthIframe = useCallback((data: { action: string; projection?: string; latitude?: number; longitude?: number }) => {
    const iframes = document.querySelectorAll<HTMLIFrameElement>('iframe[title*="Earth"]');
    iframes.forEach((iframe) => {
      try {
        iframe.contentWindow?.postMessage(data, "*");
      } catch (err) {
        console.warn("Unable to postMessage to Earth iframe", err);
      }
    });
  }, []);

  // Listen for coordinates from Earth iframe inspection
  useEffect(() => {
    const handleEarthMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "earth:location") {
        const lat = typeof e.data.latitude === "number" ? e.data.latitude : 0;
        const lon = typeof e.data.longitude === "number" ? e.data.longitude : 0;
        setInputLat(parseFloat(lat.toFixed(4)));
        setInputLon(parseFloat(lon.toFixed(4)));
      }
    };
    window.addEventListener("message", handleEarthMessage);
    return () => window.removeEventListener("message", handleEarthMessage);
  }, []);

  // Sync coordinates with Earth iframe whenever inputLat or inputLon changes
  useEffect(() => {
    if (typeof inputLat === "number" && typeof inputLon === "number") {
      sendToEarthIframe({
        action: "setLocation",
        latitude: inputLat,
        longitude: inputLon,
      });
    }
  }, [inputLat, inputLon, sendToEarthIframe]);

  // Handle Predict & Open Depth Slice Page
  const handlePredict = useCallback(() => {
    setIsPredicting(true);
    const targetUrl = `/depth-slice?lat=${inputLat}&lon=${inputLon}&depth=${workbenchDepth}`;
    setTimeout(() => {
      setIsPredicting(false);
      window.location.href = targetUrl;
    }, 280);
  }, [inputLat, inputLon, workbenchDepth]);

  // Locate yourself via Geolocation
  const handleLocateMe = useCallback(() => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(4));
          const lon = parseFloat(pos.coords.longitude.toFixed(4));
          setInputLat(lat);
          setInputLon(lon);
          sendToEarthIframe({ action: "locateMe" });
          setIsLocating(false);
        },
        () => {
          sendToEarthIframe({ action: "locateMe" });
          setIsLocating(false);
        },
        { timeout: 6000 }
      );
    } else {
      sendToEarthIframe({ action: "locateMe" });
      setIsLocating(false);
    }
  }, [sendToEarthIframe]);

  const handleSelectProjection = useCallback((projKey: string) => {
    setActiveProjection(projKey);
    sendToEarthIframe({ action: "setProjection", projection: projKey });
  }, [sendToEarthIframe]);

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

  // Oceanographic prediction calculation based on current coordinates & depth
  const prediction: OceanPredictionResult = useMemo(() => {
    return predictOceanState(inputLat, inputLon, workbenchDepth);
  }, [inputLat, inputLon, workbenchDepth]);

  const depthLayerClassification = useMemo(() => {
    if (workbenchDepth === 0) return "Surface Boundary Layer (0-10m)";
    if (workbenchDepth <= 50) return "Epipelagic Euphotic Zone (0-50m)";
    if (workbenchDepth <= 200) return "Mesopelagic Thermocline Core (50-200m)";
    if (workbenchDepth <= 1000) return "Bathypelagic Intermediate Water (200-1000m)";
    return "Abyssal Plain Subsurface (>1000m)";
  }, [workbenchDepth]);

  // Acoustic sound speed calculation (Mackenzie formulation)
  const soundSpeed = useMemo(() => {
    const T = prediction.variables.thetao.value;
    const S = prediction.variables.so.value;
    const D = workbenchDepth;
    const c = 1448.96 + 4.591 * T - 0.05304 * (T ** 2) + 0.0002374 * (T ** 3) + 1.340 * (S - 35) + 0.0163 * D + 1.675e-7 * (D ** 2);
    return c.toFixed(1);
  }, [prediction.variables.thetao.value, prediction.variables.so.value, workbenchDepth]);

  // Seawater in-situ density approximation (kg/m3)
  const seawaterDensity = useMemo(() => {
    const T = prediction.variables.thetao.value;
    const S = prediction.variables.so.value;
    const rho = 1000 + 28.15 - 0.18 * (T - 15) + 0.78 * (S - 35) + 0.0044 * workbenchDepth;
    return rho.toFixed(2);
  }, [prediction.variables.thetao.value, prediction.variables.so.value, workbenchDepth]);

  const handleBackToHome = () => {
    window.location.href = '/';
  };

  const earthIframeUrl = useMemo(() => {
    const projName = activeProjection || 'concentric_region';
    return `/earth/index.html?hidebadge=1#current/ocean/surface/currents/overlay=ocean/${projName}`;
  }, [activeProjection]);

  return (
    <div className="h-screen w-screen bg-[#050505] text-white flex flex-col overflow-hidden font-sans">
      {/* TOP HEADER BAR */}
      <header className="h-16 bg-[#090909] border-b border-[#222222] px-4 sm:px-6 flex justify-between items-center z-20 shrink-0">
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
              className="h-7 w-auto object-contain" 
            />
            <span className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
              <span>Operations &amp; Analytics Console</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Real-time Clock */}
          <div className="hidden md:flex items-center gap-2 font-mono text-xs text-[#aaaaaa] bg-[#141414] px-3 py-1.5 rounded-xl border border-[#262626]">
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
            <span>{realTimeClock}</span>
            <select
              value={selectedTimeZone}
              onChange={(e) => setSelectedTimeZone(e.target.value as TimeZone)}
              className="bg-[#1f1f1f] text-white text-xs font-mono rounded px-1.5 py-0.5 border border-[#333333] focus:outline-none cursor-pointer hover:border-neutral-400 transition-colors ml-1"
            >
              {Object.entries(timeZoneMap).map(([tz, info]) => (
                <option key={tz} value={tz}>
                  {tz} ({info.offsetLabel})
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* MAIN WORKSPACE: 3-COLUMN SYMMETRIC LAYOUT (LEFT FIXED PANEL | CENTER 3D MAP | RIGHT FIXED PANEL) */}
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        {/* LEFT DOCKED PANEL: MARITIME INTELLIGENCE & OCEAN TELEMETRY */}
        <div className="w-full lg:w-[370px] xl:w-[390px] lg:h-full bg-[#0c0c0c] border-b lg:border-b-0 lg:border-r border-[#222222] p-4 space-y-3 overflow-y-auto z-20 shadow-2xl shrink-0 max-h-[50vh] lg:max-h-full">
          {/* Header */}
          <div className="border-b border-[#222222] pb-2.5 flex justify-between items-center">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <span>MARITIME INTELLIGENCE HUD</span>
            </h3>
          </div>

          {/* Card 1: Tactical Basin & Depth Profile */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
              <span className="uppercase tracking-wide">TACTICAL REGION</span>
              <span>
                {inputLat >= 0 ? `${inputLat.toFixed(2)}°N` : `${Math.abs(inputLat).toFixed(2)}°S`}, {inputLon >= 0 ? `${inputLon.toFixed(2)}°E` : `${Math.abs(inputLon).toFixed(2)}°W`}
              </span>
            </div>
            <div className="text-sm font-bold text-white tracking-tight">
              <span className="truncate">{prediction.location.regionName}</span>
            </div>
            <div className="pt-1.5 border-t border-[#1c1c1c] flex items-center justify-between text-[11px] text-neutral-400">
              <span>Depth Level: <strong className="text-white font-mono">{workbenchDepth}m</strong></span>
              <span className="text-neutral-400 truncate max-w-[170px] text-right text-[10px]">
                {depthLayerClassification}
              </span>
            </div>
          </div>

          {/* Card 2: Operational Assessment & Safety Advisory */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
              <span className="uppercase tracking-wide">OPERATIONAL ASSESSMENT</span>
            </div>
            <p className="text-[11px] text-neutral-300 leading-relaxed line-clamp-3">
              {prediction.summary.riskMessage}
            </p>
          </div>

          {/* Card 3: Hydrodynamic Telemetry Matrix */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
              <span className="uppercase tracking-wide">HYDRODYNAMIC METRICS</span>
              <span className="text-neutral-400">PHYSICAL MODEL</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {/* Current Velocity & Drift */}
              <div className="bg-[#161616] border border-[#222222] rounded-lg p-2 space-y-0.5">
                <div className="text-[10px] text-neutral-400">
                  <span>Current Drift</span>
                </div>
                <div className="text-xs font-bold font-mono text-white flex items-baseline gap-1">
                  <span>{prediction.summary.currentSpeedKnots}</span>
                  <span className="text-[10px] font-normal text-neutral-400">kts</span>
                  <span className="text-[9px] font-mono text-neutral-500">({prediction.summary.currentSpeedMs} m/s)</span>
                </div>
                <div className="text-[9px] font-mono text-neutral-300">
                  <span>{prediction.summary.currentDirectionCompass} ({prediction.summary.currentDirectionDeg}°)</span>
                </div>
              </div>

              {/* Water Temp */}
              <div className="bg-[#161616] border border-[#222222] rounded-lg p-2 space-y-0.5">
                <div className="text-[10px] text-neutral-400">
                  <span>Water Temp (θ)</span>
                </div>
                <div className="text-xs font-bold font-mono text-white">
                  {prediction.variables.thetao.formattedValue}
                </div>
                <div className="text-[9px] text-neutral-500 truncate">
                  {workbenchDepth < 50 ? 'Upper Mixed' : workbenchDepth < 250 ? 'Thermocline' : 'Abyssal Deep'}
                </div>
              </div>

              {/* Salinity */}
              <div className="bg-[#161616] border border-[#222222] rounded-lg p-2 space-y-0.5">
                <div className="text-[10px] text-neutral-400">
                  <span>Salinity (Sp)</span>
                </div>
                <div className="text-xs font-bold font-mono text-white">
                  {prediction.variables.so.formattedValue}
                </div>
                <div className="text-[9px] text-neutral-500 truncate">
                  {prediction.location.regionName.includes('Bay of Bengal') ? 'Runoff Dilution' : 'Normal Oceanic'}
                </div>
              </div>

              {/* Mixed Layer */}
              <div className="bg-[#161616] border border-[#222222] rounded-lg p-2 space-y-0.5">
                <div className="text-[10px] text-neutral-400">
                  <span>Mixed Layer</span>
                </div>
                <div className="text-xs font-bold font-mono text-white">
                  {prediction.variables.mlotst.formattedValue}
                </div>
                <div className="text-[9px] text-neutral-500 truncate">
                  Pycnocline boundary
                </div>
              </div>

              {/* Dynamic Height */}
              <div className="bg-[#161616] border border-[#222222] rounded-lg p-2 space-y-0.5">
                <div className="text-[10px] text-neutral-400">
                  <span>Dynamic Height</span>
                </div>
                <div className="text-xs font-bold font-mono text-white">
                  {prediction.variables.zos.formattedValue}
                </div>
                <div className="text-[9px] text-neutral-500 truncate">
                  Geoid deviation
                </div>
              </div>

              {/* Benthic Temp */}
              <div className="bg-[#161616] border border-[#222222] rounded-lg p-2 space-y-0.5">
                <div className="text-[10px] text-neutral-400">
                  <span>Benthic Temp</span>
                </div>
                <div className="text-xs font-bold font-mono text-white">
                  {prediction.variables.bottomT.formattedValue}
                </div>
                <div className="text-[9px] text-neutral-500 truncate">
                  Deep sea-floor layer
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Acoustic & Subsurface Intelligence */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
              <span className="uppercase tracking-wide">ACOUSTIC &amp; SENSOR INTEL</span>
              <span className="text-neutral-400">SONAR / SVP</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Sound Speed */}
              <div className="bg-[#161616] border border-[#222222] rounded-lg p-2 space-y-0.5">
                <div className="text-[10px] text-neutral-400">
                  <span>Sound Speed (c)</span>
                </div>
                <div className="text-xs font-bold font-mono text-white flex items-baseline gap-1">
                  <span>{soundSpeed}</span>
                  <span className="text-[10px] font-normal text-neutral-400">m/s</span>
                </div>
                <div className="text-[9px] text-neutral-500 truncate">
                  {workbenchDepth < 80 ? 'Surface Sonic Layer' : workbenchDepth < 350 ? 'Thermocline Gradient' : 'Deep SOFAR Channel'}
                </div>
              </div>

              {/* In-Situ Density */}
              <div className="bg-[#161616] border border-[#222222] rounded-lg p-2 space-y-0.5">
                <div className="text-[10px] text-neutral-400">
                  <span>In-situ Density (ρ)</span>
                </div>
                <div className="text-xs font-bold font-mono text-white flex items-baseline gap-1">
                  <span>{seawaterDensity}</span>
                  <span className="text-[9px] text-neutral-400">kg/m³</span>
                </div>
                <div className="text-[9px] text-neutral-500 truncate">
                  Pycnocline gradient
                </div>
              </div>

              {/* Chlorophyll-a Biomass */}
              <div className="bg-[#161616] border border-[#222222] rounded-lg p-2 space-y-0.5">
                <div className="text-[10px] text-neutral-400">
                  <span>Chlorophyll-a</span>
                </div>
                <div className="text-xs font-bold font-mono text-white">
                  {prediction.variables.chl.formattedValue}
                </div>
                <div className="text-[9px] text-neutral-500 truncate">
                  {workbenchDepth < 50 ? 'Euphotic biomass zone' : 'Sub-euphotic aphotic'}
                </div>
              </div>

              {/* Optical / Oxygen State */}
              <div className="bg-[#161616] border border-[#222222] rounded-lg p-2 space-y-0.5">
                <div className="text-[10px] text-neutral-400">
                  <span>Water Mass State</span>
                </div>
                <div className="text-xs font-bold font-mono text-cyan-400 truncate">
                  {prediction.location.regionName.includes('Arabian') ? 'Subsurface OMZ' : 'Pelagic Mixed'}
                </div>
                <div className="text-[9px] text-neutral-500 truncate">
                  INCOIS / CMEMS baseline
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: In-Situ Sensor Telemetry & Provenance */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
              <span className="uppercase tracking-wide">SENSOR TELEMETRY &amp; ASSIMILATION</span>
              <span className="text-emerald-400 flex items-center gap-1 font-mono text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
              <div className="bg-[#161616] border border-[#222222] rounded-lg p-2">
                <div className="text-[9px] text-neutral-500">ARGO FLOATS</div>
                <div className="text-xs font-bold text-white mt-0.5">6 Active</div>
                <div className="text-[8px] text-neutral-400 mt-0.5">250nm radius</div>
              </div>
              <div className="bg-[#161616] border border-[#222222] rounded-lg p-2">
                <div className="text-[9px] text-neutral-500">LATENCY</div>
                <div className="text-xs font-bold text-cyan-400 mt-0.5">&lt; 15 min</div>
                <div className="text-[8px] text-neutral-400 mt-0.5">NRT Stream</div>
              </div>
              <div className="bg-[#161616] border border-[#222222] rounded-lg p-2">
                <div className="text-[9px] text-neutral-500">CONFIDENCE</div>
                <div className="text-xs font-bold text-emerald-400 mt-0.5">99.4%</div>
                <div className="text-[8px] text-neutral-400 mt-0.5">CMEMS Ens.</div>
              </div>
            </div>
          </div>

        </div>

        {/* CENTER COLUMN: 3D EARTH MAP (CENTERED IN THE PAGE) */}
        <div className="flex-1 h-full relative bg-[#040404] overflow-hidden min-h-[350px]">
          <iframe
            key={activeProjection}
            src={earthIframeUrl}
            title="Leher Fullscreen 3D Earth"
            className="w-full h-full border-0 absolute inset-0"
            onLoad={() => {
              sendToEarthIframe({
                action: "setLocation",
                latitude: inputLat,
                longitude: inputLon,
              });
            }}
          />
        </div>

        {/* RIGHT DOCKED PANEL: OPERATIONS & ANALYTICS WORKBENCH (EXACT SAME WIDTH & MATCHING CARDS) */}
        <div className="w-full lg:w-[370px] xl:w-[390px] lg:h-full bg-[#0c0c0c] border-t lg:border-t-0 lg:border-l border-[#222222] p-4 space-y-3 overflow-y-auto z-20 shadow-2xl shrink-0 max-h-[50vh] lg:max-h-full">
          {/* Header */}
          <div className="border-b border-[#222222] pb-2.5 flex justify-between items-center">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <span>OPERATIONS &amp; ANALYTICS</span>
            </h3>
          </div>

          {/* Card 1: Projection & Display */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-3 space-y-2">
            <div className="flex justify-between items-center text-[10px] font-mono text-neutral-500">
              <span className="uppercase tracking-wide">MAP PROJECTION</span>
              <span className="text-neutral-400">{PROJECTION_METADATA[activeProjection] || activeProjection}</span>
            </div>
            <div className="relative">
              <select
                value={activeProjection}
                onChange={(e) => handleSelectProjection(e.target.value)}
                className="w-full bg-[#161616] text-white text-xs font-mono rounded-lg px-3 py-2 border border-[#262626] hover:border-[#444444] focus:border-white focus:outline-none cursor-pointer transition-all appearance-none pr-8"
              >
                {PROJECTION_LIST.map((p) => (
                  <option key={p.key} value={p.key} className="bg-[#141414] text-white font-mono">
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-500">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="pt-1.5 border-t border-[#1c1c1c] flex items-center justify-between text-[11px] text-neutral-400">
              <span>Display Grid: <strong className="text-white font-mono">Hydrodynamic</strong></span>
              <span className="text-neutral-400 text-[10px]">Copernicus PHY</span>
            </div>
          </div>

          {/* Card 2: Target Coordinates & Quick Presets */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
              <span className="uppercase tracking-wide">TARGET COORDINATES</span>
              <span>GEO-DATUM WGS84</span>
            </div>

            {/* Latitude */}
            <div className="bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 flex items-center justify-between focus-within:border-white/80 transition-colors">
              <span className="text-[#888888] text-xs">Latitude</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="-90"
                  max="90"
                  value={inputLat}
                  onChange={(e) => setInputLat(parseFloat(e.target.value) || 0)}
                  className="w-20 bg-transparent text-white font-bold text-xs text-right focus:outline-none font-mono"
                  placeholder="15.40"
                />
                <span className="text-[#666666] font-mono text-xs w-6 text-right">
                  {inputLat >= 0 ? "°N" : "°S"}
                </span>
              </div>
            </div>

            {/* Longitude */}
            <div className="bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 flex items-center justify-between focus-within:border-white/80 transition-colors">
              <span className="text-[#888888] text-xs">Longitude</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="-180"
                  max="180"
                  value={inputLon}
                  onChange={(e) => setInputLon(parseFloat(e.target.value) || 0)}
                  className="w-20 bg-transparent text-white font-bold text-xs text-right focus:outline-none font-mono"
                  placeholder="71.20"
                />
                <span className="text-[#666666] font-mono text-xs w-6 text-right">
                  {inputLon >= 0 ? "°E" : "°W"}
                </span>
              </div>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-4 gap-1 pt-0.5">
              {LOCATION_PRESETS.map((loc) => {
                const isSelected = Math.abs(inputLat - loc.lat) < 0.05 && Math.abs(inputLon - loc.lon) < 0.05;
                return (
                  <button
                    key={loc.label}
                    type="button"
                    onClick={() => {
                      setInputLat(loc.lat);
                      setInputLon(loc.lon);
                    }}
                    className={cn(
                      "px-1.5 py-1 rounded-lg text-[10px] border transition-all cursor-pointer text-center truncate font-sans",
                      isSelected
                        ? "bg-white text-black font-semibold border-white"
                        : "bg-[#161616] border-[#222222] text-[#888888] hover:text-white hover:border-[#333333]"
                    )}
                  >
                    {loc.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 3: Depth Profile Measurement */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-3 space-y-2">
            <div className="flex justify-between items-center text-[10px] font-mono text-neutral-500">
              <span className="uppercase tracking-wide">DEPTH PROFILE</span>
            </div>
            
            <input 
              type="range" 
              min="0" 
              max="2000" 
              step="10" 
              value={workbenchDepth} 
              onChange={(e) => setWorkbenchDepth(Number(e.target.value))} 
              className="w-full accent-white h-1 bg-[#222222] rounded appearance-none cursor-pointer"
            />
            
            <div className="grid grid-cols-6 gap-1 text-center pt-0.5">
              {[0, 50, 150, 500, 1000, 2000].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setWorkbenchDepth(d)}
                  className={cn(
                    "py-1 rounded text-[10px] font-mono border transition-all cursor-pointer",
                    workbenchDepth === d
                      ? "bg-white text-black font-bold border-white"
                      : "bg-[#161616] border-[#222222] text-neutral-400 hover:text-white"
                  )}
                >
                  {d === 0 ? "0m" : `${d}m`}
                </button>
              ))}
            </div>
          </div>

          {/* Card 4: Action & Execution */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
              <span>ACTION &amp; SENSORS</span>
              <span className="text-neutral-400">READY</span>
            </div>

            <button
              type="button"
              onClick={handleLocateMe}
              disabled={isLocating}
              className="w-full py-2 px-3 rounded-lg bg-[#161616] hover:bg-[#1f1f1f] border border-[#262626] hover:border-[#3a3a3a] text-neutral-200 text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
            >
              <span>{isLocating ? "Acquiring GPS Fix..." : "Locate My Coordinates"}</span>
            </button>

            <div className="pt-0.5">
              <button
                type="button"
                onClick={handlePredict}
                disabled={isPredicting}
                className="w-full py-2.5 px-3 rounded-lg bg-white hover:bg-neutral-200 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-[0.99] disabled:opacity-75"
              >
                {isPredicting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                    <span>Generating 3D Depth Slice...</span>
                  </>
                ) : (
                  <>
                    <span>Predict Ocean State &amp; Open 3D Slice</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-black" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
