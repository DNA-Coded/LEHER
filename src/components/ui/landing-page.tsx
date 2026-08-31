import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Globe from "@/components/ui/globe";
import { cn } from "@/lib/utils";
import { 
  Waves, 
  Layers, 
  Activity, 
  Compass, 
  Globe as GlobeIcon, 
  BarChart3, 
  Sliders, 
  Clock, 
  ShieldAlert, 
  Fish, 
  Search, 
  Microscope, 
  Database, 
  ArrowRight, 
  CheckCircle2, 
  X, 
  Play, 
  Pause, 
  Maximize2, 
  FileText,
  Filter
} from "lucide-react";

const defaultGlobeConfig = {
  positions: [
    { top: "50%", left: "75%", scale: 1.25 }, // Hero: Right side, balanced & spacious
    { top: "35%", left: "80%", scale: 1.0 },  // Section 1: Right aligned
    { top: "25%", left: "20%", scale: 0.9 },  // Section 2: Left aligned
    { top: "50%", left: "85%", scale: 1.1 },  // Section 3: Right side
    { top: "30%", left: "50%", scale: 1.3 },  // Section 4: Center backdrop
  ]
};

const parsePercent = (str: string): number => parseFloat(str.replace('%', ''));

export default function LaharLandingPage() {
  const [activeSection, setActiveSection] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [globeTransform, setGlobeTransform] = useState("");
  const [isPlatformOpen, setIsPlatformOpen] = useState(false);

  // Interactive State for Model vs Reality Widget
  const [selectedDepth, setSelectedDepth] = useState<number>(250);
  const [selectedVar, setSelectedVar] = useState<'temp' | 'sal' | 'chl'>('temp');

  // Interactive Workbench State for Platform Preview
  const [workbenchVar, setWorkbenchVar] = useState<'temp' | 'sal' | 'chl' | 'cur'>('temp');
  const [workbenchDepth, setWorkbenchDepth] = useState<number>(150);
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

    const currentPos = calculatedPositions[newActiveSection] || calculatedPositions[0];
    const transform = `translate3d(${currentPos.left}vw, ${currentPos.top}vh, 0) translate3d(-50%, -50%, 0) scale3d(${currentPos.scale}, ${currentPos.scale}, 1)`;
    
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

  return (
    <div 
      ref={containerRef}
      className="relative w-full max-w-screen overflow-x-hidden min-h-screen bg-[#030712] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200"
    >
      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-0.5 bg-cyan-950/40 z-50">
        <div 
          className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 will-change-transform shadow-[0_0_10px_rgba(6,182,212,0.6)]"
          style={{ 
            transform: `scaleX(${scrollProgress})`,
            transformOrigin: 'left center',
            transition: 'transform 0.15s ease-out'
          }}
        />
      </div>

      {/* FIXED NAVIGATION */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#030712]/80 backdrop-blur-md border-b border-slate-800/60 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
              <Waves className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl sm:text-2xl tracking-wider text-slate-100">LAHAR</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono border border-cyan-500/20">v2.4</span>
              </div>
              <span className="text-[10px] text-slate-400 tracking-widest font-medium uppercase hidden sm:inline">3D Ocean Intelligence</span>
            </div>
          </div>

          {/* Minimal Nav Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <button onClick={() => scrollToSection('section-story')} className="hover:text-cyan-400 transition-colors">Explore</button>
            <button onClick={() => scrollToSection('section-capabilities')} className="hover:text-cyan-400 transition-colors">Capabilities</button>
            <button onClick={() => scrollToSection('section-data')} className="hover:text-cyan-400 transition-colors">Data Pipeline</button>
            <button onClick={() => scrollToSection('section-preview')} className="hover:text-cyan-400 transition-colors">Platform Preview</button>
          </div>

          {/* Action CTA */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsPlatformOpen(true)}
              className="group relative px-4 sm:px-6 py-2.5 rounded-lg font-semibold text-xs sm:text-sm bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 flex items-center gap-2 cursor-pointer"
            >
              <span>Launch Platform</span>
              <ArrowRight className="w-4 h-4 text-slate-950 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </nav>

      {/* Floating Dot Scroll Navigation */}
      <div className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-30 flex-col gap-4">
        {['Hero', 'Spatio-Temporal', 'Data Integration', 'Profiles', 'Model vs Reality', 'Dynamics', 'Capabilities', 'Platform Preview'].map((label, idx) => (
          <div key={idx} className="group relative flex items-center justify-end">
            <span className="absolute right-7 px-2.5 py-1 rounded bg-slate-900/90 text-slate-200 text-xs font-mono border border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
              {label}
            </span>
            <div 
              onClick={() => {
                const el = sectionRefs.current[idx];
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer border",
                activeSection === idx 
                  ? "bg-cyan-400 border-cyan-300 scale-125 shadow-[0_0_10px_#06b6d4]" 
                  : "bg-slate-700/60 border-slate-600 hover:border-cyan-500/60"
              )}
            />
          </div>
        ))}
      </div>

      {/* SUBTLE 3D GLOBE BACKDROP */}
      <div
        className="fixed z-10 pointer-events-none will-change-transform transition-all duration-[1200ms] ease-[cubic-bezier(0.23,1,0.32,1)]"
        style={{
          transform: globeTransform,
          opacity: activeSection === 0 ? 0.95 : activeSection < 5 ? 0.65 : 0.2,
        }}
      >
        <div className="scale-75 sm:scale-90 lg:scale-100">
          <Globe />
        </div>
      </div>

      {/* ========================================================
          HERO SECTION (CLEAN, MINIMAL, SPACIOUS, UNDISTURBED)
         ======================================================== */}
      <section
        ref={(el) => { sectionRefs.current[0] = el; }}
        className="relative min-h-screen flex flex-col justify-center px-4 sm:px-6 lg:px-12 z-20 pt-20 sm:pt-24 pb-12 max-w-7xl mx-auto"
      >
        <div className="max-w-2xl space-y-6 sm:space-y-8">
          {/* Small Category Label */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs sm:text-sm font-semibold tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            OCEAN INTELLIGENCE PLATFORM
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-100 leading-[1.08]">
            See the Ocean <br />
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
              in 3D.
            </span>
          </h1>

          {/* Concise Supporting Text */}
          <p className="text-base sm:text-xl text-slate-300/90 font-light leading-relaxed max-w-xl">
            LAHAR brings ocean model outputs and real-world observations together in one interactive 3D environment — across space, depth and time.
          </p>

          {/* Clean Hero CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button 
              onClick={() => scrollToSection('section-story')}
              className="px-7 py-3.5 rounded-xl font-semibold text-sm sm:text-base bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-all duration-300 shadow-lg shadow-cyan-500/25 flex items-center gap-2 cursor-pointer"
            >
              <span>Explore LAHAR</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>
            <button 
              onClick={() => scrollToSection('section-capabilities')}
              className="px-7 py-3.5 rounded-xl font-semibold text-sm sm:text-base border border-slate-700/80 bg-slate-900/50 backdrop-blur-sm text-slate-200 hover:bg-slate-800/60 hover:border-slate-600 transition-all duration-300 flex items-center gap-2 cursor-pointer"
            >
              <span>View Capabilities</span>
            </button>
          </div>

          {/* Minimal Key Indicators */}
          <div className="pt-6 border-t border-slate-800/60 flex flex-wrap items-center gap-6 sm:gap-10 text-xs sm:text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>Real-time In-Situ Fusion</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>Depth & Volumetric Slicing</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>Model Anomaly Detection</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 1: THE OCEAN IS MORE THAN A SURFACE
         ======================================================== */}
      <section
        id="section-story"
        ref={(el) => { sectionRefs.current[1] = el; }}
        className="relative min-h-screen flex flex-col justify-center px-4 sm:px-6 lg:px-12 z-20 py-20 max-w-7xl mx-auto"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-cyan-500/10 text-cyan-400 text-xs font-mono border border-cyan-500/20">
              SECTION 01 // SPATIO-TEMPORAL DYNAMICS
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-100">
              The Ocean Is More Than a Surface.
            </h2>
            <p className="text-slate-300 leading-relaxed text-base sm:text-lg font-light">
              Traditional 2D maps only scratch the surface. Ocean physical and biogeochemical dynamics continuously evolve across four dimensions:
            </p>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="text-cyan-400 font-mono text-xs uppercase tracking-wider mb-1">Latitude & Longitude</div>
                <div className="text-slate-200 text-sm font-medium">Horizontal spatial extent</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="text-cyan-400 font-mono text-xs uppercase tracking-wider mb-1">Water Depth</div>
                <div className="text-slate-200 text-sm font-medium">Surface down to 6,000m abyssal zone</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="text-cyan-400 font-mono text-xs uppercase tracking-wider mb-1">Temporal Evolution</div>
                <div className="text-slate-200 text-sm font-medium">Hourly model outputs & historic casts</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="text-cyan-400 font-mono text-xs uppercase tracking-wider mb-1">Multi-Parameter</div>
                <div className="text-slate-200 text-sm font-medium">Temp, Salinity, Currents & BGC</div>
              </div>
            </div>
          </div>

          {/* Interactive Visual Card */}
          <div className="lg:col-span-6 p-6 sm:p-8 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
            <h3 className="text-sm font-mono text-cyan-400 uppercase tracking-widest mb-4">Vertical Water Column Stratification</h3>
            
            <div className="space-y-3">
              <div className="p-3.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20 flex items-center justify-between text-xs sm:text-sm">
                <span className="font-semibold text-cyan-300">Epipelagic Zone (0m – 200m)</span>
                <span className="font-mono text-slate-400">High Solar Radiance & Currents</span>
              </div>
              <div className="p-3.5 rounded-lg bg-blue-950/30 border border-blue-500/20 flex items-center justify-between text-xs sm:text-sm">
                <span className="font-semibold text-blue-300">Thermocline Layer (200m – 1,000m)</span>
                <span className="font-mono text-slate-400">Rapid Temperature Decline</span>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-950/50 border border-slate-800 flex items-center justify-between text-xs sm:text-sm">
                <span className="font-semibold text-slate-300">Bathypelagic Zone (1,000m – 4,000m)</span>
                <span className="font-mono text-slate-400">Uniform Cold & High Salinity</span>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs sm:text-sm">
                <span className="font-semibold text-slate-400">Seafloor Bathymetry</span>
                <span className="font-mono text-cyan-400">Topographic Steering</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 2: ONE OCEAN. MULTIPLE DATA SOURCES.
         ======================================================== */}
      <section
        id="section-data"
        ref={(el) => { sectionRefs.current[2] = el; }}
        className="relative min-h-screen flex flex-col justify-center px-4 sm:px-6 lg:px-12 z-20 py-20 max-w-7xl mx-auto"
      >
        <div className="space-y-4 text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-cyan-500/10 text-cyan-400 text-xs font-mono border border-cyan-500/20">
            SECTION 02 // DATA INTEGRATION
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-100">
            One Ocean. Multiple Data Sources.
          </h2>
          <p className="text-slate-300 leading-relaxed text-base sm:text-lg font-light">
            LAHAR synthesizes fragmented ocean observation streams and complex numerical model grids into a single unified 3D environment.
          </p>
        </div>

        {/* Data Source Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4 border border-cyan-500/20">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2">Numerical Ocean Models</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-3">
              High-resolution 3D hydrodynamic outputs from INCOIS, MOM5, ROMS, and HYCOM predicting velocity, temp, and salinity.
            </p>
            <span className="text-[11px] font-mono text-cyan-400/80">Format: NetCDF4 / OPeNDAP</span>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4 border border-cyan-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2">Argo Floats</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-3">
              Autonomous profiling floats descending down to 2,000m depth every 10 days across global ocean basins.
            </p>
            <span className="text-[11px] font-mono text-cyan-400/80">Array for Real-time Geostrophic Oceanography</span>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4 border border-cyan-500/20">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2">Underwater Gliders</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-3">
              Autonomous buoyancy-driven vehicles executing sawtooth transects to capture high-density coastal & shelf data.
            </p>
            <span className="text-[11px] font-mono text-cyan-400/80">High-Resolution Transects</span>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4 border border-cyan-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2">CTD Profiles</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-3">
              Research vessel rosette casts delivering accurate in-situ Conductivity, Temperature, and Depth measurements.
            </p>
            <span className="text-[11px] font-mono text-cyan-400/80">Conductivity, Temperature & Depth</span>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4 border border-cyan-500/20">
              <Microscope className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2">BGC Sensors</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-3">
              Biogeochemical sensors monitoring dissolved oxygen, chlorophyll-a concentration, pH, and nitrate levels.
            </p>
            <span className="text-[11px] font-mono text-cyan-400/80">Biogeochemical Oceanography</span>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4 border border-cyan-500/20">
              <GlobeIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2">Satellite Remote Sensing</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-3">
              Surface altimetry, sea surface temperature (SST), and ocean color for global boundary conditions.
            </p>
            <span className="text-[11px] font-mono text-cyan-400/80">Global Synoptic Coverage</span>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 3: FROM DATA TO DEPTH (INTERACTIVE SIMULATOR)
         ======================================================== */}
      <section
        ref={(el) => { sectionRefs.current[3] = el; }}
        className="relative min-h-screen flex flex-col justify-center px-4 sm:px-6 lg:px-12 z-20 py-20 max-w-7xl mx-auto"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-cyan-500/10 text-cyan-400 text-xs font-mono border border-cyan-500/20">
              SECTION 03 // VOLUMETRIC METRICS
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-100">
              From Data to Depth.
            </h2>
            <p className="text-slate-300 leading-relaxed text-base sm:text-lg font-light">
              Analyze critical oceanic parameters at any depth level. LAHAR interpolates grid cells to generate smooth volumetric slices and continuous vertical profile curves.
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-sm font-medium text-slate-200">Sea Water Temperature</span>
                <span className="font-mono text-xs text-cyan-400">°C (Degrees Celsius)</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-sm font-medium text-slate-200">Practical Salinity</span>
                <span className="font-mono text-xs text-cyan-400">PSU (Practical Salinity Unit)</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-sm font-medium text-slate-200">Chlorophyll-a Concentration</span>
                <span className="font-mono text-xs text-cyan-400">mg/m³</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-sm font-medium text-slate-200">Current Velocity Vectors</span>
                <span className="font-mono text-xs text-cyan-400">u, v, w (m/s)</span>
              </div>
            </div>
          </div>

          {/* Interactive Depth Profile Simulator */}
          <div className="lg:col-span-7 p-6 sm:p-8 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">Live Vertical Profile Simulator</h3>
                <span className="text-xs font-mono text-slate-400">Arabian Sea Station (15.4°N, 71.2°E)</span>
              </div>
              <div className="px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-400 text-xs font-mono border border-cyan-500/20">
                DEPTH: {selectedDepth} m
              </div>
            </div>

            {/* Depth Slider Control */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400 font-mono">
                <span>0 m (Surface)</span>
                <span>1,000 m</span>
                <span>2,000 m (Abyssal)</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="2000" 
                step="10"
                value={selectedDepth}
                onChange={(e) => setSelectedDepth(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Calculated Profile Output */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                <div className="text-xs text-slate-400 font-mono mb-1">TEMPERATURE</div>
                <div className="text-2xl font-bold text-cyan-400 font-mono">{modelValues.temp} °C</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                <div className="text-xs text-slate-400 font-mono mb-1">SALINITY</div>
                <div className="text-2xl font-bold text-sky-400 font-mono">{modelValues.sal} PSU</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                <div className="text-xs text-slate-400 font-mono mb-1">CHLOROPHYLL</div>
                <div className="text-2xl font-bold text-emerald-400 font-mono">{modelValues.chl} mg/m³</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 4: MODEL VS REALITY (MOST IMPORTANT SECTION)
         ======================================================== */}
      <section
        ref={(el) => { sectionRefs.current[4] = el; }}
        className="relative min-h-screen flex flex-col justify-center px-4 sm:px-6 lg:px-12 z-20 py-20 max-w-7xl mx-auto"
      >
        <div className="space-y-4 text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-cyan-500/10 text-cyan-400 text-xs font-mono border border-cyan-500/20">
            SECTION 04 // VALIDATION & ANOMALY DETECTION
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-100">
            Model vs Reality.
          </h2>
          <p className="text-slate-300 leading-relaxed text-base sm:text-lg font-light">
            Compare what the numerical model predicts with what oceanographic instruments actually observe in-situ. Identify bias, local upwelling, and coastal anomalies.
          </p>
        </div>

        {/* Model vs Reality Card */}
        <div className="max-w-4xl mx-auto p-6 sm:p-10 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Active Comparison Station</span>
              <h3 className="text-xl font-bold text-slate-100">Arabian Sea Float #2902345</h3>
              <p className="text-xs text-slate-400 font-mono">Location: 15.4°N, 71.2°E | Depth: {selectedDepth} m</p>
            </div>

            {/* Variable Select Buttons */}
            <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <button 
                onClick={() => setSelectedVar('temp')}
                className={cn("px-3 py-1.5 rounded text-xs font-semibold transition-colors", selectedVar === 'temp' ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-slate-200")}
              >
                Temperature
              </button>
              <button 
                onClick={() => setSelectedVar('sal')}
                className={cn("px-3 py-1.5 rounded text-xs font-semibold transition-colors", selectedVar === 'sal' ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-slate-200")}
              >
                Salinity
              </button>
              <button 
                onClick={() => setSelectedVar('chl')}
                className={cn("px-3 py-1.5 rounded text-xs font-semibold transition-colors", selectedVar === 'chl' ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-slate-200")}
              >
                Chlorophyll
              </button>
            </div>
          </div>

          {/* Metric Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="text-xs font-mono text-slate-400 uppercase">MODEL PREDICTED</div>
              <div className="text-3xl font-bold text-slate-100 font-mono">
                {modelValues[selectedVar]} {selectedVar === 'temp' ? '°C' : selectedVar === 'sal' ? 'PSU' : 'mg/m³'}
              </div>
              <p className="text-xs text-slate-500">Numerical Grid Output</p>
            </div>

            <div className="p-6 rounded-xl bg-slate-950/80 border border-cyan-500/40 space-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
              <div className="text-xs font-mono text-cyan-400 uppercase">INSTRUMENT OBSERVED</div>
              <div className="text-3xl font-bold text-cyan-400 font-mono">
                {observedValues[selectedVar]} {selectedVar === 'temp' ? '°C' : selectedVar === 'sal' ? 'PSU' : 'mg/m³'}
              </div>
              <p className="text-xs text-cyan-400/80">In-situ Argo Float Cast</p>
            </div>

            <div className="p-6 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="text-xs font-mono text-amber-400 uppercase">MODEL ANOMALY / DELTA</div>
              <div className="text-3xl font-bold text-amber-400 font-mono">
                {parseFloat(diffValues[selectedVar]) > 0 ? `+${diffValues[selectedVar]}` : diffValues[selectedVar]} {selectedVar === 'temp' ? '°C' : selectedVar === 'sal' ? 'PSU' : 'mg/m³'}
              </div>
              <p className="text-xs text-slate-500">
                {parseFloat(diffValues[selectedVar]) > 0 ? 'Model Overestimation' : 'Model Underestimation'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 5: EXPLORE OCEAN DYNAMICS
         ======================================================== */}
      <section
        ref={(el) => { sectionRefs.current[5] = el; }}
        className="relative min-h-screen flex flex-col justify-center px-4 sm:px-6 lg:px-12 z-20 py-20 max-w-7xl mx-auto"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-cyan-500/10 text-cyan-400 text-xs font-mono border border-cyan-500/20">
              SECTION 05 // 4D EXPLORATION
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-100">
              Explore Ocean Dynamics.
            </h2>
            <p className="text-slate-300 leading-relaxed text-base sm:text-lg font-light">
              Uncover complex hydrodynamic processes including mesoscale eddies, upwelling plumes, thermocline shoaling, and deep water mass transport.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <Sliders className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-slate-100 text-base">Volumetric Depth Slicing</h4>
                  <p className="text-slate-400 text-sm">Slide smoothly from sea surface to abyssal trenches to examine localized temperature inversions.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <Clock className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-slate-100 text-base">Time Animation Playback</h4>
                  <p className="text-slate-400 text-sm">Step through hourly or daily forecast cycles to watch seasonal monsoon shifts evolve.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <Waves className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-slate-100 text-base">Vector Current Flow</h4>
                  <p className="text-slate-400 text-sm">Visualize 3D velocity vectors with particle streamlines illustrating ocean circulation.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 p-6 sm:p-8 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-100">Operational Purpose & Missions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-cyan-400" />
                <span className="text-sm font-medium text-slate-200">Marine Hazard Assessment</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
                <Search className="w-5 h-5 text-cyan-400" />
                <span className="text-sm font-medium text-slate-200">Search & Rescue Support</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
                <Fish className="w-5 h-5 text-cyan-400" />
                <span className="text-sm font-medium text-slate-200">Fisheries Advisories</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
                <Microscope className="w-5 h-5 text-cyan-400" />
                <span className="text-sm font-medium text-slate-200">Oceanographic Research</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 9: FEATURE SECTION (EVERYTHING THE OCEAN IS TELLING YOU)
         ======================================================== */}
      <section 
        id="section-capabilities"
        ref={(el) => { sectionRefs.current[6] = el; }}
        className="relative min-h-screen flex flex-col justify-center px-4 sm:px-6 lg:px-12 z-20 py-20 max-w-7xl mx-auto"
      >
        <div className="space-y-4 text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-cyan-500/10 text-cyan-400 text-xs font-mono border border-cyan-500/20">
            CAPABILITIES // PLATFORM FEATURES
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-100">
            Everything the Ocean Is Telling You.
          </h2>
          <p className="text-slate-300 leading-relaxed text-base sm:text-lg font-light">
            Comprehensive tools built specifically for oceanographers, marine scientists, and operational decision-makers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: "3D Volumetric Visualization",
              desc: "Explore ocean variables across the full water column with GPU-accelerated rendering.",
              icon: Layers
            },
            {
              title: "Depth Slices",
              desc: "Move seamlessly through the ocean layer by layer to isolate thermocline structures.",
              icon: Sliders
            },
            {
              title: "Time Animation",
              desc: "Watch ocean conditions evolve over time with smooth playback controls.",
              icon: Clock
            },
            {
              title: "Observation Overlay",
              desc: "Visualize Argo floats, gliders, and CTD casts alongside numerical model fields.",
              icon: Activity
            },
            {
              title: "Model vs Observation",
              desc: "Compare model predictions with actual in-situ instrument measurements.",
              icon: BarChart3
            },
            {
              title: "Scientific Profiles",
              desc: "Inspect temperature, salinity, and chlorophyll profiles against depth.",
              icon: FileText
            },
            {
              title: "Custom Visualization",
              desc: "Control color scales, opacity, lighting, and vertical exaggeration.",
              icon: Filter
            },
            {
              title: "Extensible Architecture",
              desc: "Prepare the platform for additional sensor networks and NetCDF datasets.",
              icon: Database
            }
          ].map((feat, i) => {
            const IconComp = feat.icon;
            return (
              <div 
                key={i} 
                className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-all duration-300 space-y-3 group"
              >
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 group-hover:scale-110 transition-transform">
                  <IconComp className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-100">{feat.title}</h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================
          SECTION 10 & 11: LAHAR OPERATIONAL UI PREVIEW
         ======================================================== */}
      <section 
        id="section-preview"
        ref={(el) => { sectionRefs.current[7] = el; }}
        className="relative min-h-screen flex flex-col justify-center px-4 sm:px-6 lg:px-12 z-20 py-20 max-w-7xl mx-auto"
      >
        <div className="space-y-4 text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-cyan-500/10 text-cyan-400 text-xs font-mono border border-cyan-500/20">
            PLATFORM PREVIEW // INTERACTIVE WORKBENCH
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-100">
            LAHAR Operational Workbench.
          </h2>
          <p className="text-slate-300 leading-relaxed text-base sm:text-lg font-light">
            This is what you experience when you launch LAHAR — a full scientific ocean intelligence environment.
          </p>
        </div>

        {/* Realistic Interactive Workbench Preview */}
        <div className="rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden">
          {/* Workbench Top Bar */}
          <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
              </div>
              <span className="text-slate-400 border-l border-slate-800 pl-3">LAHAR 3D OCEAN ENGINE</span>
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <span>STREAM: INCOIS NetCDF4</span>
              <span>REGION: Indian Ocean / Arabian Sea</span>
              <span className="text-cyan-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" /> LIVE STREAM
              </span>
            </div>
          </div>

          {/* Workbench Grid */}
          <div className="grid grid-cols-12 min-h-[480px]">
            {/* Left Controls Panel */}
            <div className="col-span-12 lg:col-span-3 bg-slate-900/80 border-r border-slate-800 p-4 space-y-6">
              <div>
                <label className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider block mb-2">VARIABLE</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setWorkbenchVar('temp')}
                    className={cn("px-2.5 py-1.5 rounded text-xs font-medium text-left border transition-colors", workbenchVar === 'temp' ? "bg-cyan-500/20 border-cyan-500 text-cyan-300" : "bg-slate-950 border-slate-800 text-slate-400")}
                  >
                    Temperature
                  </button>
                  <button 
                    onClick={() => setWorkbenchVar('sal')}
                    className={cn("px-2.5 py-1.5 rounded text-xs font-medium text-left border transition-colors", workbenchVar === 'sal' ? "bg-cyan-500/20 border-cyan-500 text-cyan-300" : "bg-slate-950 border-slate-800 text-slate-400")}
                  >
                    Salinity
                  </button>
                  <button 
                    onClick={() => setWorkbenchVar('chl')}
                    className={cn("px-2.5 py-1.5 rounded text-xs font-medium text-left border transition-colors", workbenchVar === 'chl' ? "bg-cyan-500/20 border-cyan-500 text-cyan-300" : "bg-slate-950 border-slate-800 text-slate-400")}
                  >
                    Chlorophyll
                  </button>
                  <button 
                    onClick={() => setWorkbenchVar('cur')}
                    className={cn("px-2.5 py-1.5 rounded text-xs font-medium text-left border transition-colors", workbenchVar === 'cur' ? "bg-cyan-500/20 border-cyan-500 text-cyan-300" : "bg-slate-950 border-slate-800 text-slate-400")}
                  >
                    Currents
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-2">
                  <span className="text-cyan-400 uppercase">DEPTH LEVEL</span>
                  <span>{workbenchDepth} m</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1000" 
                  value={workbenchDepth}
                  onChange={(e) => setWorkbenchDepth(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider block mb-2">LAYERS</label>
                <div className="space-y-2 text-xs">
                  {Object.entries(activeLayers).map(([key, val]) => (
                    <label key={key} className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800 cursor-pointer">
                      <span className="capitalize text-slate-300">{key} Layer</span>
                      <input 
                        type="checkbox" 
                        checked={val} 
                        onChange={() => setActiveLayers(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                        className="accent-cyan-400 cursor-pointer"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Center 3D Ocean Display */}
            <div className="col-span-12 lg:col-span-6 bg-slate-950 p-6 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
              
              <div className="flex justify-between items-start z-10">
                <div className="space-y-1">
                  <div className="text-xs font-mono text-cyan-400">ARABIAN SEA / BAY OF BENGAL</div>
                  <div className="text-sm font-bold text-slate-200">Depth Slice: {workbenchDepth}m</div>
                </div>
                <button 
                  onClick={() => setIsPlatformOpen(true)}
                  className="px-3 py-1.5 rounded bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 flex items-center gap-1.5 cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Fullscreen Workbench
                </button>
              </div>

              {/* Simulated Ocean Canvas Map */}
              <div className="my-8 h-64 border border-slate-800/80 rounded-xl bg-gradient-to-tr from-slate-950 via-cyan-950/20 to-slate-900 relative flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500 via-transparent to-transparent" />
                
                {/* Simulated Floating Markers */}
                {activeLayers.argo && (
                  <div className="absolute top-[30%] left-[40%] flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
                    <span className="text-[10px] font-mono bg-slate-900/90 px-1.5 py-0.5 rounded border border-cyan-500/30 text-cyan-300">Argo #2902345 (26.4°C)</span>
                  </div>
                )}

                {activeLayers.glider && (
                  <div className="absolute top-[60%] left-[65%] flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-mono bg-slate-900/90 px-1.5 py-0.5 rounded border border-emerald-500/30 text-emerald-300">Glider SG639</span>
                  </div>
                )}

                <div className="text-center space-y-1 z-10">
                  <div className="text-xs font-mono text-cyan-400/80 uppercase tracking-widest">3D Dynamic Ocean Volume</div>
                  <div className="text-slate-400 text-xs">Simulated Indian Ocean Model Stream</div>
                </div>
              </div>

              {/* Bottom Playback Bar */}
              <div className="flex items-center justify-between border-t border-slate-800 pt-3 z-10">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <span className="text-xs font-mono text-slate-400">TIMESTAMP: 15 Aug 2026 12:00 UTC</span>
                </div>
                <div className="text-xs font-mono text-cyan-400">GRID: 0.125° HORIZONTAL</div>
              </div>
            </div>

            {/* Right Instrument Inspector Panel */}
            <div className="col-span-12 lg:col-span-3 bg-slate-900/80 border-l border-slate-800 p-4 space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider block">SELECTED INSTRUMENT</span>
                <h4 className="text-sm font-bold text-slate-100">Argo Float #2902345</h4>
                <span className="text-[11px] font-mono text-slate-400">Lat: 15.4°N | Lon: 71.2°E</span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Model Temp:</span>
                  <span className="text-slate-200">26.4 °C</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-950 border border-cyan-500/30">
                  <span className="text-cyan-400">Observed Temp:</span>
                  <span className="text-cyan-300">25.9 °C</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-950 border border-amber-500/30">
                  <span className="text-amber-400">Delta Anomaly:</span>
                  <span className="text-amber-300">+0.5 °C</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 24: FINAL CTA
         ======================================================== */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-12 z-20 max-w-7xl mx-auto text-center border-t border-slate-800/80">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-4xl sm:text-6xl font-bold tracking-tight text-slate-100">
            Explore the Ocean Differently.
          </h2>
          <p className="text-slate-300 text-lg sm:text-xl font-light leading-relaxed">
            Bring model predictions, observations, depth and time together with LAHAR.
          </p>
          <div className="pt-4 flex justify-center">
            <button 
              onClick={() => setIsPlatformOpen(true)}
              className="px-8 py-4 rounded-xl font-bold text-base bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 shadow-xl shadow-cyan-500/25 flex items-center gap-3 cursor-pointer"
            >
              <span>Launch LAHAR</span>
              <ArrowRight className="w-5 h-5 text-slate-950" />
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 25: FOOTER
         ======================================================== */}
      <footer className="border-t border-slate-800 bg-[#02050e] py-12 px-4 sm:px-6 lg:px-12 z-20 relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 text-sm">
          <div className="md:col-span-6 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-500 flex items-center justify-center">
                <Waves className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              </div>
              <span className="font-extrabold text-lg text-slate-100">LAHAR</span>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm max-w-md">
              3D Ocean Intelligence & Visualization Platform. Built for ocean data exploration, numerical model validation, and in-situ observation analysis.
            </p>
            <div className="text-slate-500 text-xs font-mono pt-2">
              Proposed solution for PS 26067 | INCOIS | Ministry of Earth Sciences
            </div>
          </div>

          <div className="md:col-span-3 space-y-2">
            <div className="text-xs font-mono uppercase text-slate-400 tracking-wider">Navigation</div>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li><button onClick={() => scrollToSection('section-story')} className="hover:text-cyan-400">Explore</button></li>
              <li><button onClick={() => scrollToSection('section-capabilities')} className="hover:text-cyan-400">Capabilities</button></li>
              <li><button onClick={() => scrollToSection('section-data')} className="hover:text-cyan-400">Data Pipeline</button></li>
              <li><button onClick={() => scrollToSection('section-preview')} className="hover:text-cyan-400">Platform Preview</button></li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-2">
            <div className="text-xs font-mono uppercase text-slate-400 tracking-wider">Scientific Specs</div>
            <ul className="space-y-1.5 text-xs text-slate-400 font-mono">
              <li>Argo — Real-time Geostrophic Array</li>
              <li>CTD — Conductivity, Temp & Depth</li>
              <li>BGC — Biogeochemical Observations</li>
              <li>NetCDF4 / OPeNDAP Streams</li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto border-t border-slate-900 mt-8 pt-6 flex justify-between items-center text-xs text-slate-500 font-mono">
          <span>© 2026 LAHAR Ocean Intelligence. All rights reserved.</span>
          <span>WebGL 3D Engine v2.4</span>
        </div>
      </footer>

      {/* ========================================================
          FULLSCREEN LAHAR WORKBENCH MODAL (WHEN LAUNCHED)
         ======================================================== */}
      {isPlatformOpen && (
        <div className="fixed inset-0 z-50 bg-[#020617]/95 backdrop-blur-xl flex flex-col">
          {/* Modal Header */}
          <div className="h-14 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center">
                <Waves className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              </div>
              <span className="font-extrabold text-lg text-slate-100">LAHAR 3D Ocean Intelligence Workbench</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">LIVE DEMO MODE</span>
            </div>

            <button 
              onClick={() => setIsPlatformOpen(false)}
              className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content / Full 3D Interactive Workbench View */}
          <div className="flex-1 grid grid-cols-12 p-6 gap-6 overflow-y-auto">
            <div className="col-span-12 lg:col-span-3 bg-slate-900/90 rounded-xl border border-slate-800 p-5 space-y-6">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" /> Controls & Layers
              </h3>

              <div className="space-y-3">
                <label className="text-xs font-mono text-slate-400 uppercase">Variable Selection</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setWorkbenchVar('temp')} className={cn("p-2 rounded text-xs font-medium border text-left", workbenchVar === 'temp' ? "bg-cyan-500/20 border-cyan-500 text-cyan-300" : "bg-slate-950 border-slate-800 text-slate-400")}>Temperature (°C)</button>
                  <button onClick={() => setWorkbenchVar('sal')} className={cn("p-2 rounded text-xs font-medium border text-left", workbenchVar === 'sal' ? "bg-cyan-500/20 border-cyan-500 text-cyan-300" : "bg-slate-950 border-slate-800 text-slate-400")}>Salinity (PSU)</button>
                  <button onClick={() => setWorkbenchVar('chl')} className={cn("p-2 rounded text-xs font-medium border text-left", workbenchVar === 'chl' ? "bg-cyan-500/20 border-cyan-500 text-cyan-300" : "bg-slate-950 border-slate-800 text-slate-400")}>Chlorophyll (mg/m³)</button>
                  <button onClick={() => setWorkbenchVar('cur')} className={cn("p-2 rounded text-xs font-medium border text-left", workbenchVar === 'cur' ? "bg-cyan-500/20 border-cyan-500 text-cyan-300" : "bg-slate-950 border-slate-800 text-slate-400")}>Current Velocity</button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono text-slate-400">
                  <span>Depth Slice</span>
                  <span className="text-cyan-400">{workbenchDepth} m</span>
                </div>
                <input 
                  type="range" min="0" max="2000" step="10" 
                  value={workbenchDepth} 
                  onChange={(e) => setWorkbenchDepth(Number(e.target.value))} 
                  className="w-full accent-cyan-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-400 uppercase">Active Layers</label>
                {Object.entries(activeLayers).map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center p-2 rounded bg-slate-950 border border-slate-800 text-xs">
                    <span className="capitalize text-slate-300">{k} Layer</span>
                    <input type="checkbox" checked={v} onChange={() => setActiveLayers(prev => ({ ...prev, [k]: !prev[k as keyof typeof prev] }))} className="accent-cyan-400 cursor-pointer" />
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-12 lg:col-span-9 bg-slate-950 rounded-xl border border-slate-800 p-6 flex flex-col justify-between relative min-h-[500px]">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h4 className="text-lg font-bold text-slate-100">Arabian Sea & Bay of Bengal 3D Grid</h4>
                  <span className="text-xs font-mono text-slate-400">Coordinates: 15.4°N, 71.2°E | Resolution: 0.125°</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-mono border border-emerald-500/20">STATUS: ACTIVE STREAM</span>
                </div>
              </div>

              <div className="my-auto py-12 text-center space-y-4">
                <div className="w-24 h-24 mx-auto rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center animate-pulse">
                  <Waves className="w-12 h-12 text-cyan-400" />
                </div>
                <div className="text-slate-300 font-bold text-xl">Interactive 3D WebGL Ocean Canvas</div>
                <p className="text-slate-400 text-sm max-w-md mx-auto">
                  Rendering 3D temperature slice at {workbenchDepth}m depth with active Argo float and Glider telemetry markers.
                </p>
              </div>

              <div className="border-t border-slate-800 pt-4 flex justify-between items-center text-xs font-mono text-slate-400">
                <button onClick={() => setIsPlatformOpen(false)} className="px-4 py-2 rounded bg-slate-800 text-slate-200 hover:bg-slate-700">Close Workbench</button>
                <span>Press ESC or click button to exit</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
