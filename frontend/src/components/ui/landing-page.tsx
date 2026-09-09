import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Globe from "@/components/ui/globe";
import { cn } from "@/lib/utils";
import { 
  X, 
  Play, 
  Pause, 
  Maximize2,
  Menu,
  Locate,
  Compass,
  Sparkles,
  Layers,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Sliders,
  ArrowUpRight
} from "lucide-react";
import { leherDataService, type TraceablePointReport } from "@/lib/data/registry.ts";
import { predictOceanState, type OceanPredictionResult } from "@/lib/api/oceanPredictionService";
import { ShinyButton } from "@/components/ui/shiny-button";
import { SpinningBorderButton } from "@/components/ui/spinning-border-button";
import { MenuHoverLink } from "@/components/ui/menu-hover-effects";
import { 
  CardCurtainReveal, 
  CardCurtainRevealTitle, 
  CardCurtainRevealDescription, 
  CardCurtain 
} from "@/components/ui/card-curtain-reveal";

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
  concentric_region: "Concentric Bounded (40°S–30°N, 20°–130°E)",
  orthographic: "3D Globe (Orthographic)",
  equirectangular: "Flat Map (Plate Carrée)",
  winkel3: "Winkel Tripel (Compromise)",
  waterman: "Waterman Butterfly (Polyhedron)",
  stereographic: "Stereographic (Conformal)",
  azimuthal_equidistant: "Azimuthal Polar (Equidistant)",
  conic_equidistant: "Conic Equidistant",
  atlantis: "Atlantis (Transverse Equal-Area)",
};

