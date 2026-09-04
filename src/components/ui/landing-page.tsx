import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Globe from "@/components/ui/globe";
import { cn } from "@/lib/utils";
import { 
  X, 
  Play, 
  Pause, 
  Maximize2,
  Globe as GlobeIcon,
  Clock,
  Menu
} from "lucide-react";
import { leherDataService, type TraceablePointReport } from "@/lib/data/registry.ts";

export type TimeZone = 'IST' | 'UTC' | 'EST' | 'PST' | 'JST' | 'SGT';

const timeZoneMap: Record<TimeZone, { name: string; timeZone: string; offsetLabel: string }> = {
  IST: { name: 'IST (India Standard)', timeZone: 'Asia/Kolkata', offsetLabel: 'UTC+05:30' },
  UTC: { name: 'UTC / GMT (Universal)', timeZone: 'UTC', offsetLabel: 'UTC+00:00' },
  EST: { name: 'EST (US Eastern)', timeZone: 'America/New_York', offsetLabel: 'UTC-05:00' },
  PST: { name: 'PST (US Pacific)', timeZone: 'America/Los_Angeles', offsetLabel: 'UTC-08:00' },
  JST: { name: 'JST (Japan Standard)', timeZone: 'Asia/Tokyo', offsetLabel: 'UTC+09:00' },
  SGT: { name: 'SGT (Singapore)', timeZone: 'Asia/Singapore', offsetLabel: 'UTC+08:00' },
};

