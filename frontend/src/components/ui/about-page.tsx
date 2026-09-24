import React from 'react';
import { 
  ArrowRight, Compass, Wind, CloudRain, ShieldCheck, Database, 
  Activity, Cpu, Layers, GitBranch, ExternalLink, BookOpen, 
  Waves, Radio, Award, CheckCircle2, FileText, Anchor, Shield, LineChart
} from 'lucide-react';
import AppNavbar from '@/components/ui/app-navbar';
import { ShinyButton } from '@/components/ui/shiny-button';
import { SpinningBorderButton } from '@/components/ui/spinning-border-button';
import { Component as EtherealShadow } from '@/components/ui/etheral-shadow';
import { RayCard } from '@/components/ui/ray-card';

export function AboutLeherPage() {
  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col font-sans selection:bg-white/20 selection:text-white relative overflow-hidden">
      {/* Dynamic Ethereal Shadow Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <EtherealShadow
          color="rgba(128, 128, 128, 1)"
          animation={{ scale: 100, speed: 90 }}
          noise={{ opacity: 1, scale: 1.2 }}
          sizing="fill"
          className="w-full h-full"
        />
        {/* Soft vignette overlay for text legibility and contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#080808]/40 via-transparent to-[#080808]/70 pointer-events-none" />
      </div>

      {/* Top Navigation */}
      <div className="relative z-20">
        <AppNavbar currentRoute="about" />
      </div>

      {/* Main Content */}
      <main className="flex-1 pt-24 pb-20 px-4 sm:px-6 lg:px-12 max-w-5xl mx-auto w-full space-y-20 sm:space-y-24 relative z-10">
        
        {/* ========================================================
            01 — ABOUT LEHER (HERO WITH SIH & INSTITUTION BADGES)
           ======================================================== */}
        <section className="pt-8 sm:pt-14 text-center max-w-3xl mx-auto space-y-6">
          {/* SIH & MoES Institutional Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-800/60 text-cyan-300 text-xs font-mono font-semibold tracking-wide">
              <Award className="w-3.5 h-3.5 text-cyan-400" />
              <span>SIH Problem Statement 26067</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 text-xs font-mono font-semibold tracking-wide">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>INCOIS • Ministry of Earth Sciences (MoES)</span>
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.15]">
            Understand the Ocean. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Make Safer Decisions.
            </span>
          </h1>

          <div className="space-y-3 max-w-2xl mx-auto">
            <p className="text-base sm:text-lg text-neutral-300 leading-relaxed font-normal">
              <strong>Leher (लहर)</strong> is an institutional 3D ocean intelligence, subsurface stratification, and maritime hazard decision-support platform designed for the Indian Ocean.
            </p>
            <p className="text-sm sm:text-base text-neutral-400 leading-relaxed font-normal">
              Integrating 4D numerical hydrodynamic models with real-world in-situ observation telemetry (Argo floats, gliders, OMNI buoys) across space, depth, and time.
            </p>
          </div>

          <div className="pt-3 flex flex-wrap items-center justify-center gap-4">
            <ShinyButton
              onClick={() => navigateTo('/operations')}
              className="py-2.5 px-6 text-xs sm:text-sm font-semibold shadow-lg"
            >
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Launch Operations Console</span>
              <ArrowRight className="w-4 h-4 opacity-80" />
            </ShinyButton>
            <SpinningBorderButton
              onClick={() => navigateTo('/depth-slice')}
              hideArrow
            >
              <span>Explore 3D Depth Slices</span>
            </SpinningBorderButton>
          </div>
        </section>

        {/* ========================================================
            02 — THE OCEANOGRAPHIC PROBLEM & MANDATE
           ======================================================== */}
        <section className="space-y-8 pt-4">
          <div className="border-b border-[#1c1c1c] pb-5">
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest block">
              01 / THE OCEANOGRAPHIC CHALLENGE
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1.5">
              Bridging Flat 2D GIS with 4D Subsurface Dynamics
            </h2>
            <p className="text-sm text-neutral-400 mt-2 max-w-2xl leading-relaxed">
              India manages over 2.37 million sq km of EEZ. Traditional marine GIS portals render flat surface layers, hiding 90% of oceanic heat dynamics, thermoclines, and sonar acoustic ducts residing below.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <RayCard innerClassName="p-4 sm:p-5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-semibold">
                  <Layers className="w-4 h-4" />
                  <span>Subsurface Stratification</span>
                </div>
                <h3 className="text-base font-semibold text-white tracking-tight">
                  Vertical Column Hidden
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  Temperature, salinity, and acoustic velocity vary dramatically from surface to 2,000m+ depth, requiring depth-resolved 3D slicing.
                </p>
              </div>
            </RayCard>

            <RayCard innerClassName="p-4 sm:p-5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-semibold">
                  <Radio className="w-4 h-4" />
                  <span>Telemetry Fragmentation</span>
                </div>
                <h3 className="text-base font-semibold text-white tracking-tight">
                  Disconnected Data Silos
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  Numerical ocean models (Copernicus GLORYS12V1) were historically disconnected from physical in-situ Argo float and glider telemetry.
                </p>
              </div>
            </RayCard>

            <RayCard innerClassName="p-4 sm:p-5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Operational Actionability</span>
                </div>
                <h3 className="text-base font-semibold text-white tracking-tight">
                  Actionable Operational Advisories
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  Raw NetCDF matrices are transformed into actionable briefings for fishermen, naval acoustic operators, and coastal disaster teams.
                </p>
              </div>
            </RayCard>
          </div>
        </section>

        {/* ========================================================
            03 — THE PLATFORM FLOW
           ======================================================== */}
        <section className="space-y-8">
          <div className="border-b border-[#1c1c1c] pb-5">
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest block">
              02 / SYSTEM ARCHITECTURE & FLOW
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1.5">
              Unified Hydrodynamic &amp; Observation Intelligence
            </h2>
            <p className="text-sm text-neutral-400 mt-2 max-w-2xl leading-relaxed">
              Leher unifies multi-depth numeric models and physical sensors into one high-performance WebGL environment.
            </p>
          </div>

          {/* Connected Flow: OCEAN -> OBSERVATIONS -> BIAS ENGINE -> DECISION */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {/* Block 01 */}
            <RayCard innerClassName="p-4 sm:p-5 justify-between">
              <div className="space-y-2">
                <div>
                  <span className="text-[11px] sm:text-xs font-mono text-cyan-400 font-semibold tracking-wider uppercase inline-block">01 — HYDRODYNAMICS</span>
                </div>
                <h3 className="text-base font-semibold text-white tracking-tight">
                  4D Ocean Model Fields
                </h3>
                <p className="text-xs sm:text-[13px] text-neutral-400 leading-relaxed">
                  GLORYS12V1 reanalysis &amp; forecast data across 50 vertical depth levels (0–2000m).
                </p>
              </div>
              <div className="pt-3 text-[11px] font-mono text-neutral-500 flex items-center gap-1.5">
                <span>Passes to</span>
                <span className="text-neutral-300 font-medium">→ In-Situ Telemetry</span>
              </div>
            </RayCard>

            {/* Block 02 */}
            <RayCard innerClassName="p-4 sm:p-5 justify-between">
              <div className="space-y-2">
                <div>
                  <span className="text-[11px] sm:text-xs font-mono text-emerald-400 font-semibold tracking-wider uppercase inline-block">02 — IN-SITU FLEET</span>
                </div>
                <h3 className="text-base font-semibold text-white tracking-tight">
                  Sensor Telemetry
                </h3>
                <p className="text-xs sm:text-[13px] text-neutral-400 leading-relaxed">
                  Real-time profiling Argo floats, gliders, CTDs, and INCOIS OMNI buoy networks.
                </p>
              </div>
              <div className="pt-3 text-[11px] font-mono text-neutral-500 flex items-center gap-1.5">
                <span>Co-validates with</span>
                <span className="text-neutral-300 font-medium">→ Bias Engine</span>
              </div>
            </RayCard>

            {/* Block 03 */}
            <RayCard innerClassName="p-4 sm:p-5 justify-between">
              <div className="space-y-2">
                <div>
                  <span className="text-[11px] sm:text-xs font-mono text-amber-400 font-semibold tracking-wider uppercase inline-block">03 — BIAS ENGINE</span>
                </div>
                <h3 className="text-base font-semibold text-white tracking-tight">
                  Model vs Obs Validation
                </h3>
                <p className="text-xs sm:text-[13px] text-neutral-400 leading-relaxed">
                  Spatial-temporal co-location computing water column RMSE, mean bias, D20 error &amp; Pearson r.
                </p>
              </div>
              <div className="pt-3 text-[11px] font-mono text-neutral-500 flex items-center gap-1.5">
                <span>Feeds into</span>
                <span className="text-neutral-300 font-medium">→ Decision Support</span>
              </div>
            </RayCard>

            {/* Block 04 */}
            <RayCard innerClassName="p-4 sm:p-5 justify-between">
              <div className="space-y-2">
                <div>
                  <span className="text-[11px] sm:text-xs font-mono text-rose-400 font-semibold tracking-wider uppercase inline-block">04 — DECISION SUPPORT</span>
                </div>
                <h3 className="text-base font-semibold text-white tracking-tight">
                  Operational Advisories
                </h3>
                <p className="text-xs sm:text-[13px] text-neutral-400 leading-relaxed">
                  ML cyclone predictions, storm surge inundation, safe fishing corridors &amp; PDF dossiers.
                </p>
              </div>
              <div className="pt-3 text-[11px] font-mono text-neutral-400 flex items-center gap-1.5">
                <span>Outcome</span>
                <span className="text-white font-medium">→ Maritime Safety</span>
              </div>
            </RayCard>
          </div>
        </section>

        {/* ========================================================
            04 — CAPABILITIES & CORE FEATURES
           ======================================================== */}
        <section className="space-y-8">
          <div className="border-b border-[#1c1c1c] pb-5">
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest block">
              03 / CAPABILITIES &amp; INNOVATIONS
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1.5">
              Institutional Features Engine
            </h2>
            <p className="text-sm text-neutral-400 mt-2 max-w-2xl leading-relaxed">
              Exhaustive technological suite engineered to satisfy every operational parameter of SIH Problem Statement 26067.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <RayCard innerClassName="p-4 sm:p-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-semibold">
                  <Waves className="w-4 h-4" />
                  <span>3D Volumetric Slicing</span>
                </div>
                <h3 className="text-base font-semibold text-white tracking-tight">
                  WebGL Depth Engine
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  Three.js 3D Cylinder and Cuboid ocean block slicing across 50 vertical depth levels ($0.49\text{m}$ to $5,728\text{m}$) with Marching Cubes isosurface extraction off-thread via Web Workers.
                </p>
              </div>
            </RayCard>

            <RayCard innerClassName="p-4 sm:p-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-semibold">
                  <LineChart className="w-4 h-4" />
                  <span>Hydrodynamic Validation</span>
                </div>
                <h3 className="text-base font-semibold text-white tracking-tight">
                  Model vs. Obs Bias Engine
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  Direct co-location comparing Copernicus GLORYS12V1 vs in-situ Argo observations, computing column RMSE, signed mean bias ($\Delta T, \Delta S$), D20 thermocline error, and Pearson correlation ($r$).
                </p>
              </div>
            </RayCard>

            <RayCard innerClassName="p-4 sm:p-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-semibold">
                  <Cpu className="w-4 h-4" />
                  <span>Machine Learning Engine</span>
                </div>
                <h3 className="text-base font-semibold text-white tracking-tight">
                  Jal-Chakra &amp; Rakshak AI Suite
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  Dual XGBoost machine learning engines trained on IMD IBTrACS cyclone track records, predicting tropical storm surge inundation levels and cyclogenesis probability.
                </p>
              </div>
            </RayCard>

            <RayCard innerClassName="p-4 sm:p-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-semibold">
                  <Activity className="w-4 h-4" />
                  <span>Ecosystem Monitoring</span>
                </div>
                <h3 className="text-base font-semibold text-white tracking-tight">
                  Marine Ecosystem Health Grid
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  Real-time ecological assessment across 4,000 spatial cells tracking NOAA Degree Heating Weeks (DHW) coral bleaching risk, Harmful Algal Bloom (HAB) index, and hypoxia ($O_2$ depletion).
                </p>
              </div>
            </RayCard>

            <RayCard innerClassName="p-4 sm:p-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-400 font-mono text-xs font-semibold">
                  <FileText className="w-4 h-4" />
                  <span>Executive Reporting</span>
                </div>
                <h3 className="text-base font-semibold text-white tracking-tight">
                  1-Click Mission Dossier (PDF)
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  Instant client-side generation of institutional, printable operational briefings branded with official INCOIS and MoES standards for disaster decision-makers.
                </p>
              </div>
            </RayCard>

            <RayCard innerClassName="p-4 sm:p-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-purple-400 font-mono text-xs font-semibold">
                  <Anchor className="w-4 h-4" />
                  <span>Tactical Navigation</span>
                </div>
                <h3 className="text-base font-semibold text-white tracking-tight">
                  Safe Corridors &amp; Sonar Science
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  GeoJSON safe fishing zone corridors, port entry paths, wave energy leeway HUD, and Mackenzie sound speed calculation ($1,538.4\text{ m/s}$) for SOFAR acoustic channel ducting.
                </p>
              </div>
            </RayCard>
          </div>
        </section>

        {/* ========================================================
            05 — SCIENTIFIC & OCEANOGRAPHIC FOUNDATIONS
           ======================================================== */}
        <section className="space-y-8">
          <div className="border-b border-[#1c1c1c] pb-5">
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest block">
              04 / OCEANOGRAPHIC SCIENCE &amp; DATA STANDARDS
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1.5">
              Rigorous Physical Formulations &amp; Open Standards
            </h2>
            <p className="text-sm text-neutral-400 mt-2 max-w-2xl leading-relaxed">
              Leher enforces scientific rigor across physical equations, open data interoperability, and high-speed binary serialization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RayCard innerClassName="p-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-semibold">
                  <BookOpen className="w-4 h-4" />
                  <span>Physical Formulations</span>
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Thermocline &amp; Acoustic Ducting Dynamics
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm text-neutral-300 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold">•</span>
                    <span><strong>$D_{20}$ Thermocline Isotherm</strong>: Solves $20^\circ\text{C}$ depth isotherm to evaluate upper ocean heat potential and cyclone intensification strength.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold">•</span>
                    <span><strong>Mackenzie Sound Velocity</strong>: Computes acoustic sound speed ($c$) in seawater based on $T, S, z$ to identify SOFAR ducting axes for submarine operations.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold">•</span>
                    <span><strong>Mixed Layer Depth ($\text{MLD}$)</strong>: Evaluates upper ocean mixing using the $0.2^\circ\text{C}$ temperature threshold criterion.</span>
                  </li>
                </ul>
              </div>
            </RayCard>

            <RayCard innerClassName="p-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-semibold">
                  <Database className="w-4 h-4" />
                  <span>Data Fabric &amp; Open Standards</span>
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  NetCDF CF-1.8 &amp; Apache Arrow IPC
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm text-neutral-300 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span><strong>CF-1.8 Metadata Conventions</strong>: Full alignment with NetCDF Climate and Forecast standards for global data portal interoperability.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span><strong>Zero-Copy Apache Arrow IPC</strong>: Streams 3D volumetric slices from DuckDB/Polars backend directly to browser memory without JSON parsing overhead.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span><strong>OGC GeoJSON Standards</strong>: Standardized geospatial polygons for safe fishing corridors, port channels, and marine ecosystem cells.</span>
                  </li>
                </ul>
              </div>
            </RayCard>
          </div>
        </section>

        {/* ========================================================
            06 — SIH PROBLEM STATEMENT 26067 COMPLIANCE MATRIX
           ======================================================== */}
        <section className="space-y-8">
          <div className="border-b border-[#1c1c1c] pb-5">
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest block">
              05 / SIH COMPLIANCE MATRIX
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1.5">
              SIH PS 26067 Requirement Alignment
            </h2>
            <p className="text-sm text-neutral-400 mt-2 max-w-2xl leading-relaxed">
              Complete verification matrix against MoES / INCOIS Smart India Hackathon problem requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { id: '1', title: '3D Volumetric Rendering', desc: '0–2000m+ depth slice probes, isosurface extraction, time-step climate animation via Three.js WebGL.' },
              { id: '2', title: 'Instrument Data Overlay', desc: '16+ active ocean platforms (Argo floats, gliders, OMNI buoys) with profile charts & 30-day drift paths.' },
              { id: '2b', title: 'Model vs. Obs Hydrodynamic Bias', desc: 'Co-location comparing GLORYS model vs in-situ measurements with RMSE, Mean Bias & Pearson r metrics.' },
              { id: '3', title: 'Multi-Format Data Ingestion', desc: 'Automated NetCDF/Zarr ingestion via xarray, DuckDB indexing & Apache Arrow IPC binary streams.' },
              { id: '4', title: 'Colorbar & Variable Controls', desc: '8 scientific palettes (Viridis, Turbo, Plasma, Haline), dynamic min/max auto-scale & vertical exaggeration.' },
              { id: '5', title: 'Web-Based Scalable Architecture', desc: 'React 19 + Three.js + FastAPI zero-plugin browser architecture built for INCOIS infrastructure.' },
              { id: '6', title: 'Extensible Sensor Architecture', desc: 'Modular backend plugins ready for future CTDs, moorings, HF-Radar currents, and ADCP profile data.' },
              { id: '7', title: 'Open Standards & Interoperability', desc: 'NetCDF CF-1.8 metadata compliance, OGC GeoJSON standards, and OpenAPI 3.0 Swagger docs.' },
              { id: '8', title: 'Disaster Management Mandates', desc: 'Rakshak XGBoost cyclone & surge predictions, fishermen safe zone corridors, and ecosystem health engine.' },
              { id: '9', title: 'Public Science Communication', desc: 'Educational oceanography outreach page and 1-click executive PDF mission dossier generator.' },
            ].map((req) => (
              <RayCard key={req.id} innerClassName="p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-cyan-400 font-bold">REQ-{req.id}</span>
                    <h3 className="text-sm font-semibold text-white tracking-tight">{req.title}</h3>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">{req.desc}</p>
                </div>
              </RayCard>
            ))}
          </div>
        </section>

        {/* ========================================================
            07 — USER WORKFLOW & MARITIME RISK STATES
           ======================================================== */}
        <section className="space-y-8">
          <div className="border-b border-[#1c1c1c] pb-5">
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest block">
              06 / OPERATIONAL USER WORKFLOW
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1.5">
              From Raw Data to Tactical Action
            </h2>
            <div className="mt-3 flex items-center gap-2 font-mono text-xs text-cyan-400 font-semibold tracking-wide">
              <span>SEE</span>
              <span className="text-neutral-600">→</span>
              <span>CLICK</span>
              <span className="text-neutral-600">→</span>
              <span>UNDERSTAND</span>
              <span className="text-neutral-600">→</span>
              <span>ACT</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <RayCard innerClassName="p-4 sm:p-4.5">
              <div className="space-y-1.5">
                <span className="text-xs font-mono text-cyan-400 font-bold block">STEP 01</span>
                <h3 className="text-base font-bold text-white tracking-tight">SEE</h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  Explore 3D ocean model fields and locate active in-situ sensor pins on the interactive globe.
                </p>
              </div>
            </RayCard>

            <RayCard innerClassName="p-4 sm:p-4.5">
              <div className="space-y-1.5">
                <span className="text-xs font-mono text-cyan-400 font-bold block">STEP 02</span>
                <h3 className="text-base font-bold text-white tracking-tight">CLICK</h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  Select coordinates, probe subsurface depths ($0-2000\text{m}$), or inspect an Argo float profile.
                </p>
              </div>
            </RayCard>

            <RayCard innerClassName="p-4 sm:p-4.5">
              <div className="space-y-1.5">
                <span className="text-xs font-mono text-cyan-400 font-bold block">STEP 03</span>
                <h3 className="text-base font-bold text-white tracking-tight">UNDERSTAND</h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  Review model vs obs hydrodynamic bias, ML surge probability, and thermocline stability.
                </p>
              </div>
            </RayCard>

            <RayCard innerClassName="p-4 sm:p-4.5">
              <div className="space-y-1.5">
                <span className="text-xs font-mono text-cyan-400 font-bold block">STEP 04</span>
                <h3 className="text-base font-bold text-white tracking-tight">ACT</h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  Issue safe fishing corridor advisories, set naval sonar acoustic channels, or export mission PDF.
                </p>
              </div>
            </RayCard>
          </div>
        </section>

        {/* ========================================================
            08 — TARGET MARITIME OPERATORS
           ======================================================== */}
        <section className="space-y-8">
          <div className="border-b border-[#1c1c1c] pb-5">
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest block">
              07 / OPERATIONAL STAKEHOLDERS
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1.5">
              Serving India's Maritime Community
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <RayCard innerClassName="p-5">
              <div className="space-y-2">
                <span className="text-xs font-mono text-cyan-400 font-semibold block">STAKEHOLDER 01</span>
                <h3 className="text-lg font-bold text-white tracking-tight">Fishermen &amp; Coastal Communities</h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  Access simplified GeoJSON safe zone corridors, wave height warnings, and storm surge advisories before embarking at sea.
                </p>
              </div>
            </RayCard>

            <RayCard innerClassName="p-5">
              <div className="space-y-2">
                <span className="text-xs font-mono text-emerald-400 font-semibold block">STAKEHOLDER 02</span>
                <h3 className="text-lg font-bold text-white tracking-tight">INCOIS &amp; Disaster Managers</h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  Rapidly cross-validate numerical forecast bias against physical Argo observations and export printable executive PDF dossiers.
                </p>
              </div>
            </RayCard>

            <RayCard innerClassName="p-5">
              <div className="space-y-2">
                <span className="text-xs font-mono text-purple-400 font-semibold block">STAKEHOLDER 03</span>
                <h3 className="text-lg font-bold text-white tracking-tight">Naval &amp; Maritime Security</h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  Analyze acoustic sound velocity profiles, SOFAR ducting channel axes, and Plimsoll draft buoyancy variations.
                </p>
              </div>
            </RayCard>
          </div>
        </section>

        {/* ========================================================
            09 — GITHUB REPOSITORY & TEAM CREDITS
           ======================================================== */}
        <section className="space-y-8">
          <div className="border-b border-[#1c1c1c] pb-5">
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest block">
              08 / OPEN SOURCE &amp; REPOSITORY
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1.5">
              Master Codebase &amp; Open Development
            </h2>
            <p className="text-sm text-neutral-400 mt-2 max-w-2xl leading-relaxed">
              Leher is fully open-source and ready for integration with national oceanographic computing infrastructures.
            </p>
          </div>

          <RayCard innerClassName="p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <GitBranch className="w-5 h-5 text-cyan-400" />
                <h3 className="text-xl font-bold text-white tracking-tight">DNA-Coded / LEHER</h3>
              </div>
              <p className="text-xs sm:text-sm text-neutral-400 max-w-xl leading-relaxed">
                Explore our full repository containing React 19 frontend, FastAPI Polars/DuckDB data fabric, xarray NetCDF pipelines, and Rakshak machine learning models.
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 font-mono text-xs text-neutral-400">
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-cyan-300">React 19</span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-teal-300">Three.js WebGL</span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-emerald-300">FastAPI</span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-amber-300">Apache Arrow IPC</span>
              </div>
            </div>

            <a
              href="https://github.com/DNA-Coded/LEHER"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-black font-bold text-sm shadow-lg transition-all transform hover:scale-105 shrink-0"
            >
              <span>View GitHub Repository</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </RayCard>
        </section>

        {/* ========================================================
            10 — FINAL CTA
           ======================================================== */}
        <section className="pt-4 text-center max-w-xl mx-auto space-y-5 border-t border-[#1c1c1c]">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Explore Leher Platform
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            Experience 3D subsurface ocean intelligence and maritime risk assessment for the Indian Ocean.
          </p>

          <div className="pt-2 flex justify-center">
            <ShinyButton
              onClick={() => navigateTo('/operations')}
              className="py-3 px-8 text-sm font-semibold shadow-xl"
            >
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Launch Operations Console</span>
              <ArrowRight className="w-4 h-4 opacity-80" />
            </ShinyButton>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-[#1c1c1c] bg-[#050505] py-8 px-4 sm:px-6 lg:px-12 z-20">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono text-neutral-500">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Leher Logo" title="Leher" className="h-4 w-auto object-contain opacity-70" />
            <span>Leher • SIH PS 26067 • INCOIS / MoES</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigateTo('/')} className="hover:text-white cursor-pointer transition-colors">
              Home
            </button>
            <button onClick={() => navigateTo('/about')} className="text-neutral-300 hover:text-white cursor-pointer transition-colors">
              About
            </button>
            <button onClick={() => navigateTo('/operations')} className="hover:text-white cursor-pointer transition-colors">
              Explore / Platform
            </button>
            <a href="https://github.com/DNA-Coded/LEHER" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AboutLeherPage;
