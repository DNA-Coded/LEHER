import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ArrowLeft, 
  ChevronDown, 
  Locate, 
  RefreshCw, 
  ArrowUpRight,
  Clock,
  Compass,
  MapPin,
  Radio,
  GitCompare,
  Route,
  Maximize2,
  Minimize2,
  ChevronUp,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PROJECTION_LIST, PROJECTION_METADATA, type TimeZone } from '@/components/ui/landing-page';
import { predictOceanState } from '@/lib/api/oceanPredictionService';
import type { LocationAssessmentData, RiskLevel } from '@/lib/types/operational-types';
import { LocationAssessmentPanel } from '@/components/ui/location-assessment-panel';
import { OceanObservationsPanel } from '@/components/ui/ocean-observations-panel';
import { ModelObservationComparisonPanel } from '@/components/ui/model-observation-comparison';
import { RoutePlanningPanel } from '@/components/ui/route-planning-panel';
import { InteractiveMapOverlay } from '@/components/ui/interactive-map-overlay';
import { RiskBadge } from '@/components/ui/risk-badge';

type OperationalTab = 'location' | 'observations' | 'model-vs-obs' | 'route';

const timeZoneMap: Record<TimeZone, { name: string; timeZone: string; offsetLabel: string }> = {
  IST: { name: 'IST (India Standard)', timeZone: 'Asia/Kolkata', offsetLabel: 'UTC+05:30' },
  UTC: { name: 'UTC / GMT (Universal)', timeZone: 'UTC', offsetLabel: 'UTC+00:00' },
  EST: { name: 'EST (US Eastern)', timeZone: 'America/New_York', offsetLabel: 'UTC-05:00' },
  PST: { name: 'PST (US Pacific)', timeZone: 'America/Los_Angeles', offsetLabel: 'UTC-08:00' },
  JST: { name: 'JST (Japan Standard)', timeZone: 'Asia/Tokyo', offsetLabel: 'UTC+09:00' },
  SGT: { name: 'SGT (Singapore)', timeZone: 'Asia/Singapore', offsetLabel: 'UTC+08:00' },
};

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

  // Operational Tabs & UI State
  const [activeTab, setActiveTab] = useState<OperationalTab>('location');
  const [isSidePanelOpen, setIsSidePanelOpen] = useState<boolean>(true);
  const [isMobileSheetExpanded, setIsMobileSheetExpanded] = useState<boolean>(false);
  const [activeRouteView, setActiveRouteView] = useState<'original' | 'safer' | 'compare'>('compare');

  // Dynamically compute location assessment metrics based on Copernicus Marine / CMEMS physics
  const locationAssessmentData: LocationAssessmentData = useMemo(() => {
    const prediction = predictOceanState(inputLat, inputLon, workbenchDepth);
    const riskStatus: RiskLevel = 
      prediction.summary.riskStatus === 'HAZARD' 
        ? 'DANGER' 
        : prediction.summary.riskStatus === 'ADVISORY' 
        ? 'CAUTION' 
        : 'SAFE';

    const hasHazard = riskStatus !== 'SAFE';

    return {
      lat: inputLat,
      lon: inputLon,
      regionName: prediction.location.regionName,
      sst: {
        label: 'Sea Surface Temp',
        value: prediction.variables.thetao.value,
        unit: prediction.variables.thetao.units || '°C',
      },
      currentSpeed: {
        label: 'Current Speed',
        value: prediction.summary.currentSpeedMs,
        knots: prediction.summary.currentSpeedKnots,
        unit: 'm/s',
        directionCompass: prediction.summary.currentDirectionCompass,
        directionDeg: prediction.summary.currentDirectionDeg,
      },
      salinity: {
        label: 'Salinity (so)',
        value: prediction.variables.so.value,
        unit: 'PSU',
      },
      riskStatus,
      riskRationale: prediction.summary.riskMessage,
      hazard: {
        hasHazard,
        type: hasHazard ? 'OCEAN CONDITIONS' : undefined,
        severity: riskStatus === 'DANGER' ? 'SEVERE' : riskStatus === 'CAUTION' ? 'MODERATE' : undefined,
        status: riskStatus === 'DANGER' ? 'WARNING IN EFFECT' : riskStatus === 'CAUTION' ? 'ACTIVE ADVISORY' : undefined,
        probability: hasHazard ? (riskStatus === 'DANGER' ? 88 : 62) : 10,
        details: prediction.summary.riskMessage,
      },
    };
  }, [inputLat, inputLon, workbenchDepth]);

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

  const handleBackToHome = () => {
    if (window.history.length > 1 && window.opener) {
      window.close();
    } else {
      window.location.href = '/';
    }
  };

  const earthIframeUrl = useMemo(() => {
    const projName = activeProjection || 'concentric_region';
    return `/earth/index.html#current/ocean/surface/currents/overlay=ocean/${projName}`;
  }, [activeProjection]);

  return (
    <div className="h-screen w-screen bg-[#050505] text-white flex flex-col overflow-hidden font-sans">
      {/* 1. TOP NAVIGATION HEADER */}
      <header className="h-16 bg-[#090909] border-b border-[#222222] px-4 sm:px-6 flex justify-between items-center z-30 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToHome}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs font-mono text-[#cccccc] hover:text-white transition-all cursor-pointer shadow-sm focus:ring-2 focus:ring-cyan-400 focus:outline-none"
            title="Return to Home"
            aria-label="Return to Home page"
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
          </div>
        </div>

        {/* Center Primary Navigation */}
        <div className="hidden lg:flex items-center gap-1 text-xs font-medium">
          <a
            href="/"
            className="px-3 py-1.5 rounded-xl text-[#888888] hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            Home
          </a>
          <a
            href="/about"
            className="px-3 py-1.5 rounded-xl text-[#888888] hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            About
          </a>
          <span className="px-3 py-1.5 rounded-xl text-white bg-white/[0.08] border border-white/15 font-semibold relative">
            <span>Explore / Platform</span>
            <span className="absolute bottom-0.5 left-3 right-3 h-0.5 bg-cyan-400 rounded-full" />
          </span>
        </div>

        {/* Right Section: Real-time clock & Timezone */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 font-mono text-xs text-[#aaaaaa] bg-[#141414] px-3 py-1.5 rounded-xl border border-[#262626]">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{realTimeClock}</span>
            <select
              value={selectedTimeZone}
              onChange={(e) => setSelectedTimeZone(e.target.value as TimeZone)}
              className="bg-[#1f1f1f] text-white text-xs font-mono rounded px-1.5 py-0.5 border border-[#333333] focus:outline-none cursor-pointer hover:border-cyan-500 transition-colors ml-1"
              aria-label="Select Timezone"
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

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        {/* 2A. LEFT / CENTER: 3D EARTH + INTERACTIVE HUD OVERLAY */}
        <div className="flex-1 h-full relative bg-[#040404]">
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

          {/* Interactive HUD Map Overlay */}
          <InteractiveMapOverlay
            targetLat={inputLat}
            targetLon={inputLon}
            targetDepth={workbenchDepth}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onSelectCoordinates={(lat, lon) => {
              setInputLat(lat);
              setInputLon(lon);
            }}
            isSidePanelOpen={isSidePanelOpen}
            onToggleSidePanel={() => setIsSidePanelOpen(prev => !prev)}
            activeRouteView={activeRouteView}
          />
        </div>

        {/* 2B. RIGHT DESKTOP OPERATIONAL DECK */}
        {isSidePanelOpen && (
          <aside className="hidden lg:flex w-[440px] xl:w-[480px] bg-[#0c0c0c] border-l border-[#222222] flex-col z-20 shadow-2xl shrink-0 h-full overflow-hidden">
            {/* Top Operational Bar */}
            <div className="p-4 border-b border-[#222222] bg-[#0e0e0e] shrink-0 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Maritime Operations Deck
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-[#888888]">
                    {PROJECTION_METADATA[activeProjection] || 'Concentric'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSidePanelOpen(false)}
                    className="p-1 rounded hover:bg-white/10 text-[#888888] hover:text-white transition-colors cursor-pointer"
                    title="Collapse sidebar to expand map view"
                    aria-label="Collapse sidebar"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 4 OPERATIONAL MODE TABS */}
              <nav className="grid grid-cols-4 gap-1 bg-[#161616] p-1 rounded-xl border border-[#262626]">
                <button
                  type="button"
                  onClick={() => setActiveTab('location')}
                  className={cn(
                    "py-2 px-1.5 rounded-lg text-[11px] font-mono font-medium flex flex-col items-center gap-1 transition-all cursor-pointer text-center",
                    activeTab === 'location'
                      ? "bg-cyan-400 text-black font-bold shadow-md"
                      : "text-[#888888] hover:text-white hover:bg-white/[0.04]"
                  )}
                  title="Location Assessment"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate w-full">Location</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('observations')}
                  className={cn(
                    "py-2 px-1.5 rounded-lg text-[11px] font-mono font-medium flex flex-col items-center gap-1 transition-all cursor-pointer text-center",
                    activeTab === 'observations'
                      ? "bg-cyan-400 text-black font-bold shadow-md"
                      : "text-[#888888] hover:text-white hover:bg-white/[0.04]"
                  )}
                  title="Argo Floats & Underwater Gliders"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span className="truncate w-full">Observations</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('model-vs-obs')}
                  className={cn(
                    "py-2 px-1.5 rounded-lg text-[11px] font-mono font-medium flex flex-col items-center gap-1 transition-all cursor-pointer text-center",
                    activeTab === 'model-vs-obs'
                      ? "bg-cyan-400 text-black font-bold shadow-md"
                      : "text-[#888888] hover:text-white hover:bg-white/[0.04]"
                  )}
                  title="Model vs In-Situ Observation Verification"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  <span className="truncate w-full">Validation</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('route')}
                  className={cn(
                    "py-2 px-1.5 rounded-lg text-[11px] font-mono font-medium flex flex-col items-center gap-1 transition-all cursor-pointer text-center",
                    activeTab === 'route'
                      ? "bg-cyan-400 text-black font-bold shadow-md"
                      : "text-[#888888] hover:text-white hover:bg-white/[0.04]"
                  )}
                  title="Route Planning, Risk, and Safer Alternatives"
                >
                  <Route className="w-3.5 h-3.5" />
                  <span className="truncate w-full">Route &amp; Risk</span>
                </button>
              </nav>
            </div>

            {/* Scrollable Active Mode Content */}
            <div className="flex-1 p-5 overflow-y-auto space-y-6">
              {/* Projection Dropdown */}
              <div className="space-y-1.5 text-xs font-sans bg-[#121212] border border-[#222222] p-3 rounded-xl">
                <div className="flex justify-between items-center text-[11px] text-[#888888]">
                  <span>Globe Projection</span>
                  <span className="text-cyan-400 font-mono text-[10px]">
                    {PROJECTION_METADATA[activeProjection] || activeProjection}
                  </span>
                </div>
                <div className="relative">
                  <select
                    value={activeProjection}
                    onChange={(e) => handleSelectProjection(e.target.value)}
                    className="w-full bg-[#181818] text-white text-xs font-mono rounded-lg px-3 py-2 border border-[#2e2e2e] hover:border-[#444444] focus:border-cyan-400 focus:outline-none cursor-pointer transition-all appearance-none pr-8"
                    aria-label="Earth Projection"
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

              {/* Dynamic Panel Switcher */}
              {activeTab === 'location' && (
                <LocationAssessmentPanel
                  data={locationAssessmentData}
                  workbenchDepth={workbenchDepth}
                  onDepthChange={setWorkbenchDepth}
                  inputLat={inputLat}
                  inputLon={inputLon}
                  onLatChange={setInputLat}
                  onLonChange={setInputLon}
                  onLocateMe={handleLocateMe}
                  isLocating={isLocating}
                  onPredict={handlePredict}
                  isPredicting={isPredicting}
                  presets={LOCATION_PRESETS}
                />
              )}

              {activeTab === 'observations' && (
                <OceanObservationsPanel
                  onSelectCoordinates={(lat, lon) => {
                    setInputLat(lat);
                    setInputLon(lon);
                  }}
                />
              )}

              {activeTab === 'model-vs-obs' && (
                <ModelObservationComparisonPanel />
              )}

              {activeTab === 'route' && (
                <RoutePlanningPanel
                  activeRouteView={activeRouteView}
                  onSelectRouteView={setActiveRouteView}
                />
              )}
            </div>
          </aside>
        )}

        {/* 2C. MOBILE RESPONSIVE BOTTOM SHEET */}
        <div className="lg:hidden absolute bottom-0 inset-x-0 z-30 pointer-events-auto">
          {/* Collapsed Bottom Bar / Tap Handle */}
          <div className="bg-[#0e0e0e]/95 backdrop-blur-xl border-t border-[#262626] p-3 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => setIsMobileSheetExpanded(!isMobileSheetExpanded)}
                className="flex items-center gap-2 text-left cursor-pointer flex-1"
                aria-label="Toggle mobile operations deck"
              >
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <div className="truncate">
                  <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                    <span className="truncate">{locationAssessmentData.regionName}</span>
                    <RiskBadge level={locationAssessmentData.riskStatus} size="sm" />
                  </div>
                  <div className="text-[10px] font-mono text-[#888888]">
                    {inputLat.toFixed(2)}°N, {inputLon.toFixed(2)}°E @ {workbenchDepth}m
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsMobileSheetExpanded(!isMobileSheetExpanded)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white cursor-pointer ml-2"
                aria-label={isMobileSheetExpanded ? "Collapse sheet" : "Expand sheet"}
              >
                {isMobileSheetExpanded ? (
                  <ChevronDown className="w-5 h-5 text-cyan-400" />
                ) : (
                  <ChevronUp className="w-5 h-5 text-cyan-400" />
                )}
              </button>
            </div>

            {/* Mobile Tab Selector Pill */}
            <div className="grid grid-cols-4 gap-1 bg-[#181818] p-1 rounded-xl border border-[#2a2a2a]">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('location');
                  setIsMobileSheetExpanded(true);
                }}
                className={cn(
                  "py-2 px-1 rounded-lg text-[10px] font-mono font-medium flex flex-col items-center gap-0.5 transition-colors cursor-pointer",
                  activeTab === 'location'
                    ? "bg-cyan-400 text-black font-bold"
                    : "text-[#888888] hover:text-white"
                )}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Location</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('observations');
                  setIsMobileSheetExpanded(true);
                }}
                className={cn(
                  "py-2 px-1 rounded-lg text-[10px] font-mono font-medium flex flex-col items-center gap-0.5 transition-colors cursor-pointer",
                  activeTab === 'observations'
                    ? "bg-cyan-400 text-black font-bold"
                    : "text-[#888888] hover:text-white"
                )}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Observations</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('model-vs-obs');
                  setIsMobileSheetExpanded(true);
                }}
                className={cn(
                  "py-2 px-1 rounded-lg text-[10px] font-mono font-medium flex flex-col items-center gap-0.5 transition-colors cursor-pointer",
                  activeTab === 'model-vs-obs'
                    ? "bg-cyan-400 text-black font-bold"
                    : "text-[#888888] hover:text-white"
                )}
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>Validation</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('route');
                  setIsMobileSheetExpanded(true);
                }}
                className={cn(
                  "py-2 px-1 rounded-lg text-[10px] font-mono font-medium flex flex-col items-center gap-0.5 transition-colors cursor-pointer",
                  activeTab === 'route'
                    ? "bg-cyan-400 text-black font-bold"
                    : "text-[#888888] hover:text-white"
                )}
              >
                <Route className="w-3.5 h-3.5" />
                <span>Route</span>
              </button>
            </div>
          </div>

          {/* Expanded Mobile Sheet Body */}
          {isMobileSheetExpanded && (
            <div className="bg-[#0c0c0c] border-t border-[#262626] max-h-[68vh] overflow-y-auto p-4 space-y-4 shadow-2xl">
              {activeTab === 'location' && (
                <LocationAssessmentPanel
                  data={locationAssessmentData}
                  workbenchDepth={workbenchDepth}
                  onDepthChange={setWorkbenchDepth}
                  inputLat={inputLat}
                  inputLon={inputLon}
                  onLatChange={setInputLat}
                  onLonChange={setInputLon}
                  onLocateMe={handleLocateMe}
                  isLocating={isLocating}
                  onPredict={handlePredict}
                  isPredicting={isPredicting}
                  presets={LOCATION_PRESETS}
                />
              )}

              {activeTab === 'observations' && (
                <OceanObservationsPanel
                  onSelectCoordinates={(lat, lon) => {
                    setInputLat(lat);
                    setInputLon(lon);
                  }}
                />
              )}

              {activeTab === 'model-vs-obs' && (
                <ModelObservationComparisonPanel />
              )}

              {activeTab === 'route' && (
                <RoutePlanningPanel
                  activeRouteView={activeRouteView}
                  onSelectRouteView={setActiveRouteView}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
