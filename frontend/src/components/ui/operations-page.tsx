import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ArrowLeft, 
  ChevronDown, 
  Locate, 
  RefreshCw, 
  ArrowUpRight,
  Clock,
  Compass,
  Waves,
  Thermometer,
  Droplets,
  Activity,
  Layers,
  ChevronLeft,
  ChevronRight,
  Radio,
  Satellite,
  ExternalLink,
  ShieldCheck,
  Ship,
  Navigation
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
    { label: "Equator / IO", lat: 0.0, lon: 80.5 },
    { label: "Malacca Strait", lat: 3.5, lon: 100.2 },
    { label: "South IO", lat: -25.0, lon: 75.0 },
    { label: "Gulf of Aden", lat: 12.5, lon: 48.0 },
    { label: "Lakshadweep", lat: 10.5, lon: 72.6 },
    { label: "Andaman Sea", lat: 11.7, lon: 93.0 },
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

  const handleBackToHome = () => {
    if (window.history.length > 1 && window.opener) {
      window.close();
    } else {
      window.location.href = '/';
    }
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
        {/* LEFT DOCKED PANEL: OCEAN TELEMETRY & MARITIME INTELLIGENCE */}
        <div className="w-full lg:w-[360px] xl:w-[380px] lg:h-full bg-[#0c0c0c] border-b lg:border-b-0 lg:border-r border-[#222222] p-5 space-y-5 overflow-y-auto z-20 shadow-2xl shrink-0 max-h-[50vh] lg:max-h-full">
          {/* Header */}
          <div className="border-b border-[#222222] pb-3 flex justify-between items-center">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              OCEAN TELEMETRY
            </h3>
            <span className="font-mono text-[10px] text-neutral-400 bg-[#141414] px-2 py-0.5 rounded border border-[#262626]">
              INCOIS • CMEMS
            </span>
          </div>

          {/* 1. Tactical Basin & Depth Profile Card */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
              <span className="uppercase tracking-wide">TACTICAL REGION</span>
              <span>
                {inputLat >= 0 ? `${inputLat.toFixed(2)}°N` : `${Math.abs(inputLat).toFixed(2)}°S`}, {inputLon >= 0 ? `${inputLon.toFixed(2)}°E` : `${Math.abs(inputLon).toFixed(2)}°W`}
              </span>
            </div>
            <div className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Ship className="w-4 h-4 text-neutral-400 shrink-0" />
              <span className="truncate">{prediction.location.regionName}</span>
            </div>
            <div className="pt-1.5 border-t border-[#1c1c1c] flex items-center justify-between text-[11px] text-neutral-400">
              <span>Depth Level: <strong className="text-white font-mono">{workbenchDepth}m</strong></span>
              <span className="text-neutral-400 truncate max-w-[170px] text-right text-[10px]">
                {depthLayerClassification}
              </span>
            </div>
          </div>

          {/* 2. Operational Safety & Risk Advisory */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-wide">
                OPERATIONAL ASSESSMENT
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-neutral-200 bg-[#1a1a1a] px-2.5 py-0.5 rounded-full border border-[#333333] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
                {prediction.summary.riskStatus === 'HAZARD' ? 'DANGER' : prediction.summary.riskStatus === 'ADVISORY' ? 'CAUTION' : 'SAFE'}
              </span>
            </div>
            <p className="text-[11px] text-neutral-300 leading-relaxed">
              {prediction.summary.riskMessage}
            </p>
            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] font-mono">
              <div className="bg-[#181818] border border-[#262626] rounded-lg px-2.5 py-1 text-neutral-400">
                Acoustics: <span className="text-white">{workbenchDepth < 100 ? 'Surface Duct' : 'SOFAR Channel'}</span>
              </div>
              <div className="bg-[#181818] border border-[#262626] rounded-lg px-2.5 py-1 text-neutral-400">
                Fairway: <span className="text-white">Clear</span>
              </div>
            </div>
          </div>

          {/* 3. Hydrodynamic Telemetry Matrix */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 px-0.5">
              <span>HYDRODYNAMIC METRICS</span>
              <span className="text-neutral-400">PHYSICAL MODEL</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {/* Current Velocity & Drift */}
              <div className="bg-[#121212] border border-[#222222] rounded-xl p-2.5 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-neutral-400">
                  <span className="flex items-center gap-1.5">
                    <Waves className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Current Drift</span>
                  </span>
                </div>
                <div className="text-sm font-bold font-mono text-white flex items-baseline gap-1">
                  <span>{prediction.summary.currentSpeedKnots}</span>
                  <span className="text-[10px] font-normal text-neutral-400">kts</span>
                  <span className="text-[10px] font-mono text-neutral-500">({prediction.summary.currentSpeedMs} m/s)</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-300 pt-0.5">
                  <Navigation 
                    className="w-3 h-3 text-neutral-400 transition-transform duration-300 shrink-0" 
                    style={{ transform: `rotate(${prediction.summary.currentDirectionDeg}deg)` }} 
                  />
                  <span>{prediction.summary.currentDirectionCompass} ({prediction.summary.currentDirectionDeg}°)</span>
                </div>
              </div>

              {/* Conservative Temperature (thetao) */}
              <div className="bg-[#121212] border border-[#222222] rounded-xl p-2.5 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-neutral-400">
                  <span className="flex items-center gap-1.5">
                    <Thermometer className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Water Temp (θ)</span>
                  </span>
                </div>
                <div className="text-sm font-bold font-mono text-white">
                  {prediction.variables.thetao.formattedValue}
                </div>
                <div className="text-[10px] text-neutral-500 truncate">
                  {workbenchDepth < 50 ? 'Upper Mixed Layer' : workbenchDepth < 250 ? 'Thermocline Core' : 'Abyssal Deep Water'}
                </div>
              </div>

              {/* Practical Salinity (so) */}
              <div className="bg-[#121212] border border-[#222222] rounded-xl p-2.5 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-neutral-400">
                  <span className="flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Salinity (Sp)</span>
                  </span>
                </div>
                <div className="text-sm font-bold font-mono text-white">
                  {prediction.variables.so.formattedValue}
                </div>
                <div className="text-[10px] text-neutral-500 truncate">
                  {prediction.location.regionName.includes('Bay of Bengal') ? 'Runoff Dilution' : 'Normal Oceanic'}
                </div>
              </div>

              {/* Mixed Layer Thickness (mlotst) */}
              <div className="bg-[#121212] border border-[#222222] rounded-xl p-2.5 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-neutral-400">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Mixed Layer</span>
                  </span>
                </div>
                <div className="text-sm font-bold font-mono text-white">
                  {prediction.variables.mlotst.formattedValue}
                </div>
                <div className="text-[10px] text-neutral-500 truncate">
                  Pycnocline boundary
                </div>
              </div>

              {/* Sea Surface Height Anomaly (zos) */}
              <div className="bg-[#121212] border border-[#222222] rounded-xl p-2.5 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-neutral-400">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Dynamic Height</span>
                  </span>
                </div>
                <div className="text-sm font-bold font-mono text-white">
                  {prediction.variables.zos.formattedValue}
                </div>
                <div className="text-[10px] text-neutral-500 truncate">
                  Geoid deviation
                </div>
              </div>

              {/* Sea Floor Temp (bottomT) */}
              <div className="bg-[#121212] border border-[#222222] rounded-xl p-2.5 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-neutral-400">
                  <span className="flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Benthic Temp</span>
                  </span>
                </div>
                <div className="text-sm font-bold font-mono text-white">
                  {prediction.variables.bottomT.formattedValue}
                </div>
                <div className="text-[10px] text-neutral-500 truncate">
                  Deep sea-floor layer
                </div>
              </div>
            </div>
          </div>

          {/* 4. Observation Networks */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
              <span>OBSERVATION NETWORKS</span>
              <span className="text-neutral-400">SYNCHRONIZED</span>
            </div>

            <div className="space-y-1.5 text-[10px] font-mono text-neutral-400">
              <div className="flex items-center justify-between py-0.5 border-b border-[#1c1c1c]">
                <span className="flex items-center gap-1.5 text-white">
                  <Radio className="w-3 h-3 text-neutral-400" />
                  <span>INCOIS High-Res OSF</span>
                </span>
                <span className="text-neutral-500">0.05° Hydro Mesh</span>
              </div>
              <div className="flex items-center justify-between py-0.5 border-b border-[#1c1c1c]">
                <span className="flex items-center gap-1.5 text-white">
                  <Satellite className="w-3 h-3 text-neutral-400" />
                  <span>Copernicus PHY Model</span>
                </span>
                <span className="text-neutral-500">GLOBAL_001_030</span>
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span className="flex items-center gap-1.5 text-white">
                  <Compass className="w-3 h-3 text-neutral-400" />
                  <span>Argo IO Profilers</span>
                </span>
                <span className="text-neutral-300">Array Active</span>
              </div>
            </div>
          </div>

          {/* 5. Direct Action Links */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handlePredict}
              disabled={isPredicting}
              className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-[0.99]"
            >
              <Layers className="w-3.5 h-3.5 text-black" />
              <span>Open 3D Depth Slice ({workbenchDepth}m)</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-black" />
            </button>

            <a
              href={`/details?lat=${inputLat}&lon=${inputLon}&depth=${workbenchDepth}`}
              className="w-full py-2 px-3 rounded-xl bg-[#141414] hover:bg-[#1a1a1a] border border-[#262626] text-neutral-300 hover:text-white text-[11px] font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center"
            >
              <span>Inspect Copernicus Variable Matrix</span>
              <ExternalLink className="w-3 h-3 text-neutral-500" />
            </a>
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

          {/* Center Floating Coordinate HUD */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="bg-[#000000]/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-xs font-mono text-[#aaaaaa] flex items-center gap-3 pointer-events-auto shadow-xl">
              <Compass className="w-3.5 h-3.5 text-neutral-400" />
              <span>Target: <strong className="text-white">{inputLat >= 0 ? `${inputLat.toFixed(2)}°N` : `${Math.abs(inputLat).toFixed(2)}°S`}, {inputLon >= 0 ? `${inputLon.toFixed(2)}°E` : `${Math.abs(inputLon).toFixed(2)}°W`}</strong> @ {workbenchDepth}m</span>
              <span className="text-neutral-500 hidden md:inline">• Click on map to inspect</span>
            </div>
          </div>
        </div>

        {/* RIGHT DOCKED PANEL: OPERATIONS & ANALYTICS WORKBENCH (EXACT SAME WIDTH & PADDING) */}
        <div className="w-full lg:w-[360px] xl:w-[380px] lg:h-full bg-[#0c0c0c] border-t lg:border-t-0 lg:border-l border-[#222222] p-5 space-y-5 overflow-y-auto z-20 shadow-2xl shrink-0 max-h-[50vh] lg:max-h-full">
          {/* Top Header */}
          <div className="border-b border-[#222222] pb-3 flex justify-between items-center">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              OPERATIONS &amp; ANALYTICS
            </h3>
            <span className="font-mono text-[10px] text-neutral-400 bg-[#141414] px-2 py-0.5 rounded border border-[#262626]">
              WORKBENCH
            </span>
          </div>

          {/* 1. Globe Shape Dropdown */}
          <div className="space-y-1.5 text-xs font-sans">
            <div className="flex justify-between items-center text-[11px] text-[#888888]">
              <span>Projection</span>
              <span className="text-neutral-400 font-mono text-[10px]">{PROJECTION_METADATA[activeProjection] || activeProjection}</span>
            </div>
            <div className="relative">
              <select
                value={activeProjection}
                onChange={(e) => handleSelectProjection(e.target.value)}
                className="w-full bg-[#121212] text-white text-xs font-mono rounded-xl px-3 py-2.5 border border-[#262626] hover:border-[#444444] focus:border-white focus:outline-none cursor-pointer transition-all appearance-none pr-8"
              >
                {PROJECTION_LIST.map((p) => (
                  <option key={p.key} value={p.key} className="bg-[#141414] text-white font-mono">
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#666666]">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* 2. Coordinates Input */}
          <div className="space-y-2 text-xs font-sans">
            <div className="text-[11px] text-[#888888]">Coordinates</div>
            
            {/* Latitude */}
            <div className="bg-[#121212] border border-[#262626] rounded-xl px-3 py-2 flex items-center justify-between focus-within:border-white/80 transition-colors">
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
            <div className="bg-[#121212] border border-[#262626] rounded-xl px-3 py-2 flex items-center justify-between focus-within:border-white/80 transition-colors">
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
                      "px-1.5 py-1 rounded-lg text-[10px] border transition-all cursor-pointer text-center truncate",
                      isSelected
                        ? "bg-white text-black font-semibold border-white"
                        : "bg-[#141414] border-[#222222] text-[#888888] hover:text-white hover:border-[#333333]"
                    )}
                  >
                    {loc.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Locate Yourself */}
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            className="w-full py-2.5 px-3 rounded-xl bg-[#141414] hover:bg-[#1a1a1a] border border-[#262626] hover:border-[#3a3a3a] text-white text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
          >
            <Locate className={cn("w-3.5 h-3.5", isLocating && "animate-spin")} />
            <span>{isLocating ? "Locating..." : "Locate Yourself"}</span>
          </button>

          {/* 4. Depth Measurement */}
          <div className="space-y-2 text-xs font-sans">
            <div className="flex justify-between items-center text-[11px] text-[#888888]">
              <span>Depth</span>
              <span className="text-white font-mono font-bold bg-[#181818] px-2 py-0.5 rounded border border-[#282828] text-[11px]">
                {workbenchDepth}m
              </span>
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
            <div className="grid grid-cols-6 gap-1 text-center">
              {[0, 50, 150, 500, 1000, 2000].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setWorkbenchDepth(d)}
                  className={cn(
                    "py-1 rounded text-[10px] font-mono border transition-all cursor-pointer",
                    workbenchDepth === d
                      ? "bg-white text-black font-bold border-white"
                      : "bg-[#141414] border-[#222222] text-[#666666] hover:text-white"
                  )}
                >
                  {d === 0 ? "0m" : `${d}m`}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Predict Ocean State Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handlePredict}
              disabled={isPredicting}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-[0.99] disabled:opacity-75"
            >
              {isPredicting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>Generating 3D Depth Slice...</span>
                </>
              ) : (
                <>
                  <span>Predict Ocean State &amp; Open 3D Depth Slice</span>
                  <ArrowUpRight className="w-4 h-4 text-black" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
