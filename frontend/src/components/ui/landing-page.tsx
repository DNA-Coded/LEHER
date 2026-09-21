import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Globe from "@/components/ui/globe";
import { cn } from "@/lib/utils";
import { 
  X, 
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
  Leaf,
  Fish,
  ShieldCheck,
  MapPinOff
} from "lucide-react";
import { leherDataService, type TraceablePointReport } from "@/lib/data/registry.ts";
import { predictOceanState, type OceanPredictionResult } from "@/lib/api/oceanPredictionService";
import { validateCoordinates, HIGHLIGHTED_BOUNDS } from "@/lib/coordinates";
import { getBathymetricSeafloorDepth, type BathymetryInfo } from "@/lib/ocean/bathymetry";
import { DataProvenanceBadge } from "@/components/ui/DataProvenanceBadge";
import { evaluateDataProvenance } from "@/lib/ocean/provenance";
import { fetchBackendStatus } from "@/services/oceanApi";
import { ShinyButton } from "@/components/ui/shiny-button";
import { SpinningBorderButton } from "@/components/ui/spinning-border-button";
import { MenuHoverLink } from "@/components/ui/menu-hover-effects";
import { 
  CardCurtainReveal, 
  CardCurtainRevealTitle, 
  CardCurtainRevealDescription, 
  CardCurtain 
} from "@/components/ui/card-curtain-reveal";
import AppNavbar from "@/components/ui/app-navbar";
import RiskBadge from "@/components/ui/risk-badge";
import HowItWorks, { type Step } from "@/components/ui/how-it-works";


const LEHER_STEPS: Step[] = [
  {
    title: "SEE • Explore Ocean",
    description: "Observe dynamic currents, wave fields, and thermal gradients across the 3D Indian Ocean globe.",
    colorTheme: "cyan",
    colors: {
      bg: "bg-cyan-500/10",
      text: "text-cyan-400",
      border: "border-cyan-500/30",
    },
    popup: {
      tag: "3D BASIN TELEMETRY",
      headline: "Live Ocean Environment",
      statusText: "Active Stream",
      details: [
        "Real-time sea surface temperature layers",
        "High-resolution hydrodynamic current vectors",
        "Subsurface salinity & density gradients"
      ]
    }
  },
  {
    title: "CLICK • Select Location",
    description: "Click anywhere on the interactive map or specify GPS coordinates and transit depth layers.",
    colorTheme: "sky",
    colors: {
      bg: "bg-sky-500/10",
      text: "text-sky-400",
      border: "border-sky-500/30",
    },
    popup: {
      tag: "COORDINATE INSPECTOR",
      headline: "Target Inspection & Locking",
      statusText: "Point-Specific",
      details: [
        "Click anywhere on map to lock GPS coordinates",
        "Inspect depth layers from 0m to 2000m",
        "Auto-detect vessel location via GPS"
      ]
    }
  },
  {
    title: "UNDERSTAND • Assess Risk",
    description: "Review standardized CMEMS ocean parameters and risk indicators without deciphering raw telemetry.",
    colorTheme: "blue",
    colors: {
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      border: "border-blue-500/30",
    },
    popup: {
      tag: "SAFETY INDEXING",
      headline: "Standardized Risk Triad",
      statusText: "CMEMS Analysis",
      details: [
        "SAFE: Nominal conditions for standard transit",
        "CAUTION: Rising swell or currents; watchkeeping",
        "DANGER: Severe squalls or hazards; sheltering"
      ]
    }
  },
  {
    title: "ACT • Execute Decisions",
    description: "Identify maritime hazards, adjust voyage departure windows, and plan safer navigation trajectories.",
    colorTheme: "indigo",
    colors: {
      bg: "bg-indigo-500/10",
      text: "text-indigo-400",
      border: "border-indigo-500/30",
    },
    popup: {
      tag: "DECISION SUPPORT",
      headline: "Operational Route Decision",
      statusText: "Safer Trajectory",
      details: [
        "Compare planned route risk against alternatives",
        "Identify severe storms and maritime hazards",
        "Determine safer departure and transit windows"
      ]
    }
  },
];

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
  concentric_region: "Concentric Bounded (20°S–25°N, 53°–99°E)",
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
  { key: 'concentric_region', name: 'Concentric Bounded (20°S–25°N, 53°–99°E)', desc: 'Latitudinally & Longitudinally Bounded Focus', badge: 'BOUNDED' },
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
    { top: "50%", left: "70%", scale: 1.2 },  // 1: Steps to Use Leher
    { top: "50%", left: "50%", scale: 0.0 },  // 2: Platform Preview (Hidden, workbench iframe takes over)
  ]
};

