import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Globe from "@/components/ui/globe";
import { cn } from "@/lib/utils";
import { 
  ArrowRight, 
  X, 
  Play, 
  Pause, 
  Maximize2
} from "lucide-react";

const defaultGlobeConfig = {
  positions: [
    { top: "50%", left: "72%", scale: 1.15 }, // Hero: Right side, spacious & balanced
    { top: "40%", left: "78%", scale: 0.95 },  // Section 1: Right aligned
    { top: "28%", left: "22%", scale: 0.85 },  // Section 2: Left aligned
    { top: "50%", left: "80%", scale: 1.0 },   // Section 3: Right side
    { top: "35%", left: "50%", scale: 1.1 },   // Section 4: Center backdrop
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
      className="relative w-full max-w-screen overflow-x-hidden min-h-screen bg-[#030712] text-slate-100 font-sans selection:bg-cyan-500/20 selection:text-cyan-200"
    >
      {/* Subtle Scroll Progress Indicator */}
      <div className="fixed top-0 left-0 w-full h-[2px] bg-slate-900 z-50">
        <div 
          className="h-full bg-cyan-500 will-change-transform"
          style={{ 
            transform: `scaleX(${scrollProgress})`,
            transformOrigin: 'left center',
            transition: 'transform 0.1s ease-out'
          }}
        />
      </div>

      {/* MINIMAL EDITORIAL NAVIGATION */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#030712]/90 backdrop-blur-sm border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <span className="font-bold text-xl tracking-wider text-slate-100">LAHAR</span>
            <span className="text-[11px] font-mono text-slate-400 border-l border-slate-800 pl-3 hidden sm:inline">
              3D Ocean Intelligence
            </span>
          </div>

          {/* Minimal Nav Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <button onClick={() => scrollToSection('section-story')} className="hover:text-slate-100 transition-colors">Explore</button>
            <button onClick={() => scrollToSection('section-capabilities')} className="hover:text-slate-100 transition-colors">Capabilities</button>
            <button onClick={() => scrollToSection('section-data')} className="hover:text-slate-100 transition-colors">Data</button>
            <button onClick={() => scrollToSection('section-preview')} className="hover:text-slate-100 transition-colors">Platform</button>
          </div>

          {/* Action CTA */}
          <div className="flex items-center">
            <button 
              onClick={() => setIsPlatformOpen(true)}
              className="px-5 py-2 rounded bg-slate-100 text-slate-950 hover:bg-white text-xs font-semibold tracking-wide transition-colors cursor-pointer"
            >
              Launch Platform
            </button>
          </div>
        </div>
      </nav>

      {/* Floating Dot Scroll Navigation */}
      <div className="hidden lg:flex fixed right-8 top-1/2 -translate-y-1/2 z-30 flex-col gap-3">
        {['Hero', 'Spatio-Temporal', 'Data Integration', 'Profiles', 'Model vs Reality', 'Capabilities', 'Platform'].map((label, idx) => (
          <div key={idx} className="group relative flex items-center justify-end">
            <span className="absolute right-6 px-2 py-0.5 rounded bg-slate-900 text-slate-300 text-[11px] font-mono border border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              {label}
            </span>
            <div 
              onClick={() => {
                const el = sectionRefs.current[idx];
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className={cn(
                "w-2 h-2 rounded-full transition-all cursor-pointer",
                activeSection === idx 
                  ? "bg-cyan-400 scale-125" 
                  : "bg-slate-700/60 hover:bg-slate-500"
              )}
            />
          </div>
        ))}
      </div>

      {/* SUBTLE 3D GLOBE BACKDROP */}
      <div
        className="fixed z-10 pointer-events-none will-change-transform transition-all duration-[1000ms] ease-out"
        style={{
          transform: globeTransform,
          opacity: activeSection === 0 ? 0.9 : activeSection < 5 ? 0.6 : 0.15,
        }}
      >
        <div className="scale-75 sm:scale-90 lg:scale-100">
          <Globe />
        </div>
      </div>

      {/* ========================================================
          HERO SECTION (PRESERVED EXACTLY: CLEAN, MINIMAL, CALM)
         ======================================================== */}
      <section
        ref={(el) => { sectionRefs.current[0] = el; }}
        className="relative min-h-screen flex flex-col justify-center px-6 lg:px-12 z-20 pt-24 pb-16 max-w-7xl mx-auto"
      >
        <div className="max-w-2xl space-y-8">
          {/* Label */}
          <div className="text-xs font-mono tracking-widest text-cyan-400 uppercase">
            OCEAN INTELLIGENCE PLATFORM
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-slate-100 leading-[1.08]">
            See the Ocean <br />
            in 3D.
          </h1>

          {/* Supporting Copy */}
          <p className="text-lg sm:text-xl text-slate-300 font-light leading-relaxed max-w-xl">
            Explore ocean model data and real-world observations across space, depth and time.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button 
              onClick={() => scrollToSection('section-story')}
              className="px-6 py-3 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span>Explore LAHAR</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => scrollToSection('section-capabilities')}
              className="px-6 py-3 rounded border border-slate-800 bg-slate-900/40 hover:bg-slate-800/60 text-slate-200 font-medium text-sm transition-colors cursor-pointer"
            >
              View Capabilities
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 1: THE OCEAN IS MORE THAN A SURFACE
         ======================================================== */}
      <section
        id="section-story"
        ref={(el) => { sectionRefs.current[1] = el; }}
        className="relative min-h-screen flex flex-col justify-center px-6 lg:px-12 z-20 py-24 max-w-7xl mx-auto"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
              SPATIO-TEMPORAL DYNAMICS
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-100">
              The Ocean Is More Than a Surface.
            </h2>
            <p className="text-slate-300 leading-relaxed text-base font-light">
              Ocean conditions vary continuously across latitude, longitude, depth, and time. Surface satellite views tell only part of the story.
            </p>
            
            <div className="grid grid-cols-2 gap-4 pt-4 text-sm">
              <div className="p-4 rounded bg-slate-900/50 border border-slate-800/80">
                <div className="font-mono text-xs text-slate-400 uppercase mb-1">LATITUDE & LONGITUDE</div>
                <div className="text-slate-200">Horizontal spatial extent</div>
              </div>
              <div className="p-4 rounded bg-slate-900/50 border border-slate-800/80">
                <div className="font-mono text-xs text-slate-400 uppercase mb-1">WATER DEPTH</div>
                <div className="text-slate-200">Surface to 6,000m abyssal zone</div>
              </div>
              <div className="p-4 rounded bg-slate-900/50 border border-slate-800/80">
                <div className="font-mono text-xs text-slate-400 uppercase mb-1">TEMPORAL EVOLUTION</div>
                <div className="text-slate-200">Hourly forecast & historic casts</div>
              </div>
              <div className="p-4 rounded bg-slate-900/50 border border-slate-800/80">
                <div className="font-mono text-xs text-slate-400 uppercase mb-1">MULTI-PARAMETER</div>
                <div className="text-slate-200">Temp, Salinity, Currents & BGC</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 p-6 rounded bg-slate-900/50 border border-slate-800/80 space-y-4">
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">Vertical Stratification</div>
            
            <div className="space-y-3 text-sm">
              <div className="p-3 rounded bg-slate-950 border border-slate-800 flex justify-between">
                <span className="text-slate-200 font-medium">Epipelagic Zone (0m – 200m)</span>
                <span className="font-mono text-xs text-slate-400">Surface Layer</span>
              </div>
              <div className="p-3 rounded bg-slate-950 border border-slate-800 flex justify-between">
                <span className="text-slate-200 font-medium">Thermocline Layer (200m – 1,000m)</span>
                <span className="font-mono text-xs text-slate-400">Rapid Gradient</span>
              </div>
              <div className="p-3 rounded bg-slate-950 border border-slate-800 flex justify-between">
                <span className="text-slate-200 font-medium">Bathypelagic Zone (1,000m – 4,000m)</span>
                <span className="font-mono text-xs text-slate-400">Deep Ocean</span>
              </div>
              <div className="p-3 rounded bg-slate-950 border border-slate-800 flex justify-between">
                <span className="text-slate-200 font-medium">Seafloor Bathymetry</span>
                <span className="font-mono text-xs text-slate-400">Topography</span>
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
        className="relative min-h-screen flex flex-col justify-center px-6 lg:px-12 z-20 py-24 max-w-7xl mx-auto"
      >
        <div className="space-y-4 max-w-2xl mb-12">
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
            DATA INTEGRATION
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-100">
            One Ocean. Multiple Data Sources.
          </h2>
          <p className="text-slate-300 leading-relaxed text-base font-light">
            LAHAR unifies numerical model outputs and real-world in-situ observation streams into one coherent 3D grid.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded bg-slate-900/50 border border-slate-800/80 space-y-3">
            <h3 className="text-base font-bold text-slate-100">Numerical Ocean Models</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Hydrodynamic outputs from INCOIS, MOM5, ROMS, and HYCOM predicting velocity, temperature, and salinity fields.
            </p>
            <div className="text-xs font-mono text-cyan-400">NetCDF4 / OPeNDAP</div>
          </div>

          <div className="p-6 rounded bg-slate-900/50 border border-slate-800/80 space-y-3">
            <h3 className="text-base font-bold text-slate-100">Argo Floats</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Autonomous profiling floats delivering conductivity, temperature, and depth casts down to 2,000 meters.
            </p>
            <div className="text-xs font-mono text-cyan-400">Array for Real-time Geostrophic Oceanography</div>
          </div>

          <div className="p-6 rounded bg-slate-900/50 border border-slate-800/80 space-y-3">
            <h3 className="text-base font-bold text-slate-100">Underwater Gliders</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Buoyancy-driven vehicles conducting high-density sawtooth transects across shelf and slope waters.
            </p>
            <div className="text-xs font-mono text-cyan-400">Autonomous Transects</div>
          </div>

          <div className="p-6 rounded bg-slate-900/50 border border-slate-800/80 space-y-3">
            <h3 className="text-base font-bold text-slate-100">CTD Casts</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Shipboard Conductivity, Temperature, and Depth instrument casts providing calibrated benchmark data.
            </p>
            <div className="text-xs font-mono text-cyan-400">Conductivity, Temperature & Depth</div>
          </div>

          <div className="p-6 rounded bg-slate-900/50 border border-slate-800/80 space-y-3">
            <h3 className="text-base font-bold text-slate-100">BGC Sensors</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Biogeochemical observation streams monitoring dissolved oxygen, pH, nitrate, and chlorophyll-a.
            </p>
            <div className="text-xs font-mono text-cyan-400">Biogeochemical Sensors</div>
          </div>

          <div className="p-6 rounded bg-slate-900/50 border border-slate-800/80 space-y-3">
            <h3 className="text-base font-bold text-slate-100">Remote Sensing</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Satellite sea surface temperature, sea surface height altimetry, and ocean color boundary conditions.
            </p>
            <div className="text-xs font-mono text-cyan-400">Global Altimetry & SST</div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 3: FROM DATA TO DEPTH (PROFILE EXPLORER)
         ======================================================== */}
      <section
        ref={(el) => { sectionRefs.current[3] = el; }}
        className="relative min-h-screen flex flex-col justify-center px-6 lg:px-12 z-20 py-24 max-w-7xl mx-auto"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
              VARIABLE EXPLORATION
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-100">
              From Data to Depth.
            </h2>
            <p className="text-slate-300 leading-relaxed text-base font-light">
              Analyze physical and biological variables at any depth level across the full water column.
            </p>

            <div className="space-y-2 text-sm">
              <div className="p-3 rounded bg-slate-900/50 border border-slate-800/80 flex justify-between">
                <span className="text-slate-200">Temperature</span>
                <span className="font-mono text-xs text-slate-400">°C</span>
              </div>
              <div className="p-3 rounded bg-slate-900/50 border border-slate-800/80 flex justify-between">
                <span className="text-slate-200">Practical Salinity</span>
                <span className="font-mono text-xs text-slate-400">PSU</span>
              </div>
              <div className="p-3 rounded bg-slate-900/50 border border-slate-800/80 flex justify-between">
                <span className="text-slate-200">Chlorophyll-a</span>
                <span className="font-mono text-xs text-slate-400">mg/m³</span>
              </div>
              <div className="p-3 rounded bg-slate-900/50 border border-slate-800/80 flex justify-between">
                <span className="text-slate-200">Current Velocity</span>
                <span className="font-mono text-xs text-slate-400">m/s</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 p-6 rounded bg-slate-900/60 border border-slate-800 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">Vertical Profile Explorer</h3>
                <span className="text-xs font-mono text-slate-400">Arabian Sea Station (15.4°N, 71.2°E)</span>
              </div>
              <div className="font-mono text-xs text-cyan-400">
                DEPTH: {selectedDepth} m
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400 font-mono">
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
                className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded bg-slate-950 border border-slate-800 text-center">
                <div className="text-xs text-slate-400 font-mono mb-1">TEMP</div>
                <div className="text-2xl font-bold text-slate-100 font-mono">{modelValues.temp} °C</div>
              </div>
              <div className="p-4 rounded bg-slate-950 border border-slate-800 text-center">
                <div className="text-xs text-slate-400 font-mono mb-1">SALINITY</div>
                <div className="text-2xl font-bold text-slate-100 font-mono">{modelValues.sal} PSU</div>
              </div>
              <div className="p-4 rounded bg-slate-950 border border-slate-800 text-center">
                <div className="text-xs text-slate-400 font-mono mb-1">CHLOROPHYLL</div>
                <div className="text-2xl font-bold text-slate-100 font-mono">{modelValues.chl} mg/m³</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 4: MODEL VS REALITY
         ======================================================== */}
      <section
        ref={(el) => { sectionRefs.current[4] = el; }}
        className="relative min-h-screen flex flex-col justify-center px-6 lg:px-12 z-20 py-24 max-w-7xl mx-auto"
      >
        <div className="space-y-4 max-w-2xl mb-12">
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
            MODEL VALIDATION
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-100">
            Model vs Reality.
          </h2>
          <p className="text-slate-300 leading-relaxed text-base font-light">
            Compare numerical model predictions directly with in-situ instrument observations.
          </p>
        </div>

        <div className="max-w-4xl p-8 rounded bg-slate-900/60 border border-slate-800 space-y-8">
          <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-800 pb-6">
            <div>
              <span className="text-xs font-mono text-slate-400 uppercase">Station Profile</span>
              <h3 className="text-lg font-bold text-slate-100">Argo Float #2902345</h3>
              <p className="text-xs text-slate-400 font-mono">Location: 15.4°N, 71.2°E | Depth: {selectedDepth}m</p>
            </div>

            <div className="flex gap-2">
              {(['temp', 'sal', 'chl'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setSelectedVar(v)}
                  className={cn(
                    "px-3 py-1 rounded text-xs font-mono uppercase transition-colors",
                    selectedVar === v ? "bg-slate-100 text-slate-950 font-bold" : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                  )}
                >
                  {v === 'temp' ? 'Temperature' : v === 'sal' ? 'Salinity' : 'Chlorophyll'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-xs font-mono text-slate-400">MODEL PREDICTED</div>
              <div className="text-3xl font-bold text-slate-100 font-mono">
                {modelValues[selectedVar]} {selectedVar === 'temp' ? '°C' : selectedVar === 'sal' ? 'PSU' : 'mg/m³'}
              </div>
              <div className="text-xs text-slate-500">Grid Output</div>
            </div>

            <div className="p-6 rounded bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-xs font-mono text-cyan-400">INSTRUMENT OBSERVED</div>
              <div className="text-3xl font-bold text-cyan-400 font-mono">
                {observedValues[selectedVar]} {selectedVar === 'temp' ? '°C' : selectedVar === 'sal' ? 'PSU' : 'mg/m³'}
              </div>
              <div className="text-xs text-slate-500">In-situ Cast</div>
            </div>

            <div className="p-6 rounded bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-xs font-mono text-amber-400">DIFFERENCE</div>
              <div className="text-3xl font-bold text-amber-400 font-mono">
                {parseFloat(diffValues[selectedVar]) > 0 ? `+${diffValues[selectedVar]}` : diffValues[selectedVar]} {selectedVar === 'temp' ? '°C' : selectedVar === 'sal' ? 'PSU' : 'mg/m³'}
              </div>
              <div className="text-xs text-slate-500">
                {parseFloat(diffValues[selectedVar]) > 0 ? 'Model Overestimation' : 'Model Underestimation'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 5: CAPABILITIES (EVERYTHING THE OCEAN IS TELLING YOU)
         ======================================================== */}
      <section 
        id="section-capabilities"
        ref={(el) => { sectionRefs.current[5] = el; }}
        className="relative min-h-screen flex flex-col justify-center px-6 lg:px-12 z-20 py-24 max-w-7xl mx-auto"
      >
        <div className="space-y-4 max-w-2xl mb-16">
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
            CAPABILITIES
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-100">
            Everything the Ocean Is Telling You.
          </h2>
          <p className="text-slate-300 leading-relaxed text-base font-light">
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
            <div key={idx} className="p-6 rounded bg-slate-900/50 border border-slate-800/80 space-y-2">
              <h3 className="text-base font-bold text-slate-100">{item.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================
          SECTION 6: LAHAR OPERATIONAL PLATFORM PREVIEW
         ======================================================== */}
      <section 
        id="section-preview"
        ref={(el) => { sectionRefs.current[6] = el; }}
        className="relative min-h-screen flex flex-col justify-center px-6 lg:px-12 z-20 py-24 max-w-7xl mx-auto"
      >
        <div className="space-y-4 max-w-2xl mb-12">
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
            PLATFORM PREVIEW
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-100">
            LAHAR Operational Workbench.
          </h2>
          <p className="text-slate-300 leading-relaxed text-base font-light">
            Experience the 3D ocean intelligence environment inside your browser.
          </p>
        </div>

        <div className="rounded bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl">
          <div className="bg-slate-900 px-6 py-3 border-b border-slate-800 flex justify-between items-center text-xs font-mono text-slate-400">
            <span>LAHAR 3D WORKBENCH</span>
            <span>REGION: Indian Ocean / Arabian Sea</span>
          </div>

          <div className="grid grid-cols-12 min-h-[460px]">
            <div className="col-span-12 lg:col-span-3 bg-slate-900/60 border-r border-slate-800 p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-400 uppercase">Variable</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button onClick={() => setWorkbenchVar('temp')} className={cn("p-2 rounded text-left border font-mono", workbenchVar === 'temp' ? "bg-slate-100 text-slate-950 font-bold" : "bg-slate-950 border-slate-800 text-slate-400")}>Temp</button>
                  <button onClick={() => setWorkbenchVar('sal')} className={cn("p-2 rounded text-left border font-mono", workbenchVar === 'sal' ? "bg-slate-100 text-slate-950 font-bold" : "bg-slate-950 border-slate-800 text-slate-400")}>Salinity</button>
                  <button onClick={() => setWorkbenchVar('chl')} className={cn("p-2 rounded text-left border font-mono", workbenchVar === 'chl' ? "bg-slate-100 text-slate-950 font-bold" : "bg-slate-950 border-slate-800 text-slate-400")}>Chlorophyll</button>
                  <button onClick={() => setWorkbenchVar('cur')} className={cn("p-2 rounded text-left border font-mono", workbenchVar === 'cur' ? "bg-slate-100 text-slate-950 font-bold" : "bg-slate-950 border-slate-800 text-slate-400")}>Currents</button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono text-slate-400">
                  <span>Depth</span>
                  <span>{workbenchDepth}m</span>
                </div>
                <input 
                  type="range" min="0" max="1000" 
                  value={workbenchDepth} 
                  onChange={(e) => setWorkbenchDepth(Number(e.target.value))} 
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded appearance-none"
                />
              </div>

              <div className="space-y-2 text-xs">
                <label className="text-xs font-mono text-slate-400 uppercase">Layers</label>
                {Object.entries(activeLayers).map(([k, v]) => (
                  <label key={k} className="flex justify-between items-center p-2 rounded bg-slate-950 border border-slate-800 cursor-pointer">
                    <span className="capitalize text-slate-300">{k}</span>
                    <input type="checkbox" checked={v} onChange={() => setActiveLayers(prev => ({ ...prev, [k]: !prev[k as keyof typeof prev] }))} className="accent-cyan-400" />
                  </label>
                ))}
              </div>
            </div>

            <div className="col-span-12 lg:col-span-6 bg-slate-950 p-6 flex flex-col justify-between relative">
              <div className="flex justify-between items-center z-10">
                <div className="text-xs font-mono text-slate-400">Depth Slice: {workbenchDepth}m</div>
                <button 
                  onClick={() => setIsPlatformOpen(true)}
                  className="px-3 py-1 rounded bg-slate-100 text-slate-950 text-xs font-semibold hover:bg-white flex items-center gap-1.5 cursor-pointer"
                >
                  <Maximize2 className="w-3 h-3" /> Fullscreen
                </button>
              </div>

              <div className="my-auto py-12 text-center space-y-2">
                <div className="text-slate-200 font-bold text-lg">3D Ocean Grid Volume</div>
                <p className="text-slate-400 text-xs max-w-sm mx-auto">
                  Interactive simulation showing ocean model output with active float locations.
                </p>
              </div>

              <div className="flex justify-between items-center border-t border-slate-800 pt-3 text-xs font-mono text-slate-400">
                <button onClick={() => setIsPlaying(!isPlaying)} className="hover:text-slate-200">
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <span>TIMESTAMP: 15 Aug 2026 UTC</span>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-3 bg-slate-900/60 border-l border-slate-800 p-6 space-y-4 text-xs font-mono">
              <div className="border-b border-slate-800 pb-3">
                <span className="text-slate-400 uppercase">Selected Instrument</span>
                <h4 className="text-sm font-bold text-slate-100 font-sans mt-1">Argo Float #2902345</h4>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Model Temp:</span>
                  <span className="text-slate-200">26.4 °C</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-cyan-400">Observed Temp:</span>
                  <span className="text-cyan-300">25.9 °C</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-amber-400">Delta:</span>
                  <span className="text-amber-300">+0.5 °C</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          FINAL CTA
         ======================================================== */}
      <section className="relative py-24 px-6 lg:px-12 z-20 max-w-7xl mx-auto text-center border-t border-slate-800">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-100">
            Explore the Ocean Differently.
          </h2>
          <p className="text-slate-300 text-lg font-light leading-relaxed">
            Bring model predictions, observations, depth and time together with LAHAR.
          </p>
          <div className="pt-2 flex justify-center">
            <button 
              onClick={() => setIsPlatformOpen(true)}
              className="px-8 py-3.5 rounded bg-slate-100 text-slate-950 font-bold text-sm hover:bg-white transition-colors cursor-pointer"
            >
              Launch LAHAR
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================
          FOOTER
         ======================================================== */}
      <footer className="border-t border-slate-800 bg-[#02050e] py-12 px-6 lg:px-12 z-20 relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 text-sm">
          <div className="md:col-span-6 space-y-3">
            <div className="font-bold text-lg text-slate-100">LAHAR</div>
            <p className="text-slate-400 text-sm max-w-md">
              3D Ocean Intelligence & Visualization Platform. Built for ocean data exploration and analysis.
            </p>
            <div className="text-slate-500 text-xs font-mono pt-2">
              PS 26067 | INCOIS | Ministry of Earth Sciences
            </div>
          </div>

          <div className="md:col-span-3 space-y-2">
            <div className="text-xs font-mono uppercase text-slate-400">Navigation</div>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li><button onClick={() => scrollToSection('section-story')} className="hover:text-slate-200">Explore</button></li>
              <li><button onClick={() => scrollToSection('section-capabilities')} className="hover:text-slate-200">Capabilities</button></li>
              <li><button onClick={() => scrollToSection('section-data')} className="hover:text-slate-200">Data</button></li>
              <li><button onClick={() => scrollToSection('section-preview')} className="hover:text-slate-200">Platform</button></li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-2">
            <div className="text-xs font-mono uppercase text-slate-400">Scientific Specs</div>
            <ul className="space-y-1.5 text-xs text-slate-400 font-mono">
              <li>Argo — Profiling Floats</li>
              <li>CTD — Conductivity, Temp & Depth</li>
              <li>BGC — Biogeochemical Data</li>
              <li>NetCDF4 / OPeNDAP Streams</li>
            </ul>
          </div>
        </div>
      </footer>

      {/* ========================================================
          FULLSCREEN WORKBENCH MODAL
         ======================================================== */}
      {isPlatformOpen && (
        <div className="fixed inset-0 z-50 bg-[#020617]/95 backdrop-blur-md flex flex-col">
          <div className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="font-bold text-lg text-slate-100">LAHAR 3D Ocean Intelligence Workbench</span>
            </div>
            <button 
              onClick={() => setIsPlatformOpen(false)}
              className="p-2 rounded bg-slate-800 text-slate-400 hover:text-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 grid grid-cols-12 p-6 gap-6 overflow-y-auto">
            <div className="col-span-12 lg:col-span-3 bg-slate-900/80 rounded border border-slate-800 p-5 space-y-6">
              <h3 className="text-sm font-bold text-slate-100">Controls & Layers</h3>

              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-400 uppercase">Variable</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button onClick={() => setWorkbenchVar('temp')} className={cn("p-2 rounded text-left border font-mono", workbenchVar === 'temp' ? "bg-slate-100 text-slate-950 font-bold" : "bg-slate-950 border-slate-800 text-slate-400")}>Temperature</button>
                  <button onClick={() => setWorkbenchVar('sal')} className={cn("p-2 rounded text-left border font-mono", workbenchVar === 'sal' ? "bg-slate-100 text-slate-950 font-bold" : "bg-slate-950 border-slate-800 text-slate-400")}>Salinity</button>
                  <button onClick={() => setWorkbenchVar('chl')} className={cn("p-2 rounded text-left border font-mono", workbenchVar === 'chl' ? "bg-slate-100 text-slate-950 font-bold" : "bg-slate-950 border-slate-800 text-slate-400")}>Chlorophyll</button>
                  <button onClick={() => setWorkbenchVar('cur')} className={cn("p-2 rounded text-left border font-mono", workbenchVar === 'cur' ? "bg-slate-100 text-slate-950 font-bold" : "bg-slate-950 border-slate-800 text-slate-400")}>Currents</button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono text-slate-400">
                  <span>Depth Slice</span>
                  <span>{workbenchDepth}m</span>
                </div>
                <input 
                  type="range" min="0" max="2000" step="10" 
                  value={workbenchDepth} 
                  onChange={(e) => setWorkbenchDepth(Number(e.target.value))} 
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded appearance-none"
                />
              </div>

              <div className="space-y-2 text-xs">
                <label className="text-xs font-mono text-slate-400 uppercase">Active Layers</label>
                {Object.entries(activeLayers).map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="capitalize text-slate-300">{k}</span>
                    <input type="checkbox" checked={v} onChange={() => setActiveLayers(prev => ({ ...prev, [k]: !prev[k as keyof typeof prev] }))} className="accent-cyan-400" />
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-12 lg:col-span-9 bg-slate-950 rounded border border-slate-800 p-6 flex flex-col justify-between min-h-[500px]">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h4 className="text-base font-bold text-slate-100">Arabian Sea & Bay of Bengal 3D Grid</h4>
                  <span className="text-xs font-mono text-slate-400">Coordinates: 15.4°N, 71.2°E | Depth: {workbenchDepth}m</span>
                </div>
              </div>

              <div className="my-auto py-16 text-center space-y-2">
                <div className="text-slate-200 font-bold text-xl">Interactive 3D WebGL Ocean Canvas</div>
                <p className="text-slate-400 text-sm max-w-md mx-auto">
                  Rendering 3D temperature slice at {workbenchDepth}m depth with active Argo float and Glider telemetry markers.
                </p>
              </div>

              <div className="border-t border-slate-800 pt-4 flex justify-between items-center text-xs font-mono text-slate-400">
                <button onClick={() => setIsPlatformOpen(false)} className="px-4 py-2 rounded bg-slate-800 text-slate-200 hover:bg-slate-700">Close Workbench</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