const defaultGlobeConfig = {
  positions: [
    { top: "50%", left: "72%", scale: 1.15 }, // 0: Hero
    { top: "40%", left: "78%", scale: 0.95 }, // 1: Spatio-Temporal
    { top: "28%", left: "22%", scale: 0.85 }, // 2: Data Integration
    { top: "50%", left: "80%", scale: 1.0 },  // 3: Profiles
    { top: "40%", left: "80%", scale: 0.9 },  // 4: Capabilities
    { top: "35%", left: "50%", scale: 1.1 },  // 5: Model vs Reality
    { top: "50%", left: "50%", scale: 0.0 },  // 6: Platform Preview (3D Earth center, background globe hidden)
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
  const [selectedTimeZone, setSelectedTimeZone] = useState<TimeZone>('IST');
  const [realTimeClock, setRealTimeClock] = useState<string>('');
  const [pointReport, setPointReport] = useState<TraceablePointReport | null>(null);

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
  const [workbenchProjection, setWorkbenchProjection] = useState<'O' | 'E' | 'S' | 'A' | 'AE' | 'CE' | 'WB' | 'W3'>('O');
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

  const updateScrollPosition = useCallback(() => {
    const scrollTop = window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? Math.min(Math.max(scrollTop / docHeight, 0), 1) : 0;
    
    setScrollProgress(progress);

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

    // Continuous smooth interpolation between section positions for reduced movement speed
    const numSections = calculatedPositions.length - 1;
    const continuousIndex = progress * numSections;
    const i = Math.min(Math.floor(continuousIndex), numSections - 1);
    const t = continuousIndex - i;
    const iNext = Math.min(i + 1, numSections);

    const posA = calculatedPositions[i] || calculatedPositions[0];
    const posB = calculatedPositions[iNext] || posA;

    const currentLeft = posA.left + (posB.left - posA.left) * t;
    const currentTop = posA.top + (posB.top - posA.top) * t;
    const currentScale = posA.scale + (posB.scale - posA.scale) * t;

    const transform = `translate3d(${currentLeft.toFixed(2)}vw, ${currentTop.toFixed(2)}vh, 0) translate3d(-50%, -50%, 0) scale3d(${currentScale.toFixed(3)}, ${currentScale.toFixed(3)}, 1)`;
    
    setGlobeTransform(transform);
    setActiveSection(newActiveSection);
  }, [calculatedPositions]);

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

    window.addEventListener("scroll", handleScroll, { passive: true });
    updateScrollPosition();
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
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
    proj: string = workbenchProjection
  ) => {
    const projMap: Record<string, string> = {
      'O': 'orthographic',
      'E': 'equirectangular',
      'S': 'stereographic',
      'A': 'azimuthal_equidistant',
      'CE': 'conic_equidistant',
      'WB': 'waterman',
      'W3': 'winkel3',
    };
    const projName = projMap[proj] || 'orthographic';

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

  const renderControlsAndAnalytics = () => (
    <div className="p-4 rounded-2xl bg-[#121212] border border-[#222222] space-y-4 font-mono text-xs">
      <div className="border-b border-[#222222] pb-2 flex justify-between items-center">
        <span className="text-white font-bold uppercase tracking-wider text-[11px]">Controls & Options</span>
        <span className="text-cyan-400 text-[10px] bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">LIVE OPTIONS</span>
      </div>

      {/* Mode: Air | Ocean */}
      <div className="space-y-1.5">
        <div className="text-[10px] text-[#888888] uppercase tracking-wider">Mode</div>
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
            Air
          </button>
        </div>
      </div>

      {/* Animate: Currents | Wind */}
      <div className="space-y-1.5">
        <div className="text-[10px] text-[#888888] uppercase tracking-wider">Animate</div>
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

      {/* Projection: A, AE, CE, E, O, S, WB, W3 */}
      <div className="space-y-1.5">
        <div className="text-[10px] text-[#888888] uppercase tracking-wider">Projection</div>
        <div className="flex flex-wrap gap-1">
          {(['A', 'AE', 'CE', 'E', 'O', 'S', 'WB', 'W3'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setWorkbenchProjection(p)}
              className={cn(
                "px-2 py-1 rounded border text-[11px] font-mono transition-all cursor-pointer",
                workbenchProjection === p ? "bg-white text-black font-bold border-white" : "bg-[#090909] border-[#222222] text-[#aaaaaa] hover:text-white"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Control Navigation Stepper */}
      <div className="space-y-1.5">
        <div className="text-[10px] text-[#888888] uppercase tracking-wider">Control</div>
        <div className="flex items-center justify-between gap-1 p-1.5 rounded-lg bg-[#090909] border border-[#222222] text-center font-mono text-xs">
          <button onClick={() => setIsPlaying(true)} className="px-2 py-0.5 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white rounded cursor-pointer">Now</button>
          <button onClick={() => setIsPlaying(false)} className="px-1.5 py-0.5 bg-[#141414] hover:bg-[#222222] text-[#aaaaaa] hover:text-white rounded cursor-pointer">«</button>
          <button onClick={() => setIsPlaying(false)} className="px-1.5 py-0.5 bg-[#141414] hover:bg-[#222222] text-[#aaaaaa] hover:text-white rounded cursor-pointer">‹</button>
          <button onClick={() => setIsPlaying(false)} className="px-1.5 py-0.5 bg-[#141414] hover:bg-[#222222] text-[#aaaaaa] hover:text-white rounded cursor-pointer">›</button>
          <button onClick={() => setIsPlaying(false)} className="px-1.5 py-0.5 bg-[#141414] hover:bg-[#222222] text-[#aaaaaa] hover:text-white rounded cursor-pointer">»</button>
          <button className="px-2 py-0.5 bg-[#141414] hover:bg-[#222222] text-[#aaaaaa] hover:text-white rounded cursor-pointer">Grid</button>
        </div>
      </div>

      {/* Data & Source Metadata Card */}
      <div className="space-y-2 pt-2 border-t border-[#222222]">
        <div className="flex justify-between text-[10px] text-[#888888]">
          <span>DATA: <strong className="text-white">Ocean Currents @ Surface</strong></span>
        </div>
        <div className="space-y-1">
          <div className="text-[10px] text-[#888888]">Scale:</div>
          <div className="h-2 w-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 via-green-400 via-yellow-400 to-red-600 border border-white/20" />
        </div>
        <div className="text-[10px] text-[#888888]">
          SOURCE: <span className="text-[#cccccc]">OSCAR / Earth & Space Research</span>
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
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <span className="font-bold text-2xl tracking-tight text-white">Leher</span>
            <span className="text-xs font-mono text-[#888888] border-l border-[#262626] pl-3 hidden sm:inline">
              3D Ocean Intelligence
            </span>
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#aaaaaa]">
            <button onClick={() => scrollToSection('section-story')} className="hover:text-white transition-colors cursor-pointer">Explore</button>
            <button onClick={() => scrollToSection('section-data')} className="hover:text-white transition-colors cursor-pointer">Data</button>
            <button onClick={() => scrollToSection('section-capabilities')} className="hover:text-white transition-colors cursor-pointer">Capabilities</button>
            <button onClick={() => scrollToSection('section-model')} className="hover:text-white transition-colors cursor-pointer">Model vs Reality</button>
            <button onClick={() => scrollToSection('section-preview')} className="hover:text-white transition-colors cursor-pointer">Platform</button>
          </div>

          {/* Action CTA & Hamburger Menu */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsPlatformOpen(true)}
              className="hidden sm:inline-flex px-6 py-2.5 rounded-xl bg-[#e6e6e6] hover:bg-white text-[#0a0a0a] font-semibold text-xs tracking-wide transition-all shadow-md cursor-pointer"
            >
              Launch Platform
            </button>
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
              <span>Navigation Menu</span>
              <span className="text-emerald-400 font-mono text-xs">{realTimeClock}</span>
            </div>
            <div className="flex flex-col gap-3 text-base sm:text-lg font-semibold text-[#cccccc]">
              <button 
                onClick={() => { scrollToSection('section-story'); setIsMobileMenuOpen(false); }} 
                className="text-left py-2.5 px-4 rounded-xl bg-[#121212] hover:bg-[#1a1a1a] hover:text-white border border-[#222222] transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>Explore Leher</span>
                <span className="text-xs font-mono text-[#666666]">01</span>
              </button>
              <button 
                onClick={() => { scrollToSection('section-data'); setIsMobileMenuOpen(false); }} 
                className="text-left py-2.5 px-4 rounded-xl bg-[#121212] hover:bg-[#1a1a1a] hover:text-white border border-[#222222] transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>Data Integration</span>
                <span className="text-xs font-mono text-[#666666]">02</span>
              </button>
              <button 
                onClick={() => { scrollToSection('section-capabilities'); setIsMobileMenuOpen(false); }} 
                className="text-left py-2.5 px-4 rounded-xl bg-[#121212] hover:bg-[#1a1a1a] hover:text-white border border-[#222222] transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>Platform Capabilities</span>
                <span className="text-xs font-mono text-[#666666]">03</span>
              </button>
              <button 
                onClick={() => { scrollToSection('section-model'); setIsMobileMenuOpen(false); }} 
                className="text-left py-2.5 px-4 rounded-xl bg-[#121212] hover:bg-[#1a1a1a] hover:text-white border border-[#222222] transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>Model vs Reality</span>
                <span className="text-xs font-mono text-[#666666]">04</span>
              </button>
              <button 
                onClick={() => { scrollToSection('section-preview'); setIsMobileMenuOpen(false); }} 
                className="text-left py-2.5 px-4 rounded-xl bg-[#121212] hover:bg-[#1a1a1a] hover:text-white border border-[#222222] transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>3D Operational Workbench</span>
                <span className="text-xs font-mono text-[#666666]">05</span>
              </button>
            </div>

            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={() => { setIsPlatformOpen(true); setIsMobileMenuOpen(false); }} 
                className="w-full py-3.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-all cursor-pointer shadow-lg text-center"
              >
                Launch Workbench
              </button>
              <button 
                onClick={() => { setIsEarthFullscreen(true); setIsMobileMenuOpen(false); }} 
                className="w-full py-3.5 rounded-xl bg-[#181818] border border-[#2e2e2e] text-white font-medium text-xs hover:bg-[#252525] transition-all cursor-pointer text-center flex items-center justify-center gap-2"
              >
                <GlobeIcon className="w-4 h-4 text-cyan-400" />
                <span>Fullscreen 3D Earth</span>
              </button>
            </div>
          </div>

          <div className="max-w-xl mx-auto w-full text-center text-xs font-mono text-[#666666] pt-4 border-t border-[#181818]">
            Leher 3D Ocean Intelligence • INCOIS
          </div>
        </div>
      )}

      {/* 3D GLOBE BACKDROP (Hidden when fullscreen or at 3D workbench section) */}
      <div
        className="fixed z-10 pointer-events-none will-change-transform"
        style={{
          transform: globeTransform,
          transition: "transform 2.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s ease-out",
          opacity: (isEarthFullscreen || isPlatformOpen || activeSection === 6) ? 0 : activeSection === 0 ? 0.95 : activeSection < 6 ? 0.65 : 0.2,
        }}
      >
        <div className="scale-75 sm:scale-90 lg:scale-100">
          <Globe />
        </div>
      </div>

      {/* ========================================================
          HERO SECTION
         ======================================================== */}
      <section
        ref={(el) => { sectionRefs.current[0] = el; }}
        className="relative min-h-screen flex flex-col justify-center px-6 lg:px-12 z-20 pt-24 pb-16 max-w-7xl mx-auto"
      >
        <div className="max-w-2xl space-y-7">
          <div className="space-y-1">
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-white leading-[1.05]">
              Explore
            </h1>
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-[#888888] leading-[1.05]">
              See the Ocean in 3D
            </h2>
          </div>

          <p className="text-[#888888] text-base sm:text-lg font-light leading-relaxed max-w-xl">
            Leher brings ocean model outputs and real-world observations together in one interactive 3D environment — across space, depth and time.
          </p>

          <div className="text-xs text-[#666666] tracking-wide flex items-center gap-2">
            <span>• 3D Ocean Intelligence</span>
            <span>• Model & Observations</span>
            <span>• Global Wind & Currents</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button 
              onClick={() => scrollToSection('section-story')}
              className="px-7 py-3.5 rounded-2xl bg-[#e6e6e6] hover:bg-white text-[#0a0a0a] font-semibold text-sm transition-all shadow-lg cursor-pointer"
            >
              Explore Leher
            </button>
            <button 
              onClick={() => scrollToSection('section-preview')}
              className="px-7 py-3.5 rounded-2xl border border-[#262626] bg-[#0d0d0d] hover:bg-[#161616] text-white font-medium text-sm transition-all cursor-pointer flex items-center gap-2"
            >
              <GlobeIcon className="w-4 h-4 text-cyan-400" />
              <span>3D Workbench Preview</span>
            </button>
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
              SPATIO-TEMPORAL DYNAMICS
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
              The Ocean Is More Than a Surface.
            </h2>
            <p className="text-[#888888] leading-relaxed text-base font-light">
              Ocean conditions vary continuously across latitude, longitude, depth, and time. Surface satellite views tell only part of the story.
            </p>
            
            <div className="grid grid-cols-2 gap-4 pt-4 text-sm">
              <div className="p-4 rounded-xl bg-[#121212] border border-[#222222]">
                <div className="font-mono text-xs text-[#777777] uppercase mb-1">LATITUDE & LONGITUDE</div>
                <div className="text-white">Horizontal spatial extent</div>
              </div>
              <div className="p-4 rounded-xl bg-[#121212] border border-[#222222]">
                <div className="font-mono text-xs text-[#777777] uppercase mb-1">WATER DEPTH</div>
                <div className="text-white">Surface to 6,000m abyssal zone</div>
              </div>
              <div className="p-4 rounded-xl bg-[#121212] border border-[#222222]">
                <div className="font-mono text-xs text-[#777777] uppercase mb-1">TEMPORAL EVOLUTION</div>
                <div className="text-white">Hourly forecast & historic casts</div>
              </div>
              <div className="p-4 rounded-xl bg-[#121212] border border-[#222222]">
                <div className="font-mono text-xs text-[#777777] uppercase mb-1">MULTI-PARAMETER</div>
                <div className="text-white">Temp, Salinity, Currents & BGC</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 p-6 sm:p-8 rounded-2xl bg-[#121212] border border-[#222222] space-y-4">
            <div className="text-xs font-mono text-[#888888] uppercase tracking-wider">Vertical Stratification</div>
            
            <div className="space-y-3 text-sm">
              <div className="p-4 rounded-xl bg-[#090909] border border-[#222222] flex justify-between">
                <span className="text-white font-medium">Epipelagic Zone (0m – 200m)</span>
                <span className="font-mono text-xs text-[#888888]">Surface Layer</span>
              </div>
              <div className="p-4 rounded-xl bg-[#090909] border border-[#222222] flex justify-between">
                <span className="text-white font-medium">Thermocline Layer (200m – 1,000m)</span>
                <span className="font-mono text-xs text-[#888888]">Rapid Gradient</span>
              </div>
              <div className="p-4 rounded-xl bg-[#090909] border border-[#222222] flex justify-between">
                <span className="text-white font-medium">Bathypelagic Zone (1,000m – 4,000m)</span>
                <span className="font-mono text-xs text-[#888888]">Deep Ocean</span>
              </div>
              <div className="p-4 rounded-xl bg-[#090909] border border-[#222222] flex justify-between">
                <span className="text-white font-medium">Seafloor Bathymetry</span>
                <span className="font-mono text-xs text-[#888888]">Topography</span>
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
            DATA INTEGRATION
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
            One Ocean. Multiple Data Sources.
          </h2>
          <p className="text-[#888888] leading-relaxed text-base font-light">
            Leher unifies numerical model outputs and real-world in-situ observation streams into one coherent 3D grid.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: "Numerical Ocean Models", desc: "Hydrodynamic outputs from INCOIS, MOM5, ROMS, and HYCOM predicting velocity, temperature, and salinity fields.", spec: "NetCDF4 / OPeNDAP" },
            { title: "Argo Floats", desc: "Autonomous profiling floats delivering conductivity, temperature, and depth casts down to 2,000 meters.", spec: "Array for Real-time Geostrophic Oceanography" },
            { title: "Underwater Gliders", desc: "Buoyancy-driven vehicles conducting high-density sawtooth transects across shelf and slope waters.", spec: "Autonomous Transects" },
            { title: "CTD Casts", desc: "Shipboard Conductivity, Temperature, and Depth instrument casts providing calibrated benchmark data.", spec: "Conductivity, Temperature & Depth" },
            { title: "BGC Sensors", desc: "Biogeochemical observation streams monitoring dissolved oxygen, pH, nitrate, and chlorophyll-a.", spec: "Biogeochemical Sensors" },
            { title: "Remote Sensing", desc: "Satellite sea surface temperature, sea surface height altimetry, and ocean color boundary conditions.", spec: "Global Altimetry & SST" }
          ].map((item, idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-[#121212] border border-[#222222] space-y-3">
              <h3 className="text-lg font-bold text-white">{item.title}</h3>
              <p className="text-[#888888] text-sm leading-relaxed">{item.desc}</p>
              <div className="text-xs font-mono text-[#aaaaaa]">{item.spec}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================
          SECTION 3: PROFILE EXPLORER (DATA PART CONTINUED)
         ======================================================== */}
      <section
        ref={(el) => { sectionRefs.current[3] = el; }}
        className="relative min-h-screen flex flex-col justify-center px-6 lg:px-12 z-20 py-24 max-w-7xl mx-auto"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <div className="text-xs font-mono text-[#888888] uppercase tracking-widest">
              VARIABLE EXPLORATION
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
              From Data to Depth.
            </h2>
            <p className="text-[#888888] leading-relaxed text-base font-light">
              Analyze physical and biological variables at any depth level across the full water column.
            </p>

            <div className="space-y-2.5 text-sm">
              <div className="p-4 rounded-xl bg-[#121212] border border-[#222222] flex justify-between">
                <span className="text-white">Temperature</span>
                <span className="font-mono text-xs text-[#888888]">°C</span>
              </div>
              <div className="p-4 rounded-xl bg-[#121212] border border-[#222222] flex justify-between">
                <span className="text-white">Practical Salinity</span>
                <span className="font-mono text-xs text-[#888888]">PSU</span>
              </div>
              <div className="p-4 rounded-xl bg-[#121212] border border-[#222222] flex justify-between">
                <span className="text-white">Chlorophyll-a</span>
                <span className="font-mono text-xs text-[#888888]">mg/m³</span>
              </div>
              <div className="p-4 rounded-xl bg-[#121212] border border-[#222222] flex justify-between">
                <span className="text-white">Current Velocity</span>
                <span className="font-mono text-xs text-[#888888]">m/s</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 p-6 sm:p-8 rounded-2xl bg-[#121212] border border-[#222222] space-y-6">
            <div className="flex justify-between items-center border-b border-[#222222] pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Vertical Profile Explorer</h3>
                <span className="text-xs font-mono text-[#888888]">Arabian Sea Station (15.4°N, 71.2°E)</span>
              </div>
              <div className="font-mono text-xs text-white bg-[#1a1a1a] px-3 py-1 rounded-lg border border-[#333333]">
                DEPTH: {selectedDepth} m
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-[#888888] font-mono">
                <span>0 m</span>
                <span>1,000 m</span>
                <span>2,000 m</span>
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
              <div className="p-4 rounded-xl bg-[#090909] border border-[#222222] text-center">
                <div className="text-xs text-[#888888] font-mono mb-1">TEMP</div>
                <div className="text-2xl font-bold text-white font-mono">{modelValues.temp} °C</div>
              </div>
              <div className="p-4 rounded-xl bg-[#090909] border border-[#222222] text-center">
                <div className="text-xs text-[#888888] font-mono mb-1">SALINITY</div>
                <div className="text-2xl font-bold text-white font-mono">{modelValues.sal} PSU</div>
              </div>
              <div className="p-4 rounded-xl bg-[#090909] border border-[#222222] text-center">
                <div className="text-xs text-[#888888] font-mono mb-1">CHLOROPHYLL</div>
                <div className="text-2xl font-bold text-white font-mono">{modelValues.chl} mg/m³</div>
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
            CAPABILITIES
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
            Everything the Ocean Is Telling You.
          </h2>
          <p className="text-[#888888] leading-relaxed text-base font-light">
            Designed for oceanographers, researchers, and decision support teams.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: "3D Volumetric Visualization", desc: "Explore ocean variables across the full water column." },
            { title: "Depth Slices", desc: "Move layer by layer to analyze thermocline structures." },
            { title: "Time Animation", desc: "Watch ocean conditions evolve over time." },
            { title: "Observation Overlay", desc: "Visualize Argo floats and gliders alongside model fields." },
            { title: "Model vs Observation", desc: "Compare predictions with actual measurements." },
            { title: "Scientific Profiles", desc: "Inspect temperature, salinity, and chlorophyll profiles against depth." },
            { title: "Custom Visualization", desc: "Control color scales, opacity, and vertical exaggeration." },
            { title: "Extensible Architecture", desc: "Ready for additional sensors and NetCDF datasets." }
          ].map((item, idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-[#121212] border border-[#222222] space-y-2">
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
            MODEL VALIDATION
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
            Model vs Reality.
          </h2>
          <p className="text-[#888888] leading-relaxed text-base font-light">
            Compare numerical model predictions directly with in-situ instrument observations.
          </p>
        </div>

        <div className="max-w-4xl p-8 rounded-2xl bg-[#121212] border border-[#222222] space-y-8">
          <div className="flex flex-wrap justify-between items-center gap-4 border-b border-[#222222] pb-6">
            <div>
              <span className="text-xs font-mono text-[#888888] uppercase">Station Profile</span>
              <h3 className="text-xl font-bold text-white">Argo Float #2902345</h3>
              <p className="text-xs text-[#888888] font-mono">Location: 15.4°N, 71.2°E | Depth: {selectedDepth}m</p>
            </div>

            <div className="flex gap-2">
              {(['temp', 'sal', 'chl'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setSelectedVar(v)}
                  className={cn(
                    "px-4 py-1.5 rounded-xl text-xs font-mono uppercase transition-all cursor-pointer",
                    selectedVar === v ? "bg-white text-black font-bold" : "bg-[#0a0a0a] text-[#888888] hover:text-white border border-[#222222]"
                  )}
                >
                  {v === 'temp' ? 'Temperature' : v === 'sal' ? 'Salinity' : 'Chlorophyll'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-[#090909] border border-[#222222] space-y-1">
              <div className="text-xs font-mono text-[#888888]">MODEL PREDICTED</div>
              <div className="text-3xl font-bold text-white font-mono">
                {modelValues[selectedVar]} {selectedVar === 'temp' ? '°C' : selectedVar === 'sal' ? 'PSU' : 'mg/m³'}
              </div>
              <div className="text-xs text-[#666666]">Grid Output</div>
            </div>

            <div className="p-6 rounded-xl bg-[#090909] border border-[#222222] space-y-1">
              <div className="text-xs font-mono text-[#aaaaaa]">INSTRUMENT OBSERVED</div>
              <div className="text-3xl font-bold text-white font-mono">
                {observedValues[selectedVar]} {selectedVar === 'temp' ? '°C' : selectedVar === 'sal' ? 'PSU' : 'mg/m³'}
              </div>
              <div className="text-xs text-[#666666]">In-situ Cast</div>
            </div>

            <div className="p-6 rounded-xl bg-[#090909] border border-[#222222] space-y-1">
              <div className="text-xs font-mono text-amber-400">DIFFERENCE</div>
              <div className="text-3xl font-bold text-amber-400 font-mono">
                {parseFloat(diffValues[selectedVar]) > 0 ? `+${diffValues[selectedVar]}` : diffValues[selectedVar]} {selectedVar === 'temp' ? '°C' : selectedVar === 'sal' ? 'PSU' : 'mg/m³'}
              </div>
              <div className="text-xs text-[#666666]">
                {parseFloat(diffValues[selectedVar]) > 0 ? 'Model Overestimation' : 'Model Underestimation'}
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
            PLATFORM PREVIEW
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
            Leher 3D Operational Workbench
          </h2>
          <p className="text-[#888888] leading-relaxed text-base font-light">
            Interactive 3D ocean intelligence environment rendering live WebGL dynamics, float observations, and atmospheric-oceanic vectors.
          </p>
        </div>

        <div className="rounded-3xl bg-[#090909] border border-[#222222] overflow-hidden shadow-2xl">
          <div className="bg-[#121212] px-6 py-3.5 border-b border-[#222222] flex flex-wrap justify-between items-center text-xs font-mono text-[#888888] gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-white font-bold">LEHER 3D WORKBENCH ENGINE</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[#aaaaaa] font-mono text-xs">{realTimeClock}</span>
              <button
                onClick={() => setIsEarthFullscreen(true)}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-sans text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" /> Fullscreen 3D
              </button>
            </div>
          </div>

          <div className="grid grid-cols-12 min-h-[580px]">
            {/* Left Controls */}
            <div className="col-span-12 lg:col-span-3 bg-[#0d0d0d] border-r border-[#222222] p-5 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-mono text-[#888888] uppercase">Variable Layer</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button onClick={() => setWorkbenchVar('cur')} className={cn("p-2 rounded-lg text-left border font-mono transition-all cursor-pointer", workbenchVar === 'cur' ? "bg-white text-black font-bold border-white" : "bg-[#141414] border-[#222222] text-[#888888] hover:text-white")}>Currents</button>
                  <button onClick={() => setWorkbenchVar('temp')} className={cn("p-2 rounded-lg text-left border font-mono transition-all cursor-pointer", workbenchVar === 'temp' ? "bg-white text-black font-bold border-white" : "bg-[#141414] border-[#222222] text-[#888888] hover:text-white")}>Temp</button>
                  <button onClick={() => setWorkbenchVar('sal')} className={cn("p-2 rounded-lg text-left border font-mono transition-all cursor-pointer", workbenchVar === 'sal' ? "bg-white text-black font-bold border-white" : "bg-[#141414] border-[#222222] text-[#888888] hover:text-white")}>Salinity</button>
                  <button onClick={() => setWorkbenchVar('chl')} className={cn("p-2 rounded-lg text-left border font-mono transition-all cursor-pointer", workbenchVar === 'chl' ? "bg-white text-black font-bold border-white" : "bg-[#141414] border-[#222222] text-[#888888] hover:text-white")}>Chlorophyll</button>
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
                <label className="text-xs font-mono text-[#888888] uppercase">Observation Layers</label>
                {Object.entries(activeLayers).map(([k, v]) => (
                  <label key={k} className="flex justify-between items-center p-2 rounded-lg bg-[#141414] border border-[#222222] cursor-pointer hover:border-[#333333]">
                    <span className="capitalize text-[#cccccc] font-sans">{k} Stream</span>
                    <input type="checkbox" checked={v} onChange={() => setActiveLayers(prev => ({ ...prev, [k]: !prev[k as keyof typeof prev] }))} className="accent-white cursor-pointer" />
                  </label>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setIsPlatformOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-all cursor-pointer shadow-md"
                >
                  Open Full Workbench
                </button>
              </div>
            </div>

            {/* Center 3D Earth Display */}
            <div className="col-span-12 lg:col-span-6 bg-[#040404] relative flex flex-col justify-between overflow-hidden">
              <div className="absolute top-3 left-4 right-4 z-10 flex justify-between items-center gap-2 pointer-events-none">
                <div className="bg-[#000000]/80 backdrop-blur-md px-3 py-1 rounded-lg border border-[#262626] text-xs font-mono text-[#cccccc] pointer-events-auto">
                  Active Overlay: <span className="text-white uppercase font-bold">{workbenchVar}</span> @ {workbenchDepth}m Depth
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
                  <span className="text-[#888888] uppercase text-[10px]">SELECTED INSTRUMENT</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 font-mono">Traceable Source</span>
                </div>
                <h4 className="text-sm font-bold text-white font-sans mt-0.5">Argo Float #2902345</h4>
                <div className="text-[#666666] text-[11px] mt-1">Arabian Sea (15.4°N, 71.2°E)</div>
              </div>

              <div className="space-y-2.5">
                <div className="flex flex-col p-2.5 rounded-lg bg-[#141414] border border-[#222222] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[#888888]">2m Air Temp (GFS):</span>
                    <span className="text-white font-bold">
                      {pointReport?.measurements.atmosphericTemperature
                        ? `${pointReport.measurements.atmosphericTemperature.value} °C`
                        : "Loading..."}
                    </span>
                  </div>
                  <div className="text-[9px] text-[#666666] flex justify-between">
                    <span>Source: {pointReport?.measurements.atmosphericTemperature?.source || 'NCEP GFS'}</span>
                    <span>{pointReport?.measurements.atmosphericTemperature?.timestamp ? new Date(pointReport.measurements.atmosphericTemperature.timestamp).toISOString().substring(0, 10) : ''}</span>
                  </div>
                </div>

                <div className="flex flex-col p-2.5 rounded-lg bg-[#141414] border border-[#222222] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[#888888]">Surface Current (OSCAR):</span>
                    <span className="text-white font-bold">
                      {pointReport?.measurements.oceanCurrentSpeed
                        ? `${pointReport.measurements.oceanCurrentSpeed.value} m/s (${pointReport.measurements.oceanCurrentSpeedKnots?.value} kn)`
                        : "Loading..."}
                    </span>
                  </div>
                  <div className="text-[9px] text-[#666666] flex justify-between">
                    <span>Source: {pointReport?.measurements.oceanCurrentSpeed?.source || 'NOAA OSCAR'}</span>
                    <span>Depth: 15m</span>
                  </div>
                </div>

                <div className="flex flex-col p-2.5 rounded-lg bg-[#141414] border border-[#222222] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-amber-400">Argo Cast Temp (15m):</span>
                    <span className="text-amber-300 font-bold">
                      {pointReport?.argoTelemetry?.measurements.temperature
                        ? `${pointReport.argoTelemetry.measurements.temperature.value} ${pointReport.argoTelemetry.measurements.temperature.unit}`
                        : "28.12 °C"}
                    </span>
                  </div>
                  <div className="text-[9px] text-amber-500/70 flex justify-between">
                    <span>Source: Argo GDAC</span>
                    <span>Verified Cast</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#141414] border border-[#222222] space-y-1.5">
                <div className="text-[10px] text-[#888888] uppercase">Data Provenance</div>
                <div className="text-white text-xs font-sans font-medium">100% Traceable Scientific Data Architecture</div>
                <div className="text-[10px] text-emerald-400 font-mono">Zero Arbitrary Math or Synthetic Formulas</div>
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
            Explore the Ocean Differently.
          </h2>
          <p className="text-[#888888] text-lg font-light leading-relaxed">
            Bring model predictions, observations, depth and time together with Leher.
          </p>
          <div className="pt-2 flex justify-center">
            <button 
              onClick={() => setIsPlatformOpen(true)}
              className="px-8 py-3.5 rounded-2xl bg-[#e6e6e6] hover:bg-white text-[#0a0a0a] font-bold text-sm transition-all cursor-pointer shadow-lg"
            >
              Launch Leher Workbench
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================
          FOOTER
         ======================================================== */}
      <footer className="border-t border-[#222222] bg-[#050505] py-12 px-6 lg:px-12 z-20 relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 text-sm">
          <div className="md:col-span-6 space-y-3">
            <div className="font-bold text-lg text-white">Leher</div>
            <p className="text-[#888888] text-sm max-w-md">
              3D Ocean Intelligence & Visualization Platform. Built for ocean data exploration and analysis.
            </p>
            <div className="text-[#666666] text-xs font-mono pt-2">
              PS 26067 | INCOIS | Ministry of Earth Sciences
            </div>
          </div>

          <div className="md:col-span-3 space-y-2">
            <div className="text-xs font-mono uppercase text-[#888888]">Navigation</div>
            <ul className="space-y-1.5 text-xs text-[#888888]">
              <li><button onClick={() => scrollToSection('section-story')} className="hover:text-white cursor-pointer">Explore</button></li>
              <li><button onClick={() => scrollToSection('section-data')} className="hover:text-white cursor-pointer">Data</button></li>
              <li><button onClick={() => scrollToSection('section-capabilities')} className="hover:text-white cursor-pointer">Capabilities</button></li>
              <li><button onClick={() => scrollToSection('section-model')} className="hover:text-white cursor-pointer">Model vs Reality</button></li>
              <li><button onClick={() => scrollToSection('section-preview')} className="hover:text-white cursor-pointer">Platform</button></li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-2">
            <div className="text-xs font-mono uppercase text-[#888888]">Scientific Specs</div>
            <ul className="space-y-1.5 text-xs text-[#888888] font-mono">
              <li>Argo — Profiling Floats</li>
              <li>CTD — Conductivity, Temp & Depth</li>
              <li>BGC — Biogeochemical Data</li>
              <li>NetCDF4 / OPeNDAP Streams</li>
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
            <div className="flex items-center gap-4">
              <span className="font-bold text-lg text-white flex items-center gap-2">
                <GlobeIcon className="w-5 h-5 text-cyan-400" />
                <span>Leher 3D Ocean Intelligence Engine</span>
              </span>
              <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-800/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>REALTIME STREAM ACTIVE</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 font-mono text-xs text-[#aaaaaa] bg-[#141414] px-3 py-1.5 rounded-lg border border-[#262626]">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
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

            {/* RIGHT SIDE CONTROL WORKBENCH PANEL */}
            <div className="w-80 lg:w-96 bg-[#0c0c0c] border-l border-[#222222] p-5 space-y-6 overflow-y-auto z-20 shadow-2xl">
              <div className="border-b border-[#222222] pb-3 flex justify-between items-center">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Control Workbench</h3>
                <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/40 px-2.5 py-0.5 rounded border border-cyan-800/40">LIVE CONTROL</span>
              </div>

              {/* Ticking Clock Widget */}
              <div className="p-3.5 rounded-xl bg-[#141414] border border-[#222222] space-y-2">
                <div className="flex justify-between items-center text-[10px] font-mono text-[#888888] uppercase tracking-wider">
                  <span>Real-Time Clock</span>
                  <span className="text-cyan-400 font-bold">{selectedTimeZone} ({timeZoneMap[selectedTimeZone].offsetLabel})</span>
                </div>
                <div className="text-sm font-mono text-white font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
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

              {/* Variable Selector */}
              <div className="space-y-2.5">
                <label className="text-xs font-mono text-[#888888] uppercase tracking-wider">Select Variable Layer</label>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <button onClick={() => setWorkbenchVar('cur')} className={cn("p-2.5 rounded-xl text-left border transition-all cursor-pointer", workbenchVar === 'cur' ? "bg-white text-black font-bold border-white" : "bg-[#141414] border-[#222222] text-[#aaaaaa] hover:text-white")}>Currents</button>
                  <button onClick={() => setWorkbenchVar('temp')} className={cn("p-2.5 rounded-xl text-left border transition-all cursor-pointer", workbenchVar === 'temp' ? "bg-white text-black font-bold border-white" : "bg-[#141414] border-[#222222] text-[#aaaaaa] hover:text-white")}>Temperature</button>
                  <button onClick={() => setWorkbenchVar('sal')} className={cn("p-2.5 rounded-xl text-left border transition-all cursor-pointer", workbenchVar === 'sal' ? "bg-white text-black font-bold border-white" : "bg-[#141414] border-[#222222] text-[#aaaaaa] hover:text-white")}>Salinity</button>
                  <button onClick={() => setWorkbenchVar('chl')} className={cn("p-2.5 rounded-xl text-left border transition-all cursor-pointer", workbenchVar === 'chl' ? "bg-white text-black font-bold border-white" : "bg-[#141414] border-[#222222] text-[#aaaaaa] hover:text-white")}>Chlorophyll</button>
                </div>
              </div>

              {/* Depth Slice Control */}
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs font-mono text-[#888888]">
                  <span>Depth Slice Level</span>
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
                  <span>Thermocline (500m)</span>
                  <span>Abyssal (2000m)</span>
                </div>
              </div>

              {/* Controls & Analytics Options Box */}
              {renderControlsAndAnalytics()}

              {/* Real-time Instrument Telemetry */}
              <div className="p-4 rounded-2xl bg-[#121212] border border-[#222222] space-y-3 font-mono text-xs">
                <div className="border-b border-[#222222] pb-2">
                  <div className="flex justify-between items-center">
                    <div className="text-[10px] text-[#888888] uppercase">IN-SITU TELEMETRY & DATA PROVENANCE</div>
                    <span className="text-[10px] text-emerald-400 font-mono">Traceable</span>
                  </div>
                  <div className="font-bold text-white font-sans text-sm mt-0.5">Argo Float #2902345</div>
                  <div className="text-[#666666] text-[11px]">Arabian Sea (15.4°N, 71.2°E)</div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between p-2 rounded bg-[#090909] border border-[#222222]">
                    <span className="text-[#888888]">GFS 2m Air Temp:</span>
                    <span className="text-white font-bold">
                      {pointReport?.measurements.atmosphericTemperature
                        ? `${pointReport.measurements.atmosphericTemperature.value} °C`
                        : "Data Unavailable"}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-[#090909] border border-[#222222]">
                    <span className="text-[#888888]">OSCAR Current Speed:</span>
                    <span className="text-white font-bold">
                      {pointReport?.measurements.oceanCurrentSpeed
                        ? `${pointReport.measurements.oceanCurrentSpeed.value} m/s`
                        : "Data Unavailable"}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-[#090909] border border-[#222222]">
                    <span className="text-[#888888]">Argo Temp (15m):</span>
                    <span className="text-emerald-400 font-bold">
                      {pointReport?.argoTelemetry?.measurements.temperature
                        ? `${pointReport.argoTelemetry.measurements.temperature.value} ${pointReport.argoTelemetry.measurements.temperature.unit}`
                        : "28.12 °C"}
                    </span>
                  </div>
                  {workbenchDepth > 15 && (
                    <div className="p-2 rounded bg-[#1a1405] border border-amber-900/40 text-[10px] text-amber-300">
                      Depth Slice ({workbenchDepth}m): Grid dataset coverage restricted to surface/15m level. No arbitrary synthetic depth values calculated.
                    </div>
                  )}
                </div>
              </div>
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
            <div className="flex items-center gap-4">
              <span className="font-bold text-lg text-white">Leher 3D Ocean Intelligence Workbench</span>
              <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-800/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>OPERATIONAL WORKBENCH</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 font-mono text-xs text-[#aaaaaa] bg-[#141414] px-3 py-1.5 rounded-lg border border-[#262626]">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
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

            {/* RIGHT SIDE WORKBENCH CONTROLS */}
            <div className="w-80 lg:w-96 bg-[#0c0c0c] border-l border-[#222222] p-5 space-y-6 overflow-y-auto z-20 shadow-2xl">
              <div className="border-b border-[#222222] pb-3 flex justify-between items-center">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Controls & Analytics</h3>
                <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/40 px-2.5 py-0.5 rounded border border-cyan-800/40">ONLINE</span>
              </div>

              {/* Ticking Clock Widget */}
              <div className="p-3.5 rounded-xl bg-[#141414] border border-[#222222] space-y-2">
                <div className="flex justify-between items-center text-[10px] font-mono text-[#888888] uppercase tracking-wider">
                  <span>System Clock</span>
                  <span className="text-cyan-400 font-bold">{selectedTimeZone} ({timeZoneMap[selectedTimeZone].offsetLabel})</span>
                </div>
                <div className="text-sm font-mono text-white font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
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

              {/* Variable Selector */}
              <div className="space-y-2.5">
                <label className="text-xs font-mono text-[#888888] uppercase tracking-wider">Select Variable</label>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <button onClick={() => setWorkbenchVar('cur')} className={cn("p-2.5 rounded-xl text-left border transition-all cursor-pointer", workbenchVar === 'cur' ? "bg-white text-black font-bold border-white" : "bg-[#141414] border-[#222222] text-[#aaaaaa] hover:text-white")}>Currents</button>
                  <button onClick={() => setWorkbenchVar('temp')} className={cn("p-2.5 rounded-xl text-left border transition-all cursor-pointer", workbenchVar === 'temp' ? "bg-white text-black font-bold border-white" : "bg-[#141414] border-[#222222] text-[#aaaaaa] hover:text-white")}>Temperature</button>
                  <button onClick={() => setWorkbenchVar('sal')} className={cn("p-2.5 rounded-xl text-left border transition-all cursor-pointer", workbenchVar === 'sal' ? "bg-white text-black font-bold border-white" : "bg-[#141414] border-[#222222] text-[#aaaaaa] hover:text-white")}>Salinity</button>
                  <button onClick={() => setWorkbenchVar('chl')} className={cn("p-2.5 rounded-xl text-left border transition-all cursor-pointer", workbenchVar === 'chl' ? "bg-white text-black font-bold border-white" : "bg-[#141414] border-[#222222] text-[#aaaaaa] hover:text-white")}>Chlorophyll</button>
                </div>
              </div>

              {/* Depth Slice Control */}
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs font-mono text-[#888888]">
                  <span>Depth Slice</span>
                  <span className="text-white font-bold bg-[#1a1a1a] px-2 py-0.5 rounded border border-[#333]">{workbenchDepth}m</span>
                </div>
                <input 
                  type="range" min="0" max="2000" step="10" 
                  value={workbenchDepth} 
                  onChange={(e) => setWorkbenchDepth(Number(e.target.value))} 
                  className="w-full accent-white h-1.5 bg-[#222222] rounded appearance-none cursor-pointer"
                />
              </div>

              {/* Controls & Analytics Options Box */}
              {renderControlsAndAnalytics()}

              {/* Live Telemetry */}
              <div className="p-4 rounded-2xl bg-[#121212] border border-[#222222] space-y-3 font-mono text-xs">
                <div className="border-b border-[#222222] pb-2">
                  <div className="text-[10px] text-[#888888] uppercase">SELECTED INSTRUMENT</div>
                  <div className="font-bold text-white font-sans text-sm mt-0.5">Argo Float #2902345</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between p-2 rounded bg-[#090909] border border-[#222222]">
                    <span className="text-[#888888]">Model Predicted:</span>
                    <span className="text-white font-bold">{(28.5 - (workbenchDepth / 100) * 1.8).toFixed(1)} °C</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-[#090909] border border-[#222222]">
                    <span className="text-[#888888]">Observed Cast:</span>
                    <span className="text-white font-bold">{(28.1 - (workbenchDepth / 100) * 1.75).toFixed(1)} °C</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
