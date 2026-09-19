import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  RefreshCw,
  ArrowUpRight,
  Clock,
  Map as MapIcon,
  Sliders,
  Compass,
  Radio,
  X,
  Crosshair,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PROJECTION_LIST, type TimeZone } from '@/components/ui/landing-page';
import { predictOceanState, type OceanPredictionResult } from '@/lib/api/oceanPredictionService';
import { 
  IN_SITU_SENSORS, 
  type InSituSensorType 
} from '@/services/inSituSensorData';

const timeZoneMap: Record<TimeZone, { name: string; timeZone: string; offsetLabel: string }> = {
  IST: { name: 'IST (India Standard)', timeZone: 'Asia/Kolkata', offsetLabel: 'UTC+05:30' },
  UTC: { name: 'UTC / GMT (Universal)', timeZone: 'UTC', offsetLabel: 'UTC+00:00' },
  EST: { name: 'EST (US Eastern)', timeZone: 'America/New_York', offsetLabel: 'UTC-05:00' },
  PST: { name: 'PST (US Pacific)', timeZone: 'America/Los_Angeles', offsetLabel: 'UTC-08:00' },
  JST: { name: 'JST (Japan Standard)', timeZone: 'Asia/Tokyo', offsetLabel: 'UTC+09:00' },
  SGT: { name: 'SGT (Singapore)', timeZone: 'Asia/Singapore', offsetLabel: 'UTC+08:00' },
};