const parsePercent = (str: string): number => parseFloat(str.replace('%', ''));

export default function LeherLandingPage() {
  const [activeSection, setActiveSection] = useState(0);
  const activeSectionRef = useRef(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const globeContainerRef = useRef<HTMLDivElement>(null);
  const lastPageMoveTimeRef = useRef(0);
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

  // Local bathymetric seafloor depth for currently entered coordinates
  const bathymetryInfo = useMemo(() => {
    if (isNaN(inputLat) || isNaN(inputLon)) {
      return getBathymetricSeafloorDepth(15.4, 71.2);
    }
    return getBathymetricSeafloorDepth(inputLat, inputLon);
  }, [inputLat, inputLon]);

  // Auto-clamp workbenchDepth if coordinates change to land or shallow water
  useEffect(() => {
    if (bathymetryInfo.isLand) {
      if (workbenchDepth !== 0) setWorkbenchDepth(0);
    } else if (workbenchDepth > bathymetryInfo.maxSafeDepth) {
      setWorkbenchDepth(bathymetryInfo.maxSafeDepth);
    }
  }, [bathymetryInfo.isLand, bathymetryInfo.maxSafeDepth, workbenchDepth]);

  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);

  // Probe backend operational readiness on mount
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

  // Data Provenance & Snapping Offset Lineage
  const provenanceInfo = useMemo(() => {
    return evaluateDataProvenance(inputLat, inputLon, {
      isBackendConnected,
      isRealDataFetched: true,
    });
  }, [inputLat, inputLon, isBackendConnected]);

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
    { label: "Indian Ocean", lat: 0.0, lon: 80.5 },
    { label: "Lakshadweep", lat: 10.5, lon: 72.6 },
    { label: "Andaman Sea", lat: 11.7, lon: 93.0 },
    { label: "Gulf of Mannar", lat: 8.8, lon: 79.0 },
    { label: "Maldives", lat: 3.2, lon: 73.2 },
    { label: "South Sri Lanka", lat: 5.5, lon: 80.5 },
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

  // Validation of input coordinates against highlighted operational bounds
  const coordValidation = useMemo(
    () => validateCoordinates(inputLat, inputLon),
    [inputLat, inputLon]
  );

  const handlePredict = useCallback(() => {
    if (!coordValidation.isValid || bathymetryInfo.isLand) return;
    setIsPredicting(true);
    const targetUrl = `/depth-slice?lat=${inputLat}&lon=${inputLon}&depth=${workbenchDepth}`;
    setTimeout(() => {
      const res = predictOceanState(Number(inputLat), Number(inputLon), Number(workbenchDepth));
      setPredictionResult(res);
      setIsPredicting(false);
      window.open(targetUrl, '_blank');
    }, 280);
  }, [inputLat, inputLon, workbenchDepth, coordValidation.isValid, bathymetryInfo.isLand]);

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
    
    // Smooth, zero-render scroll progress bar update via direct DOM ref
    if (progressBarRef.current) {
      progressBarRef.current.style.transform = `scaleX(${progress})`;
    }

    // Whenever user scrolls or moves the page, restore globe to its natural state and resume normal rotation
    if (Math.abs(scrollTop - lastScrollPosRef.current) > 2) {
      const now = Date.now();
      if (now - lastPageMoveTimeRef.current > 350) {
        lastPageMoveTimeRef.current = now;
        const globeIframe = document.getElementById("leher-globe-iframe") as HTMLIFrameElement | null;
        globeIframe?.contentWindow?.postMessage({ type: "LEHER_RESUME_ROTATION" }, "*");
        setIsGlobePaused(false);
      }
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
    // Sections 0 & 1 (Hero through Step 1, 2, 3):
    // Desktop: globe remains strictly static at top: 50%, left: 70%, scale: 1.2
    // Mobile/Tablet (< 1024px): sits comfortably lower at top: 66%, left: 50%, scale: 0.78 so text is fully readable
    const isMobile = window.innerWidth < 1024;
    const secSteps = sectionRefs.current[1];
    const secWorkbench = sectionRefs.current[2];

    let currentLeft = isMobile ? 50 : 70;
    let currentTop = isMobile ? 66 : 50;
    let currentScale = isMobile ? 0.78 : 1.2;
    let currentOpacity = 0.95;

    if (secSteps && secWorkbench) {
      const topSteps = secSteps.offsetTop;
      const topWorkbench = secWorkbench.offsetTop;
      const step4Trigger = topSteps + Math.max((topWorkbench - topSteps) * 0.55, 300);

      if (scrollTop <= step4Trigger) {
        currentLeft = isMobile ? 50 : 70;
        currentTop = isMobile ? 66 : 50;
        currentScale = isMobile ? 0.78 : 1.2;
        currentOpacity = 0.95;
      } else if (scrollTop < topWorkbench) {
        const progress = Math.min(Math.max((scrollTop - step4Trigger) / (topWorkbench - step4Trigger), 0), 1);
        const ease = progress * progress * (3 - 2 * progress);
        currentLeft = isMobile ? 50 : (70 + (50 - 70) * ease);
        currentTop = isMobile ? (66 + (50 - 66) * ease) : 50;
        currentScale = (isMobile ? 0.78 : 1.2) * (1 - 0.72 * ease);
        currentOpacity = 0.95 * (1 - ease);
      } else {
        currentLeft = 50;
        currentTop = 50;
        currentScale = 0;
        currentOpacity = 0;
      }
    }

    const transform = `translate3d(${currentLeft.toFixed(2)}vw, ${currentTop.toFixed(2)}vh, 0) translate3d(-50%, -50%, 0) scale3d(${currentScale.toFixed(3)}, ${currentScale.toFixed(3)}, 1)`;
    
    // Direct DOM ref update prevents re-rendering all 1400 lines of LandingPage at 60fps during scroll
    if (globeContainerRef.current) {
      globeContainerRef.current.style.transform = transform;
      globeContainerRef.current.style.opacity = (isEarthFullscreen || isPlatformOpen) ? '0' : String(currentOpacity);
    }

    if (newActiveSection !== activeSectionRef.current) {
      activeSectionRef.current = newActiveSection;
      setActiveSection(newActiveSection);
    }
  }, [isEarthFullscreen, isPlatformOpen]);

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
      const now = Date.now();
      if (now - lastPageMoveTimeRef.current > 350) {
        lastPageMoveTimeRef.current = now;
        const globeIframe = document.getElementById("leher-globe-iframe") as HTMLIFrameElement | null;
        globeIframe?.contentWindow?.postMessage({ type: "LEHER_RESUME_ROTATION" }, "*");
        setIsGlobePaused(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("wheel", handlePageMove, { passive: true });
    window.addEventListener("touchmove", handlePageMove, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    updateScrollPosition();
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("wheel", handlePageMove);
      window.removeEventListener("touchmove", handlePageMove);
      window.removeEventListener("resize", handleScroll);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [updateScrollPosition]);

  useEffect(() => {
    const isMobile = window.innerWidth < 1024;
    const initialPos = calculatedPositions[0];
    if (initialPos && globeContainerRef.current) {
      const left = isMobile ? 50 : initialPos.left;
      const top = isMobile ? 66 : initialPos.top;
      const scale = isMobile ? 0.78 : initialPos.scale;
      globeContainerRef.current.style.transform = `translate3d(${left}vw, ${top}vh, 0) translate3d(-50%, -50%, 0) scale3d(${scale}, ${scale}, 1)`;
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
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#888888]">Coordinates</span>
          <span className="text-[10px] font-mono text-[#666666]">
            Sector: {HIGHLIGHTED_BOUNDS.label}
          </span>
        </div>
        
        {/* Latitude */}
        <div className={cn(
          "bg-[#121212] border rounded-xl px-3 py-2 flex items-center justify-between transition-colors",
          coordValidation.latError
            ? "border-rose-500/80 bg-rose-950/20 text-rose-200 ring-1 ring-rose-500/30"
            : "border-[#262626] focus-within:border-cyan-400/80"
        )}>
          <span className={cn("text-xs", coordValidation.latError ? "text-rose-400 font-semibold" : "text-[#888888]")}>
            Latitude
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              value={isNaN(inputLat) ? "" : inputLat}
              onChange={(e) => setInputLat(e.target.value === "" ? NaN : parseFloat(e.target.value))}
              className={cn(
                "w-20 bg-transparent font-bold text-xs text-right focus:outline-none font-mono",
                coordValidation.latError ? "text-rose-200 placeholder-rose-700" : "text-white"
              )}
              placeholder="15.40"
            />
            <span className={cn("font-mono text-xs w-6 text-right", coordValidation.latError ? "text-rose-400" : "text-[#666666]")}>
              {!isNaN(inputLat) ? (inputLat >= 0 ? "°N" : "°S") : "--"}
            </span>
          </div>
        </div>

        {/* Longitude */}
        <div className={cn(
          "bg-[#121212] border rounded-xl px-3 py-2 flex items-center justify-between transition-colors",
          coordValidation.lonError
            ? "border-rose-500/80 bg-rose-950/20 text-rose-200 ring-1 ring-rose-500/30"
            : "border-[#262626] focus-within:border-cyan-400/80"
        )}>
          <span className={cn("text-xs", coordValidation.lonError ? "text-rose-400 font-semibold" : "text-[#888888]")}>
            Longitude
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              value={isNaN(inputLon) ? "" : inputLon}
              onChange={(e) => setInputLon(e.target.value === "" ? NaN : parseFloat(e.target.value))}
              className={cn(
                "w-20 bg-transparent font-bold text-xs text-right focus:outline-none font-mono",
                coordValidation.lonError ? "text-rose-200 placeholder-rose-700" : "text-white"
              )}
              placeholder="71.20"
            />
            <span className={cn("font-mono text-xs w-6 text-right", coordValidation.lonError ? "text-rose-400" : "text-[#666666]")}>
              {!isNaN(inputLon) ? (inputLon >= 0 ? "°E" : "°W") : "--"}
            </span>
          </div>
        </div>

        {/* Invalid Coordinates Alert */}
        {!coordValidation.isValid && (
          <div 
            id="invalid-coord-alert"
            role="alert"
            className="p-3 bg-rose-950/40 border border-rose-500/60 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-1 duration-200 shadow-lg shadow-rose-950/40"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-1 text-xs">
                <div className="font-bold text-rose-300 tracking-wide">
                  Outside Highlighted Operational Area
                </div>
                <p className="text-[11px] text-rose-200/90 leading-relaxed font-sans">
                  {coordValidation.message}
                </p>
                <div className="text-[10px] text-rose-400/90 font-mono bg-rose-950/60 px-2 py-1 rounded border border-rose-800/40 mt-1">
                  Sector Bounds: <strong className="text-white font-mono">{HIGHLIGHTED_BOUNDS.label}</strong>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-rose-800/40 text-[10px]">
              <span className="text-rose-400/80 font-mono">Prediction button disabled</span>
              <button
                type="button"
                onClick={() => {
                  setInputLat(15.4);
                  setInputLon(71.2);
                }}
                className="text-cyan-400 hover:text-cyan-300 font-mono underline cursor-pointer"
              >
                Reset to Sector Center (15.4°N, 71.2°E)
              </button>
            </div>
          </div>
        )}

        {/* Land Surface Alert */}
        {coordValidation.isValid && bathymetryInfo.isLand && (
          <div
            role="alert"
            className="p-2.5 bg-amber-950/40 border border-amber-500/60 rounded-xl space-y-1.5 text-xs text-amber-200 animate-in fade-in duration-200"
          >
            <div className="flex items-start gap-2">
              <MapPinOff className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-bold text-amber-300 text-[11px] flex items-center gap-1.5">
                  <span>Terrestrial Land Surface Selected</span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px]">
                    NON-OCEAN
                  </span>
                </div>
                <p className="text-[10px] text-amber-200/90 leading-snug">
                  Coordinates fall on land ({bathymetryInfo.description}). Subsurface ocean water column, depth sounding, and 3D depth slices are disabled for land surfaces.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-amber-800/40 text-[10px]">
              <span className="text-amber-400/80 font-mono">Ocean depth disabled</span>
              <button
                type="button"
                onClick={() => {
                  setInputLat(14.5);
                  setInputLon(73.2);
                }}
                className="text-cyan-400 hover:text-cyan-300 font-mono underline cursor-pointer"
                title="Select Goa Continental Slope (460m depth)"
              >
                Try Ocean Slope (14.5°N, 73.2°E)
              </button>
            </div>
          </div>
        )}

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

      {/* 3. Locate Yourself (Secondary Button Animation) */}
      <SpinningBorderButton
        type="button"
        onClick={handleLocateMe}
        disabled={isLocating}
        hideArrow
        className="w-full text-xs"
      >
        <Locate className={cn("w-3.5 h-3.5 mr-1.5", isLocating && "animate-spin")} />
        <span>{isLocating ? "Locating..." : "Locate Yourself"}</span>
      </SpinningBorderButton>

      {/* Data Provenance & Telemetry Lineage */}
      {coordValidation.isValid && !bathymetryInfo.isLand && (
        <div className="flex items-center justify-between py-1 px-0.5 border-b border-white/5">
          <span className="text-[10px] font-mono text-[#888888] flex items-center gap-1">
            <span>DATA LINEAGE</span>
          </span>
          <DataProvenanceBadge provenance={provenanceInfo} />
        </div>
      )}

      {/* Sparse Grid Snapping Alert if > 15km */}
      {coordValidation.isValid && !bathymetryInfo.isLand && provenanceInfo.isSparseOrOffset && (
        <div className="p-2 bg-amber-950/30 border border-amber-500/30 rounded-lg text-[10px] text-amber-300 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400 mt-0.5" />
          <span>Sparse grid point ({provenanceInfo.gridOffsetKm} km to nearest node). Sub-grid variance expected.</span>
        </div>
      )}

      {/* 4. Depth Measurement with Bathymetry Seafloor Capping & Land Lock */}
      <div className={cn("space-y-2", bathymetryInfo.isLand && "opacity-60")}>
        <div className="flex justify-between items-center text-[11px] text-[#888888]">
          <div className="flex items-center gap-1.5">
            <span>Depth Profile</span>
            {bathymetryInfo.isLand ? (
              <span className="px-1.5 py-0.5 bg-rose-950/60 border border-rose-500/40 text-rose-300 rounded text-[9px] font-mono">
                Land Surface (Disabled)
              </span>
            ) : bathymetryInfo.isContinentalShelf ? (
              <span className="px-1.5 py-0.5 bg-amber-950/60 border border-amber-500/40 text-amber-300 rounded text-[9px] font-mono">
                Shelf Capped ({bathymetryInfo.seafloorDepth}m)
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2 font-mono">
            <span className="text-[10px] text-[#666666]">
              {bathymetryInfo.isLand ? "Land Surface" : `Seafloor: ~${bathymetryInfo.seafloorDepth}m`}
            </span>
            <span className={cn("font-bold text-[11px]", bathymetryInfo.isLand ? "text-neutral-500" : "text-white")}>
              {bathymetryInfo.isLand ? "N/A" : `${workbenchDepth}m`}
            </span>
          </div>
        </div>

        <input 
          type="range" 
          min="0" 
          max={bathymetryInfo.maxSafeDepth} 
          step={bathymetryInfo.maxSafeDepth <= 100 ? 5 : 10} 
          value={workbenchDepth} 
          disabled={bathymetryInfo.isLand || !coordValidation.isValid}
          onChange={(e) => !bathymetryInfo.isLand && setWorkbenchDepth(Number(e.target.value))} 
          className={cn(
            "w-full h-1 bg-[#222222] rounded appearance-none",
            bathymetryInfo.isLand ? "cursor-not-allowed opacity-40" : "accent-white cursor-pointer"
          )}
        />

        <div className="grid grid-cols-6 gap-1 text-center">
          {[0, 50, 150, 500, 1000, 2000].map((d) => {
            const isExceeded = bathymetryInfo.isLand || d > bathymetryInfo.seafloorDepth;
            return (
              <button
                key={d}
                type="button"
                onClick={() => !isExceeded && setWorkbenchDepth(d)}
                disabled={isExceeded}
                title={
                  bathymetryInfo.isLand
                    ? "Depth sounding disabled on land"
                    : isExceeded
                    ? `Exceeds local seafloor (${bathymetryInfo.seafloorDepth}m)`
                    : `Set depth to ${d}m`
                }
                className={cn(
                  "py-1 rounded text-[10px] font-mono border transition-all truncate",
                  isExceeded
                    ? "bg-[#101010] border-[#1d1d1d] text-[#444444] cursor-not-allowed line-through opacity-40"
                    : workbenchDepth === d
                    ? "bg-white text-black font-bold border-white cursor-pointer shadow-sm"
                    : "bg-[#141414] border-[#222222] text-[#666666] hover:text-white cursor-pointer"
                )}
              >
                {d === 0 ? "0m" : `${d}m`}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Predict Button (Primary Button Animation) */}
      <div className="pt-2">
        <ShinyButton
          type="button"
          onClick={handlePredict}
          disabled={isPredicting || !coordValidation.isValid || bathymetryInfo.isLand}
          className={cn(
            "w-full py-3 px-4 text-xs font-bold transition-all",
            (!coordValidation.isValid || bathymetryInfo.isLand) && "opacity-40 cursor-not-allowed filter grayscale"
          )}
          title={
            !coordValidation.isValid
              ? `Prediction disabled: coordinates must be within highlighted area (${HIGHLIGHTED_BOUNDS.label})`
              : bathymetryInfo.isLand
              ? "Prediction disabled: selected coordinates are on land"
              : "Predict Ocean State at chosen coordinates and depth"
          }
        >
          {isPredicting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-300" />
              <span>Predicting...</span>
            </>
          ) : !coordValidation.isValid ? (
            <>
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Prediction Disabled (Invalid Coordinates)</span>
            </>
          ) : bathymetryInfo.isLand ? (
            <>
              <MapPinOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Prediction Disabled (Land Surface)</span>
            </>
          ) : (
            <span>Predict Ocean State</span>
          )}
        </ShinyButton>
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

      {/* Maritime Intelligence Sectors (Direct Link to Operations Page Tabs) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
        <button
          type="button"
          onClick={() => {
            window.open(`/operations?lat=${inputLat}&lon=${inputLon}&depth=${workbenchDepth}&tab=cyclone`, '_blank');
          }}
          className="p-1.5 rounded-xl bg-[#121212] hover:bg-[#181818] border border-neutral-800 hover:border-rose-500/50 text-left transition-all cursor-pointer group"
          title="Open Cyclone & Hazard Tracker"
        >
          <div className="text-[9px] font-mono text-neutral-400 flex items-center gap-1 group-hover:text-rose-300">
            <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
            <span>Cyclone</span>
          </div>
          <div className="text-[10px] font-bold text-rose-400 font-mono mt-0.5 flex items-center justify-between">
            <span>Tracker</span>
            <span className="text-[8px] opacity-70 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            window.open(`/operations?lat=${inputLat}&lon=${inputLon}&depth=${workbenchDepth}&tab=ecosystem`, '_blank');
          }}
          className="p-1.5 rounded-xl bg-[#121212] hover:bg-[#181818] border border-neutral-800 hover:border-emerald-500/50 text-left transition-all cursor-pointer group"
          title="Open Marine Ecosystem Health"
        >
          <div className="text-[9px] font-mono text-neutral-400 flex items-center gap-1 group-hover:text-emerald-300">
            <Leaf className="w-2.5 h-2.5 text-emerald-400" />
            <span>Ecosystem</span>
          </div>
          <div className="text-[10px] font-bold text-emerald-400 font-mono mt-0.5 flex items-center justify-between">
            <span>Health</span>
            <span className="text-[8px] opacity-70 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            window.open(`/operations?lat=${inputLat}&lon=${inputLon}&depth=${workbenchDepth}&tab=fishing`, '_blank');
          }}
          className="p-1.5 rounded-xl bg-[#121212] hover:bg-[#181818] border border-neutral-800 hover:border-sky-500/50 text-left transition-all cursor-pointer group"
          title="Open Fishing Advisory & PFZ"
        >
          <div className="text-[9px] font-mono text-neutral-400 flex items-center gap-1 group-hover:text-sky-300">
            <Fish className="w-2.5 h-2.5 text-sky-400" />
            <span>Fishing</span>
          </div>
          <div className="text-[10px] font-bold text-sky-400 font-mono mt-0.5 flex items-center justify-between">
            <span>Advisory</span>
            <span className="text-[8px] opacity-70 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            window.open(`/operations?lat=${inputLat}&lon=${inputLon}&depth=${workbenchDepth}&tab=safezone`, '_blank');
          }}
          className="p-1.5 rounded-xl bg-[#121212] hover:bg-[#181818] border border-neutral-800 hover:border-emerald-500/50 text-left transition-all cursor-pointer group"
          title="Open Safe Zone Assessment"
        >
          <div className="text-[9px] font-mono text-neutral-400 flex items-center gap-1 group-hover:text-emerald-300">
            <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
            <span>Safe Zone</span>
          </div>
          <div className="text-[10px] font-bold text-emerald-400 font-mono mt-0.5 flex items-center justify-between">
            <span>Envelope</span>
            <span className="text-[8px] opacity-70 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
          </div>
        </button>
      </div>

      {/* Action Buttons: Open Direction (Primary) and View Details (Secondary) in New Page */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        <ShinyButton
          type="button"
          onClick={() => {
            window.open(`/operations?lat=${inputLat}&lon=${inputLon}&depth=${workbenchDepth}`, '_blank');
          }}
          className="w-full text-xs font-semibold whitespace-nowrap !px-2.5 !py-2.5"
          style={{ padding: '0.625rem 0.5rem' }}
          title="Open Directions and 3D Operations in a new page"
        >
          <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="whitespace-nowrap text-xs">Open Direction</span>
          <ExternalLink className="w-3 h-3 opacity-70 shrink-0 ml-0.5" />
        </ShinyButton>

        <SpinningBorderButton
          type="button"
          onClick={() => {
            window.open(`/details?lat=${inputLat}&lon=${inputLon}&depth=${workbenchDepth}`, '_blank');
          }}
          hideArrow
          className="w-full whitespace-nowrap text-xs"
          innerClassName="py-2.5 px-2.5"
          title="Open Oceanographic Parameter Details in a new page"
        >
          <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="whitespace-nowrap text-xs">View Details</span>
          <ExternalLink className="w-3 h-3 text-[#888888] shrink-0 ml-0.5" />
        </SpinningBorderButton>

        <button
          type="button"
          disabled={bathymetryInfo.isLand || !coordValidation.isValid}
          onClick={() => {
            if (bathymetryInfo.isLand || !coordValidation.isValid) return;
            window.open(`/depth-slice?lat=${inputLat}&lon=${inputLon}&depth=${workbenchDepth}`, '_blank');
          }}
          className={cn(
            "col-span-1 sm:col-span-2 w-full py-2.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md",
            bathymetryInfo.isLand || !coordValidation.isValid
              ? "bg-[#141418] border-zinc-800 text-zinc-600 opacity-40 cursor-not-allowed"
              : "bg-gradient-to-r from-cyan-950/60 to-blue-950/60 hover:from-cyan-900/60 hover:to-blue-900/60 border-cyan-500/40 text-cyan-300 cursor-pointer"
          )}
          title={
            bathymetryInfo.isLand
              ? "3D Volumetric Depth Slice is unavailable for land coordinates"
              : !coordValidation.isValid
              ? "Coordinates outside operational area"
              : "Open 3D Volumetric Ocean Depth Slice in a new page"
          }
        >
          <Layers className={cn("w-3.5 h-3.5", bathymetryInfo.isLand ? "text-zinc-600" : "text-cyan-400")} />
          <span>{bathymetryInfo.isLand ? "3D Depth Slice (Ocean Only)" : "Open 3D Depth Slice"}</span>
          {!bathymetryInfo.isLand && <ExternalLink className="w-3 h-3 text-cyan-400" />}
        </button>
      </div>
    </div>
  );

  const renderMergedControlsAndAnalytics = () => (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="border-b border-[#222222] pb-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Operations & Analytics</h3>
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
      <div className="fixed top-0 left-0 w-full h-[2px] bg-[#1a1a1a] z-50 pointer-events-none">
        <div 
          ref={progressBarRef}
          className="h-full bg-white will-change-transform"
          style={{ 
            transform: 'scaleX(0)',
            transformOrigin: 'left center',
            transition: 'transform 0.1s ease-out'
          }}
        />
      </div>

      {/* NAVIGATION */}
      <AppNavbar currentRoute="home" />

      {/* 3D GLOBE BACKDROP (Hidden when fullscreen or at 3D workbench section) */}
      <div
        ref={globeContainerRef}
        className={cn(
          "fixed pointer-events-none will-change-transform",
          activeSection === 0 ? "z-10 lg:z-25" : "z-10"
        )}
        style={{
          transform: "translate3d(70vw, 50vh, 0) translate3d(-50%, -50%, 0) scale3d(1.2, 1.2, 1)",
          transition: "transform 0.4s ease-out, opacity 0.4s ease-out",
          opacity: (isEarthFullscreen || isPlatformOpen) ? 0 : 0.95,
        }}
      >
        <div className="scale-65 sm:scale-80 lg:scale-100 pointer-events-auto">
          <Globe />
        </div>
      </div>

      {/* ========================================================
          HERO SECTION
         ======================================================== */}
      <section
        ref={(el) => { sectionRefs.current[0] = el; }}
        className="relative min-h-screen flex flex-col justify-center px-4 sm:px-6 lg:px-12 z-20 pt-24 pb-16 max-w-7xl mx-auto pointer-events-none"
      >
        <div className="max-w-2xl space-y-5 sm:space-y-7 pointer-events-auto">
          <div className="space-y-1">
            <h1 className="text-4xl sm:text-6xl lg:text-8xl font-bold tracking-tight text-white leading-[1.05]">
              LEHER
            </h1>
            <h2 className="text-2xl sm:text-4xl lg:text-7xl font-semibold tracking-tight text-[#888888] leading-[1.05]">
              Indian Ocean Maritime Safety & Hazard Intelligence
            </h2>
          </div>



          <div className="flex flex-wrap items-center gap-4 pt-2">
            <ShinyButton 
              onClick={() => {
                sessionStorage.removeItem('leher_ops_returned_from_subscreen');
                sessionStorage.removeItem('leher_ops_subscreen_visited');
                window.location.href = '/operations';
              }}
              className="py-3 px-7 text-sm font-semibold shadow-lg cursor-pointer"
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
          SECTION 1: STEPS TO USE LEHER (OPERATIONAL WORKFLOW)
         ======================================================== */}
      <section
        id="section-story"
        ref={(el) => { sectionRefs.current[1] = el; }}
        className="relative min-h-screen flex flex-col justify-center px-6 lg:px-12 z-20 py-16 sm:py-20 max-w-7xl mx-auto"
      >
        <div className="space-y-3 max-w-xl text-left mb-12">
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
            OPERATIONAL WORKFLOW
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
            How to Use Leher.
          </h2>
          <p className="text-[#888888] leading-relaxed text-sm sm:text-base font-light">
            A 4-step decision-support workflow designed for coastal fishermen, patrol vessels, and maritime authorities.
          </p>
        </div>

        {/* Strictly left-aligned container so the 3D rotating globe on the right remains unobstructed */}
        <div className="w-full lg:max-w-[640px]">
          <HowItWorks features={LEHER_STEPS} align="left" />
        </div>
      </section>

      {/* ========================================================
          OPERATIONS CONSOLE PREVIEW WITH CENTER 3D EARTH WORKBENCH
         ======================================================== */}
      <section 
        id="section-preview"
        ref={(el) => { sectionRefs.current[2] = el; }}
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
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <ShinyButton 
              onClick={() => {
                sessionStorage.removeItem('leher_ops_returned_from_subscreen');
                sessionStorage.removeItem('leher_ops_subscreen_visited');
                window.location.href = '/operations';
              }}
              className="py-3.5 px-8 text-sm font-semibold shadow-xl cursor-pointer"
            >
              <Compass className="w-4 h-4 text-cyan-400 inline mr-2" />
              <span>Open Operations &amp; Direction Console</span>
            </ShinyButton>
            <SpinningBorderButton
              onClick={() => scrollToSection('section-story')}
              hideArrow
            >
              <span>Explore Operational Workflow</span>
            </SpinningBorderButton>
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
              <img src="/logo.png" alt="Leher Logo" title="Leher" className="h-8 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]" />
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
              <li><a href="/" className="text-white hover:text-cyan-400 cursor-pointer font-medium">Home</a></li>
              <li><a href="/about" className="hover:text-cyan-400 cursor-pointer">About</a></li>
              <li><a href="/operations" className="hover:text-cyan-400 cursor-pointer">Explore / Platform</a></li>
              <li className="pt-1.5 border-t border-[#1c1c1c]"><button onClick={() => scrollToSection('section-story')} className="hover:text-white cursor-pointer">How It Works</button></li>
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
              <img src="/logo.png" alt="Leher Logo" title="Leher" className="h-7 w-auto object-contain" />
              <div>
                <div className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <span>Copernicus Marine Oceanographic Dossier</span>
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
                <div className="p-3 rounded-xl bg-[#141414] border border-[#252525] flex flex-col items-center justify-center min-w-[130px] space-y-1">
                  <div className="text-[9px] text-[#777777] font-mono uppercase">Safety Advisory</div>
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

                  {/* Streamlined Operational Guidance (Reduced Text) */}
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-cyan-300 font-mono text-[11px] block">
                          Operational Meaning:
                        </span>
                        <p className="text-[#cccccc] text-xs leading-relaxed mt-0.5">
                          {v.operationalImpact}
                        </p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/10 flex items-start gap-2">
                      <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-amber-300 font-mono text-[11px] block">
                          Regional Navigation State:
                        </span>
                        <p className="text-[#aaaaaa] text-xs leading-relaxed mt-0.5">
                          {v.depthInterpretation}
                        </p>
                      </div>
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
              <img src="/logo.png" alt="Leher Logo" title="Leher" className="h-7 w-auto object-contain" />
              <span className="font-bold text-lg text-white flex items-center gap-2">
                <span>Indian Ocean Maritime Operations Console</span>
              </span>
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
              <img src="/logo.png" alt="Leher Logo" title="Leher" className="h-7 w-auto object-contain" />
              <span className="font-bold text-lg text-white">Leher 3D Ocean Intelligence Workbench</span>
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
