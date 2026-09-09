import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Globe from "@/components/ui/globe";
import { cn } from "@/lib/utils";
import { 
  X, 
  Play, 
  Pause, 
  Maximize2,
  Menu
} from "lucide-react";
import { leherDataService, type TraceablePointReport } from "@/lib/data/registry.ts";
import { ShinyButton } from "@/components/ui/shiny-button";
import { SpinningBorderButton } from "@/components/ui/spinning-border-button";

export type TimeZone = 'IST' | 'UTC' | 'EST' | 'PST' | 'JST' | 'SGT';

const timeZoneMap: Record<TimeZone, { name: string; timeZone: string; offsetLabel: string }> = {
  IST: { name: 'IST (India Standard)', timeZone: 'Asia/Kolkata', offsetLabel: 'UTC+05:30' },
  UTC: { name: 'UTC / GMT (Universal)', timeZone: 'UTC', offsetLabel: 'UTC+00:00' },
  EST: { name: 'EST (US Eastern)', timeZone: 'America/New_York', offsetLabel: 'UTC-05:00' },
  PST: { name: 'PST (US Pacific)', timeZone: 'America/Los_Angeles', offsetLabel: 'UTC-08:00' },
  JST: { name: 'JST (Japan Standard)', timeZone: 'Asia/Tokyo', offsetLabel: 'UTC+09:00' },
  SGT: { name: 'SGT (Singapore)', timeZone: 'Asia/Singapore', offsetLabel: 'UTC+08:00' },
};

export const PROJECTION_METADATA: Record<string, string> = {
  orthographic: "3D Globe (Orthographic)",
  concentric_region: "Concentric Focus (40°S–30°N, 20°–130°E)",
  equirectangular: "Flat Map (Plate Carrée)",
  winkel3: "Winkel Tripel (Compromise)",
  waterman: "Waterman Butterfly (Polyhedron)",
  stereographic: "Stereographic (Conformal)",
  azimuthal_equidistant: "Azimuthal Polar (Equidistant)",
  conic_equidistant: "Conic Equidistant",
  atlantis: "Atlantis (Transverse Equal-Area)",
};

export const PROJECTION_LIST = [
  { key: 'orthographic', name: '3D Globe', desc: 'Spherical Orthographic', badge: '3D' },
  { key: 'equirectangular', name: 'Flat Map', desc: 'Plate Carrée Cylindrical', badge: 'FLAT' },
  { key: 'winkel3', name: 'Winkel Tripel', desc: 'Compromise World Map', badge: 'GLOBAL' },
  { key: 'waterman', name: 'Waterman', desc: 'Butterfly Octahedron', badge: 'POLY' },
  { key: 'stereographic', name: 'Stereographic', desc: 'True-Shape Perspective', badge: 'CONFORM' },
  { key: 'azimuthal_equidistant', name: 'Azimuthal', desc: 'Equidistant True-Distance', badge: 'POLAR' },
  { key: 'conic_equidistant', name: 'Conic', desc: 'Mid-Latitude Equidistant', badge: 'CONIC' },
  { key: 'atlantis', name: 'Atlantis', desc: 'Transverse Equal-Area', badge: 'OCEAN' },
];

const defaultGlobeConfig = {
  positions: [
    { top: "50%", left: "70%", scale: 1.2 },  // 0: Hero (Locked in position)
    { top: "50%", left: "70%", scale: 1.2 },  // 1: Spatio-Temporal (Behind vertical stratification)
    { top: "50%", left: "70%", scale: 1.2 },  // 2: Data Integration (Locked in place)
    { top: "50%", left: "70%", scale: 1.2 },  // 3: Profiles (Locked in place)
    { top: "50%", left: "70%", scale: 1.2 },  // 4: Capabilities (Locked in place)
    { top: "52%", left: "50%", scale: 1.2 },  // 5: Model vs Reality (Smoothly glides to center & merges behind card)
    { top: "50%", left: "50%", scale: 0.0 },  // 6: Platform Preview (Hidden, workbench iframe takes over)
  ]
};

const parsePercent = (str: string): number => parseFloat(str.replace('%', ''));