export default function OperationsPage() {
  const earthIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Read coordinates and depth from URL query parameters
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

  // Entry Popup Modal State
  // Shown every time the user actively enters the platform, but suppressed when returning back from a sub-screen
  const [showEntryModal, setShowEntryModal] = useState<boolean>(() => {
    try {
      // 1. Explicit query parameter indicating returning back from another page
      const search = new URLSearchParams(window.location.search);
      if (search.get('from') || search.get('back') === 'true' || search.get('return') === 'true') {
        return false;
      }

      // 2. Marked in sessionStorage when navigating to or from sub-screens
      if (sessionStorage.getItem('leher_ops_returned_from_subscreen') === 'true') {
        sessionStorage.removeItem('leher_ops_returned_from_subscreen');
        return false;
      }

      // 3. Check document.referrer (coming from depth-slice, hazards, details, maritime)
      if (typeof document !== 'undefined' && document.referrer) {
        const ref = document.referrer.toLowerCase();
        if (
          ref.includes('/depth-slice') ||
          ref.includes('/hazards') ||
          ref.includes('/details') ||
          ref.includes('/maritime')
        ) {
          return false;
        }
      }

      // 4. Check browser Back/Forward navigation from a visited sub-screen
      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navEntries.length > 0 && navEntries[0].type === 'back_forward') {
        if (sessionStorage.getItem('leher_ops_subscreen_visited') === 'true') {
          return false;
        }
      }
    } catch (e) {
      console.warn("Navigation state check error:", e);
    }

    // Default: Actively entering the platform -> Show modal
    return true;
  });
  const [modalLat, setModalLat] = useState<number>(params.lat);
  const [modalLon, setModalLon] = useState<number>(params.lon);
  const [modalDepth, setModalDepth] = useState<number>(params.depth);

  // In-Situ Fleet Filter & Selection State
  const [activeSensorFilter, setActiveSensorFilter] = useState<InSituSensorType | 'all'>('all');
  const [selectedSensorId, setSelectedSensorId] = useState<string>('');
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

  const [activeProjection, setActiveProjection] = useState<string>('concentric_region');
  const [activeMobileTab, setActiveMobileTab] = useState<'map' | 'controls'>('map');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [selectedTimeZone, setSelectedTimeZone] = useState<TimeZone>('IST');
  const [realTimeClock, setRealTimeClock] = useState<string>('');

  // Send command to embedded earth viewer
  const sendToEarthIframe = useCallback((data: Record<string, unknown>) => {
    try {
      if (earthIframeRef.current && earthIframeRef.current.contentWindow) {
        earthIframeRef.current.contentWindow.postMessage(data, "*");
      }
    } catch (err) {
      console.warn("Earth iframe communication error:", err);
    }
  }, []);

  // Update earth location when inputs change
  useEffect(() => {
    sendToEarthIframe({
      action: "setLocation",
      latitude: inputLat,
      longitude: inputLon,
    });
  }, [inputLat, inputLon, sendToEarthIframe]);

  // Handle Predict & Open Depth Slice Page
  const handlePredict = useCallback(() => {
    setIsPredicting(true);
    sessionStorage.setItem('leher_ops_returned_from_subscreen', 'true');
    sessionStorage.setItem('leher_ops_subscreen_visited', 'true');
    const sensorParam = selectedSensorId ? `&sensor=${encodeURIComponent(selectedSensorId)}` : '';
    const targetUrl = `/depth-slice?lat=${inputLat}&lon=${inputLon}&depth=${workbenchDepth}${sensorParam}`;
    setTimeout(() => {
      setIsPredicting(false);
      window.location.href = targetUrl;
    }, 250);
  }, [inputLat, inputLon, workbenchDepth, selectedSensorId]);

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

  const handleSelectPreset = useCallback((preset: { label: string; lat: number; lon: number }) => {
    setInputLat(preset.lat);
    setInputLon(preset.lon);
    sendToEarthIframe({
      action: "setLocation",
      latitude: preset.lat,
      longitude: preset.lon,
    });
  }, [sendToEarthIframe]);

  // Handle Target Sensor (pure selection of location, no output telemetry)
  const handleSelectInSituSensor = useCallback((sensorId: string) => {
    const s = IN_SITU_SENSORS.find(x => x.id === sensorId);
    if (s) {
      setSelectedSensorId(s.id);
      setInputLat(s.lat);
      setInputLon(s.lon);
      sendToEarthIframe({
        action: "setLocation",
        latitude: s.lat,
        longitude: s.lon,
      });
    }
  }, [sendToEarthIframe]);

  // Apply coordinates from Entry Modal (no page transition!)
  const handleApplyModalCoordinates = () => {
    setInputLat(modalLat);
    setInputLon(modalLon);
    setWorkbenchDepth(modalDepth);
    sendToEarthIframe({
      action: "setLocation",
      latitude: modalLat,
      longitude: modalLon,
    });
    setShowEntryModal(false);
  };

  const handleLatBlur = () => {
    setInputLat((prev) => Math.min(25, Math.max(-20, prev)));
  };

  const handleLonBlur = () => {
    setInputLon((prev) => Math.min(99, Math.max(53, prev)));
  };

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

  // Oceanographic prediction calculation for location label
  const prediction: OceanPredictionResult = useMemo(() => {
    return predictOceanState(inputLat, inputLon, workbenchDepth);
  }, [inputLat, inputLon, workbenchDepth]);

  const handleBackToHome = () => {
    sessionStorage.removeItem('leher_ops_returned_from_subscreen');
    sessionStorage.removeItem('leher_ops_subscreen_visited');
    window.location.href = '/';
  };

  const earthIframeUrl = useMemo(() => {
    const projName = activeProjection || 'concentric_region';
    return `/earth/index.html?hidebadge=1#current/ocean/surface/currents/overlay=ocean/${projName}`;
  }, [activeProjection]);

  return (
    <div className="h-screen w-screen bg-[#050505] text-white flex flex-col overflow-hidden font-sans selection:bg-white/20 selection:text-white">
      {/* TOP HEADER BAR */}
      <header className="h-16 bg-[#060606]/30 backdrop-blur-2xl border-b border-white/[0.08] px-4 sm:px-6 flex justify-between items-center z-30 shrink-0 shadow-lg shadow-black/20">
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
            <span className="font-bold text-sm sm:text-base text-white tracking-tight font-mono">
              Operations &amp; In-Situ Console
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Re-open Target Coordinate Popup Button */}
          <button
            type="button"
            onClick={() => {
              setModalLat(inputLat);
              setModalLon(inputLon);
              setModalDepth(workbenchDepth);
              setShowEntryModal(true);
            }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#161616] hover:bg-[#1f1f1f] border border-[#262626] text-xs font-mono text-[#cccccc] hover:text-white transition-all cursor-pointer"
            title="Open Target Coordinates & Depth Modal"
          >
            <Crosshair className="w-3.5 h-3.5 text-[#888888]" />
            <span>Target Coordinates</span>
          </button>

          {/* Real-time Clock */}
          <div className="hidden md:flex items-center gap-2 font-mono text-xs text-[#888888] bg-[#141414] px-3 py-1.5 rounded-xl border border-[#222222]">
            <Clock className="w-3.5 h-3.5 text-[#666666]" />
            <span>{realTimeClock}</span>
            <select
              value={selectedTimeZone}
              onChange={(e) => setSelectedTimeZone(e.target.value as TimeZone)}
              className="bg-[#1a1a1a] text-white text-xs font-mono rounded px-1.5 py-0.5 border border-[#2a2a2a] focus:outline-none cursor-pointer hover:border-white/30 transition-colors ml-1"
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

      {/* MOBILE PANEL SWITCHER (< lg only; hidden on desktop) */}
      <div className="flex lg:hidden bg-[#0c0c0c] border-b border-[#222222] p-1.5 gap-1 shrink-0 z-20">
        <button
          type="button"
          onClick={() => setActiveMobileTab('map')}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer",
            activeMobileTab === 'map'
              ? "bg-[#1f1f1f] text-white border border-[#333333] shadow-sm"
              : "text-[#888888] hover:text-white"
          )}
        >
          <MapIcon className="w-3.5 h-3.5 text-[#888888]" />
          <span>3D Globe View</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('controls')}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer",
            activeMobileTab === 'controls'
              ? "bg-[#1f1f1f] text-white border border-[#333333] shadow-sm"
              : "text-[#888888] hover:text-white"
          )}
        >
          <Sliders className="w-3.5 h-3.5 text-[#888888]" />
          <span>Operations Workbench</span>
        </button>
      </div>

      {/* MAIN WORKSPACE: 2-COLUMN MONOCHROME LAYOUT (MATCHING SCREENSHOT 2) */}
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        {/* EXPANSIVE 3D EARTH MAP VIEWPORT */}
        <div className={cn(
          "flex-1 h-full relative bg-[#040404] overflow-hidden min-h-[300px] min-w-0 lg:-mt-16",
          activeMobileTab === 'map' ? "block" : "hidden lg:block"
        )}>
          <iframe
            ref={earthIframeRef}
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
              sendToEarthIframe({
                action: "setInSituPlatforms",
                platforms: IN_SITU_SENSORS,
              });
            }}
          />

          {/* Center Floating Coordinate HUD */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="bg-[#000000]/85 backdrop-blur-lg px-5 py-3 rounded-2xl border border-white/10 shadow-2xl pointer-events-auto flex flex-col items-center gap-1 min-w-[220px]">
              <div className="flex items-center gap-2 font-mono">
                <span className="text-white font-bold text-base tracking-tight">
                  {inputLat >= 0 ? `${inputLat.toFixed(2)}°N` : `${Math.abs(inputLat).toFixed(2)}°S`}
                  <span className="text-neutral-500 mx-1.5">·</span>
                  {inputLon >= 0 ? `${inputLon.toFixed(2)}°E` : `${Math.abs(inputLon).toFixed(2)}°W`}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400">
                <span className="text-neutral-300 font-semibold">{prediction.location.regionName}</span>
                <span className="text-neutral-600">·</span>
                <span>{workbenchDepth}m depth</span>
              </div>
            </div>
          </div>
          
          {/* Zoom Controls */}
          <div className="absolute right-4 bottom-1/2 translate-y-1/2 flex flex-col gap-2 z-10">
            <button
              onClick={() => sendToEarthIframe({ action: "zoomIn" })}
              className="w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 hover:bg-black/80 hover:border-white/30 text-white flex items-center justify-center transition-all shadow-lg cursor-pointer"
              title="Zoom In"
            >
              <span className="text-lg font-bold leading-none">+</span>
            </button>
            <button
              onClick={() => sendToEarthIframe({ action: "zoomOut" })}
              className="w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 hover:bg-black/80 hover:border-white/30 text-white flex items-center justify-center transition-all shadow-lg cursor-pointer"
              title="Zoom Out"
            >
              <span className="text-lg font-bold leading-none">−</span>
            </button>
          </div>
        </div>

        {/* RIGHT DOCKED PANEL: MINIMAL MONOCHROME AESTHETIC WITH ALL OPTIONS RESTORED */}
        <div className={cn(
          "w-full lg:w-[390px] xl:w-[400px] lg:flex-none lg:h-full bg-[#0c0c0c] border-t lg:border-t-0 lg:border-l border-[#222222] p-4 space-y-3 overflow-y-auto z-20 shadow-2xl shrink-0 max-h-none lg:max-h-full min-w-0 font-mono",
          activeMobileTab === 'controls' ? "flex-1 block lg:flex-none" : "hidden lg:block"
        )}>
          {/* Header */}
          <div className="border-b border-[#222222] pb-2.5 flex justify-between items-center">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              OPERATIONS WORKBENCH
            </h3>
            <span className="text-[10px] font-mono text-[#666666]">
              {prediction.location.regionName}
            </span>
          </div>

          {/* 1. MAP PROJECTION */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-3.5 space-y-2">
            <div className="text-[10px] text-[#666666] uppercase tracking-wide font-medium">
              MAP PROJECTION
            </div>
            <div className="relative">
              <select
                value={activeProjection}
                onChange={(e) => handleSelectProjection(e.target.value)}
                className="w-full bg-[#161616] text-white text-xs font-mono rounded-lg px-3 py-2.5 border border-[#262626] hover:border-[#333333] focus:border-white/60 focus:outline-none cursor-pointer transition-all appearance-none pr-8 truncate"
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

          {/* 2. COORDINATES */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-3.5 space-y-2.5">
            <div className="text-[10px] text-[#666666] uppercase tracking-wide font-medium">
              COORDINATES
            </div>

            {/* Latitude */}
            <div className="bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 flex items-center justify-between focus-within:border-white/60 transition-colors">
              <span className="text-[#888888] text-xs font-mono">Latitude</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.0001"
                  min="-20"
                  max="25"
                  value={inputLat}
                  onChange={(e) => setInputLat(parseFloat(e.target.value) || 0)}
                  onBlur={handleLatBlur}
                  className="w-24 bg-transparent text-white font-bold text-xs text-right focus:outline-none font-mono"
                  placeholder="15.4"
                />
                <span className="text-[#666666] font-mono text-xs w-6 text-right">
                  {inputLat >= 0 ? "°N" : "°S"}
                </span>
              </div>
            </div>

            {/* Longitude */}
            <div className="bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 flex items-center justify-between focus-within:border-white/60 transition-colors">
              <span className="text-[#888888] text-xs font-mono">Longitude</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.0001"
                  min="53"
                  max="99"
                  value={inputLon}
                  onChange={(e) => setInputLon(parseFloat(e.target.value) || 0)}
                  onBlur={handleLonBlur}
                  className="w-24 bg-transparent text-white font-bold text-xs text-right focus:outline-none font-mono"
                  placeholder="71.2"
                />
                <span className="text-[#666666] font-mono text-xs w-6 text-right">
                  {inputLon >= 0 ? "°E" : "°W"}
                </span>
              </div>
            </div>

            {/* Locate Myself Button (Clean minimal monochrome, no cyan) */}
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={isLocating}
              className="w-full py-2.5 px-3 rounded-lg bg-[#161616] hover:bg-[#202020] border border-[#262626] text-white text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              title="Detect your current geographic position and center the 3D globe"
            >
              <Compass className="w-3.5 h-3.5 text-[#888888]" />
              <span>{isLocating ? "Acquiring GPS Fix..." : "Locate Myself"}</span>
            </button>
          </div>

          {/* 3. DEPTH PROFILE */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-3.5 space-y-2.5">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="uppercase tracking-wide text-[#666666] font-medium">DEPTH PROFILE</span>
              <span className="text-white font-bold text-xs">{workbenchDepth}m</span>
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
                    "py-1.5 rounded text-[10px] font-mono border transition-all cursor-pointer",
                    workbenchDepth === d
                      ? "bg-white text-black font-bold border-white"
                      : "bg-[#161616] border-[#222222] text-[#888888] hover:text-white"
                  )}
                >
                  {d === 0 ? "0m" : `${d}m`}
                </button>
              ))}
            </div>
          </div>

          {/* 4. IN-SITU OBSERVATIONS (Restored! Clean minimal monochrome) */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-[#888888] uppercase tracking-wide font-bold flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-[#888888]" />
                IN-SITU OBSERVATIONS
              </span>
              <span className="text-[10px] font-mono text-[#888888] bg-[#161616] px-2 py-0.5 rounded border border-[#262626]">
                {IN_SITU_SENSORS.length} ACTIVE
              </span>
            </div>

            {/* Category Filter Pills */}
            <div className="grid grid-cols-5 gap-1.5">
              {(['all', 'argo', 'glider', 'mooring', 'bgc'] as const).map((t) => {
                const count = t === 'all' ? IN_SITU_SENSORS.length : IN_SITU_SENSORS.filter(s => s.type === t).length;
                const labels = { all: 'ALL', argo: 'ARGO', glider: 'GLIDER', mooring: 'OMNI', bgc: 'BGC' };
                const isSelected = activeSensorFilter === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActiveSensorFilter(t)}
                    className={cn(
                      "py-1.5 px-1 rounded-md text-[10px] font-mono transition-all text-center truncate cursor-pointer",
                      isSelected
                        ? "bg-white text-black font-bold shadow-sm"
                        : "bg-[#161616] text-[#888888] hover:text-white border border-[#222222]"
                    )}
                    title={`Filter ${labels[t]} (${count})`}
                  >
                    {labels[t]} ({count})
                  </button>
                );
              })}
            </div>

            {/* Location Platform Selection Dropdown */}
            <div className="relative">
              <select
                value={selectedSensorId}
                onChange={(e) => handleSelectInSituSensor(e.target.value)}
                className="w-full bg-[#161616] text-white text-xs font-mono rounded-lg px-3 py-2.5 border border-[#262626] hover:border-[#333333] focus:border-white/60 focus:outline-none cursor-pointer transition-all appearance-none pr-8 truncate"
              >
                <option value="" disabled>
                  Select In-Situ Location ({IN_SITU_SENSORS.length} Platforms)...
                </option>
                {(activeSensorFilter === 'all' || activeSensorFilter === 'argo') && (
                  <optgroup label="── Argo Autonomous Profilers ──">
                    {IN_SITU_SENSORS.filter(s => s.type === 'argo').map(s => (
                      <option key={s.id} value={s.id}>
                        {s.wmoId} • {s.basin} ({s.lat.toFixed(2)}°N, {s.lon.toFixed(2)}°E)
                      </option>
                    ))}
                  </optgroup>
                )}
                {(activeSensorFilter === 'all' || activeSensorFilter === 'glider') && (
                  <optgroup label="── Underwater Gliders ──">
                    {IN_SITU_SENSORS.filter(s => s.type === 'glider').map(s => (
                      <option key={s.id} value={s.id}>
                        {s.wmoId} • {s.basin} ({s.lat.toFixed(2)}°N, {s.lon.toFixed(2)}°E)
                      </option>
                    ))}
                  </optgroup>
                )}
                {(activeSensorFilter === 'all' || activeSensorFilter === 'mooring') && (
                  <optgroup label="── INCOIS OMNI Moored Buoys ──">
                    {IN_SITU_SENSORS.filter(s => s.type === 'mooring').map(s => (
                      <option key={s.id} value={s.id}>
                        {s.wmoId} • {s.basin} ({s.lat.toFixed(2)}°N, {s.lon.toFixed(2)}°E)
                      </option>
                    ))}
                  </optgroup>
                )}
                {(activeSensorFilter === 'all' || activeSensorFilter === 'bgc') && (
                  <optgroup label="── BGC Biogeochemical Floats ──">
                    {IN_SITU_SENSORS.filter(s => s.type === 'bgc').map(s => (
                      <option key={s.id} value={s.id}>
                        {s.wmoId} • {s.basin} ({s.lat.toFixed(2)}°N, {s.lon.toFixed(2)}°E)
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#666666]">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* 5. ACTION & SENSORS */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-[#666666]">
              <span className="uppercase tracking-wide font-medium">ACTION &amp; SENSORS</span>
              <span className="text-[#888888] font-mono">READY</span>
            </div>

            <button
              type="button"
              onClick={handlePredict}
              disabled={isPredicting}
              className="w-full py-2.5 px-3 rounded-lg bg-white hover:bg-neutral-200 text-black font-bold text-xs font-sans flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-[0.99] disabled:opacity-75"
            >
              {isPredicting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                  <span>Computing 3D Ocean Model...</span>
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

      {/* ── ENTRY POPUP MODAL (MATCHING EXACT MONOCHROME MINIMAL SPEC IN SCREENSHOT 2) ── */}
      {showEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-5 shadow-2xl max-w-sm w-full text-white space-y-4 font-mono relative">
            {/* Close / Skip X icon */}
            <button
              type="button"
              onClick={() => setShowEntryModal(false)}
              className="absolute top-3.5 right-3.5 p-1 rounded-md text-[#666666] hover:text-white hover:bg-[#1a1a1a] transition-colors cursor-pointer"
              title="Close Dialog"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="space-y-1">
              <div className="text-[10px] text-[#666666] uppercase tracking-wide">
                TARGET COORDINATES &amp; DEPTH
              </div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Initialize Marine Simulation Sector
              </h2>
            </div>

            {/* Coordinate Inputs */}
            <div className="space-y-2">
              {/* Latitude */}
              <div className="bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 flex items-center justify-between focus-within:border-white/60 transition-colors">
                <span className="text-[#888888] text-xs font-mono">Latitude</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.0001"
                    min="-20"
                    max="25"
                    value={modalLat}
                    onChange={(e) => setModalLat(parseFloat(e.target.value) || 0)}
                    className="w-20 bg-transparent text-white font-bold text-xs text-right focus:outline-none font-mono"
                    placeholder="15.4"
                  />
                  <span className="text-[#666666] font-mono text-xs w-6 text-right">
                    {modalLat >= 0 ? "°N" : "°S"}
                  </span>
                </div>
              </div>

              {/* Longitude */}
              <div className="bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 flex items-center justify-between focus-within:border-white/60 transition-colors">
                <span className="text-[#888888] text-xs font-mono">Longitude</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.0001"
                    min="53"
                    max="99"
                    value={modalLon}
                    onChange={(e) => setModalLon(parseFloat(e.target.value) || 0)}
                    className="w-20 bg-transparent text-white font-bold text-xs text-right focus:outline-none font-mono"
                    placeholder="71.2"
                  />
                  <span className="text-[#666666] font-mono text-xs w-6 text-right">
                    {modalLon >= 0 ? "°E" : "°W"}
                  </span>
                </div>
              </div>

              {/* Depth Selection */}
              <div className="bg-[#161616] border border-[#262626] rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-[#666666] uppercase tracking-wide">DEPTH PROFILE</span>
                  <span className="text-white font-bold text-xs">{modalDepth}m</span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="2000"
                  step="10"
                  value={modalDepth}
                  onChange={(e) => setModalDepth(Number(e.target.value))}
                  className="w-full accent-white h-1 bg-[#222222] rounded appearance-none cursor-pointer"
                />

                <div className="grid grid-cols-6 gap-1 text-center pt-0.5">
                  {[0, 50, 150, 500, 1000, 2000].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setModalDepth(d)}
                      className={cn(
                        "py-1 rounded text-[10px] font-mono border transition-all cursor-pointer",
                        modalDepth === d
                          ? "bg-white text-black font-bold border-white"
                          : "bg-[#121212] border-[#222222] text-[#888888] hover:text-white"
                      )}
                    >
                      {d === 0 ? "0m" : `${d}m`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-1.5 pt-1">
              <button
                type="button"
                onClick={handleApplyModalCoordinates}
                className="w-full py-2.5 px-3 rounded-lg bg-white hover:bg-neutral-200 text-black font-bold text-xs font-sans flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-[0.99]"
              >
                <span>Set Coordinates &amp; Depth</span>
              </button>

              <button
                type="button"
                onClick={() => setShowEntryModal(false)}
                className="w-full py-1 text-[#888888] hover:text-white text-[11px] font-mono text-center transition-colors cursor-pointer"
              >
                Skip &amp; Select Manually or by In-Situ Options →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
