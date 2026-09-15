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
  ArrowUpRight,
  ExternalLink,
  FileText,
  Eye,
  MousePointerClick,
  BrainCircuit,
  Navigation,
  ArrowRight,
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
  CardCurtain,
} from "@/components/ui/card-curtain-reveal";
import AppNavbar from "@/components/ui/app-navbar";
import RiskBadge from "@/components/ui/risk-badge";
import HowItWorks, { type Step } from "@/components/ui/how-it-works";
import { WavyBackground } from "@/components/ui/wavy";

const LEHER_STEPS: Step[] = [
  {
    title: "SEE • Explore Ocean",
    description: "Observe dynamic currents, wave fields, and thermal gradients across the 3D Indian Ocean globe.",
    colorTheme: "cyan",
    colors: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30" },
    popup: {
      tag: "3D BASIN TELEMETRY",
      headline: "Live Ocean Environment",
      statusText: "Active Stream",
      details: [
        "Real-time sea surface temperature layers",
        "High-resolution hydrodynamic current vectors",
        "Subsurface salinity & density gradients",
      ],
    },
  },
  {
    title: "CLICK • Select Location",
    description: "Click anywhere on the interactive map or specify GPS coordinates and transit depth layers.",
    colorTheme: "sky",
    colors: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/30" },
    popup: {
      tag: "COORDINATE INSPECTOR",
      headline: "Target Inspection & Locking",
      statusText: "Point-Specific",
      details: [
        "Click anywhere on map to lock GPS coordinates",
        "Inspect depth layers from 0m to 2000m",
        "Auto-detect vessel location via GPS",
      ],
    },
  },
  {
    title: "UNDERSTAND • Assess Risk",
    description: "Review standardized CMEMS ocean parameters and risk indicators without deciphering raw telemetry.",
    colorTheme: "blue",
    colors: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
    popup: {
      tag: "SAFETY INDEXING",
      headline: "Standardized Risk Triad",
      statusText: "CMEMS Analysis",
      details: [
        "SAFE: Nominal conditions for standard transit",
        "CAUTION: Rising swell or currents; watchkeeping",
        "DANGER: Severe squalls or hazards; sheltering",
      ],
    },
  },
  {
    title: "ACT • Execute Decisions",
    description: "Identify maritime hazards, adjust voyage departure windows, and plan safer navigation trajectories.",
    colorTheme: "indigo",
    colors: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/30" },
    popup: {
      tag: "DECISION SUPPORT",
      headline: "Operational Route Decision",
      statusText: "Safer Trajectory",
      details: [
        "Compare planned route risk against alternatives",
        "Identify severe storms and maritime hazards",
        "Determine safer departure and transit windows",
      ],
    },
  },
];

export type TimeZone = "IST" | "UTC" | "EST" | "PST" | "JST" | "SGT";

const timeZoneMap: Record<TimeZone, { name: string; timeZone: string; offsetLabel: string }> = {
  IST: { name: "IST (India Standard)", timeZone: "Asia/Kolkata", offsetLabel: "UTC+05:30" },
  UTC: { name: "UTC / GMT (Universal)", timeZone: "UTC", offsetLabel: "UTC+00:00" },
  EST: { name: "EST (US Eastern)", timeZone: "America/New_York", offsetLabel: "UTC-05:00" },
  PST: { name: "PST (US Pacific)", timeZone: "America/Los_Angeles", offsetLabel: "UTC-08:00" },
  JST: { name: "JST (Japan Standard)", timeZone: "Asia/Tokyo", offsetLabel: "UTC+09:00" },
  SGT: { name: "SGT (Singapore)", timeZone: "Asia/Singapore", offsetLabel: "UTC+08:00" },
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
  { key: "concentric_region", name: "Concentric Bounded (40°S–30°N, 20°–130°E)", desc: "Latitudinally & Longitudinally Bounded Focus", badge: "BOUNDED" },
  { key: "orthographic", name: "3D Globe", desc: "Spherical Orthographic", badge: "3D" },
  { key: "equirectangular", name: "Flat Map", desc: "Plate Carrée Cylindrical", badge: "FLAT" },
  { key: "winkel3", name: "Winkel Tripel", desc: "Compromise World Map", badge: "GLOBAL" },
  { key: "waterman", name: "Waterman", desc: "Butterfly Octahedron", badge: "POLY" },
  { key: "stereographic", name: "Stereographic", desc: "True-Shape Perspective", badge: "CONFORM" },
  { key: "azimuthal_equidistant", name: "Azimuthal", desc: "Equidistant True-Distance", badge: "POLAR" },
  { key: "conic_equidistant", name: "Conic", desc: "Mid-Latitude Equidistant", badge: "CONIC" },
  { key: "atlantis", name: "Atlantis", desc: "Transverse Equal-Area", badge: "OCEAN" },
];

const defaultGlobeConfig = {
  positions: [
    { top: "50%", left: "70%", scale: 1.2 },
    { top: "50%", left: "70%", scale: 1.2 },
    { top: "50%", left: "50%", scale: 0.0 },
  ],
};

const parsePercent = (str: string): number => parseFloat(str.replace("%", ""));

// Ocean parameter ticker items (mirrors Helix price marquee)
const OCEAN_TICKERS = [
  { label: "SST · Arabian Sea", value: "28.4°C", change: "+0.3", positive: true },
  { label: "Current Speed · IO", value: "0.42 m/s", change: "+0.04", positive: true },
  { label: "Salinity · Bay of Bengal", value: "31.2 PSU", change: "-0.1", positive: false },
  { label: "Wave Height · Malacca", value: "1.8m", change: "+0.2", positive: true },
  { label: "SST · Gulf of Aden", value: "26.1°C", change: "-0.5", positive: false },
  { label: "Chlorophyll · Lakshadweep", value: "0.38 mg/m³", change: "+0.06", positive: true },
  { label: "Wind Speed · Andaman", value: "14.2 kn", change: "+1.1", positive: false },
  { label: "Salinity · Arabian Sea", value: "36.1 PSU", change: "+0.2", positive: true },
  { label: "Mixed Layer Depth · IO", value: "62m", change: "+4", positive: true },
];