export const PROJECTION_LIST = [
  { key: 'concentric_region', name: 'Concentric Bounded (40°S–30°N, 20°–130°E)', desc: 'Latitudinally & Longitudinally Bounded Focus', badge: 'BOUNDED' },
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
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
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
  const [activeProjection, setActiveProjection] = useState<string>('concentric_region');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [inputLat, setInputLat] = useState<number>(15.4);
  const [inputLon, setInputLon] = useState<number>(71.2);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [predictionResult, setPredictionResult] = useState<OceanPredictionResult>(() => 
    predictOceanState(15.4, 71.2, 150)
  );
  const [inspectedCoords, setInspectedCoords] = useState<{
    valLat: string;
    valLon: string;
    decLat: string;
    decLon: string;
    status: string;
  }>({
    valLat: "15° 24' 00\"N",
    valLon: "71° 12' 00\"E",
    decLat: "15.4000° N",
    decLon: "71.2000° E",
    status: "Arabian Sea Active",
  });

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
        setInspectedCoords({
          valLat: e.data.latDMS || `${Math.abs(lat).toFixed(2)}°`,
          valLon: e.data.lonDMS || `${Math.abs(lon).toFixed(2)}°`,
          decLat: lat >= 0 ? `${lat.toFixed(4)}° N` : `${Math.abs(lat).toFixed(4)}° S`,
          decLon: lon >= 0 ? `${lon.toFixed(4)}° E` : `${Math.abs(lon).toFixed(4)}° W`,
          status: "Point Selected",
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

  // Sync coordinates with Earth iframe whenever inputLat or inputLon changes
  useEffect(() => {
    if (
      typeof inputLat === "number" &&
      typeof inputLon === "number" &&
      !isNaN(inputLat) &&
      !isNaN(inputLon)
    ) {
      sendToEarthIframe({
        action: "setLocation",
        latitude: inputLat,
        longitude: inputLon,
      });
    }
  }, [inputLat, inputLon, sendToEarthIframe]);

  const handlePredict = useCallback(() => {
    setIsPredicting(true);
    setTimeout(() => {
      const res = predictOceanState(Number(inputLat), Number(inputLon), Number(workbenchDepth));
      setPredictionResult(res);
      setIsPredicting(false);
    }, 300);
  }, [inputLat, inputLon, workbenchDepth]);

  const handleLocateMe = useCallback(() => {
    setIsLocating(true);
    setInspectedCoords((prev) => ({ ...prev, status: "Detecting GPS Position..." }));
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(4));
          const lon = parseFloat(pos.coords.longitude.toFixed(4));
          setInputLat(lat);
          setInputLon(lon);
          setInspectedCoords({
            valLat: `${Math.abs(lat).toFixed(2)}°`,
            valLon: `${Math.abs(lon).toFixed(2)}°`,
            decLat: lat >= 0 ? `${lat}° N` : `${Math.abs(lat)}° S`,
            decLon: lon >= 0 ? `${lon}° E` : `${Math.abs(lon)}° W`,
            status: "GPS Located",
          });
          sendToEarthIframe({ action: "locateMe" });
          setIsLocating(false);
        },
        (err) => {
          console.warn("Geolocation fallback:", err);
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

  const handleClearCoords = useCallback(() => {
    setInputLat(15.4);
    setInputLon(71.2);
    setInspectedCoords({
      valLat: "15° 24' 00\"N",
      valLon: "71° 12' 00\"E",
      decLat: "15.4000° N",
      decLon: "71.2000° E",
      status: "Reset to Default",
    });
    sendToEarthIframe({ action: "setLocation", latitude: 15.4, longitude: 71.2 });
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
    const projName = proj || 'concentric_region';

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

  const renderOperationInputs = () => (
    <div className="space-y-4 text-xs font-sans">
      {/* 1. Globe Shape Dropdown */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[11px] text-[#888888]">
          <span>Projection</span>
          <span className="text-cyan-400 font-mono text-[10px]">{PROJECTION_METADATA[activeProjection] || activeProjection}</span>
        </div>
        <div className="relative">
          <select
            value={activeProjection}
            onChange={(e) => handleSelectProjection(e.target.value)}
            className="w-full bg-[#121212] text-white text-xs font-mono rounded-xl px-3 py-2.5 border border-[#262626] hover:border-[#444444] focus:border-cyan-400 focus:outline-none cursor-pointer transition-all appearance-none pr-8"
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

      {/* 2. Coordinates */}
      <div className="space-y-2">
        <div className="text-[11px] text-[#888888]">Coordinates</div>
        
        {/* Latitude */}
        <div className="bg-[#121212] border border-[#262626] rounded-xl px-3 py-2 flex items-center justify-between focus-within:border-cyan-400/80 transition-colors">
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
        <div className="bg-[#121212] border border-[#262626] rounded-xl px-3 py-2 flex items-center justify-between focus-within:border-cyan-400/80 transition-colors">
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
      <div className="space-y-2">
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

      {/* 5. Predict Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handlePredict}
          disabled={isPredicting}
          className="w-full py-3 px-4 rounded-xl bg-white hover:bg-[#e6e6e6] text-black font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-[0.99] disabled:opacity-75"
        >
          {isPredicting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-black" />
              <span>Predicting...</span>
            </>
          ) : (
            <span>Predict Ocean State</span>
          )}
        </button>
      </div>
    </div>
  );

  const renderPredictionAnswerSection = () => (
    <div className="space-y-4 text-xs font-sans">
      {/* Top Header: Region & Status */}
      <div className="flex justify-between items-center pb-1">
        <div className="text-white font-bold text-sm">
          {predictionResult.location.regionName}
        </div>
        <span className={cn(
          "text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold uppercase",
          predictionResult.summary.riskStatus === 'SAFE' 
            ? "bg-emerald-950/60 border-emerald-800/60 text-emerald-400"
            : predictionResult.summary.riskStatus === 'ADVISORY'
            ? "bg-amber-950/60 border-amber-800/60 text-amber-400"
            : "bg-red-950/60 border-red-800/60 text-red-400"
        )}>
          {predictionResult.summary.riskStatus}
        </span>
      </div>

      {/* Clean Parameters Box (Style of the trading widget in screenshot) */}
      <div className="rounded-2xl border border-[#1f1f1f] bg-[#0c0c0c] p-4 space-y-2.5 shadow-inner">
        <div className="flex justify-between items-center text-xs pb-1.5 border-b border-[#181818]">
          <span className="text-[#888888]">Current speed</span>
          <span className="font-bold text-white font-mono">{predictionResult.summary.currentSpeedMs} m s⁻¹</span>
        </div>
        <div className="flex justify-between items-center text-xs pb-1.5 border-b border-[#181818]">
          <span className="text-[#888888]">Current bearing</span>
          <span className="font-bold text-white font-mono">{predictionResult.summary.currentDirectionCompass} ({predictionResult.summary.currentDirectionDeg}°)</span>
        </div>
        {Object.values(predictionResult.variables).map((v) => (
          <div key={v.variable} className="flex justify-between items-center text-xs">
            <span className="text-[#888888]">
              {v.commonName}
            </span>
            <span className="font-bold text-white font-mono">
              {v.formattedValue}
            </span>
          </div>
        ))}
      </div>

      {/* View in Detail Button */}
      <button
        type="button"
        onClick={() => setIsDetailModalOpen(true)}
        className="w-full py-2.5 px-4 rounded-xl bg-[#141414] hover:bg-[#1a1a1a] border border-[#262626] hover:border-[#3a3a3a] text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
      >
        <span>View in detail</span>
        <ArrowUpRight className="w-3.5 h-3.5 text-[#888888]" />
      </button>
    </div>
  );

  const renderMergedControlsAndAnalytics = () => (
    <div className="space-y-6">
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

      {/* Inputs Section */}
      {renderOperationInputs()}

      {/* Prediction Answers Section */}
      {renderPredictionAnswerSection()}
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

          {/* Nav Links with Menu Hover Effects (Light Sky Blue) */}
          <div className="hidden md:flex items-center gap-1 lg:gap-2.5 text-xs font-medium whitespace-nowrap">
            <MenuHoverLink onClick={() => scrollToSection('section-story')}>Explore</MenuHoverLink>
            <MenuHoverLink onClick={() => scrollToSection('section-data')}>Conditions</MenuHoverLink>
            <MenuHoverLink onClick={() => scrollToSection('section-capabilities')}>Capabilities</MenuHoverLink>
            <MenuHoverLink onClick={() => scrollToSection('section-model')}>Location Assessment</MenuHoverLink>
            <MenuHoverLink onClick={() => scrollToSection('section-preview')}>Operations</MenuHoverLink>
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
                className="text-left py-2.5 px-4 rounded-xl bg-[#121212] hover:bg-[#0c1e36] hover:border-sky-400 hover:text-sky-200 border border-[#222222] transition-all cursor-pointer flex items-center justify-between group shadow-sm"
              >
                <span className="group-hover:translate-x-1 transition-transform">Open Operations</span>
                <span className="text-xs font-mono text-[#666666] group-hover:text-sky-400">01</span>
              </button>
              <button 
                onClick={() => { scrollToSection('section-data'); setIsMobileMenuOpen(false); }} 
                className="text-left py-2.5 px-4 rounded-xl bg-[#121212] hover:bg-[#0c1e36] hover:border-sky-400 hover:text-sky-200 border border-[#222222] transition-all cursor-pointer flex items-center justify-between group shadow-sm"
              >
                <span className="group-hover:translate-x-1 transition-transform">Maritime Conditions</span>
                <span className="text-xs font-mono text-[#666666] group-hover:text-sky-400">02</span>
              </button>
              <button 
                onClick={() => { scrollToSection('section-capabilities'); setIsMobileMenuOpen(false); }} 
                className="text-left py-2.5 px-4 rounded-xl bg-[#121212] hover:bg-[#0c1e36] hover:border-sky-400 hover:text-sky-200 border border-[#222222] transition-all cursor-pointer flex items-center justify-between group shadow-sm"
              >
                <span className="group-hover:translate-x-1 transition-transform">Risk & Hazard Intelligence</span>
                <span className="text-xs font-mono text-[#666666] group-hover:text-sky-400">03</span>
              </button>
              <button 
                onClick={() => { scrollToSection('section-model'); setIsMobileMenuOpen(false); }} 
                className="text-left py-2.5 px-4 rounded-xl bg-[#121212] hover:bg-[#0c1e36] hover:border-sky-400 hover:text-sky-200 border border-[#222222] transition-all cursor-pointer flex items-center justify-between group shadow-sm"
              >
                <span className="group-hover:translate-x-1 transition-transform">Location Assessment</span>
                <span className="text-xs font-mono text-[#666666] group-hover:text-sky-400">04</span>
              </button>
              <button 
                onClick={() => { scrollToSection('section-preview'); setIsMobileMenuOpen(false); }} 
                className="text-left py-2.5 px-4 rounded-xl bg-[#121212] hover:bg-[#0c1e36] hover:border-sky-400 hover:text-sky-200 border border-[#222222] transition-all cursor-pointer flex items-center justify-between group shadow-sm"
              >
                <span className="group-hover:translate-x-1 transition-transform">Operations Console</span>
                <span className="text-xs font-mono text-[#666666] group-hover:text-sky-400">05</span>
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

      {/* ========================================================
          HERO SECTION
         ======================================================== */}
      <section
        ref={(el) => { sectionRefs.current[0] = el; }}
        className="relative min-h-screen flex flex-col justify-center px-6 lg:px-12 z-20 pt-24 pb-16 max-w-7xl mx-auto pointer-events-none"
      >
        <div className="max-w-2xl space-y-7 pointer-events-auto">
          <div className="space-y-1">
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-white leading-[1.05]">
              LEHER
            </h1>
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-[#888888] leading-[1.05]">
              Indian Ocean Maritime Safety & Hazard Intelligence
            </h2>
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
            { 
              title: "Sea Surface Temperature", 
              desc: "Monitors thermal gradients, temperature fronts, and anomalous heat layers impacting navigation routes."
            },
            { 
              title: "Surface Currents", 
              desc: "Tracks surface flow vectors, velocities, and directional drift critical for vessel course and stability."
            },
            { 
              title: "Salinity", 
              desc: "Assesses sea surface salinity distribution influencing water mass density and acoustic propagation."
            },
            { 
              title: "Wind Conditions", 
              desc: "Measures 10m surface winds, gusts, and directional vectors driving sea state and surface drift."
            },
            { 
              title: "Sea State", 
              desc: "Evaluates wave dynamics, swell direction, and sea surface roughness to identify hazardous navigation waters."
            },
            { 
              title: "Environmental Observations", 
              desc: "In-situ monitoring networks and satellite feeds integrated for continuous risk ground truthing."
            }
          ].map((item, idx) => (
            <CardCurtainReveal
              key={idx}
              className="relative p-6 sm:p-7 rounded-2xl bg-[#121212]/90 backdrop-blur-md border border-[#222222] hover:border-white/25 transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.5)] overflow-hidden h-[195px] flex flex-col justify-start cursor-pointer group"
            >
              <CardCurtainRevealTitle centerOffset={52} className="text-lg font-bold text-white tracking-tight">
                {item.title}
              </CardCurtainRevealTitle>
              <CardCurtainRevealDescription className="text-[#888888] text-sm leading-relaxed mt-2.5">
                <p>{item.desc}</p>
              </CardCurtainRevealDescription>
              <CardCurtain className="bg-white/[0.03] pointer-events-none" />
            </CardCurtainReveal>
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
            { 
              title: "3D Maritime Visualization", 
              desc: "Spatial representation of maritime domain conditions and dynamic oceanic vectors."
            },
            { 
              title: "Risk Zone Monitoring", 
              desc: "Continuous surveillance of designated maritime transit corridors and high-risk zones."
            },
            { 
              title: "Hazard Detection", 
              desc: "Early identification of convective storms, cyclone paths, extreme wave heights, and anomalies."
            },
            { 
              title: "Location Assessment", 
              desc: "Point-specific inspection of multi-parameter environmental conditions and safety indicators."
            },
            { 
              title: "Route Risk Analysis", 
              desc: "Comprehensive risk indexing along planned vessel transit waypoints and navigation lanes."
            },
            { 
              title: "Safer Route Planning", 
              desc: "Identifies safer navigational trajectories avoiding severe hazards and extreme sea states."
            },
            { 
              title: "Operational Alerts", 
              desc: "Audio and visual notifications for vessels entering high-risk areas or deteriorating weather."
            },
            { 
              title: "Environmental Monitoring", 
              desc: "Unified tracking of winds, currents, sea surface temperature, and swell dynamics."
            }
          ].map((item, idx) => (
            <CardCurtainReveal
              key={idx}
              className="relative p-6 rounded-2xl bg-[#121212]/90 backdrop-blur-md border border-[#222222] hover:border-white/25 transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.5)] overflow-hidden h-[195px] flex flex-col justify-start cursor-pointer group"
            >
              <CardCurtainRevealTitle centerOffset={52} className="text-base font-bold text-white tracking-tight">
                {item.title}
              </CardCurtainRevealTitle>
              <CardCurtainRevealDescription className="text-[#888888] text-sm leading-relaxed mt-2.5">
                <p>{item.desc}</p>
              </CardCurtainRevealDescription>
              <CardCurtain className="bg-white/[0.03] pointer-events-none" />
            </CardCurtainReveal>
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

          <div className="grid grid-cols-12 min-h-[640px]">
            {/* Column 1: Input Controls (Lat/Lon, Auto-Detect, Depth, Globe Dropdown, Predict Button) */}
            <div className="col-span-12 lg:col-span-4 bg-[#0c0c0c] border-b lg:border-b-0 lg:border-r border-[#222222] p-5 space-y-4">
              <div className="border-b border-[#222222] pb-2 flex justify-between items-center">
                <span className="text-white font-bold uppercase tracking-wider text-xs font-mono flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  INPUT &amp; CONTROLS
                </span>
                <span className="text-[10px] font-mono text-[#888888]">Interactive Predictor</span>
              </div>
              {renderOperationInputs()}
            </div>

            {/* Column 2: Center 3D Earth Display */}
            <div className="col-span-12 lg:col-span-4 bg-[#040404] relative flex flex-col justify-between overflow-hidden border-b lg:border-b-0 min-h-[480px]">
              <div className="absolute top-3 left-4 right-4 z-10 flex justify-between items-center gap-2 pointer-events-none">
                <div className="bg-[#000000]/80 backdrop-blur-md px-3 py-1 rounded-lg border border-[#262626] text-xs font-mono text-[#cccccc] pointer-events-auto shadow-md">
                  Domain: <span className="text-white uppercase font-bold">{PROJECTION_METADATA[activeProjection] ? "BOUNDED" : activeProjection}</span> @ {workbenchDepth}m
                </div>

                <div className="bg-[#080808]/85 backdrop-blur-md px-3 py-1 rounded-lg border border-[#262626] flex items-center gap-2 text-[11px] font-mono text-[#888888] pointer-events-auto shadow-md">
                  <button onClick={() => setIsPlaying(!isPlaying)} className="hover:text-white flex items-center gap-1.5 cursor-pointer">
                    {isPlaying ? <Pause className="w-3 h-3 text-emerald-400" /> : <Play className="w-3 h-3 text-white" />}
                    <span className="font-semibold text-[#e0e0e0]">{isPlaying ? "LIVE" : "PAUSED"}</span>
                  </button>
                </div>
              </div>

              {/* CENTER 3D EARTH IFRAME */}
              <div className="w-full h-full min-h-[500px] relative">
                <iframe
                  key={`${activeProjection}-${workbenchVar}`}
                  src={getEarthIframeUrl(workbenchVar)}
                  title="Leher Workbench 3D Earth"
                  className="w-full h-full border-0 absolute inset-0"
                  loading="lazy"
                  onLoad={() => {
                    sendToEarthIframe({
                      action: "setLocation",
                      latitude: inputLat,
                      longitude: inputLon,
                    });
                  }}
                />
              </div>

              {/* Bottom Map Bar with Coordinate HUD */}
              <div className="absolute bottom-3 left-4 right-4 z-10 pointer-events-none">
                <div className="bg-[#000000]/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-mono text-[#aaaaaa] flex justify-between items-center pointer-events-auto shadow-md">
                  <span>Selected: <strong className="text-white">{inputLat >= 0 ? `${inputLat}°N` : `${Math.abs(inputLat)}°S`}, {inputLon >= 0 ? `${inputLon}°E` : `${Math.abs(inputLon)}°W`}</strong></span>
                  <span className="text-cyan-400 font-semibold">Click map to inspect any point</span>
                </div>
              </div>
            </div>

            {/* Column 3: Answer Section (10 Copernicus Variables Table & Telemetry) */}
            <div className="col-span-12 lg:col-span-4 bg-[#0c0c0c] border-t lg:border-t-0 lg:border-l border-[#222222] p-5 space-y-4 overflow-y-auto max-h-[680px]">
              <div className="border-b border-[#222222] pb-2 flex justify-between items-center">
                <span className="text-white font-bold uppercase tracking-wider text-xs font-mono flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  PREDICTION ANSWERS
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                  Standardized CMEMS
                </span>
              </div>
              {renderPredictionAnswerSection()}
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
          COMPREHENSIVE OCEANOGRAPHIC PARAMETER DOSSIER MODAL
          (DETAILED BREAKDOWN DESCRIBING EVERY PARAMETER INDIVIDUALLY)
         ======================================================== */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#050505]/95 backdrop-blur-xl flex flex-col overflow-hidden animate-in fade-in duration-200">
          {/* Header Bar */}
          <div className="h-16 bg-[#090909] border-b border-[#222222] px-6 flex justify-between items-center z-20 shrink-0">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Leher Logo" title="Leher" className="w-7 h-7 object-contain" />
              <div>
                <div className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <span>Copernicus Marine Oceanographic Dossier</span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                    10 PARAMETERS
                  </span>
                </div>
                <div className="text-[11px] text-[#888888] font-mono">
                  {predictionResult.location.regionName} ({predictionResult.location.lat >= 0 ? `${predictionResult.location.lat}°N` : `${Math.abs(predictionResult.location.lat)}°S`}, {predictionResult.location.lon >= 0 ? `${predictionResult.location.lon}°E` : `${Math.abs(predictionResult.location.lon)}°W`}) @ {predictionResult.location.depth}m Depth
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-[#181818] hover:bg-[#252525] text-white text-xs font-mono flex items-center gap-1.5 border border-[#333333] transition-all cursor-pointer shadow"
                title="Close Dossier"
              >
                <X className="w-4 h-4" />
                <span>Close Dossier</span>
              </button>
            </div>
          </div>

          {/* Dossier Content Area */}
          <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-6">
            {/* Top Overview Banner */}
            <div className="p-5 rounded-2xl bg-[#0c0c0c] border border-[#222222] flex flex-wrap justify-between items-center gap-4 shadow-xl">
              <div>
                <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-bold">
                  LOCAL MARITIME TARGET STATE
                </div>
                <h3 className="text-xl font-bold text-white mt-0.5">
                  {predictionResult.location.regionName} Comprehensive Marine Profile
                </h3>
                <p className="text-xs text-[#888888] max-w-2xl mt-1">
                  Standardized ocean physical, dynamic, biogeochemical, and cryospheric parameters derived from CMEMS ocean physics numerical models at coordinates ({predictionResult.location.lat}°, {predictionResult.location.lon}°) depth level {predictionResult.location.depth}m.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-[#141414] border border-[#252525] text-center min-w-[120px]">
                  <div className="text-[9px] text-[#777777] font-mono uppercase">Current Speed</div>
                  <div className="text-sm font-bold text-white mt-0.5 font-mono">{predictionResult.summary.currentSpeedMs} m s⁻¹</div>
                  <div className="text-[10px] text-cyan-400 font-mono">{predictionResult.summary.currentSpeedKnots} kts</div>
                </div>
                <div className="p-3 rounded-xl bg-[#141414] border border-[#252525] text-center min-w-[120px]">
                  <div className="text-[9px] text-[#777777] font-mono uppercase">Flow Direction</div>
                  <div className="text-sm font-bold text-white mt-0.5 font-mono">{predictionResult.summary.currentDirectionCompass}</div>
                  <div className="text-[10px] text-[#888888] font-mono">{predictionResult.summary.currentDirectionDeg}° Bearing</div>
                </div>
                <div className="p-3 rounded-xl bg-[#141414] border border-[#252525] text-center min-w-[120px]">
                  <div className="text-[9px] text-[#777777] font-mono uppercase">Safety Advisory</div>
                  <div className={cn(
                    "text-sm font-bold mt-0.5 font-mono",
                    predictionResult.summary.riskStatus === 'SAFE' ? "text-emerald-400" : predictionResult.summary.riskStatus === 'ADVISORY' ? "text-amber-400" : "text-red-400"
                  )}>
                    {predictionResult.summary.riskStatus}
                  </div>
                  <div className="text-[9px] text-[#888888] font-mono">Operational Tier</div>
                </div>
              </div>
            </div>

            {/* Individual Parameter Cards (Grid of 10) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.values(predictionResult.variables).map((v) => (
                <div 
                  key={v.variable}
                  className="rounded-2xl bg-[#0e0e0e] border border-[#222222] p-5 space-y-4 hover:border-cyan-500/40 transition-all shadow-lg"
                >
                  {/* Card Header */}
                  <div className="flex justify-between items-start border-b border-[#1f1f1f] pb-3 gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {v.commonName}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider font-mono",
                          v.category === 'physical' ? "bg-cyan-950/60 border-cyan-800/60 text-cyan-300"
                          : v.category === 'dynamic' ? "bg-amber-950/60 border-amber-800/60 text-amber-300"
                          : v.category === 'biogeochemical' ? "bg-emerald-950/60 border-emerald-800/60 text-emerald-300"
                          : "bg-purple-950/60 border-purple-800/60 text-purple-300"
                        )}>
                          {v.category}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#666666] font-mono mt-0.5">
                        Code: <strong className="text-[#aaaaaa]">{v.variable}</strong> • NetCDF Standard: <span className="text-cyan-400/80">{v.standardName}</span>
                      </div>
                    </div>

                    {/* Measured Value & Units Badge */}
                    <div className="text-right shrink-0 bg-[#161616] border border-[#262626] px-3 py-1.5 rounded-xl">
                      <div className="text-[9px] text-[#777777] uppercase font-mono">MEASURED VALUE</div>
                      <div className="text-sm sm:text-base font-extrabold text-white font-mono">
                        {v.formattedValue}
                      </div>
                    </div>
                  </div>

                  {/* Descriptions Section */}
                  <div className="space-y-2.5 text-xs">
                    {/* Scientific Definition */}
                    <div className="p-3 rounded-xl bg-[#141414] border border-[#1e1e1e] space-y-1">
                      <div className="text-[10px] uppercase font-mono tracking-wider text-cyan-400 font-semibold flex items-center gap-1.5">
                        <span>Physical Definition &amp; Measurement</span>
                      </div>
                      <p className="text-[#cccccc] font-sans text-xs leading-relaxed">
                        {v.longDescription}
                      </p>
                    </div>

                    {/* Operational Impact */}
                    <div className="p-3 rounded-xl bg-[#141414] border border-[#1e1e1e] space-y-1">
                      <div className="text-[10px] uppercase font-mono tracking-wider text-amber-400 font-semibold flex items-center gap-1.5">
                        <span>Maritime &amp; Operational Impact</span>
                      </div>
                      <p className="text-[#bbbbbb] font-sans text-xs leading-relaxed">
                        {v.operationalImpact}
                      </p>
                    </div>

                    {/* Depth & Basin Context */}
                    <div className="p-3 rounded-xl bg-[#141414] border border-[#1e1e1e] space-y-1">
                      <div className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 font-semibold flex items-center gap-1.5">
                        <span>Depth ({predictionResult.location.depth}m) &amp; Regional State</span>
                      </div>
                      <p className="text-[#aaaaaa] font-sans text-xs leading-relaxed">
                        {v.depthInterpretation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Close Button */}
            <div className="flex justify-center pt-4 pb-8">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs flex items-center gap-2 border border-white/20 transition-all cursor-pointer shadow-lg"
              >
                <X className="w-4 h-4" />
                <span>Close Parameter Dossier</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
                onLoad={() => {
                  sendToEarthIframe({
                    action: "setLocation",
                    latitude: inputLat,
                    longitude: inputLon,
                  });
                }}
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
                onLoad={() => {
                  sendToEarthIframe({
                    action: "setLocation",
                    latitude: inputLat,
                    longitude: inputLon,
                  });
                }}
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