export default function LeherLandingPage() {
  const [activeSection, setActiveSection] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [globeTransform, setGlobeTransform] = useState("");
  const [isPlatformOpen, setIsPlatformOpen] = useState(false);
  const [isEarthFullscreen, setIsEarthFullscreen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isGlobePaused, setIsGlobePaused] = useState(false);
  const [selectedTimeZone, setSelectedTimeZone] = useState<TimeZone>('IST');
  const [realTimeClock, setRealTimeClock] = useState<string>('');
  const [pointReport, setPointReport] = useState<TraceablePointReport | null>(null);

  // Listen for globe paused / unpaused state messages from the 3D globe iframe
  useEffect(() => {
    const handleGlobeMessage = (event: MessageEvent) => {
      if (event.data && typeof event.data.isPaused === "boolean") {
        setIsGlobePaused(event.data.isPaused);
      }
    };
    window.addEventListener("message", handleGlobeMessage);
    return () => window.removeEventListener("message", handleGlobeMessage);
  }, []);

  // Initialize Scientific Data Service on mount
  useEffect(() => {
    leherDataService.initialize().then(() => {
      setPointReport(leherDataService.getPointData(15.4, 71.2, 0));
    });
  }, []);

  // Ticking Real-Time Multi-TimeZone Clock (IST default)
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

  // Interactive State for Model vs Reality Widget
  const [selectedDepth, setSelectedDepth] = useState<number>(250);
  const [selectedVar, setSelectedVar] = useState<'temp' | 'sal' | 'chl'>('temp');

  // Interactive Workbench State for Platform Preview
  const [workbenchVar, setWorkbenchVar] = useState<'temp' | 'sal' | 'chl' | 'cur'>('cur');
  const [workbenchDepth, setWorkbenchDepth] = useState<number>(150);
  const [workbenchMode, setWorkbenchMode] = useState<'ocean' | 'air'>('ocean');
  const [workbenchAnimate, setWorkbenchAnimate] = useState<'currents' | 'wind'>('currents');
  const [activeProjection, setActiveProjection] = useState<string>('orthographic');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [inspectedCoords, setInspectedCoords] = useState<{
    valLat: string;
    valLon: string;
    decLat: string;
    decLon: string;
    status: string;
  }>({
    valLat: "--° --' --\"",
    valLon: "--° --' --\"",
    decLat: "--.----°",
    decLon: "--.----°",
    status: "Click Globe To Inspect",
  });

  // Listen for coordinates from Earth iframe inspection
  useEffect(() => {
    const handleEarthMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "earth:location") {
        const lat = typeof e.data.latitude === "number" ? e.data.latitude : 0;
        const lon = typeof e.data.longitude === "number" ? e.data.longitude : 0;
        setInspectedCoords({
          valLat: e.data.latDMS || `${Math.abs(lat).toFixed(2)}°`,
          valLon: e.data.lonDMS || `${Math.abs(lon).toFixed(2)}°`,
          decLat: lat >= 0 ? `${lat.toFixed(4)}° N` : `${Math.abs(lat).toFixed(4)}° S`,
          decLon: lon >= 0 ? `${lon.toFixed(4)}° E` : `${Math.abs(lon).toFixed(4)}° W`,
          status: "Point Inspected",
        });
      } else if (e.data.type === "earth:clear") {
        setInspectedCoords({
          valLat: "--° --' --\"",
          valLon: "--° --' --\"",
          decLat: "--.----°",
          decLon: "--.----°",
          status: "Click Globe To Inspect",
        });
      }
    };
    window.addEventListener("message", handleEarthMessage);
    return () => window.removeEventListener("message", handleEarthMessage);
  }, []);

  const sendToEarthIframe = useCallback((data: { action: string; projection?: string }) => {
    const iframes = document.querySelectorAll<HTMLIFrameElement>('iframe[title*="Earth"]');
    iframes.forEach((iframe) => {
      try {
        iframe.contentWindow?.postMessage(data, "*");
      } catch (err) {
        console.warn("Unable to postMessage to Earth iframe", err);
      }
    });
  }, []);

  const handleLocateMe = useCallback(() => {
    setIsLocating(true);
    setInspectedCoords((prev) => ({ ...prev, status: "Detecting GPS..." }));
    sendToEarthIframe({ action: "locateMe" });
    setTimeout(() => {
      setIsLocating(false);
    }, 3500);
  }, [sendToEarthIframe]);

  const handleClearCoords = useCallback(() => {
    setInspectedCoords({
      valLat: "--° --' --\"",
      valLon: "--° --' --\"",
      decLat: "--.----°",
      decLon: "--.----°",
      status: "Click Globe To Inspect",
    });
    sendToEarthIframe({ action: "clearLocation" });
  }, [sendToEarthIframe]);

  const handleSelectProjection = useCallback((projKey: string) => {
    setActiveProjection(projKey);
    sendToEarthIframe({ action: "setProjection", projection: projKey });
  }, [sendToEarthIframe]);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [activeLayers, setActiveLayers] = useState({
    model: true,
    argo: true,
    glider: true,
    currents: true,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const animationFrameId = useRef<number | undefined>(undefined);

  const calculatedPositions = useMemo(() => {
    return defaultGlobeConfig.positions.map(pos => ({
      top: parsePercent(pos.top),
      left: parsePercent(pos.left),
      scale: pos.scale
    }));
  }, []);

  const lastScrollPosRef = useRef(0);

  const updateScrollPosition = useCallback(() => {
    const scrollTop = window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? Math.min(Math.max(scrollTop / docHeight, 0), 1) : 0;
    
    setScrollProgress(progress);

    // Whenever user scrolls or moves the page, restore globe to its natural state and resume normal rotation
    if (Math.abs(scrollTop - lastScrollPosRef.current) > 1 || scrollTop > 2) {
      const globeIframe = document.getElementById("leher-globe-iframe") as HTMLIFrameElement | null;
      globeIframe?.contentWindow?.postMessage({ type: "LEHER_RESUME_ROTATION" }, "*");
      setIsGlobePaused(false);
    }
    lastScrollPosRef.current = scrollTop;

    const viewportCenter = window.innerHeight / 2;
    let newActiveSection = 0;
    let minDistance = Infinity;

    sectionRefs.current.forEach((ref, index) => {
      if (ref) {
        const rect = ref.getBoundingClientRect();
        const sectionCenter = rect.top + rect.height / 2;
        const distance = Math.abs(sectionCenter - viewportCenter);
        
        if (distance < minDistance) {
          minDistance = distance;
          newActiveSection = index;
        }
      }
    });

    // Section-aware globe positioning:
    // Sections 0 to 4 (Hero through Capabilities): globe sticks strictly in place at top: 50%, left: 70%, scale: 1.2
    // Section 5 (Model vs Reality): glides smoothly to center (top: 52%, left: 50%, scale: 1.2) and merges with Model vs Reality
    // Section 6 (Workbench): scales down to 0 as operational workbench takes over
    const sec4 = sectionRefs.current[4];
    const sec5 = sectionRefs.current[5];
    const sec6 = sectionRefs.current[6];

    let currentLeft = 70;
    let currentTop = 50;
    let currentScale = 1.2;

    if (sec4 && sec5) {
      const top4 = sec4.offsetTop;
      const top5 = sec5.offsetTop;
      const top6 = sec6 ? sec6.offsetTop : (top5 + 850);

      if (scrollTop <= top4) {
        // Stick in this place only across hero, spatio-temporal, data, profiles, and capabilities
        currentLeft = 70;
        currentTop = 50;
        currentScale = 1.2;
      } else if (scrollTop < top5) {
        // Smoothly transition and glide into center as Model vs Reality enters
        const t = Math.min(Math.max((scrollTop - top4) / (top5 - top4), 0), 1);
        currentLeft = 70 + (50 - 70) * t;
        currentTop = 50 + (52 - 50) * t;
        currentScale = 1.2;
      } else if (scrollTop < top6) {
        // Merged in center at Model vs Reality, transitioning to Workbench
        const t = Math.min(Math.max((scrollTop - top5) / (top6 - top5), 0), 1);
        currentLeft = 50;
        currentTop = 52;
        currentScale = 1.2 * (1 - t);
      } else {
        // In Section 6: hidden
        currentLeft = 50;
        currentTop = 52;
        currentScale = 0;
      }
    }

    const transform = `translate3d(${currentLeft.toFixed(2)}vw, ${currentTop.toFixed(2)}vh, 0) translate3d(-50%, -50%, 0) scale3d(${currentScale.toFixed(3)}, ${currentScale.toFixed(3)}, 1)`;
    
    setGlobeTransform(transform);
    setActiveSection(newActiveSection);
  }, []);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        animationFrameId.current = requestAnimationFrame(() => {
          updateScrollPosition();
          ticking = false;
        });
        ticking = true;
      }
    };

    const handlePageMove = () => {
      const globeIframe = document.getElementById("leher-globe-iframe") as HTMLIFrameElement | null;
      globeIframe?.contentWindow?.postMessage({ type: "LEHER_RESUME_ROTATION" }, "*");
      setIsGlobePaused(false);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("wheel", handlePageMove, { passive: true });
    window.addEventListener("touchmove", handlePageMove, { passive: true });
    updateScrollPosition();
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("wheel", handlePageMove);
      window.removeEventListener("touchmove", handlePageMove);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [updateScrollPosition]);

  useEffect(() => {
    const initialPos = calculatedPositions[0];
    if (initialPos) {
      setGlobeTransform(`translate3d(${initialPos.left}vw, ${initialPos.top}vh, 0) translate3d(-50%, -50%, 0) scale3d(${initialPos.scale}, ${initialPos.scale}, 1)`);
    }
  }, [calculatedPositions]);

  // Model vs Reality Calculated Metrics
  const modelValues = {
    temp: (28.5 - (selectedDepth / 100) * 1.8).toFixed(1),
    sal: (35.2 + (selectedDepth / 200) * 0.4).toFixed(2),
    chl: Math.max(0.05, 1.4 - (selectedDepth / 80) * 0.35).toFixed(2),
  };

  const observedValues = {
    temp: (28.1 - (selectedDepth / 100) * 1.75).toFixed(1),
    sal: (35.15 + (selectedDepth / 200) * 0.38).toFixed(2),
    chl: Math.max(0.04, 1.25 - (selectedDepth / 80) * 0.32).toFixed(2),
  };

  const diffValues = {
    temp: (parseFloat(modelValues.temp) - parseFloat(observedValues.temp)).toFixed(1),
    sal: (parseFloat(modelValues.sal) - parseFloat(observedValues.sal)).toFixed(2),
    chl: (parseFloat(modelValues.chl) - parseFloat(observedValues.chl)).toFixed(2),
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getEarthIframeUrl = (
    varType: 'temp' | 'sal' | 'chl' | 'cur',
    mode: 'ocean' | 'air' = workbenchMode,
    proj: string = activeProjection
  ) => {
    const projName = proj || 'orthographic';

    if (mode === 'air') {
      let ovStr = 'none';
      if (varType === 'temp') ovStr = 'temp';
      else if (varType === 'sal') ovStr = 'relative_humidity';
      else if (varType === 'chl') ovStr = 'total_cloud_water';
      else if (varType === 'cur') ovStr = 'wind';
      return `/earth/index.html#current/wind/surface/level/overlay=${ovStr}/${projName}`;
    } else {
      let ovStr = 'currents';
      if (varType === 'temp') ovStr = 'temp';
      else if (varType === 'sal') ovStr = 'relative_humidity';
      else if (varType === 'chl') ovStr = 'total_cloud_water';
      else if (varType === 'cur') ovStr = 'ocean';
      return `/earth/index.html#current/ocean/surface/currents/overlay=${ovStr}/${projName}`;
    }
  };

  const renderMergedControlsAndAnalytics = () => (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="border-b border-[#222222] pb-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Operations & Analytics</h3>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-cyan-400 bg-cyan-950/40 px-2.5 py-0.5 rounded-full border border-cyan-800/40">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>OPERATIONS ACTIVE</span>
        </div>
      </div>

      {/* System Clock Card */}
      <div className="p-3.5 rounded-xl bg-[#141414] border border-[#222222] space-y-2">
        <div className="flex justify-between items-center text-[10px] font-mono text-[#888888] uppercase tracking-wider">
          <span>Operations Clock</span>
          <span className="text-cyan-400 font-bold">{selectedTimeZone} ({timeZoneMap[selectedTimeZone].offsetLabel})</span>
        </div>
        <div className="text-sm font-mono text-white font-bold">
          <span>{realTimeClock}</span>
        </div>
        <div className="pt-1 flex items-center justify-between gap-2 text-xs font-mono">
          <label className="text-[11px] text-[#aaaaaa]">Timezone:</label>
          <select
            value={selectedTimeZone}
            onChange={(e) => setSelectedTimeZone(e.target.value as TimeZone)}
            className="bg-[#1f1f1f] text-white text-xs font-mono rounded-lg px-2 py-1 border border-[#333333] focus:outline-none cursor-pointer hover:border-cyan-500 transition-colors"
          >
            {Object.entries(timeZoneMap).map(([tz, info]) => (
              <option key={tz} value={tz}>
                {tz} ({info.offsetLabel})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Geographic Coordinates Inspector */}
      <div className="p-3.5 rounded-xl bg-[#141414] border border-[#222222] space-y-3">
        <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-wider">
          <span className="text-[#888888]">Location Coordinates</span>
          <span className="text-cyan-400 font-semibold">{inspectedCoords.status}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-black/50 border border-white/5 rounded-xl p-2.5">
            <div className="text-[10px] font-mono text-[#666666]">LATITUDE (φ)</div>
            <div className="text-xs font-mono font-bold text-cyan-300 mt-0.5 truncate">{inspectedCoords.valLat}</div>
            <div className="text-[10px] font-mono text-[#888888] mt-0.5">{inspectedCoords.decLat}</div>
          </div>
          <div className="bg-black/50 border border-white/5 rounded-xl p-2.5">
            <div className="text-[10px] font-mono text-[#666666]">LONGITUDE (λ)</div>
            <div className="text-xs font-mono font-bold text-cyan-300 mt-0.5 truncate">{inspectedCoords.valLon}</div>
            <div className="text-[10px] font-mono text-[#888888] mt-0.5">{inspectedCoords.decLon}</div>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button
            onClick={handleLocateMe}
            disabled={isLocating}
            className="py-2 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white font-sans font-bold text-xs flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-cyan-900/30 disabled:opacity-60"
          >
            <span>{isLocating ? "Detecting Location..." : "Auto-Detect Location"}</span>
          </button>
          <button
            onClick={handleClearCoords}
            title="Clear Selection"
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-red-950/40 border border-white/10 hover:border-red-500/40 text-[#aaaaaa] hover:text-red-300 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Earth Projections Switcher */}
      <div className="space-y-2.5">
        <div className="flex justify-between items-center text-xs font-mono text-[#888888]">
          <span className="uppercase tracking-wider">Regional Map Views</span>
          <span className="text-cyan-400 font-semibold text-[10px]">
            {PROJECTION_METADATA[activeProjection] || activeProjection}
          </span>
        </div>

        {/* Concentric Region Special Button */}
        <button 
          onClick={() => handleSelectProjection('concentric_region')}
          className={cn(
            "w-full p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden",
            activeProjection === 'concentric_region'
              ? "bg-gradient-to-br from-emerald-950/70 to-cyan-950/70 border-cyan-400 shadow-[0_0_20px_rgba(56,189,248,0.3)]"
              : "bg-gradient-to-br from-emerald-950/25 to-cyan-950/25 border-cyan-800/40 hover:border-cyan-500/60"
          )}
        >
          <div className="flex items-center justify-end">
            <span className={cn(
              "text-[9px] font-mono px-2 py-0.5 rounded uppercase font-bold tracking-wider",
              activeProjection === 'concentric_region' ? "bg-cyan-400 text-black" : "bg-cyan-950/60 text-cyan-300 border border-cyan-800/40"
            )}>
              CONCENTRIC FOCUS
            </span>
          </div>
          <div className="font-bold text-white font-mono text-xs mt-1.5">40°S–30°N / 20°–130°E</div>
          <div className="text-[11px] text-[#aaaaaa] font-sans mt-0.5">Indian Ocean & Indo-Pacific Regional Bounding Box</div>
        </button>

        {/* 8 Standard Projections Grid */}
        <div className="grid grid-cols-2 gap-2">
          {PROJECTION_LIST.map((p) => {
            const isActive = activeProjection === p.key;
            return (
              <button
                key={p.key}
                onClick={() => handleSelectProjection(p.key)}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1",
                  isActive
                    ? "bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.25)] text-white"
                    : "bg-[#141414] border-[#222222] text-[#aaaaaa] hover:border-[#3a3a3a] hover:text-white"
                )}
              >
                <div className="flex items-center justify-end">
                  <span className={cn(
                    "text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold",
                    isActive ? "bg-cyan-400 text-black font-bold" : "bg-white/5 text-[#888888]"
                  )}>
                    {p.badge}
                  </span>
                </div>
                <div className="font-bold text-white font-sans text-xs">{p.name}</div>
                <div className="text-[10px] text-[#777777] font-sans truncate">{p.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Concentric Region Spec Box */}
        {activeProjection === 'concentric_region' && (
          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-[11px] font-mono space-y-1 text-emerald-300">
            <div className="font-bold text-xs text-white">Concentric Regional Focus</div>
            <div><strong>Latitude:</strong> 40°00'00"S to 30°00'00"N</div>
            <div><strong>Longitude:</strong> 20°00'00"E to 130°00'00"E</div>
            <div className="text-[10px] text-emerald-400/80 pt-1 border-t border-emerald-900/40">
              Target region rendered in vivid green & ocean blue. High-resolution regional domain.
            </div>
          </div>
        )}
      </div>

      {/* Variable Selector */}
      <div className="space-y-2">
        <label className="text-xs font-mono text-[#888888] uppercase tracking-wider">Environmental Conditions</label>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <button onClick={() => { setWorkbenchVar('cur'); setWorkbenchMode('ocean'); setWorkbenchAnimate('currents'); }} className={cn("p-2.5 rounded-xl text-left border transition-all cursor-pointer", workbenchVar === 'cur' ? "bg-white text-black font-bold border-white" : "bg-[#141414] border-[#222222] text-[#aaaaaa] hover:text-white")}>Currents</button>
          <button onClick={() => setWorkbenchVar('temp')} className={cn("p-2.5 rounded-xl text-left border transition-all cursor-pointer", workbenchVar === 'temp' ? "bg-white text-black font-bold border-white" : "bg-[#141414] border-[#222222] text-[#aaaaaa] hover:text-white")}>SST</button>
          <button onClick={() => setWorkbenchVar('sal')} className={cn("p-2.5 rounded-xl text-left border transition-all cursor-pointer", workbenchVar === 'sal' ? "bg-white text-black font-bold border-white" : "bg-[#141414] border-[#222222] text-[#aaaaaa] hover:text-white")}>Salinity</button>
          <button onClick={() => setWorkbenchVar('chl')} className={cn("p-2.5 rounded-xl text-left border transition-all cursor-pointer", workbenchVar === 'chl' ? "bg-white text-black font-bold border-white" : "bg-[#141414] border-[#222222] text-[#aaaaaa] hover:text-white")}>Sea State</button>
        </div>
      </div>

      {/* Depth Slice Level Slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-mono text-[#888888]">
          <span>Depth Level</span>
          <span className="text-white font-bold bg-[#1a1a1a] px-2 py-0.5 rounded border border-[#333]">{workbenchDepth}m</span>
        </div>
        <input 
          type="range" min="0" max="2000" step="10" 
          value={workbenchDepth} 
          onChange={(e) => setWorkbenchDepth(Number(e.target.value))} 
          className="w-full accent-white h-1.5 bg-[#222222] rounded appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-[10px] font-mono text-[#666666]">
          <span>Surface (0m)</span>
          <span>Mid-Depth (500m)</span>
          <span>Deep (2000m)</span>
        </div>
      </div>

      {/* Mode & Animate Options Box */}
      <div className="p-3.5 rounded-2xl bg-[#121212] border border-[#222222] space-y-3 font-mono text-xs">
        <div className="border-b border-[#222222] pb-2 flex justify-between items-center">
          <span className="text-white font-bold uppercase tracking-wider text-[11px]">Environmental Controls</span>
          <span className="text-cyan-400 text-[10px] bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">ACTIVE</span>
        </div>

        {/* Mode: Air | Ocean */}
        <div className="space-y-1.5">
          <div className="text-[10px] text-[#888888] uppercase tracking-wider">Domain</div>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => setWorkbenchMode('ocean')} 
              className={cn("py-1.5 px-3 rounded-lg border text-center transition-all cursor-pointer text-xs", workbenchMode === 'ocean' ? "bg-amber-400/20 border-amber-400 text-amber-300 font-bold" : "bg-[#090909] border-[#222222] text-[#888888] hover:text-white")}
            >
              Ocean
            </button>
            <button 
              onClick={() => setWorkbenchMode('air')} 
              className={cn("py-1.5 px-3 rounded-lg border text-center transition-all cursor-pointer text-xs", workbenchMode === 'air' ? "bg-amber-400/20 border-amber-400 text-amber-300 font-bold" : "bg-[#090909] border-[#222222] text-[#888888] hover:text-white")}
            >
              Atmosphere
            </button>
          </div>
        </div>

        {/* Animate: Currents | Wind */}
        <div className="space-y-1.5">
          <div className="text-[10px] text-[#888888] uppercase tracking-wider">Dynamics</div>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => { setWorkbenchAnimate('currents'); setWorkbenchVar('cur'); setWorkbenchMode('ocean'); }} 
              className={cn("py-1.5 px-3 rounded-lg border text-center transition-all cursor-pointer text-xs", workbenchAnimate === 'currents' ? "bg-amber-400/20 border-amber-400 text-amber-300 font-bold" : "bg-[#090909] border-[#222222] text-[#888888] hover:text-white")}
            >
              Currents
            </button>
            <button 
              onClick={() => { setWorkbenchAnimate('wind'); setWorkbenchMode('air'); }} 
              className={cn("py-1.5 px-3 rounded-lg border text-center transition-all cursor-pointer text-xs", workbenchAnimate === 'wind' ? "bg-amber-400/20 border-amber-400 text-amber-300 font-bold" : "bg-[#090909] border-[#222222] text-[#888888] hover:text-white")}
            >
              Wind
            </button>
          </div>
        </div>

        {/* Data & Source Scale Bar */}
        <div className="space-y-2 pt-2 border-t border-[#222222]">
          <div className="flex justify-between text-[10px] text-[#888888]">
            <span>DATA: <strong className="text-white">Surface Ocean Currents</strong></span>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] text-[#888888]">Scale:</div>
            <div className="h-2 w-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 via-green-400 via-yellow-400 to-red-600 border border-white/20" />
          </div>
          <div className="text-[10px] text-[#888888]">
            SOURCE: <span className="text-[#cccccc]">Verified Ocean Current Model</span>
          </div>
        </div>
      </div>

      {/* Location Assessment Telemetry */}
      <div className="p-4 rounded-2xl bg-[#121212] border border-[#222222] space-y-3 font-mono text-xs">
        <div className="border-b border-[#222222] pb-2">
          <div className="flex justify-between items-center">
            <div className="text-[10px] text-[#888888] uppercase">LOCATION ASSESSMENT & RISK STATUS</div>
            <span className="text-[10px] text-emerald-400 font-mono">Active</span>
          </div>
          <div className="font-bold text-white font-sans text-sm mt-0.5">Selected Ocean Location</div>
          <div className="text-[#666666] text-[11px]">Arabian Sea (15.4°N, 71.2°E)</div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between p-2 rounded bg-[#090909] border border-[#222222]">
            <span className="text-[#888888]">2m Air Temp:</span>
            <span className="text-white font-bold">
              {pointReport?.measurements.atmosphericTemperature
                ? `${pointReport.measurements.atmosphericTemperature.value} °C`
                : "27.8 °C"}
            </span>
          </div>
          <div className="flex justify-between p-2 rounded bg-[#090909] border border-[#222222]">
            <span className="text-[#888888]">Surface Current Speed:</span>
            <span className="text-white font-bold">
              {pointReport?.measurements.oceanCurrentSpeed
                ? `${pointReport.measurements.oceanCurrentSpeed.value} m/s`
                : "0.42 m/s"}
            </span>
          </div>
          <div className="flex justify-between p-2 rounded bg-[#090909] border border-[#222222]">
            <span className="text-[#888888]">Environmental Status:</span>
            <span className="text-white font-bold">Normal</span>
          </div>
          <div className="flex justify-between p-2 rounded bg-[#090909] border border-[#222222]">
            <span className="text-emerald-400">RISK STATUS:</span>
            <span className="text-emerald-400 font-bold">SAFE</span>
          </div>
          {workbenchDepth > 15 && (
            <div className="p-2 rounded bg-[#1a1405] border border-amber-900/40 text-[10px] text-amber-300">
              Depth Level ({workbenchDepth}m): Verified multi-layer environmental conditions.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div 
      ref={containerRef}
      className="relative w-full max-w-screen overflow-x-hidden min-h-screen text-white font-sans selection:bg-white/20 selection:text-white"
    >
      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-[2px] bg-[#1a1a1a] z-50">
        <div 
          className="h-full bg-white will-change-transform"
          style={{ 
            transform: `scaleX(${scrollProgress})`,
            transformOrigin: 'left center',
            transition: 'transform 0.1s ease-out'
          }}
        />
      </div>

      {/* NAVIGATION */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#080808]/80 backdrop-blur-md border-b border-[#1c1c1c]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <div 
            className="flex items-center gap-3.5 cursor-pointer group" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="relative w-10 h-10 group-hover:scale-105 transition-transform duration-300 flex items-center justify-center">
              <img 
                src="/logo.png" 
                alt="Leher Logo" 
                title="Leher"
                className="w-full h-full object-contain" 
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-2xl tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                Leher
              </span>
              <span className="text-xs font-mono text-[#888888] border-l border-[#262626] pl-3 hidden sm:inline">
                Maritime Safety & Hazards
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#aaaaaa]">
            <button onClick={() => scrollToSection('section-story')} className="hover:text-white transition-colors cursor-pointer">Explore</button>
            <button onClick={() => scrollToSection('section-data')} className="hover:text-white transition-colors cursor-pointer">Conditions</button>
            <button onClick={() => scrollToSection('section-capabilities')} className="hover:text-white transition-colors cursor-pointer">Capabilities</button>
            <button onClick={() => scrollToSection('section-model')} className="hover:text-white transition-colors cursor-pointer">Location Assessment</button>
            <button onClick={() => scrollToSection('section-preview')} className="hover:text-white transition-colors cursor-pointer">Operations</button>
          </div>

          {/* Action CTA & Hamburger Menu */}
          <div className="flex items-center gap-3">
            <ShinyButton 
              onClick={() => setIsPlatformOpen(true)}
              className="hidden sm:inline-flex py-2 px-5 text-xs font-semibold"
            >
              Open Operations
            </ShinyButton>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2.5 rounded-xl bg-[#141414] hover:bg-[#222222] border border-[#262626] text-white flex items-center gap-2 cursor-pointer transition-all"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* HAMBURGER MENU OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-20 z-40 bg-[#080808]/95 backdrop-blur-xl border-b border-[#222222] p-6 flex flex-col justify-between transition-all duration-300 animate-in fade-in slide-in-from-top-4">
          <div className="space-y-6 max-w-xl mx-auto w-full pt-4">
            <div className="text-xs font-mono uppercase text-[#888888] tracking-widest border-b border-[#222222] pb-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Leher Logo" title="Leher" className="w-5 h-5 rounded-full object-contain" />
                <span>Operations Menu</span>
              </div>
              <span className="text-emerald-400 font-mono text-xs">{realTimeClock}</span>
            </div>
            <div className="flex flex-col gap-3 text-base sm:text-lg font-semibold text-[#cccccc]">
              <button 
                onClick={() => { scrollToSection('section-story'); setIsMobileMenuOpen(false); }} 
                className="text-left py-2.5 px-4 rounded-xl bg-[#121212] hover:bg-[#1a1a1a] hover:text-white border border-[#222222] transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>Open Operations</span>
                <span className="text-xs font-mono text-[#666666]">01</span>
              </button>
              <button 
                onClick={() => { scrollToSection('section-data'); setIsMobileMenuOpen(false); }} 
                className="text-left py-2.5 px-4 rounded-xl bg-[#121212] hover:bg-[#1a1a1a] hover:text-white border border-[#222222] transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>Maritime Conditions</span>
                <span className="text-xs font-mono text-[#666666]">02</span>
              </button>
              <button 
                onClick={() => { scrollToSection('section-capabilities'); setIsMobileMenuOpen(false); }} 
                className="text-left py-2.5 px-4 rounded-xl bg-[#121212] hover:bg-[#1a1a1a] hover:text-white border border-[#222222] transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>Risk & Hazard Intelligence</span>
                <span className="text-xs font-mono text-[#666666]">03</span>
              </button>
              <button 
                onClick={() => { scrollToSection('section-model'); setIsMobileMenuOpen(false); }} 
                className="text-left py-2.5 px-4 rounded-xl bg-[#121212] hover:bg-[#1a1a1a] hover:text-white border border-[#222222] transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>Location Assessment</span>
                <span className="text-xs font-mono text-[#666666]">04</span>
              </button>
              <button 
                onClick={() => { scrollToSection('section-preview'); setIsMobileMenuOpen(false); }} 
                className="text-left py-2.5 px-4 rounded-xl bg-[#121212] hover:bg-[#1a1a1a] hover:text-white border border-[#222222] transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>Operations Console</span>
                <span className="text-xs font-mono text-[#666666]">05</span>
              </button>
            </div>

            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ShinyButton 
                onClick={() => { setIsPlatformOpen(true); setIsMobileMenuOpen(false); }} 
                className="w-full py-3 text-xs font-bold"
              >
                Open Operations Console
              </ShinyButton>
              <SpinningBorderButton 
                onClick={() => { setIsEarthFullscreen(true); setIsMobileMenuOpen(false); }}
                className="w-full"
              >
                View Operations Map
              </SpinningBorderButton>
            </div>
          </div>

          <div className="max-w-xl mx-auto w-full text-center text-xs font-mono text-[#666666] pt-4 border-t border-[#181818] flex items-center justify-center gap-2">
            <img src="/logo.png" alt="Leher Logo" title="Leher" className="w-4 h-4 rounded-full opacity-80" />
            <span>Leher Maritime Safety & Hazard Intelligence • INCOIS</span>
          </div>
        </div>
      )}

      {/* 3D GLOBE BACKDROP (Hidden when fullscreen or at 3D workbench section) */}
      <div
        className={cn(
          "fixed pointer-events-none will-change-transform",
          activeSection === 0 ? "z-25" : "z-10"
        )}
        style={{
          transform: globeTransform,
          transition: "transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s ease-out",
          opacity: (isEarthFullscreen || isPlatformOpen || activeSection === 6) ? 0 : 0.95,
        }}
      >
        <div className="scale-75 sm:scale-90 lg:scale-100 pointer-events-auto">
          <Globe />
        </div>
      </div>

      {/* Landing Page Interactive Globe Status Pill (Click to stop / resume) */}
      {activeSection === 0 && (
        <div 
          onClick={() => {
            const iframe = document.getElementById("leher-globe-iframe") as HTMLIFrameElement | null;
            if (isGlobePaused) {
              iframe?.contentWindow?.postMessage({ type: "LEHER_RESUME_ROTATION" }, "*");
              setIsGlobePaused(false);
            } else {
              iframe?.contentWindow?.postMessage({ type: "LEHER_STOP_ROTATION" }, "*");
              setIsGlobePaused(true);
            }
          }}
          className={cn(
            "hidden sm:flex fixed bottom-8 right-8 lg:right-24 z-30 items-center gap-2.5 px-4 py-2 rounded-full border transition-all duration-300 cursor-pointer backdrop-blur-md shadow-xl select-none",
            isGlobePaused 
              ? "bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30" 
              : "bg-[#141414]/80 border-white/15 text-[#aaaaaa] hover:text-white hover:border-white/30"
          )}
          title={isGlobePaused ? "Globe stopped. Click to resume auto-rotation." : "Click globe or badge to stop auto-rotation."}
        >
          {isGlobePaused ? (
            <>
              <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
              <span className="text-xs font-mono font-medium tracking-wide">Globe Paused • Click to Resume</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-xs font-mono tracking-wide">Interactive Globe • Click / Touch to Stop</span>
            </>
          )}
        </div>
      )}

      {/* ========================================================
          HERO SECTION
         ======================================================== */}
      <section
        ref={(el) => { sectionRefs.current[0] = el; }}
        className="relative min-h-screen flex flex-col justify-center px-6 lg:px-12 z-20 pt-24 pb-16 max-w-7xl mx-auto pointer-events-none"
      >
        <div className="max-w-2xl space-y-7 pointer-events-auto">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#121212] border border-[#262626] backdrop-blur-md shadow-sm">
            <img src="/logo.png" alt="Leher Logo" title="Leher" className="w-5 h-5 rounded-full object-contain shadow" />
            <span className="text-xs font-mono text-cyan-300 font-medium tracking-wide">LEHER • MARITIME SAFETY & HAZARD INTELLIGENCE</span>
          </div>
          <div className="space-y-1">
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-white leading-[1.05]">
              LEHER
            </h1>
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-[#888888] leading-[1.05]">
              Indian Ocean Maritime Safety & Hazard Intelligence
            </h2>
          </div>

          <p className="text-[#888888] text-base sm:text-lg font-light leading-relaxed max-w-xl">
            Real-time maritime condition assessment, hazard intelligence, risk zones, and safer route planning across the Indian Ocean.
          </p>

          <div className="text-xs text-[#666666] tracking-wide flex items-center gap-2">
            <span>• Maritime Condition Assessment</span>
            <span>• Hazard Detection</span>
            <span>• Safer Route Planning</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <ShinyButton 
              onClick={() => scrollToSection('section-story')}
              className="py-3 px-7 text-sm font-semibold shadow-lg"
            >
              Open Operations
            </ShinyButton>
            <SpinningBorderButton 
              onClick={() => scrollToSection('section-preview')}
            >
              View Operations Map
            </SpinningBorderButton>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 1: SPATIO-TEMPORAL DYNAMICS
         ======================================================== */}
      <section
        id="section-story"
        ref={(el) => { sectionRefs.current[1] = el; }}
        className="relative min-h-screen flex flex-col justify-center px-6 lg:px-12 z-20 py-24 max-w-7xl mx-auto"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="text-xs font-mono text-[#888888] uppercase tracking-widest">
              MARITIME SURVEILLANCE
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
              Monitor Maritime Conditions in Real Time.
            </h2>
            <p className="text-[#888888] leading-relaxed text-base font-light">
              Assess ocean conditions that directly influence maritime safety, navigation, and operational decisions.
            </p>
            
            <div className="grid grid-cols-2 gap-4 pt-4 text-sm">
              <div className="p-4 rounded-xl bg-[#121212] border border-[#222222]">
                <div className="font-mono text-xs text-[#777777] uppercase mb-1">POSITION & COVERAGE</div>
                <div className="text-white">Indian Ocean navigation domain</div>
              </div>
              <div className="p-4 rounded-xl bg-[#121212] border border-[#222222]">
                <div className="font-mono text-xs text-[#777777] uppercase mb-1">SURFACE & DEPTH</div>
                <div className="text-white">Surface and subsurface layers</div>
              </div>
              <div className="p-4 rounded-xl bg-[#121212] border border-[#222222]">
                <div className="font-mono text-xs text-[#777777] uppercase mb-1">TEMPORAL FORECAST</div>
                <div className="text-white">Hourly updates and trend tracking</div>
              </div>
              <div className="p-4 rounded-xl bg-[#121212] border border-[#222222]">
                <div className="font-mono text-xs text-[#777777] uppercase mb-1">MULTI-VARIABLE</div>
                <div className="text-white">Wind, waves, currents & salinity</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 p-6 sm:p-8 rounded-2xl bg-[#0a0f18]/45 backdrop-blur-xl border border-cyan-500/20 shadow-[0_8px_32px_rgba(0,0,0,0.6)] space-y-4">
            <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider flex justify-between items-center">
              <span>Operational Conditions</span>
              <span className="text-[10px] text-[#888888] font-sans">Active Status</span>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="p-4 rounded-xl bg-black/35 backdrop-blur-md border border-white/10 flex justify-between hover:border-cyan-500/30 transition-all">
                <span className="text-white font-medium">Sea Surface Temperature</span>
                <span className="font-mono text-xs text-[#888888]">Thermal Status</span>
              </div>
              <div className="p-4 rounded-xl bg-black/35 backdrop-blur-md border border-white/10 flex justify-between hover:border-cyan-500/30 transition-all">
                <span className="text-white font-medium">Surface Current Speed</span>
                <span className="font-mono text-xs text-[#888888]">Drift Vector</span>
              </div>
              <div className="p-4 rounded-xl bg-black/35 backdrop-blur-md border border-white/10 flex justify-between hover:border-cyan-500/30 transition-all">
                <span className="text-white font-medium">Salinity</span>
                <span className="font-mono text-xs text-[#888888]">Water Mass</span>
              </div>
              <div className="p-4 rounded-xl bg-black/35 backdrop-blur-md border border-white/10 flex justify-between hover:border-cyan-500/30 transition-all">
                <span className="text-white font-medium">Sea State</span>
                <span className="font-mono text-xs text-[#888888]">Roughness</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 2: DATA INTEGRATION (DATA PART)
         ======================================================== */}
      <section
        id="section-data"
        ref={(el) => { sectionRefs.current[2] = el; }}
        className="relative min-h-screen flex flex-col justify-center px-6 lg:px-12 z-20 py-24 max-w-7xl mx-auto"
      >
        <div className="space-y-4 max-w-2xl mb-12">
          <div className="text-xs font-mono text-[#888888] uppercase tracking-widest">
            LIVE ENVIRONMENTAL CONDITIONS
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
            Live Maritime Environmental Conditions.
          </h2>
          <p className="text-[#888888] leading-relaxed text-base font-light">
            Integrated environmental information provides the conditions required for maritime risk assessment and operational awareness.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: "Sea Surface Temperature", desc: "Monitors thermal gradients, temperature fronts, and anomalous heat layers impacting navigation routes.", spec: "High-Resolution SST" },
            { title: "Surface Currents", desc: "Tracks surface flow vectors, velocities, and directional drift critical for vessel course and stability.", spec: "Current Vectors & Drift" },
            { title: "Salinity", desc: "Assesses sea surface salinity distribution influencing water mass density and acoustic propagation.", spec: "Practical Salinity Field" },
            { title: "Wind Conditions", desc: "Measures 10m surface winds, gusts, and directional vectors driving sea state and surface drift.", spec: "Surface Wind Vectors" },
            { title: "Sea State", desc: "Evaluates wave dynamics, swell direction, and sea surface roughness to identify hazardous navigation waters.", spec: "Wave & Swell Dynamics" },
            { title: "Environmental Observations", desc: "In-situ monitoring networks and satellite feeds integrated for continuous risk ground truthing.", spec: "Continuous Surveillance" }
          ].map((item, idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-[#121212]/80 backdrop-blur-md border border-[#222222] hover:border-cyan-500/30 transition-all space-y-3">
              <h3 className="text-lg font-bold text-white">{item.title}</h3>
              <p className="text-[#888888] text-sm leading-relaxed">{item.desc}</p>
              <div className="text-xs font-mono text-[#aaaaaa]">{item.spec}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================
          SECTION 3: LOCATION RISK ASSESSMENT
         ======================================================== */}
      <section
        ref={(el) => { sectionRefs.current[3] = el; }}
        className="relative min-h-screen flex flex-col justify-center px-6 lg:px-12 z-20 py-24 max-w-7xl mx-auto"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <div className="text-xs font-mono text-[#888888] uppercase tracking-widest">
              LOCATION RISK ASSESSMENT
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
              Select a Location to Assess Risk.
            </h2>
            <p className="text-[#888888] leading-relaxed text-base font-light">
              Click any location on the Indian Ocean map to view current environmental conditions and maritime risk status.
            </p>

            <div className="space-y-2.5 text-sm">
              <div className="p-4 rounded-xl bg-[#121212] border border-[#222222] flex justify-between">
                <span className="text-white">Latitude</span>
                <span className="font-mono text-xs text-[#888888]">15.4000° N</span>
              </div>
              <div className="p-4 rounded-xl bg-[#121212] border border-[#222222] flex justify-between">
                <span className="text-white">Longitude</span>
                <span className="font-mono text-xs text-[#888888]">71.2000° E</span>
              </div>
              <div className="p-4 rounded-xl bg-[#121212] border border-[#222222] flex justify-between">
                <span className="text-white">SST</span>
                <span className="font-mono text-xs text-[#888888]">28.2 °C</span>
              </div>
              <div className="p-4 rounded-xl bg-[#121212] border border-[#222222] flex justify-between">
                <span className="text-white">Current Speed</span>
                <span className="font-mono text-xs text-[#888888]">0.42 m/s</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 p-6 sm:p-8 rounded-2xl bg-[#0a0f18]/45 backdrop-blur-xl border border-cyan-500/20 shadow-[0_8px_32px_rgba(0,0,0,0.6)] space-y-6">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Location Assessment</h3>
                <span className="text-xs font-mono text-cyan-300/80">Arabian Sea Station (15.4°N, 71.2°E)</span>
              </div>
              <div className="font-mono text-xs text-white bg-black/40 px-3 py-1 rounded-lg border border-white/15">
                DEPTH: {selectedDepth} m
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-[#888888] font-mono">
                <span>Surface (0 m)</span>
                <span>Mid-Depth (1,000 m)</span>
                <span>Deep (2,000 m)</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="2000" 
                step="10" 
                value={selectedDepth} 
                onChange={(e) => setSelectedDepth(Number(e.target.value))} 
                className="w-full h-1.5 bg-[#222222] rounded appearance-none cursor-pointer accent-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-black/35 backdrop-blur-md border border-white/10 text-center">
                <div className="text-xs text-[#888888] font-mono mb-1">SST</div>
                <div className="text-2xl font-bold text-white font-mono">{modelValues.temp} °C</div>
              </div>
              <div className="p-4 rounded-xl bg-black/35 backdrop-blur-md border border-white/10 text-center">
                <div className="text-xs text-[#888888] font-mono mb-1">CURRENT SPEED</div>
                <div className="text-2xl font-bold text-white font-mono">0.42 m/s</div>
              </div>
              <div className="p-4 rounded-xl bg-black/35 backdrop-blur-md border border-white/10 text-center">
                <div className="text-xs text-[#888888] font-mono mb-1">RISK STATUS</div>
                <div className="text-2xl font-bold text-emerald-400 font-mono">SAFE</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 4: CAPABILITIES (BELOW DATA PART)
         ======================================================== */}
      <section 
        id="section-capabilities"
        ref={(el) => { sectionRefs.current[4] = el; }}
        className="relative min-h-screen flex flex-col justify-center px-6 lg:px-12 z-20 py-24 max-w-7xl mx-auto"
      >
        <div className="space-y-4 max-w-2xl mb-16">
          <div className="text-xs font-mono text-[#888888] uppercase tracking-widest">
            OPERATIONAL CAPABILITIES
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
            Maritime Risk & Hazard Intelligence.
          </h2>
          <p className="text-[#888888] leading-relaxed text-base font-light">
            Monitor conditions, identify hazards, assess location risk, and support safer maritime decisions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: "3D Maritime Visualization", desc: "Spatial representation of maritime domain conditions and dynamic oceanic vectors." },
            { title: "Risk Zone Monitoring", desc: "Continuous surveillance of designated maritime transit corridors and high-risk zones." },
            { title: "Hazard Detection", desc: "Early identification of convective storms, cyclone paths, extreme wave heights, and anomalies." },
            { title: "Location Assessment", desc: "Point-specific inspection of multi-parameter environmental conditions and safety indicators." },
            { title: "Route Risk Analysis", desc: "Comprehensive risk indexing along planned vessel transit waypoints and navigation lanes." },
            { title: "Safer Route Planning", desc: "Identifies safer navigational trajectories avoiding severe hazards and extreme sea states." },
            { title: "Operational Alerts", desc: "Audio and visual notifications for vessels entering high-risk areas or deteriorating weather." },
            { title: "Environmental Monitoring", desc: "Unified tracking of winds, currents, sea surface temperature, and swell dynamics." }
          ].map((item, idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-[#121212]/80 backdrop-blur-md border border-[#222222] hover:border-cyan-500/30 transition-all space-y-2">
              <h3 className="text-base font-bold text-white">{item.title}</h3>
              <p className="text-[#888888] text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================
          SECTION 5: MODEL VS REALITY (THEN MODEL AND REALITY)
         ======================================================== */}
      <section
        id="section-model"
        ref={(el) => { sectionRefs.current[5] = el; }}
        className="relative min-h-screen flex flex-col justify-center px-6 lg:px-12 z-20 py-24 max-w-7xl mx-auto"
      >
        <div className="space-y-4 max-w-2xl mb-12">
          <div className="text-xs font-mono text-[#888888] uppercase tracking-widest">
            LOCATION ASSESSMENT
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
            Location Assessment
          </h2>
          <p className="text-[#888888] leading-relaxed text-base font-light">
            Evaluate multi-source environmental conditions and determine operational safety status.
          </p>
        </div>

        <div className="max-w-4xl p-8 rounded-2xl bg-[#0a0f18]/55 backdrop-blur-xl border border-cyan-500/25 shadow-[0_8px_32px_rgba(0,0,0,0.6)] space-y-8">
          <div className="flex flex-wrap justify-between items-center gap-4 border-b border-white/10 pb-6">
            <div>
              <span className="text-xs font-mono text-cyan-400 uppercase">Location Profile</span>
              <h3 className="text-xl font-bold text-white">Selected Ocean Location</h3>
              <p className="text-xs text-[#aaaaaa] font-mono">Location: 15.4°N, 71.2°E | Level: {selectedDepth}m</p>
            </div>

            <div className="flex gap-2">
              {(['temp', 'sal', 'chl'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setSelectedVar(v)}
                  className={cn(
                    "px-4 py-1.5 rounded-xl text-xs font-mono uppercase transition-all cursor-pointer",
                    selectedVar === v ? "bg-white text-black font-bold" : "bg-black/40 text-[#aaaaaa] hover:text-white border border-white/15"
                  )}
                >
                  {v === 'temp' ? 'SST' : v === 'sal' ? 'Salinity' : 'Sea State'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 space-y-1">
              <div className="text-xs font-mono text-[#888888]">SST</div>
              <div className="text-3xl font-bold text-white font-mono">
                {modelValues[selectedVar]} {selectedVar === 'temp' ? '°C' : selectedVar === 'sal' ? 'PSU' : 'mg/m³'}
              </div>
              <div className="text-xs text-[#666666]">Sea Surface Temperature</div>
            </div>

            <div className="p-6 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 space-y-1">
              <div className="text-xs font-mono text-[#aaaaaa]">CURRENT SPEED</div>
              <div className="text-3xl font-bold text-white font-mono">
                0.42 m/s
              </div>
              <div className="text-xs text-[#666666]">Surface Drift Vector</div>
            </div>

            <div className="p-6 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 space-y-1">
              <div className="text-xs font-mono text-emerald-400">RISK STATUS</div>
              <div className="text-3xl font-bold text-emerald-400 font-mono">
                SAFE
              </div>
              <div className="text-xs text-[#666666]">
                Within Operational Thresholds
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 6: PLATFORM PREVIEW WITH CENTER 3D EARTH WORKBENCH
         ======================================================== */}
      <section 
        id="section-preview"
        ref={(el) => { sectionRefs.current[6] = el; }}
        className="relative min-h-screen flex flex-col justify-center px-4 sm:px-6 lg:px-12 z-20 py-20 max-w-7xl mx-auto"
      >
        <div className="space-y-4 max-w-2xl mb-8">
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
            OPERATIONS CONSOLE
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
            Indian Ocean Maritime Operations Console
          </h2>
          <p className="text-[#888888] leading-relaxed text-base font-light">
            Interactive maritime map for environmental assessment, hazard awareness, and route safety decisions.
          </p>
        </div>

        <div className="rounded-3xl bg-[#090909] border border-[#222222] overflow-hidden shadow-2xl">
          <div className="bg-[#121212] px-6 py-3.5 border-b border-[#222222] flex flex-wrap justify-between items-center text-xs font-mono text-[#888888] gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-white font-bold">INDIAN OCEAN MARITIME OPERATIONS CONSOLE</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[#aaaaaa] font-mono text-xs">{realTimeClock}</span>
              <button
                onClick={() => setIsEarthFullscreen(true)}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-sans text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" /> Fullscreen Map
              </button>
            </div>
          </div>

          <div className="grid grid-cols-12 min-h-[580px]">
            {/* Left Controls */}
            <div className="col-span-12 lg:col-span-3 bg-[#0d0d0d] border-r border-[#222222] p-5 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-mono text-[#888888] uppercase">Sea Conditions</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button onClick={() => setWorkbenchVar('cur')} className={cn("p-2 rounded-lg text-left border font-mono transition-all cursor-pointer", workbenchVar === 'cur' ? "bg-white text-black font-bold border-white" : "bg-[#141414] border-[#222222] text-[#888888] hover:text-white")}>Currents</button>
                  <button onClick={() => setWorkbenchVar('temp')} className={cn("p-2 rounded-lg text-left border font-mono transition-all cursor-pointer", workbenchVar === 'temp' ? "bg-white text-black font-bold border-white" : "bg-[#141414] border-[#222222] text-[#888888] hover:text-white")}>SST</button>
                  <button onClick={() => setWorkbenchVar('sal')} className={cn("p-2 rounded-lg text-left border font-mono transition-all cursor-pointer", workbenchVar === 'sal' ? "bg-white text-black font-bold border-white" : "bg-[#141414] border-[#222222] text-[#888888] hover:text-white")}>Salinity</button>
                  <button onClick={() => setWorkbenchVar('chl')} className={cn("p-2 rounded-lg text-left border font-mono transition-all cursor-pointer", workbenchVar === 'chl' ? "bg-white text-black font-bold border-white" : "bg-[#141414] border-[#222222] text-[#888888] hover:text-white")}>Sea State</button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono text-[#888888]">
                  <span>Depth Slice</span>
                  <span className="text-white font-bold">{workbenchDepth}m</span>
                </div>
                <input 
                  type="range" min="0" max="1000" step="10" 
                  value={workbenchDepth} 
                  onChange={(e) => setWorkbenchDepth(Number(e.target.value))} 
                  className="w-full accent-white h-1.5 bg-[#222222] rounded appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-2 text-xs">
                <label className="text-xs font-mono text-[#888888] uppercase">Operational Layers</label>
                {[
                  { label: "Risk Zones", key: "gliders" },
                  { label: "Active Hazards", key: "argo" },
                  { label: "Location Assessment", key: "moorings" }
                ].map((item) => (
                  <label key={item.key} className="flex justify-between items-center p-2 rounded-lg bg-[#141414] border border-[#222222] cursor-pointer hover:border-[#333333]">
                    <span className="text-[#cccccc] font-sans">{item.label}</span>
                    <input type="checkbox" defaultChecked className="accent-white cursor-pointer" />
                  </label>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setIsPlatformOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-all cursor-pointer shadow-md"
                >
                  Open Operations Console
                </button>
              </div>
            </div>

            {/* Center 3D Earth Display */}
            <div className="col-span-12 lg:col-span-6 bg-[#040404] relative flex flex-col justify-between overflow-hidden">
              <div className="absolute top-3 left-4 right-4 z-10 flex justify-between items-center gap-2 pointer-events-none">
                <div className="bg-[#000000]/80 backdrop-blur-md px-3 py-1 rounded-lg border border-[#262626] text-xs font-mono text-[#cccccc] pointer-events-auto">
                  Environmental Condition: <span className="text-white uppercase font-bold">{workbenchVar}</span> @ {workbenchDepth}m Level
                </div>

                <div className="bg-[#080808]/85 backdrop-blur-md px-3 py-1 rounded-lg border border-[#262626] flex items-center gap-3 text-[11px] font-mono text-[#888888] pointer-events-auto">
                  <button onClick={() => setIsPlaying(!isPlaying)} className="hover:text-white flex items-center gap-1.5 cursor-pointer">
                    {isPlaying ? <Pause className="w-3 h-3 text-emerald-400" /> : <Play className="w-3 h-3 text-white" />}
                    <span className="font-semibold text-[#e0e0e0]">{isPlaying ? "LIVE" : "PAUSED"}</span>
                  </button>
                  <span className="text-[10px] text-[#888888] hidden sm:inline">{realTimeClock}</span>
                </div>
              </div>

              {/* CENTER 3D EARTH IFRAME */}
              <div className="w-full h-full min-h-[500px] relative">
                <iframe
                  key={workbenchVar}
                  src={getEarthIframeUrl(workbenchVar)}
                  title="Leher Workbench 3D Earth"
                  className="w-full h-full border-0 absolute inset-0"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Right Telemetry Sidebar */}
            <div className="col-span-12 lg:col-span-3 bg-[#0d0d0d] border-l border-[#222222] p-5 space-y-4 text-xs font-mono">
              <div className="border-b border-[#222222] pb-3">
                <div className="flex justify-between items-center">
                  <span className="text-[#888888] uppercase text-[10px]">SELECTED LOCATION</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 font-mono">Surveillance Active</span>
                </div>
                <h4 className="text-sm font-bold text-white font-sans mt-0.5">Selected Ocean Location</h4>
                <div className="text-[#666666] text-[11px] mt-1">Arabian Sea (15.4°N, 71.2°E)</div>
              </div>

              <div className="space-y-2.5">
                <div className="flex flex-col p-2.5 rounded-lg bg-[#141414] border border-[#222222] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[#888888]">2m Air Temp:</span>
                    <span className="text-white font-bold">
                      {pointReport?.measurements.atmosphericTemperature
                        ? `${pointReport.measurements.atmosphericTemperature.value} °C`
                        : "27.8 °C"}
                    </span>
                  </div>
                  <div className="text-[9px] text-[#666666] flex justify-between">
                    <span>Source: Atmospheric Model</span>
                    <span>Verified</span>
                  </div>
                </div>

                <div className="flex flex-col p-2.5 rounded-lg bg-[#141414] border border-[#222222] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[#888888]">Surface Current:</span>
                    <span className="text-white font-bold">
                      {pointReport?.measurements.oceanCurrentSpeed
                        ? `${pointReport.measurements.oceanCurrentSpeed.value} m/s (${pointReport.measurements.oceanCurrentSpeedKnots?.value} kn)`
                        : "0.42 m/s (0.8 kn)"}
                    </span>
                  </div>
                  <div className="text-[9px] text-[#666666] flex justify-between">
                    <span>Source: Ocean Velocity Field</span>
                    <span>Depth: 15m</span>
                  </div>
                </div>

                <div className="flex flex-col p-2.5 rounded-lg bg-[#141414] border border-[#222222] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-400">RISK STATUS:</span>
                    <span className="text-emerald-300 font-bold">
                      SAFE
                    </span>
                  </div>
                  <div className="text-[9px] text-emerald-500/70 flex justify-between">
                    <span>Assessment: Normal</span>
                    <span>Low Hazard</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#141414] border border-[#222222] space-y-1.5">
                <div className="text-[10px] text-[#888888] uppercase">OPERATIONAL INTEGRITY</div>
                <div className="text-white text-xs font-sans font-medium">Verified Maritime Safety Architecture</div>
                <div className="text-[10px] text-emerald-400 font-mono">Continuous Indian Ocean Risk Monitoring</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          FINAL CTA
         ======================================================== */}
      <section className="relative py-24 px-6 lg:px-12 z-20 max-w-7xl mx-auto text-center border-t border-[#222222]">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
            Enhance Maritime Safety with Leher.
          </h2>
          <p className="text-[#888888] text-lg font-light leading-relaxed">
            Real-time environmental monitoring, hazard intelligence, and safer navigation planning across the Indian Ocean.
          </p>
          <div className="pt-2 flex justify-center">
            <ShinyButton 
              onClick={() => setIsPlatformOpen(true)}
              className="py-3.5 px-8 text-sm font-semibold shadow-xl"
            >
              Open Operations Console
            </ShinyButton>
          </div>
        </div>
      </section>

      {/* ========================================================
          FOOTER
         ======================================================== */}
      <footer className="border-t border-[#222222] bg-[#050505] py-12 px-6 lg:px-12 z-20 relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 text-sm">
          <div className="md:col-span-6 space-y-3">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Leher Logo" title="Leher" className="w-8 h-8 object-contain" />
              <div className="font-bold text-xl text-white">Leher</div>
            </div>
            <p className="text-[#888888] text-sm max-w-md">
              Indian Ocean Maritime Safety & Hazard Intelligence Platform. Real-time condition assessment, risk monitoring, and safer navigation.
            </p>
            <div className="text-[#666666] text-xs font-mono pt-2">
              PS 26067 | INCOIS | Maritime Safety & Hazard Intelligence
            </div>
          </div>

          <div className="md:col-span-3 space-y-2">
            <div className="text-xs font-mono uppercase text-[#888888]">Navigation</div>
            <ul className="space-y-1.5 text-xs text-[#888888]">
              <li><button onClick={() => scrollToSection('section-story')} className="hover:text-white cursor-pointer">Explore</button></li>
              <li><button onClick={() => scrollToSection('section-data')} className="hover:text-white cursor-pointer">Maritime Conditions</button></li>
              <li><button onClick={() => scrollToSection('section-capabilities')} className="hover:text-white cursor-pointer">Capabilities</button></li>
              <li><button onClick={() => scrollToSection('section-model')} className="hover:text-white cursor-pointer">Location Assessment</button></li>
              <li><button onClick={() => scrollToSection('section-preview')} className="hover:text-white cursor-pointer">Operations Console</button></li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-2">
            <div className="text-xs font-mono uppercase text-[#888888]">Operational Features</div>
            <ul className="space-y-1.5 text-xs text-[#888888] font-mono">
              <li>Risk Zone Monitoring</li>
              <li>Hazard Detection & Alerts</li>
              <li>Location Risk Assessment</li>
              <li>Safer Route Planning</li>
            </ul>
          </div>
        </div>
      </footer>

      {/* ========================================================
          FULLSCREEN 3D EARTH WORKBENCH MODAL
          (RIGHT-SIDE CONTROLS, REAL-TIME CLOCK, FULL CANVAS)
         ======================================================== */}
      {isEarthFullscreen && (
        <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col overflow-hidden">
          {/* Header Bar */}
          <div className="h-16 bg-[#090909] border-b border-[#222222] px-6 flex justify-between items-center z-20">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Leher Logo" title="Leher" className="w-7 h-7 object-contain" />
              <span className="font-bold text-lg text-white flex items-center gap-2">
                <span>Indian Ocean Maritime Operations Console</span>
              </span>
              <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-800/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>LIVE MARITIME OPERATIONS</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 font-mono text-xs text-[#aaaaaa] bg-[#141414] px-3 py-1.5 rounded-lg border border-[#262626]">
                <span>{realTimeClock}</span>
                <select
                  value={selectedTimeZone}
                  onChange={(e) => setSelectedTimeZone(e.target.value as TimeZone)}
                  className="bg-[#1f1f1f] text-white text-xs font-mono rounded px-1.5 py-0.5 border border-[#333333] focus:outline-none cursor-pointer hover:border-cyan-500 transition-colors"
                  title="Change Time Zone"
                >
                  {Object.entries(timeZoneMap).map(([tz, info]) => (
                    <option key={tz} value={tz}>
                      {tz} ({info.offsetLabel})
                    </option>
                  ))}
                </select>
              </div>
              <button 
                onClick={() => setIsEarthFullscreen(false)}
                className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#282828] text-[#cccccc] hover:text-white transition-all cursor-pointer"
                title="Close Fullscreen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Workspace Area */}
          <div className="flex-1 flex relative overflow-hidden">
            {/* 3D Earth Canvas (Left / Center Area) */}
            <div className="flex-1 h-full relative bg-[#040404]">
              <iframe
                key={workbenchVar}
                src={getEarthIframeUrl(workbenchVar)}
                title="Leher Global 3D Earth Fullscreen"
                className="w-full h-full border-0 absolute inset-0"
              />
            </div>

            {/* SINGLE RIGHT SIDE WORKBENCH CONTROLS */}
            <div className="w-84 sm:w-96 lg:w-[420px] bg-[#0c0c0c] border-l border-[#222222] p-5 space-y-6 overflow-y-auto z-20 shadow-2xl">
              {renderMergedControlsAndAnalytics()}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          FULLSCREEN OPERATIONAL WORKBENCH MODAL
          (RIGHT-SIDE CONTROLS, REAL-TIME CLOCK, FULL CANVAS)
         ======================================================== */}
      {isPlatformOpen && (
        <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col overflow-hidden">
          {/* Header Bar */}
          <div className="h-16 bg-[#0f0f0f] border-b border-[#222222] px-6 flex justify-between items-center z-20">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Leher Logo" title="Leher" className="w-7 h-7 object-contain" />
              <span className="font-bold text-lg text-white">Leher 3D Ocean Intelligence Workbench</span>
              <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-800/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>OPERATIONAL WORKBENCH</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 font-mono text-xs text-[#aaaaaa] bg-[#141414] px-3 py-1.5 rounded-lg border border-[#262626]">
                <span>{realTimeClock}</span>
                <select
                  value={selectedTimeZone}
                  onChange={(e) => setSelectedTimeZone(e.target.value as TimeZone)}
                  className="bg-[#1f1f1f] text-white text-xs font-mono rounded px-1.5 py-0.5 border border-[#333333] focus:outline-none cursor-pointer hover:border-cyan-500 transition-colors"
                  title="Change Time Zone"
                >
                  {Object.entries(timeZoneMap).map(([tz, info]) => (
                    <option key={tz} value={tz}>
                      {tz} ({info.offsetLabel})
                    </option>
                  ))}
                </select>
              </div>
              <button 
                onClick={() => setIsPlatformOpen(false)}
                className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#282828] text-[#cccccc] hover:text-white transition-all cursor-pointer"
                title="Close Workbench"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Area */}
          <div className="flex-1 flex relative overflow-hidden">
            {/* 3D Earth Canvas (Left / Center Area) */}
            <div className="flex-1 h-full relative bg-[#040404]">
              <iframe
                key={workbenchVar}
                src={getEarthIframeUrl(workbenchVar)}
                title="Leher Full Workbench 3D Earth"
                className="w-full h-full border-0 absolute inset-0"
              />
            </div>

            {/* SINGLE RIGHT SIDE WORKBENCH CONTROLS */}
            <div className="w-84 sm:w-96 lg:w-[420px] bg-[#0c0c0c] border-l border-[#222222] p-5 space-y-6 overflow-y-auto z-20 shadow-2xl">
              {renderMergedControlsAndAnalytics()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