const FEATURES = [
  { title: "Live Ocean Telemetry", body: "Real-time sea surface temperature, salinity, and current vectors drawn from CMEMS Copernicus Marine datasets updated daily." },
  { title: "Hardened Risk Assessment", body: "A three-tier SAFE / CAUTION / DANGER model rejects ambiguity. Every location gets a clear operational advisory, not a raw data dump." },
  { title: "One Interactive Globe", body: "A single 3D Earth canvas is the counterparty to every query — depth slice, current animation, temperature overlay — all in one view." },
  { title: "Real-time and On-Screen", body: "Ocean conditions, depth slices, and route risk stream into a live terminal. No external API calls block the UI in the navigation path." },
  { title: "Depth & Current Analysis", body: "Subsurface analysis from 0m to 2000m with depth-specific current speed, bearing, and stratification profile." },
  { title: "Access for All Mariners", body: "Designed for coastal fishermen, patrol vessels, and maritime authorities alike — plain-language risk labels, not scientific notation." },
];

export default function LeherLandingPage() {
  const [activeSection, setActiveSection] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [globeTransform, setGlobeTransform] = useState("translate3d(70.00vw, 50.00vh, 0) translate3d(-50%, -50%, 0) scale3d(1.200, 1.200, 1)");
  const [globeOpacity, setGlobeOpacity] = useState(0.95);
  const [isPlatformOpen, setIsPlatformOpen] = useState(false);
  const [isEarthFullscreen, setIsEarthFullscreen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isGlobePaused, setIsGlobePaused] = useState(false);
  const [selectedTimeZone, setSelectedTimeZone] = useState<TimeZone>("IST");
  const [realTimeClock, setRealTimeClock] = useState<string>("");
  const [pointReport, setPointReport] = useState<TraceablePointReport | null>(null);

  useEffect(() => {
    const handleGlobeMessage = (event: MessageEvent) => {
      if (event.data && typeof event.data.isPaused === "boolean") {
        setIsGlobePaused(event.data.isPaused);
      }
    };
    window.addEventListener("message", handleGlobeMessage);
    return () => window.removeEventListener("message", handleGlobeMessage);
  }, []);

  useEffect(() => {
    leherDataService.initialize().then(() => {
      setPointReport(leherDataService.getPointData(15.4, 71.2, 0));
    });
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      try {
        const options: Intl.DateTimeFormatOptions = {
          timeZone: timeZoneMap[selectedTimeZone].timeZone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        };
        const formatter = new Intl.DateTimeFormat("en-CA", options);
        const formatted = formatter.format(now).replace(", ", " ");
        setRealTimeClock(`${formatted} ${selectedTimeZone}`);
      } catch {
        setRealTimeClock(`${now.toISOString().substring(0, 19).replace("T", " ")} ${selectedTimeZone}`);
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [selectedTimeZone]);

  const [selectedDepth, setSelectedDepth] = useState<number>(250);
  const [selectedVar, setSelectedVar] = useState<"temp" | "sal" | "chl">("temp");
  const [workbenchVar, setWorkbenchVar] = useState<"temp" | "sal" | "chl" | "cur">("cur");
  const [workbenchDepth, setWorkbenchDepth] = useState<number>(150);
  const [workbenchMode, setWorkbenchMode] = useState<"ocean" | "air">("ocean");
  const [workbenchAnimate, setWorkbenchAnimate] = useState<"currents" | "wind">("currents");
  const [activeProjection, setActiveProjection] = useState<string>("concentric_region");
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
    { label: "Gulf of Kutch", lat: 22.5, lon: 69.2 },
    { label: "Gulf of Mannar", lat: 8.8, lon: 79.1 },
    { label: "Lakshadweep", lat: 10.5, lon: 72.6 },
    { label: "Andaman Sea", lat: 11.7, lon: 93.0 },
    { label: "Malacca Strait", lat: 3.5, lon: 100.2 },
    { label: "Gulf of Aden", lat: 12.5, lon: 48.0 },
    { label: "Gulf of Oman", lat: 24.5, lon: 58.5 },
    { label: "Somali Basin", lat: 4.5, lon: 51.0 },
    { label: "Dondra Head", lat: 5.8, lon: 80.5 },
    { label: "Mozambique Ch.", lat: -18.0, lon: 41.0 },
  ];

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

  const sendToEarthIframe = useCallback(
    (data: { action: string; projection?: string; latitude?: number; longitude?: number }) => {
      const iframes = document.querySelectorAll<HTMLIFrameElement>('iframe[title*="Earth"]');
      iframes.forEach((iframe) => {
        try {
          iframe.contentWindow?.postMessage(data, "*");
        } catch (err) {
          console.warn("Unable to postMessage to Earth iframe", err);
        }
      });
    },
    []
  );

  useEffect(() => {
    if (typeof inputLat === "number" && typeof inputLon === "number" && !isNaN(inputLat) && !isNaN(inputLon)) {
      sendToEarthIframe({ action: "setLocation", latitude: inputLat, longitude: inputLon });
    }
  }, [inputLat, inputLon, sendToEarthIframe]);

  const handlePredict = useCallback(() => {
    setIsPredicting(true);
    const targetUrl = `/depth-slice?lat=${inputLat}&lon=${inputLon}&depth=${workbenchDepth}`;
    setTimeout(() => {
      const res = predictOceanState(Number(inputLat), Number(inputLon), Number(workbenchDepth));
      setPredictionResult(res);
      setIsPredicting(false);
      window.open(targetUrl, "_blank");
    }, 280);
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

  const handleSelectProjection = useCallback(
    (projKey: string) => {
      setActiveProjection(projKey);
      sendToEarthIframe({ action: "setProjection", projection: projKey });
    },
    [sendToEarthIframe]
  );

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [activeLayers, setActiveLayers] = useState({ model: true, argo: true, glider: true, currents: true });

  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const animationFrameId = useRef<number | undefined>(undefined);

  const calculatedPositions = useMemo(() => {
    return defaultGlobeConfig.positions.map((pos) => ({
      top: parsePercent(pos.top),
      left: parsePercent(pos.left),
      scale: pos.scale,
    }));
  }, []);

  const lastScrollPosRef = useRef(0);

  const updateScrollPosition = useCallback(() => {
    const scrollTop = window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? Math.min(Math.max(scrollTop / docHeight, 0), 1) : 0;
    setScrollProgress(progress);

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
        if (distance < minDistance) { minDistance = distance; newActiveSection = index; }
      }
    });

    // Globe exits quickly within the top portion of the hero viewport:
    // Starts shrinking backward immediately on scroll (5%), completely gone by 35%
    // of the hero height, so it's fully disappeared well before the marquee ribbon scrolls up.
    const heroHeight = window.innerHeight;
    const fadeStart = heroHeight * 0.05;
    const fadeEnd   = heroHeight * 0.35;
    let currentLeft = 70, currentTop = 50, currentScale = 1.2, currentOpacity = 0.95;

    if (scrollTop <= fadeStart) {
      // Fully visible
      currentLeft = 70; currentTop = 50; currentScale = 1.2; currentOpacity = 0.95;
    } else if (scrollTop < fadeEnd) {
      const progress = (scrollTop - fadeStart) / (fadeEnd - fadeStart);
      const ease = progress * progress * (3 - 2 * progress); // smooth-step
      // Scale down backward and move inward while fading
      currentLeft   = 70 + (60 - 70) * ease;
      currentTop    = 50 + 5 * ease;
      currentScale  = 1.2 * (1 - ease * 0.9);
      currentOpacity = 0.95 * (1 - ease);
    } else {
      // Fully hidden
      currentLeft = 60; currentTop = 55; currentScale = 0; currentOpacity = 0;
    }

    const transform = `translate3d(${currentLeft.toFixed(2)}vw, ${currentTop.toFixed(2)}vh, 0) translate3d(-50%, -50%, 0) scale3d(${currentScale.toFixed(3)}, ${currentScale.toFixed(3)}, 1)`;
    setGlobeTransform(transform);
    setGlobeOpacity(currentOpacity);
    setActiveSection(newActiveSection);
  }, []);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        animationFrameId.current = requestAnimationFrame(() => { updateScrollPosition(); ticking = false; });
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
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const getEarthIframeUrl = (
    varType: "temp" | "sal" | "chl" | "cur",
    mode: "ocean" | "air" = workbenchMode,
    proj: string = activeProjection
  ) => {
    const projName = proj || "concentric_region";
    if (mode === "air") {
      let ovStr = "none";
      if (varType === "temp") ovStr = "temp";
      else if (varType === "sal") ovStr = "relative_humidity";
      else if (varType === "chl") ovStr = "total_cloud_water";
      else if (varType === "cur") ovStr = "wind";
      return `/earth/index.html#current/wind/surface/level/overlay=${ovStr}/${projName}`;
    } else {
      let ovStr = "currents";
      if (varType === "temp") ovStr = "temp";
      else if (varType === "sal") ovStr = "relative_humidity";
      else if (varType === "chl") ovStr = "total_cloud_water";
      else if (varType === "cur") ovStr = "ocean";
      return `/earth/index.html#current/ocean/surface/currents/overlay=${ovStr}/${projName}`;
    }
  };

  const renderOperationInputs = () => (
    <div className="space-y-4 text-xs font-sans">
      <div className="space-y-1.5">
        <div className="flex justify-between items-center" style={{ color: 'rgb(var(--ink-faint))', fontSize: '11px' }}>
          <span>Projection</span>
          <span className="tnum" style={{ color: 'rgb(var(--brand))', fontSize: '10px' }}>{PROJECTION_METADATA[activeProjection] || activeProjection}</span>
        </div>
        <div className="relative">
          <select
            value={activeProjection}
            onChange={(e) => handleSelectProjection(e.target.value)}
            className="w-full text-xs font-mono rounded-md px-3 py-2.5 appearance-none pr-8 cursor-pointer transition-all focus:outline-none"
            style={{ backgroundColor: 'rgb(var(--elevated))', color: 'rgb(var(--ink))', border: '1px solid rgb(var(--hairline))' }}
          >
            {PROJECTION_LIST.map((p) => (
              <option key={p.key} value={p.key} style={{ backgroundColor: 'rgb(var(--surface))' }}>{p.name}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3" style={{ color: 'rgb(var(--ink-faint))' }}>
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs" style={{ color: 'rgb(var(--ink-faint))' }}>Coordinates</div>
        {[
          { label: "Latitude", value: inputLat, setter: setInputLat, min: -90, max: 90, suffix: inputLat >= 0 ? "°N" : "°S" },
          { label: "Longitude", value: inputLon, setter: setInputLon, min: -180, max: 180, suffix: inputLon >= 0 ? "°E" : "°W" },
        ].map((field) => (
          <div key={field.label} className="rounded-md px-3 py-2 flex items-center justify-between" style={{ backgroundColor: 'rgb(var(--elevated))', border: '1px solid rgb(var(--hairline))' }}>
            <span style={{ color: 'rgb(var(--ink-muted))' }}>{field.label}</span>
            <div className="flex items-center gap-2">
              <input
                type="number" step="0.01" min={field.min} max={field.max}
                value={field.value}
                onChange={(e) => field.setter(parseFloat(e.target.value) || 0)}
                className="w-20 bg-transparent font-bold text-xs text-right focus:outline-none tnum"
                style={{ color: 'rgb(var(--ink))' }}
              />
              <span className="tnum text-xs w-6 text-right" style={{ color: 'rgb(var(--ink-faint))' }}>{field.suffix}</span>
            </div>
          </div>
        ))}

        <div className="grid grid-cols-4 gap-1 pt-0.5">
          {LOCATION_PRESETS.map((loc) => {
            const isSelected = Math.abs(inputLat - loc.lat) < 0.05 && Math.abs(inputLon - loc.lon) < 0.05;
            return (
              <button
                key={loc.label}
                type="button"
                onClick={() => { setInputLat(loc.lat); setInputLon(loc.lon); }}
                className="px-1.5 py-1 rounded text-center truncate cursor-pointer transition-all hover-lift"
                style={{
                  fontSize: '10px',
                  backgroundColor: isSelected ? 'rgb(var(--brand))' : 'rgb(var(--elevated))',
                  color: isSelected ? '#000' : 'rgb(var(--ink-muted))',
                  border: `1px solid ${isSelected ? 'rgb(var(--brand))' : 'rgb(var(--hairline))'}`,
                  fontWeight: isSelected ? '600' : '400',
                }}
              >
                {loc.label}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button" onClick={handleLocateMe} disabled={isLocating}
        className="w-full py-2.5 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 hover-lift"
        style={{ backgroundColor: 'rgb(var(--elevated))', color: 'rgb(var(--ink))', border: '1px solid rgb(var(--hairline))' }}
      >
        <Locate className={cn("w-3.5 h-3.5", isLocating && "animate-spin")} style={{ color: 'rgb(var(--brand))' }} />
        <span>{isLocating ? "Locating..." : "Locate Yourself"}</span>
      </button>

      <div className="space-y-2">
        <div className="flex justify-between items-center" style={{ color: 'rgb(var(--ink-faint))', fontSize: '11px' }}>
          <span>Depth</span>
          <span className="tnum font-bold px-2 py-0.5 rounded" style={{ color: 'rgb(var(--ink))', backgroundColor: 'rgb(var(--elevated))', border: '1px solid rgb(var(--hairline))' }}>{workbenchDepth}m</span>
        </div>
        <input
          type="range" min="0" max="2000" step="10" value={workbenchDepth}
          onChange={(e) => setWorkbenchDepth(Number(e.target.value))}
          className="w-full h-1 rounded appearance-none cursor-pointer"
          style={{ accentColor: 'rgb(var(--brand))' }}
        />
        <div className="grid grid-cols-6 gap-1 text-center">
          {[0, 50, 150, 500, 1000, 2000].map((d) => (
            <button
              key={d} type="button" onClick={() => setWorkbenchDepth(d)}
              className="py-1 rounded cursor-pointer transition-all hover-lift"
              style={{
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                backgroundColor: workbenchDepth === d ? 'rgb(var(--brand))' : 'rgb(var(--elevated))',
                color: workbenchDepth === d ? '#000' : 'rgb(var(--ink-muted))',
                border: `1px solid ${workbenchDepth === d ? 'rgb(var(--brand))' : 'rgb(var(--hairline))'}`,
                fontWeight: workbenchDepth === d ? '700' : '400',
              }}
            >
              {d === 0 ? "0m" : `${d}m`}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2">
        <button
          type="button" onClick={handlePredict} disabled={isPredicting}
          className="w-full py-3 px-4 rounded-md brand-fill glow-brand text-black font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-75 hover-lift"
        >
          {isPredicting ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /><span>Predicting...</span></>
          ) : (
            <span>Predict Ocean State</span>
          )}
        </button>
      </div>
    </div>
  );

  const renderPredictionAnswerSection = () => (
    <div className="space-y-4 text-xs font-sans">
      <div className="flex justify-between items-center pb-1">
        <div className="font-display text-sm" style={{ color: 'rgb(var(--ink))' }}>{predictionResult.location.regionName}</div>
        <RiskBadge
          level={predictionResult.summary.riskStatus === "SAFE" ? "SAFE" : predictionResult.summary.riskStatus === "ADVISORY" ? "CAUTION" : "DANGER"}
          size="sm"
        />
      </div>

      <div className="rounded-md p-4 space-y-2.5" style={{ border: '1px solid rgb(var(--hairline))', backgroundColor: 'rgb(var(--elevated))' }}>
        {[
          { label: "Current speed", value: `${predictionResult.summary.currentSpeedMs} m s⁻¹` },
          { label: "Current bearing", value: `${predictionResult.summary.currentDirectionCompass} (${predictionResult.summary.currentDirectionDeg}°)` },
          ...Object.values(predictionResult.variables).map((v) => ({ label: v.commonName, value: v.formattedValue })),
        ].map((row, i, arr) => (
          <div
            key={row.label}
            className={cn("flex justify-between items-center text-xs pb-2", i < arr.length - 1 && "border-b")}
            style={{ borderColor: 'rgb(var(--hairline))' }}
          >
            <span style={{ color: 'rgb(var(--ink-muted))' }}>{row.label}</span>
            <span className="font-bold tnum" style={{ color: 'rgb(var(--ink))' }}>{row.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={() => window.open(`/operations?lat=${inputLat}&lon=${inputLon}&depth=${workbenchDepth}`, "_blank")}
          className="py-2.5 px-3 rounded-md brand-fill glow-brand text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer hover-lift"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Open Direction</span>
          <ExternalLink className="w-3 h-3 opacity-70" />
        </button>
        <button
          type="button"
          onClick={() => window.open(`/details?lat=${inputLat}&lon=${inputLon}&depth=${workbenchDepth}`, "_blank")}
          className="py-2.5 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer hover-lift"
          style={{ backgroundColor: 'rgb(var(--elevated))', color: 'rgb(var(--ink))', border: '1px solid rgb(var(--hairline))' }}
        >
          <FileText className="w-3.5 h-3.5" style={{ color: 'rgb(var(--brand))' }} />
          <span>View Details</span>
          <ExternalLink className="w-3 h-3" style={{ color: 'rgb(var(--ink-faint))' }} />
        </button>
        <button
          type="button"
          onClick={() => window.open(`/depth-slice?lat=${inputLat}&lon=${inputLon}&depth=${workbenchDepth}`, "_blank")}
          className="col-span-2 py-2.5 px-3 rounded-md font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer hover-lift"
          style={{ backgroundColor: 'rgb(var(--elevated))', color: 'rgb(var(--brand))', border: '1px solid rgb(var(--brand) / 0.3)' }}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Open 3D Depth Slice</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );

  const renderMergedControlsAndAnalytics = () => (
    <div className="space-y-6">
      <div className="pb-3 flex justify-between items-center" style={{ borderBottom: '1px solid rgb(var(--hairline))' }}>
        <h3 className="eyebrow" style={{ color: 'rgb(var(--ink))' }}>Operations & Analytics</h3>
        <div className="flex items-center gap-1.5 tnum px-2.5 py-0.5 rounded-full" style={{ fontSize: '10px', color: 'rgb(var(--brand))', backgroundColor: 'rgb(var(--brand) / 0.08)', border: '1px solid rgb(var(--brand) / 0.25)' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse-soft" style={{ backgroundColor: 'rgb(var(--brand))' }} />
          <span>OPERATIONS ACTIVE</span>
        </div>
      </div>
      {renderOperationInputs()}
      {renderPredictionAnswerSection()}
    </div>
  );

  return (
    <div ref={containerRef} className="relative w-full max-w-screen overflow-x-hidden min-h-screen font-sans">
      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-[2px] z-50" style={{ backgroundColor: 'rgb(var(--hairline))' }}>
        <div
          className="h-full will-change-transform"
          style={{
            background: 'rgb(var(--brand))',
            transform: `scaleX(${scrollProgress})`,
            transformOrigin: "left center",
            transition: "transform 0.1s ease-out",
          }}
        />
      </div>

      {/* NAVIGATION */}
      <AppNavbar currentRoute="home" />

      {/* 3D GLOBE BACKDROP — always z-20, below marquee (z-30) and nav (z-40) */}
      <div
        className="fixed pointer-events-none will-change-transform"
        style={{
          zIndex: 20,
          transform: globeTransform,
          transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease-out",
          opacity: isEarthFullscreen || isPlatformOpen ? 0 : globeOpacity,
          pointerEvents: globeOpacity < 0.05 ? 'none' : undefined,
        }}
      >
        <div className="scale-75 sm:scale-90 lg:scale-100 pointer-events-auto">
          <Globe />
        </div>
      </div>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section
        ref={(el) => { sectionRefs.current[0] = el; }}
        className="relative min-h-screen overflow-hidden"
      >
        {/* Ocean Wave Shader Background */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-80">
          <WavyBackground className="w-full h-full" />
          {/* Subtle bottom fade into the rest of the dark Helix canvas */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 70% 50%, transparent 40%, rgb(var(--canvas) / 0.7) 100%), linear-gradient(to bottom, transparent 65%, rgb(var(--canvas)) 100%)',
            }}
          />
        </div>

        {/* Hairline grid overlay */}
        <div className="grid-bg pointer-events-none absolute inset-0 z-[1]" />

        {/* Hero content */}
        <div className="relative z-20 flex flex-col justify-center min-h-screen px-6 lg:px-12 pt-24 pb-16 max-w-6xl mx-auto pointer-events-none">
          <div className="max-w-2xl space-y-7 pointer-events-auto">
            <div className="space-y-2 animate-reveal-up" style={{ animationDelay: "80ms" }}>
              <h1 className="font-display text-[4rem] sm:text-7xl lg:text-[5.5rem] leading-[0.93] tracking-[-0.045em]" style={{ color: 'rgb(var(--ink))' }}>
                LEHER
              </h1>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl leading-[1.05]" style={{ color: 'rgb(var(--ink-muted))' }}>
                Navigate the Indian Ocean, Safely.
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2 animate-reveal-up" style={{ animationDelay: "260ms" }}>
              <button
                onClick={() => window.location.href = "/operations"}
                className="inline-flex items-center gap-2 py-3 px-7 rounded-md brand-fill glow-brand text-black font-semibold text-sm transition-all cursor-pointer hover-lift focus:outline-none"
              >
                Launch Platform <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollToSection("section-story")}
                className="inline-flex items-center gap-2 py-3 px-6 rounded-md font-medium text-sm transition-all cursor-pointer hover-lift focus:outline-none"
                style={{ color: 'rgb(var(--ink-muted))', border: '1px solid rgb(var(--hairline))', backgroundColor: 'rgb(var(--surface))' }}
              >
                How It Works
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── OCEAN PARAMETER MARQUEE ───────────────────────────── */}
      {/* position:relative + z-index ensures it always renders above the fixed globe */}
      <div aria-hidden className="border-y" style={{ backgroundColor: 'rgb(var(--surface))', borderColor: 'rgb(var(--hairline))', padding: '14px 0', position: 'relative', zIndex: 30 }}>
        <div className="mask-fade-r overflow-hidden">
          <div className="flex w-max animate-marquee items-center gap-10 pr-10">
            {[...OCEAN_TICKERS, ...OCEAN_TICKERS, ...OCEAN_TICKERS, ...OCEAN_TICKERS].map((t, i) => (
              <div key={i} className="flex items-center gap-3 whitespace-nowrap">
                <span className="text-sm font-medium" style={{ color: 'rgb(var(--ink))' }}>{t.label}</span>
                <span className="tnum text-sm" style={{ color: 'rgb(var(--ink-muted))' }}>{t.value}</span>
                <span className="tnum" style={{ fontSize: '0.6875rem', color: t.positive ? 'rgb(var(--long))' : 'rgb(var(--short))' }}>
                  {t.positive ? "+" : ""}{t.change}
                </span>
                <span style={{ color: 'rgb(var(--ink-faint))' }}>·</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── STAT BAND ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pt-16">
        <div className="grid grid-cols-2 overflow-hidden rounded-lg md:grid-cols-4" style={{ border: '1px solid rgb(var(--hairline))', backgroundColor: 'rgb(var(--surface))' }}>
          {[
            { label: "Coverage", value: "Indian Ocean" },
            { label: "Variables", value: "9 CMEMS" },
            { label: "Risk Levels", value: "3 Tiers" },
            { label: "Data Source", value: "CMEMS" },
          ].map((s, i) => (
            <div key={s.label} className={cn("px-6 py-7", i > 0 && "border-l")} style={{ borderColor: 'rgb(var(--hairline))' }}>
              <p className="eyebrow mb-2.5">{s.label}</p>
              <p className="font-display text-3xl md:text-4xl" style={{ color: 'rgb(var(--ink))' }}>{s.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── NARRATIVE "WHY LEHER" ─────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="grid gap-10 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-5">
            <p className="eyebrow mb-5">Why Leher</p>
            <h2 className="font-display text-4xl leading-[1.05] md:text-5xl" style={{ color: 'rgb(var(--ink))' }}>
              A platform built for the Indian Ocean.
            </h2>
          </div>
          <div className="space-y-6 md:col-span-7 md:pt-2">
            <p className="text-lg leading-relaxed" style={{ color: 'rgb(var(--ink-muted))' }}>
              The Indian Ocean spans 70 million km² with some of the world's most complex hydrodynamics — seasonal monsoon reversals, warm-pool SST anomalies, and layered current systems from 0m to 2000m.
            </p>
            <p className="text-base leading-relaxed" style={{ color: 'rgb(var(--ink-faint))' }}>
              Leher turns Copernicus Marine (CMEMS) scientific datasets into plain-language operational advisories — SAFE, CAUTION, or DANGER — for fishermen, patrol vessels, and maritime authorities who need decisions, not data dumps.
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 1: STEPS TO USE LEHER ────────────────────── */}
      <section
        id="section-story"
        ref={(el) => { sectionRefs.current[1] = el; }}
        className="relative min-h-screen flex flex-col justify-center px-6 lg:px-12 z-20 py-16 sm:py-20 max-w-6xl mx-auto"
      >
        <div className="space-y-3 max-w-xl text-left mb-12">
          <p className="eyebrow flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-soft" style={{ backgroundColor: 'rgb(var(--brand))' }} />
            OPERATIONAL WORKFLOW
          </p>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[0.95]" style={{ color: 'rgb(var(--ink))' }}>
            How to Use Leher.
          </h2>
          <p className="text-base leading-relaxed font-light" style={{ color: 'rgb(var(--ink-muted))' }}>
            A 4-step decision-support workflow designed for coastal fishermen, patrol vessels, and maritime authorities.
          </p>
        </div>
        <div className="w-full lg:max-w-[640px]">
          <HowItWorks features={LEHER_STEPS} align="left" />
        </div>
      </section>

      {/* ── FEATURES GRID ─────────────────────────────────────── */}
      <section className="border-t" style={{ backgroundColor: 'rgb(var(--surface) / 0.4)', borderColor: 'rgb(var(--hairline))' }}>
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="grid gap-10 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-4">
              <p className="eyebrow mb-5">The Platform</p>
              <h2 className="font-display text-4xl leading-[1.05] md:text-5xl" style={{ color: 'rgb(var(--ink))' }}>
                Real intelligence, not raw data.
              </h2>
              <p className="mt-6 text-sm leading-relaxed" style={{ color: 'rgb(var(--ink-faint))' }}>
                Nine Copernicus variables, a 3D interactive globe, and depth-slice analysis — distilled into a single operational advisory you can act on in seconds.
              </p>
            </div>
            <div className="md:col-span-8">
              <div className="grid sm:grid-cols-2">
                {FEATURES.map((f, i) => (
                  <div
                    key={f.title}
                    className="flex gap-5 py-7 border-t sm:[&:nth-child(-n+2)]:border-t-0 sm:[&:nth-child(odd)]:pr-8"
                    style={{ borderColor: 'rgb(var(--hairline))' }}
                  >
                    <span className="tnum text-lg" style={{ color: 'rgb(var(--brand) / 0.7)' }}>0{i + 1}</span>
                    <div>
                      <h3 className="text-base font-medium" style={{ color: 'rgb(var(--ink))' }}>{f.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed" style={{ color: 'rgb(var(--ink-muted))' }}>{f.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── OPERATIONS CONSOLE PREVIEW ────────────────────────── */}
      <section
        id="section-preview"
        ref={(el) => { sectionRefs.current[2] = el; }}
        className="relative min-h-screen flex flex-col justify-center px-4 sm:px-6 lg:px-12 z-20 py-20 max-w-6xl mx-auto"
      >
        <div className="space-y-4 max-w-2xl mb-8">
          <p className="eyebrow">Operations Console</p>
          <h2 className="font-display text-4xl sm:text-5xl" style={{ color: 'rgb(var(--ink))' }}>
            Indian Ocean Maritime Operations Console
          </h2>
          <p className="text-base leading-relaxed font-light" style={{ color: 'rgb(var(--ink-muted))' }}>
            Interactive maritime map for environmental assessment, hazard awareness, and route safety decisions.
          </p>
        </div>

        <div className="rounded-xl overflow-hidden shadow-2xl" style={{ backgroundColor: 'rgb(var(--surface))', border: '1px solid rgb(var(--hairline))' }}>
          {/* Console header bar */}
          <div className="px-6 py-3.5 flex flex-wrap justify-between items-center gap-2 sheen" style={{ backgroundColor: 'rgb(var(--elevated))', borderBottom: '1px solid rgb(var(--hairline))' }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-pulse-soft" style={{ backgroundColor: 'rgb(var(--long))' }} />
              <span className="text-xs font-medium tnum" style={{ color: 'rgb(var(--ink))' }}>INDIAN OCEAN MARITIME OPERATIONS CONSOLE</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="tnum text-xs" style={{ color: 'rgb(var(--ink-muted))' }}>{realTimeClock}</span>
              <button
                onClick={() => setIsEarthFullscreen(true)}
                className="px-3 py-1 rounded text-xs flex items-center gap-1.5 transition-all cursor-pointer hover-lift"
                style={{ backgroundColor: 'rgb(var(--elevated))', color: 'rgb(var(--ink-muted))', border: '1px solid rgb(var(--hairline))' }}
              >
                <Maximize2 className="w-3.5 h-3.5" /> Fullscreen Map
              </button>
            </div>
          </div>

          {/* 3-column grid */}
          <div className="grid grid-cols-12 min-h-[640px]">
            {/* Left: Input Controls */}
            <div className="col-span-12 lg:col-span-4 p-5 space-y-4" style={{ backgroundColor: 'rgb(var(--surface))', borderRight: '1px solid rgb(var(--hairline))' }}>
              <div className="pb-2 flex justify-between items-center" style={{ borderBottom: '1px solid rgb(var(--hairline))' }}>
                <span className="eyebrow flex items-center gap-1.5" style={{ color: 'rgb(var(--ink))' }}>
                  <Sliders className="w-3.5 h-3.5" style={{ color: 'rgb(var(--brand))' }} />
                  INPUT & CONTROLS
                </span>
                <span className="tnum" style={{ fontSize: '10px', color: 'rgb(var(--ink-faint))' }}>Interactive Predictor</span>
              </div>
              {renderOperationInputs()}
            </div>

            {/* Center: Earth Iframe */}
            <div className="col-span-12 lg:col-span-4 relative flex flex-col overflow-hidden min-h-[480px]" style={{ backgroundColor: '#040404' }}>
              <div className="absolute top-3 left-4 right-4 z-10 flex justify-between items-center gap-2 pointer-events-none">
                <div className="px-3 py-1 rounded text-xs tnum pointer-events-auto" style={{ backgroundColor: 'rgb(0 0 0 / 0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgb(var(--hairline))', color: 'rgb(var(--ink-muted))' }}>
                  {PROJECTION_METADATA[activeProjection] ? "BOUNDED" : activeProjection} @ {workbenchDepth}m
                </div>
                <div className="px-3 py-1 rounded flex items-center gap-2 tnum pointer-events-auto" style={{ fontSize: '11px', backgroundColor: 'rgb(var(--surface) / 0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgb(var(--hairline))', color: 'rgb(var(--ink-muted))' }}>
                  <button onClick={() => setIsPlaying(!isPlaying)} className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
                    {isPlaying ? <Pause className="w-3 h-3" style={{ color: 'rgb(var(--long))' }} /> : <Play className="w-3 h-3" style={{ color: 'rgb(var(--ink))' }} />}
                    <span className="font-semibold" style={{ color: 'rgb(var(--ink))' }}>{isPlaying ? "LIVE" : "PAUSED"}</span>
                  </button>
                </div>
              </div>
              <div className="w-full h-full min-h-[500px] relative">
                <iframe
                  key={`${activeProjection}-${workbenchVar}`}
                  src={getEarthIframeUrl(workbenchVar)}
                  title="Leher Workbench 3D Earth"
                  className="w-full h-full border-0 absolute inset-0"
                  loading="lazy"
                  onLoad={() => sendToEarthIframe({ action: "setLocation", latitude: inputLat, longitude: inputLon })}
                />
              </div>
              <div className="absolute bottom-3 left-4 right-4 z-10 pointer-events-none">
                <div className="px-3 py-1.5 rounded-lg flex justify-between items-center pointer-events-auto" style={{ backgroundColor: 'rgb(0 0 0 / 0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgb(255 255 255 / 0.08)', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'rgb(var(--ink-muted))' }}>
                  <span>Selected: <strong style={{ color: 'rgb(var(--ink))' }}>{inputLat >= 0 ? `${inputLat}°N` : `${Math.abs(inputLat)}°S`}, {inputLon >= 0 ? `${inputLon}°E` : `${Math.abs(inputLon)}°W`}</strong></span>
                  <span style={{ color: 'rgb(var(--brand))' }}>Click map to inspect</span>
                </div>
              </div>
            </div>

            {/* Right: Prediction Answers */}
            <div className="col-span-12 lg:col-span-4 p-5 space-y-4 overflow-y-auto max-h-[680px]" style={{ backgroundColor: 'rgb(var(--surface))', borderLeft: '1px solid rgb(var(--hairline))' }}>
              <div className="pb-2 flex justify-between items-center" style={{ borderBottom: '1px solid rgb(var(--hairline))' }}>
                <span className="eyebrow flex items-center gap-1.5" style={{ color: 'rgb(var(--ink))' }}>
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'rgb(var(--long))' }} />
                  PREDICTION ANSWERS
                </span>
                <span className="tnum px-2 py-0.5 rounded" style={{ fontSize: '10px', color: 'rgb(var(--long))', backgroundColor: 'rgb(var(--long) / 0.08)', border: '1px solid rgb(var(--long) / 0.25)' }}>
                  Standardized CMEMS
                </span>
              </div>
              {renderPredictionAnswerSection()}
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center md:py-28 border-t" style={{ borderColor: 'rgb(var(--hairline))' }}>
        <p className="eyebrow mb-6">Operational Platform</p>
        <h2 className="font-display mx-auto max-w-3xl text-balance text-5xl leading-[1.03] md:text-7xl" style={{ color: 'rgb(var(--ink))' }}>
          Enhance Maritime Safety with Leher.
        </h2>
        <div className="mt-10 flex justify-center gap-3">
          <button
            onClick={() => window.open("/operations", "_blank")}
            className="inline-flex items-center gap-2 py-3.5 px-8 rounded-md brand-fill glow-brand text-black font-semibold text-sm transition-all cursor-pointer hover-lift focus:outline-none"
          >
            Launch Operations Console <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer className="border-t" style={{ borderColor: 'rgb(var(--hairline))' }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-6 py-10 md:flex-row">
          <div className="flex items-center gap-3 text-sm" style={{ color: 'rgb(var(--ink-faint))' }}>
            <img src="/logo.png" alt="Leher" className="h-7 w-auto object-contain" style={{ filter: 'drop-shadow(0 0 6px rgb(var(--brand) / 0.3))' }} />
            <span className="font-display text-base" style={{ color: 'rgb(var(--ink))' }}>Leher</span>
            <span>· PS 26067 | INCOIS | Maritime Safety</span>
          </div>
          <div className="flex items-center gap-7 text-sm" style={{ color: 'rgb(var(--ink-muted))' }}>
            <a href="/" className="transition-colors hover:text-white">Home</a>
            <a href="/about" className="transition-colors hover:text-white">About</a>
            <a href="/operations" className="transition-colors hover:text-white">Platform</a>
          </div>
        </div>
      </footer>

      {/* ── DETAIL MODAL ──────────────────────────────────────── */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col overflow-hidden animate-fade-in" style={{ backgroundColor: 'rgb(var(--canvas) / 0.95)', backdropFilter: 'blur(20px)' }}>
          <div className="h-16 px-6 flex justify-between items-center shrink-0" style={{ backgroundColor: 'rgb(var(--surface))', borderBottom: '1px solid rgb(var(--hairline))' }}>
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Leher" className="h-7 w-auto object-contain" />
              <div>
                <div className="font-display text-sm flex items-center gap-2" style={{ color: 'rgb(var(--ink))' }}>
                  <span>Copernicus Marine Oceanographic Dossier</span>
                  <span className="tnum px-2 py-0.5 rounded" style={{ fontSize: '10px', color: 'rgb(var(--brand))', border: '1px solid rgb(var(--brand) / 0.3)' }}>10 PARAMETERS</span>
                </div>
                <div className="tnum text-xs mt-0.5" style={{ color: 'rgb(var(--ink-faint))' }}>
                  {predictionResult.location.regionName} @ {predictionResult.location.depth}m
                </div>
              </div>
            </div>
            <button onClick={() => setIsDetailModalOpen(false)} className="p-2 rounded cursor-pointer transition-colors hover:bg-elevated" style={{ color: 'rgb(var(--ink-muted))' }}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full space-y-6">
            <div className="p-5 rounded-xl flex flex-wrap justify-between items-center gap-4" style={{ backgroundColor: 'rgb(var(--surface))', border: '1px solid rgb(var(--hairline))' }}>
              <div>
                <p className="eyebrow mb-1">Local Maritime Target State</p>
                <h3 className="font-display text-xl" style={{ color: 'rgb(var(--ink))' }}>{predictionResult.location.regionName} Marine Profile</h3>
              </div>
              <RiskBadge level={predictionResult.summary.riskStatus === "SAFE" ? "SAFE" : predictionResult.summary.riskStatus === "ADVISORY" ? "CAUTION" : "DANGER"} size="sm" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.values(predictionResult.variables).map((v) => (
                <div key={v.variable} className="rounded-xl p-5 space-y-4" style={{ backgroundColor: 'rgb(var(--surface))', border: '1px solid rgb(var(--hairline))' }}>
                  <div className="flex justify-between items-start pb-3" style={{ borderBottom: '1px solid rgb(var(--hairline))' }}>
                    <div>
                      <span className="text-sm font-medium" style={{ color: 'rgb(var(--ink))' }}>{v.commonName}</span>
                      <div className="tnum text-xs mt-0.5" style={{ color: 'rgb(var(--ink-faint))' }}>Code: {v.variable}</div>
                    </div>
                    <div className="text-right px-3 py-1.5 rounded" style={{ backgroundColor: 'rgb(var(--elevated))', border: '1px solid rgb(var(--hairline))' }}>
                      <div className="tnum text-sm font-bold" style={{ color: 'rgb(var(--ink))' }}>{v.formattedValue}</div>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgb(var(--ink-muted))' }}>{v.operationalImpact}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── FULLSCREEN EARTH MODAL ────────────────────────────── */}
      {isEarthFullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" style={{ backgroundColor: '#040404' }}>
          <div className="h-16 px-6 flex justify-between items-center shrink-0" style={{ backgroundColor: 'rgb(var(--surface))', borderBottom: '1px solid rgb(var(--hairline))' }}>
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Leher" className="h-7 w-auto" />
              <span className="font-display text-base" style={{ color: 'rgb(var(--ink))' }}>Indian Ocean Maritime Operations Console</span>
              <div className="hidden sm:flex items-center gap-2 tnum px-3 py-1 rounded-full" style={{ fontSize: '11px', color: 'rgb(var(--long))', backgroundColor: 'rgb(var(--long) / 0.08)', border: '1px solid rgb(var(--long) / 0.25)' }}>
                <span className="w-2 h-2 rounded-full bg-long animate-pulse-soft" />
                <span>LIVE MARITIME OPERATIONS</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden md:block tnum text-xs" style={{ color: 'rgb(var(--ink-muted))' }}>{realTimeClock}</span>
              <button onClick={() => setIsEarthFullscreen(false)} className="p-2 rounded cursor-pointer transition-colors" style={{ color: 'rgb(var(--ink-muted))', backgroundColor: 'rgb(var(--elevated))', border: '1px solid rgb(var(--hairline))' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 flex relative overflow-hidden">
            <div className="flex-1 h-full relative" style={{ backgroundColor: '#040404' }}>
              <iframe key={workbenchVar} src={getEarthIframeUrl(workbenchVar)} title="Leher Global 3D Earth Fullscreen" className="w-full h-full border-0 absolute inset-0" onLoad={() => sendToEarthIframe({ action: "setLocation", latitude: inputLat, longitude: inputLon })} />
            </div>
            <div className="w-96 lg:w-[420px] p-5 space-y-6 overflow-y-auto z-20" style={{ backgroundColor: 'rgb(var(--surface))', borderLeft: '1px solid rgb(var(--hairline))' }}>
              {renderMergedControlsAndAnalytics()}
            </div>
          </div>
        </div>
      )}

      {/* ── FULLSCREEN PLATFORM MODAL ─────────────────────────── */}
      {isPlatformOpen && (
        <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" style={{ backgroundColor: '#040404' }}>
          <div className="h-16 px-6 flex justify-between items-center shrink-0" style={{ backgroundColor: 'rgb(var(--surface))', borderBottom: '1px solid rgb(var(--hairline))' }}>
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Leher" className="h-7 w-auto" />
              <span className="font-display text-base" style={{ color: 'rgb(var(--ink))' }}>Leher 3D Ocean Intelligence Workbench</span>
              <div className="hidden sm:flex items-center gap-2 tnum px-3 py-1 rounded-full" style={{ fontSize: '11px', color: 'rgb(var(--long))', backgroundColor: 'rgb(var(--long) / 0.08)', border: '1px solid rgb(var(--long) / 0.25)' }}>
                <span className="w-2 h-2 rounded-full animate-pulse-soft" style={{ backgroundColor: 'rgb(var(--long))' }} />
                <span>OPERATIONAL WORKBENCH</span>
              </div>
            </div>
            <button onClick={() => setIsPlatformOpen(false)} className="p-2 rounded cursor-pointer transition-colors" style={{ color: 'rgb(var(--ink-muted))', backgroundColor: 'rgb(var(--elevated))', border: '1px solid rgb(var(--hairline))' }}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 flex relative overflow-hidden">
            <div className="flex-1 h-full relative" style={{ backgroundColor: '#040404' }}>
              <iframe key={workbenchVar} src={getEarthIframeUrl(workbenchVar)} title="Leher Full Workbench 3D Earth" className="w-full h-full border-0 absolute inset-0" onLoad={() => sendToEarthIframe({ action: "setLocation", latitude: inputLat, longitude: inputLon })} />
            </div>
            <div className="w-96 lg:w-[420px] p-5 space-y-6 overflow-y-auto z-20" style={{ backgroundColor: 'rgb(var(--surface))', borderLeft: '1px solid rgb(var(--hairline))' }}>
              {renderMergedControlsAndAnalytics()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
