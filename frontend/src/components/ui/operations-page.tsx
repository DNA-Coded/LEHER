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
  ArrowLeftRight,
  Layers,
  AlertTriangle,
  AlertCircle,
  MapPinOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PROJECTION_LIST, type TimeZone } from '@/components/ui/landing-page';
import { predictOceanState, type OceanPredictionResult } from '@/lib/api/oceanPredictionService';
import { validateCoordinates, HIGHLIGHTED_BOUNDS } from '@/lib/coordinates';
import { getBathymetricSeafloorDepth, type BathymetryInfo } from '@/lib/ocean/bathymetry';
import { DataProvenanceBadge } from '@/components/ui/DataProvenanceBadge';
import { evaluateDataProvenance } from '@/lib/ocean/provenance';
import { fetchBackendStatus } from '@/services/oceanApi';
import {
  IN_SITU_SENSORS,
  type InSituSensorType
} from '@/services/inSituSensorData';
import { ModelVsObsComparator } from '@/components/ocean/ModelVsObsComparator';

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
  const [activeSensorFilter, setActiveSensorFilter] = useState<'all' | InSituSensorType>('all');
  const [selectedSensorId, setSelectedSensorId] = useState<string>('');
  const [showModelVsObsModal, setShowModelVsObsModal] = useState<boolean>(false);
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

  // Listen for coordinates from Earth iframe inspection
  useEffect(() => {
    const handleEarthMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "earth:location") {
        const lat = typeof e.data.latitude === "number" ? e.data.latitude : 0;
        const lon = typeof e.data.longitude === "number" ? e.data.longitude : 0;
        const roundedLat = parseFloat(lat.toFixed(4));
        const roundedLon = parseFloat(lon.toFixed(4));
        setInputLat(roundedLat);
        setInputLon(roundedLon);
        const info = getBathymetricSeafloorDepth(roundedLat, roundedLon);
        if (info.isLand) {
          setWorkbenchDepth(0);
        } else if (workbenchDepth > info.maxSafeDepth) {
          setWorkbenchDepth(info.maxSafeDepth);
        }
      }
    };
    window.addEventListener("message", handleEarthMessage);
    return () => window.removeEventListener("message", handleEarthMessage);
  }, [workbenchDepth]);

  // Update earth location when inputs change
  useEffect(() => {
    sendToEarthIframe({
      action: "setLocation",
      latitude: inputLat,
      longitude: inputLon,
    });
  }, [inputLat, inputLon, sendToEarthIframe]);

  // Validation of input coordinates against highlighted operational bounds
  const coordValidation = useMemo(
    () => validateCoordinates(inputLat, inputLon),
    [inputLat, inputLon]
  );

  const modalCoordValidation = useMemo(
    () => validateCoordinates(modalLat, modalLon),
    [modalLat, modalLon]
  );

  // Bathymetric seafloor depth for sidebar and modal coordinates
  const bathymetryInfo = useMemo(() => {
    if (isNaN(inputLat) || isNaN(inputLon)) {
      return getBathymetricSeafloorDepth(15.4, 71.2);
    }
    return getBathymetricSeafloorDepth(inputLat, inputLon);
  }, [inputLat, inputLon]);

  const modalBathymetryInfo = useMemo(() => {
    if (isNaN(modalLat) || isNaN(modalLon)) {
      return getBathymetricSeafloorDepth(15.4, 71.2);
    }
    return getBathymetricSeafloorDepth(modalLat, modalLon);
  }, [modalLat, modalLon]);

  // Auto-clamp depth if exceeding local seafloor or on land
  useEffect(() => {
    if (bathymetryInfo.isLand) {
      if (workbenchDepth !== 0) setWorkbenchDepth(0);
    } else if (workbenchDepth > bathymetryInfo.maxSafeDepth) {
      setWorkbenchDepth(bathymetryInfo.maxSafeDepth);
    }
  }, [bathymetryInfo.isLand, bathymetryInfo.maxSafeDepth, workbenchDepth]);

  useEffect(() => {
    if (modalBathymetryInfo.isLand) {
      if (modalDepth !== 0) setModalDepth(0);
    } else if (modalDepth > modalBathymetryInfo.maxSafeDepth) {
      setModalDepth(modalBathymetryInfo.maxSafeDepth);
    }
  }, [modalBathymetryInfo.isLand, modalBathymetryInfo.maxSafeDepth, modalDepth]);

  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    fetchBackendStatus()
      .then((status) => {
        if (mounted) setIsBackendConnected(status !== null && status.status === 'ok');
      })
      .catch(() => {
        if (mounted) setIsBackendConnected(false);
      });
    return () => { mounted = false; };
  }, []);

  const provenanceInfo = useMemo(() => {
    return evaluateDataProvenance(inputLat, inputLon, {
      isBackendConnected,
      isRealDataFetched: true,
    });
  }, [inputLat, inputLon, isBackendConnected]);

  // Handle Predict & Open Depth Slice Page
  const handlePredict = useCallback(() => {
    if (!coordValidation.isValid || bathymetryInfo.isLand) return;
    setIsPredicting(true);
    sessionStorage.setItem('leher_ops_returned_from_subscreen', 'true');
    sessionStorage.setItem('leher_ops_subscreen_visited', 'true');
    const safeDepth = Math.min(workbenchDepth, bathymetryInfo.maxSafeDepth);
    const sensorParam = selectedSensorId ? `&sensor=${encodeURIComponent(selectedSensorId)}` : '';
    const targetUrl = `/depth-slice?lat=${inputLat}&lon=${inputLon}&depth=${safeDepth}${sensorParam}`;
    setTimeout(() => {
      setIsPredicting(false);
      window.location.href = targetUrl;
    }, 250);
  }, [inputLat, inputLon, workbenchDepth, selectedSensorId, coordValidation.isValid, bathymetryInfo.isLand, bathymetryInfo.maxSafeDepth]);

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
    if (!modalCoordValidation.isValid) return;
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

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Re-open Target Coordinate Popup Button (compact on mobile) */}
          <button
            type="button"
            onClick={() => {
              setModalLat(inputLat);
              setModalLon(inputLon);
              setModalDepth(workbenchDepth);
              setShowEntryModal(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-[#161616] hover:bg-[#1f1f1f] border border-[#262626] text-xs font-mono text-[#cccccc] hover:text-white transition-all cursor-pointer"
            title="Open Target Coordinates & Depth Modal"
          >
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Target Coordinates</span>
            <span className="sm:hidden text-[11px]">Coords</span>
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
            "flex-1 py-2 px-2 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[40px]",
            activeMobileTab === 'map'
              ? "bg-[#1f1f1f] text-white border border-[#333333] shadow-sm font-bold"
              : "text-[#888888] hover:text-white"
          )}
        >
          <MapIcon className="w-3.5 h-3.5 text-cyan-400" />
          <span>3D Globe View</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('controls')}
          className={cn(
            "flex-1 py-2 px-2 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[40px]",
            activeMobileTab === 'controls'
              ? "bg-[#1f1f1f] text-white border border-[#333333] shadow-sm font-bold"
              : "text-[#888888] hover:text-white"
          )}
        >
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span>Operations Workbench</span>
        </button>
      </div>

      {/* MAIN WORKSPACE: 2-COLUMN MONOCHROME LAYOUT (MATCHING SCREENSHOT 2) */}
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        {/* EXPANSIVE 3D EARTH MAP VIEWPORT */}
        <div className={cn(
          "flex-1 h-full relative bg-[#070709] overflow-hidden min-h-[300px] min-w-0",
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
          <div className="absolute bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 z-10 pointer-events-none max-w-[calc(100vw-32px)]">
            <div className="bg-[#000000]/85 backdrop-blur-lg px-3.5 py-2 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl border border-white/10 shadow-2xl pointer-events-auto flex flex-col items-center gap-0.5 sm:gap-1 min-w-[200px] sm:min-w-[220px]">
              <div className="flex items-center gap-1.5 sm:gap-2 font-mono">
                <span className="text-white font-bold text-sm sm:text-base tracking-tight">
                  {inputLat >= 0 ? `${inputLat.toFixed(2)}°N` : `${Math.abs(inputLat).toFixed(2)}°S`}
                  <span className="text-neutral-500 mx-1 sm:mx-1.5">·</span>
                  {inputLon >= 0 ? `${inputLon.toFixed(2)}°E` : `${Math.abs(inputLon).toFixed(2)}°W`}
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-mono text-neutral-400">
                <span className="text-neutral-300 font-semibold truncate max-w-[130px] sm:max-w-none">{prediction.location.regionName}</span>
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

        {/* RIGHT DOCKED PANEL: FIXED AT 100% VIEW (NO SCROLLING ON LARGE DISPLAY) + SENIOR UI/UX PALETTE */}
        <div className={cn(
          "w-full lg:w-[380px] xl:w-[390px] lg:flex-none h-full bg-[#0d0e13] border-t lg:border-t-0 lg:border-l border-zinc-800/90 p-3 lg:p-3.5 flex flex-col justify-between overflow-y-auto z-20 shadow-2xl shrink-0 min-w-0 font-mono select-none",
          activeMobileTab === 'controls' ? "flex-1 block lg:flex-none" : "hidden lg:flex"
        )}>
          {/* Header */}
          <div className="border-b border-zinc-800/80 pb-2 flex justify-between items-center shrink-0">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-white" />
              OPERATIONS WORKBENCH
            </h3>
            <span className="text-[10px] font-mono text-zinc-300 font-semibold truncate max-w-[140px]">
              {prediction.location.regionName}
            </span>
          </div>

          {/* 1. MAP PROJECTION */}
          <div className="bg-[#13141b] border border-zinc-800/90 hover:border-zinc-700/90 rounded-xl p-2.5 space-y-1.5 transition-colors">
            <div className="text-[10px] text-zinc-200 uppercase tracking-wider font-semibold font-mono">
              MAP PROJECTION
            </div>
            <div className="relative">
              <select
                value={activeProjection}
                onChange={(e) => handleSelectProjection(e.target.value)}
                className="w-full bg-[#181922] text-white text-xs font-mono rounded-lg px-2.5 py-1.5 border border-zinc-800 hover:border-zinc-700 focus:border-white/60 focus:outline-none cursor-pointer transition-all appearance-none pr-8 truncate"
              >
                {PROJECTION_LIST.map((p) => (
                  <option key={p.key} value={p.key} className="bg-[#13141b] text-white font-mono">
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-zinc-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* 2. COORDINATES */}
          <div className="bg-[#13141b] border border-zinc-800/90 hover:border-zinc-700/90 rounded-xl p-3 space-y-2 transition-colors">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-zinc-400 uppercase tracking-wider">COORDINATES</span>
              <span className="text-zinc-500 font-mono text-[9px]">{HIGHLIGHTED_BOUNDS.label}</span>
            </div>

            {/* Latitude */}
            <div className={cn(
              "bg-[#181922] border rounded-lg px-3 py-2 flex items-center justify-between transition-colors",
              coordValidation.latError
                ? "border-rose-500/80 bg-rose-950/20 text-rose-200 ring-1 ring-rose-500/30"
                : "border-zinc-800 focus-within:border-white/60"
            )}>
              <span className={cn("text-xs font-mono", coordValidation.latError ? "text-rose-400 font-semibold" : "text-zinc-400")}>
                Latitude
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.0001"
                  value={isNaN(inputLat) ? "" : inputLat}
                  onChange={(e) => setInputLat(e.target.value === "" ? NaN : parseFloat(e.target.value))}
                  className={cn(
                    "w-16 bg-transparent font-bold text-xs text-right focus:outline-none font-mono",
                    coordValidation.latError ? "text-rose-200 placeholder-rose-700" : "text-white"
                  )}
                  placeholder="15.4"
                />
                <span className={cn("font-mono text-xs", coordValidation.latError ? "text-rose-400" : "text-zinc-400")}>
                  {!isNaN(inputLat) ? (inputLat >= 0 ? "°N" : "°S") : "--"}
                </span>
              </div>
            </div>

            {/* Longitude */}
            <div className={cn(
              "bg-[#181922] border rounded-lg px-3 py-2 flex items-center justify-between transition-colors",
              coordValidation.lonError
                ? "border-rose-500/80 bg-rose-950/20 text-rose-200 ring-1 ring-rose-500/30"
                : "border-zinc-800 focus-within:border-white/60"
            )}>
              <span className={cn("text-xs font-mono", coordValidation.lonError ? "text-rose-400 font-semibold" : "text-zinc-400")}>
                Longitude
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.0001"
                  value={isNaN(inputLon) ? "" : inputLon}
                  onChange={(e) => setInputLon(e.target.value === "" ? NaN : parseFloat(e.target.value))}
                  className={cn(
                    "w-16 bg-transparent font-bold text-xs text-right focus:outline-none font-mono",
                    coordValidation.lonError ? "text-rose-200 placeholder-rose-700" : "text-white"
                  )}
                  placeholder="71.2"
                />
                <span className={cn("font-mono text-xs", coordValidation.lonError ? "text-rose-400" : "text-zinc-400")}>
                  {!isNaN(inputLon) ? (inputLon >= 0 ? "°E" : "°W") : "--"}
                </span>
              </div>
            </div>

            {/* Invalid Coordinates Alert */}
            {!coordValidation.isValid && (
              <div
                role="alert"
                className="p-2.5 bg-rose-950/40 border border-rose-500/60 rounded-lg space-y-1.5 text-xs text-rose-200 animate-in fade-in duration-200"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-0.5">
                    <div className="font-bold text-rose-300 text-[11px]">
                      Coordinates Outside Highlighted Area
                    </div>
                    <p className="text-[10px] text-rose-200/90 leading-snug">
                      {coordValidation.message}
                    </p>
                    <div className="text-[9px] text-rose-400/90 font-mono pt-0.5">
                      Valid Bounds: {HIGHLIGHTED_BOUNDS.label}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-rose-800/40 text-[10px]">
                  <span className="text-rose-400/80">Prediction disabled</span>
                  <button
                    type="button"
                    onClick={() => { setInputLat(15.4); setInputLon(71.2); }}
                    className="text-cyan-400 hover:text-cyan-300 font-mono underline cursor-pointer"
                  >
                    Reset (15.4°N, 71.2°E)
                  </button>
                </div>
              </div>
            )}

            {/* Land Surface Alert */}
            {coordValidation.isValid && bathymetryInfo.isLand && (
              <div
                role="alert"
                className="p-2.5 bg-amber-950/40 border border-amber-500/60 rounded-lg space-y-1.5 text-xs text-amber-200 animate-in fade-in duration-200"
              >
                <div className="flex items-start gap-2">
                  <MapPinOff className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="font-bold text-amber-300 text-[11px] flex items-center gap-1.5">
                      <span>Terrestrial Land Selected</span>
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px]">
                        NON-OCEAN
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-200/90 leading-snug">
                      Coordinates fall on land ({bathymetryInfo.description}). Ocean sounding and 3D depth slice are disabled on land surfaces.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-amber-800/40 text-[10px]">
                  <span className="text-amber-400/80">Depth slice locked</span>
                  <button
                    type="button"
                    onClick={() => { setInputLat(14.5); setInputLon(73.2); }}
                    className="text-cyan-400 hover:text-cyan-300 font-mono underline cursor-pointer"
                    title="Select Goa Continental Slope (460m depth)"
                  >
                    Try Ocean Slope (14.5°N, 73.2°E)
                  </button>
                </div>
              </div>
            )}

            {/* Locate Myself Button */}
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={isLocating}
              className="w-full py-2 px-3 rounded-lg bg-[#181922] hover:bg-[#20222e] border border-zinc-800 hover:border-zinc-700 text-white text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              title="Detect your current geographic position and center the 3D globe"
            >
              <Compass className="w-3.5 h-3.5 text-zinc-300" />
              <span className="text-white font-bold">{isLocating ? "Acquiring GPS Fix..." : "Locate Myself"}</span>
            </button>
          </div>

          {/* Data Provenance & Lineage */}
          {coordValidation.isValid && !bathymetryInfo.isLand && (
            <div className="flex items-center justify-between py-1 px-2 bg-[#13141b]/60 border border-zinc-800/60 rounded-lg">
              <span className="text-[10px] font-mono text-zinc-400">DATA LINEAGE</span>
              <DataProvenanceBadge provenance={provenanceInfo} compact />
            </div>
          )}

          {/* Sparse Grid Snapping Alert if > 15km */}
          {coordValidation.isValid && !bathymetryInfo.isLand && provenanceInfo.isSparseOrOffset && (
            <div className="p-2 bg-amber-950/30 border border-amber-500/30 rounded-lg text-[10px] text-amber-300 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400 mt-0.5" />
              <span>Sparse grid point ({provenanceInfo.gridOffsetKm} km to nearest node). Sub-grid variance expected.</span>
            </div>
          )}

          {/* 3. DEPTH PROFILE with Bathymetric Capping & Land Lock */}
          <div className={cn("bg-[#13141b] border border-zinc-800/90 hover:border-zinc-700/90 rounded-xl p-2.5 space-y-1.5 transition-colors", bathymetryInfo.isLand && "opacity-60")}>
            <div className="flex justify-between items-center text-[10px] font-mono">
              <div className="flex items-center gap-1.5">
                <span className="uppercase tracking-wider text-zinc-200 font-semibold">DEPTH PROFILE</span>
                {bathymetryInfo.isLand ? (
                  <span className="px-1.5 py-0.2 bg-rose-950/60 border border-rose-500/40 text-rose-300 rounded text-[9px]">
                    Land Surface (Disabled)
                  </span>
                ) : bathymetryInfo.isContinentalShelf ? (
                  <span className="px-1.5 py-0.2 bg-amber-950/60 border border-amber-500/40 text-amber-300 rounded text-[9px]">
                    Shelf Capped
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-[10px] text-zinc-500">
                  {bathymetryInfo.isLand ? "Land Surface" : `Seafloor: ~${bathymetryInfo.seafloorDepth}m`}
                </span>
                <span className={cn("font-bold text-xs", bathymetryInfo.isLand ? "text-zinc-500" : "text-white")}>
                  {bathymetryInfo.isLand ? "N/A" : `${workbenchDepth}m`}
                </span>
              </div>
            </div>

            <input
              type="range"
              min="0"
              max={bathymetryInfo.maxSafeDepth}
              step={bathymetryInfo.maxSafeDepth <= 100 ? 5 : 10}
              value={Math.min(workbenchDepth, bathymetryInfo.maxSafeDepth)}
              disabled={bathymetryInfo.isLand || !coordValidation.isValid}
              onChange={(e) => !bathymetryInfo.isLand && setWorkbenchDepth(Math.min(Number(e.target.value), bathymetryInfo.maxSafeDepth))}
              className={cn(
                "w-full h-1 bg-zinc-800 rounded appearance-none",
                bathymetryInfo.isLand ? "cursor-not-allowed opacity-40" : "accent-white cursor-pointer"
              )}
            />

            <div className="grid grid-cols-6 gap-1 text-center pt-0.5">
              {[0, 50, 150, 500, 1000, 2000].map((d) => {
                const isExceeded = bathymetryInfo.isLand || d > bathymetryInfo.maxSafeDepth;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => !isExceeded && setWorkbenchDepth(Math.min(d, bathymetryInfo.maxSafeDepth))}
                    disabled={isExceeded}
                    title={
                      bathymetryInfo.isLand
                        ? "Depth sounding disabled on land"
                        : isExceeded
                        ? `Prohibited: Exceeds seafloor depth (~${bathymetryInfo.seafloorDepth}m / max safe: ${bathymetryInfo.maxSafeDepth}m)`
                        : `Set depth to ${d}m`
                    }
                    className={cn(
                      "py-1 rounded text-[10px] font-mono border transition-all text-center truncate",
                      isExceeded
                        ? "bg-[#141418] border-zinc-900 text-zinc-600 cursor-not-allowed line-through opacity-40"
                        : workbenchDepth === d
                        ? "bg-white text-black font-bold border-white shadow-sm cursor-pointer"
                        : "bg-[#181922] border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 cursor-pointer"
                    )}
                  >
                    {d === 0 ? "0m" : `${d}m`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. IN-SITU OBSERVATIONS */}
          <div className="bg-[#13141b] border border-zinc-800/90 hover:border-zinc-700/90 rounded-xl p-2.5 space-y-1.5 transition-colors">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-zinc-200 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-zinc-300" />
                IN-SITU OBSERVATIONS
              </span>
              <span className="text-[9px] font-mono text-zinc-300 bg-[#181922] px-2 py-0.5 rounded border border-zinc-800">
                {IN_SITU_SENSORS.length} ACTIVE
              </span>
            </div>

            {/* Category Filter Pills */}
            <div className="grid grid-cols-5 gap-1">
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
                      "py-1 px-1 rounded-md text-[9px] font-mono transition-all text-center truncate cursor-pointer",
                      isSelected
                        ? "bg-white text-black font-bold shadow-sm"
                        : "bg-[#181922] text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700"
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
                className="w-full bg-[#181922] text-white text-xs font-mono rounded-lg px-2.5 py-1.5 border border-zinc-800 hover:border-zinc-700 focus:border-white/60 focus:outline-none cursor-pointer transition-all appearance-none pr-8 truncate"
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
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-zinc-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* 5. ACTION & SENSORS */}
          <div className="bg-[#13141b] border border-zinc-800/90 hover:border-zinc-700/90 rounded-xl p-2.5 space-y-1.5 transition-colors">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="uppercase tracking-wider text-zinc-200 font-semibold">ACTION &amp; SENSORS</span>
              <span className={cn(
                "font-mono text-[9px]",
                !coordValidation.isValid
                  ? "text-rose-400 font-bold"
                  : bathymetryInfo.isLand
                  ? "text-amber-400 font-bold"
                  : "text-emerald-400 font-bold"
              )}>
                {!coordValidation.isValid ? "INVALID SECTOR" : bathymetryInfo.isLand ? "LAND SURFACE" : "READY"}
              </span>
            </div>

            <button
              type="button"
              onClick={handlePredict}
              disabled={isPredicting || !coordValidation.isValid || bathymetryInfo.isLand}
              className={cn(
                "w-full py-2.5 px-3 rounded-lg text-xs font-sans flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-[0.99]",
                coordValidation.isValid && !bathymetryInfo.isLand
                  ? "bg-white hover:bg-zinc-200 text-black font-bold cursor-pointer"
                  : "bg-zinc-800 text-zinc-500 border border-zinc-700 font-semibold cursor-not-allowed opacity-60"
              )}
              title={
                !coordValidation.isValid
                  ? `Prediction disabled: coordinates must be within highlighted area (${HIGHLIGHTED_BOUNDS.label})`
                  : bathymetryInfo.isLand
                  ? "Prediction & 3D Slice disabled: selected coordinate is on land"
                  : "Predict Ocean State & Open 3D Slice"
              }
            >
              {isPredicting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                  <span>Computing 3D Ocean Model...</span>
                </>
              ) : !coordValidation.isValid ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Outside Highlighted Area (Disabled)</span>
                </>
              ) : bathymetryInfo.isLand ? (
                <>
                  <MapPinOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>3D Depth Slice Disabled (Land Surface)</span>
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
              <div className={cn(
                "bg-[#161616] border rounded-lg px-3 py-2 flex items-center justify-between transition-colors",
                modalCoordValidation.latError
                  ? "border-rose-500/80 bg-rose-950/20 text-rose-200 ring-1 ring-rose-500/30"
                  : "border-[#262626] focus-within:border-white/60"
              )}>
                <span className={cn("text-xs font-mono", modalCoordValidation.latError ? "text-rose-400 font-semibold" : "text-[#888888]")}>
                  Latitude
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.0001"
                    value={isNaN(modalLat) ? "" : modalLat}
                    onChange={(e) => setModalLat(e.target.value === "" ? NaN : parseFloat(e.target.value))}
                    className={cn(
                      "w-20 bg-transparent font-bold text-xs text-right focus:outline-none font-mono",
                      modalCoordValidation.latError ? "text-rose-200 placeholder-rose-700" : "text-white"
                    )}
                    placeholder="15.4"
                  />
                  <span className={cn("font-mono text-xs w-6 text-right", modalCoordValidation.latError ? "text-rose-400" : "text-[#666666]")}>
                    {!isNaN(modalLat) ? (modalLat >= 0 ? "°N" : "°S") : "--"}
                  </span>
                </div>
              </div>

              {/* Longitude */}
              <div className={cn(
                "bg-[#161616] border rounded-lg px-3 py-2 flex items-center justify-between transition-colors",
                modalCoordValidation.lonError
                  ? "border-rose-500/80 bg-rose-950/20 text-rose-200 ring-1 ring-rose-500/30"
                  : "border-[#262626] focus-within:border-white/60"
              )}>
                <span className={cn("text-xs font-mono", modalCoordValidation.lonError ? "text-rose-400 font-semibold" : "text-[#888888]")}>
                  Longitude
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.0001"
                    value={isNaN(modalLon) ? "" : modalLon}
                    onChange={(e) => setModalLon(e.target.value === "" ? NaN : parseFloat(e.target.value))}
                    className={cn(
                      "w-20 bg-transparent font-bold text-xs text-right focus:outline-none font-mono",
                      modalCoordValidation.lonError ? "text-rose-200 placeholder-rose-700" : "text-white"
                    )}
                    placeholder="71.2"
                  />
                  <span className={cn("font-mono text-xs w-6 text-right", modalCoordValidation.lonError ? "text-rose-400" : "text-[#666666]")}>
                    {!isNaN(modalLon) ? (modalLon >= 0 ? "°E" : "°W") : "--"}
                  </span>
                </div>
              </div>

              {/* Invalid Modal Coordinates Alert */}
              {!modalCoordValidation.isValid && (
                <div
                  role="alert"
                  className="p-2.5 bg-rose-950/40 border border-rose-500/60 rounded-lg space-y-1 text-xs text-rose-200 animate-in fade-in duration-150"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                    <div className="space-y-0.5">
                      <div className="font-bold text-rose-300 text-[11px]">
                        Outside Highlighted Area
                      </div>
                      <p className="text-[10px] text-rose-200/90 leading-snug">
                        {modalCoordValidation.message}
                      </p>
                      <div className="text-[9px] text-rose-400/90 font-mono pt-0.5">
                        Valid Bounds: {HIGHLIGHTED_BOUNDS.label}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Land Surface Alert in Modal */}
              {modalCoordValidation.isValid && modalBathymetryInfo.isLand && (
                <div
                  role="alert"
                  className="p-2.5 bg-amber-950/40 border border-amber-500/60 rounded-lg space-y-1 text-xs text-amber-200 animate-in fade-in duration-150"
                >
                  <div className="flex items-start gap-2">
                    <MapPinOff className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="font-bold text-amber-300 text-[11px]">
                        Terrestrial Land Coordinate
                      </div>
                      <p className="text-[10px] text-amber-200/90 leading-snug">
                        Selected location is on land ({modalBathymetryInfo.description}). Subsurface ocean sounding and 3D depth slices require marine waters.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Depth Selection with Bathymetric Capping */}
              <div className={cn("bg-[#161616] border border-[#262626] rounded-lg p-3 space-y-2", modalBathymetryInfo.isLand && "opacity-60")}>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#666666] uppercase tracking-wide">DEPTH PROFILE</span>
                    {modalBathymetryInfo.isLand ? (
                      <span className="px-1.5 py-0.2 bg-rose-950/60 border border-rose-500/40 text-rose-300 rounded text-[9px]">
                        Land Surface
                      </span>
                    ) : modalBathymetryInfo.isContinentalShelf ? (
                      <span className="px-1.5 py-0.2 bg-amber-950/60 border border-amber-500/40 text-amber-300 rounded text-[9px]">
                        Shelf Capped
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-[10px] text-[#666666]">
                      {modalBathymetryInfo.isLand ? "Land Surface" : `Seafloor: ~${modalBathymetryInfo.seafloorDepth}m`}
                    </span>
                    <span className={cn("font-bold text-xs", modalBathymetryInfo.isLand ? "text-[#666666]" : "text-white")}>
                      {modalBathymetryInfo.isLand ? "N/A" : `${modalDepth}m`}
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max={modalBathymetryInfo.maxSafeDepth}
                  step={modalBathymetryInfo.maxSafeDepth <= 100 ? 5 : 10}
                  value={Math.min(modalDepth, modalBathymetryInfo.maxSafeDepth)}
                  disabled={modalBathymetryInfo.isLand || !modalCoordValidation.isValid}
                  onChange={(e) => !modalBathymetryInfo.isLand && setModalDepth(Math.min(Number(e.target.value), modalBathymetryInfo.maxSafeDepth))}
                  className={cn(
                    "w-full h-1 bg-[#222222] rounded appearance-none",
                    modalBathymetryInfo.isLand ? "cursor-not-allowed opacity-40" : "accent-white cursor-pointer"
                  )}
                />

                <div className="grid grid-cols-6 gap-1 text-center pt-0.5">
                  {[0, 50, 150, 500, 1000, 2000].map((d) => {
                    const isExceeded = modalBathymetryInfo.isLand || d > modalBathymetryInfo.maxSafeDepth;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => !isExceeded && setModalDepth(Math.min(d, modalBathymetryInfo.maxSafeDepth))}
                        disabled={isExceeded}
                        title={
                          modalBathymetryInfo.isLand
                            ? "Depth sounding disabled on land"
                            : isExceeded
                            ? `Prohibited: Exceeds seafloor depth (~${modalBathymetryInfo.seafloorDepth}m / max safe: ${modalBathymetryInfo.maxSafeDepth}m)`
                            : `Set depth to ${d}m`
                        }
                        className={cn(
                          "py-1 rounded text-[10px] font-mono border transition-all truncate",
                          isExceeded
                            ? "bg-[#101010] border-[#1a1a1a] text-[#444444] cursor-not-allowed line-through opacity-40"
                            : modalDepth === d
                            ? "bg-white text-black font-bold border-white cursor-pointer"
                            : "bg-[#121212] border-[#222222] text-[#888888] hover:text-white cursor-pointer"
                        )}
                      >
                        {d === 0 ? "0m" : `${d}m`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-1.5 pt-1">
              <button
                type="button"
                onClick={handleApplyModalCoordinates}
                disabled={!modalCoordValidation.isValid || modalBathymetryInfo.isLand}
                className={cn(
                  "w-full py-2.5 px-3 rounded-lg text-xs font-sans flex items-center justify-center gap-1.5 transition-all shadow-md",
                  modalCoordValidation.isValid && !modalBathymetryInfo.isLand
                    ? "bg-white hover:bg-neutral-200 text-black font-bold cursor-pointer active:scale-[0.99]"
                    : "bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-60 font-semibold"
                )}
              >
                {!modalCoordValidation.isValid ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Outside Highlighted Area</span>
                  </>
                ) : modalBathymetryInfo.isLand ? (
                  <>
                    <MapPinOff className="w-3.5 h-3.5 text-amber-400" />
                    <span>Land Surface Selected (Ocean Only)</span>
                  </>
                ) : (
                  <span>Set Coordinates &amp; Depth</span>
                )}
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

      {/* ── MODEL VS. OBSERVED ANOMALY MODAL ── */}
      {showModelVsObsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto custom-scrollbar">
            <ModelVsObsComparator
              initialSensorId={selectedSensorId || 'argo-2902345'}
              onClose={() => setShowModelVsObsModal(false)}
              onTargetCoordinates={(tLat, tLon, tDepth = 0) => {
                setInputLat(tLat);
                setInputLon(tLon);
                setWorkbenchDepth(tDepth);
                sendToEarthIframe({
                  action: 'setLocation',
                  latitude: tLat,
                  longitude: tLon,
                });
                setShowModelVsObsModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
