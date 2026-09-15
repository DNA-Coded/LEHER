import React from 'react';
import { ArrowRight, Compass } from 'lucide-react';
import AppNavbar from '@/components/ui/app-navbar';

export function AboutLeherPage() {
  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col font-sans selection:bg-white/20 selection:text-white">
      {/* Top Navigation */}
      <AppNavbar currentRoute="about" />

      {/* Main Content */}
      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6 lg:px-12 max-w-5xl mx-auto w-full space-y-16 sm:space-y-20">
        
        {/* ========================================================
            01 — INTRODUCTION
           ======================================================== */}
        <section className="pt-6 sm:pt-10 text-center max-w-3xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-neutral-300 text-xs font-mono font-medium">
            <span>ABOUT</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
            Understand the Ocean. Make Safer Decisions.
          </h1>

          <p className="text-base sm:text-lg text-[#94a3b8] leading-relaxed max-w-2xl mx-auto font-normal">
            Leher is an interactive 3D ocean platform for exploring ocean conditions, assessing locations and understanding maritime risk across the Indian Ocean.
          </p>

          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => navigateTo('/operations')}
              className="inline-flex items-center gap-2 py-2.5 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-black font-semibold text-xs sm:text-sm transition-all shadow-[0_0_20px_rgba(6,182,212,0.25)] cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>Launch Platform</span>
              <ArrowRight className="w-4 h-4 opacity-80" />
            </button>
            <button
              onClick={() => navigateTo('/')}
              className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-white font-medium text-xs sm:text-sm transition-all cursor-pointer"
            >
              <span>Back to Home</span>
            </button>
          </div>
        </section>

        {/* ========================================================
            02 — WHY LEHER
           ======================================================== */}
        <section className="space-y-6">
          <div className="border-b border-[#1f2430] pb-4">
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest block">01 / WHY LEHER</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
              Understanding Ocean Conditions Should Be Easier
            </h2>
            <p className="text-sm text-[#94a3b8] mt-2 max-w-2xl leading-relaxed">
              Ocean data can vary across location, depth and time. Bringing these conditions together in a single interactive view makes them easier to explore and interpret.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#0e1117] border border-[#1f2430] space-y-2.5">
              <span className="text-xs font-mono text-neutral-400 block">01</span>
              <h3 className="text-base font-semibold text-white tracking-tight">
                Complex Ocean Conditions
              </h3>
              <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
                Temperature, salinity and currents change across the ocean and with depth.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0e1117] border border-[#1f2430] space-y-2.5">
              <span className="text-xs font-mono text-neutral-400 block">02</span>
              <h3 className="text-base font-semibold text-white tracking-tight">
                Different Sources of Information
              </h3>
              <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
                Ocean models and instrument observations provide different views of the same environment.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0e1117] border border-[#1f2430] space-y-2.5">
              <span className="text-xs font-mono text-neutral-400 block">03</span>
              <h3 className="text-base font-semibold text-white tracking-tight">
                Hard to Interpret in Isolation
              </h3>
              <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
                Users need a clear way to explore these conditions together and understand what they mean at a selected location.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================
            03 — WHAT YOU CAN EXPLORE
           ======================================================== */}
        <section className="space-y-6">
          <div className="border-b border-[#1f2430] pb-4">
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest block">02 / EXPLORE</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
              Explore the Ocean in One Place
            </h2>
            <p className="text-sm text-[#94a3b8] mt-2 max-w-2xl leading-relaxed">
              Leher brings the main ocean variables and observations into an interactive 3D environment.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#0e1117] border border-[#1f2430] space-y-2">
              <span className="text-xs font-mono text-neutral-400 block">01</span>
              <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                3D Ocean View
              </h3>
              <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
                Explore ocean conditions across location and depth in an interactive 3D view.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0e1117] border border-[#1f2430] space-y-2">
              <span className="text-xs font-mono text-neutral-400 block">02</span>
              <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                Ocean Conditions
              </h3>
              <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
                Inspect temperature, salinity and currents at different locations and depths.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0e1117] border border-[#1f2430] space-y-2">
              <span className="text-xs font-mono text-neutral-400 block">03</span>
              <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                Depth &amp; Time
              </h3>
              <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
                Move through depth levels and time to see how ocean conditions change.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0e1117] border border-[#1f2430] space-y-2">
              <span className="text-xs font-mono text-neutral-400 block">04</span>
              <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                Ocean Observations
              </h3>
              <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
                Explore observations from instruments such as Argo floats and gliders.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0e1117] border border-[#1f2430] space-y-2">
              <span className="text-xs font-mono text-neutral-400 block">05</span>
              <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                Location Assessment
              </h3>
              <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
                Select a location to view its conditions and current risk status.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0e1117] border border-[#1f2430] space-y-2">
              <span className="text-xs font-mono text-neutral-400 block">06</span>
              <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                Model &amp; Observation View
              </h3>
              <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
                Compare ocean model information with available observations at a selected location.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================
            04 — RISK & HAZARDS
           ======================================================== */}
        <section className="space-y-6">
          <div className="border-b border-[#1f2430] pb-4">
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest block">03 / MARITIME RISK</span>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mt-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                See Where Conditions Become a Risk
              </h2>
              <div className="text-xs font-mono text-neutral-400 font-medium tracking-wide">
                SAFE → CAUTION → DANGER
              </div>
            </div>
            <p className="text-sm text-[#94a3b8] mt-2 max-w-2xl leading-relaxed">
              Leher connects ocean conditions with a clear view of maritime risk, helping users identify areas that may require attention.
            </p>
          </div>

          {/* Risk States */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#0e1117] border border-emerald-500/25 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold uppercase tracking-wider">
                  SAFE
                </span>
                <span className="text-[11px] font-mono text-emerald-400/80">Nominal</span>
              </div>
              <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed pt-1">
                Lower operational risk based on the available conditions.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0e1117] border border-amber-500/25 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-xs font-mono font-bold uppercase tracking-wider">
                  CAUTION
                </span>
                <span className="text-[11px] font-mono text-amber-400/80">Advisory</span>
              </div>
              <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed pt-1">
                Conditions require additional attention before proceeding.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0e1117] border border-rose-500/25 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-xs font-mono font-bold uppercase tracking-wider">
                  DANGER
                </span>
                <span className="text-[11px] font-mono text-rose-400/80">Warning</span>
              </div>
              <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed pt-1">
                Conditions indicate elevated risk and require appropriate caution.
              </p>
            </div>
          </div>

          {/* Compact Hazard Subsection */}
          <div className="pt-4 space-y-4">
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Maritime Hazards
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-[#0e1117] border border-[#1f2430] space-y-2">
                <span className="text-xs font-mono text-neutral-400 block">01</span>
                <h4 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                  CYCLONE / STORM
                </h4>
                <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
                  Severe weather systems that can affect maritime movement and safety.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#0e1117] border border-[#1f2430] space-y-2">
                <span className="text-xs font-mono text-neutral-400 block">02</span>
                <h4 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                  STORM SURGE
                </h4>
                <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
                  Abnormal coastal water-level rise associated with severe weather.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#0e1117] border border-[#1f2430] space-y-2">
                <span className="text-xs font-mono text-neutral-400 block">03</span>
                <h4 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                  OCEAN CONDITIONS
                </h4>
                <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
                  Temperature, currents and other environmental conditions that can contribute to local risk.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            05 — HOW LEHER WORKS
           ======================================================== */}
        <section className="space-y-6">
          <div className="border-b border-[#1f2430] pb-3">
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest block">04 / USER FLOW</span>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mt-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                From Ocean Data to Action
              </h2>
              <div className="text-xs font-mono text-neutral-400 font-medium tracking-wide">
                SEE → CLICK → UNDERSTAND → ACT
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#0e1117] border border-[#1f2430] space-y-2.5">
              <span className="text-xs font-mono text-neutral-400 font-bold block">STEP 01</span>
              <h3 className="text-base font-bold text-white tracking-tight">SEE</h3>
              <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
                Explore the 3D ocean and identify an area of interest.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0e1117] border border-[#1f2430] space-y-2.5">
              <span className="text-xs font-mono text-neutral-400 font-bold block">STEP 02</span>
              <h3 className="text-base font-bold text-white tracking-tight">CLICK</h3>
              <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
                Select a location or hazard on the map.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0e1117] border border-[#1f2430] space-y-2.5">
              <span className="text-xs font-mono text-neutral-400 font-bold block">STEP 03</span>
              <h3 className="text-base font-bold text-white tracking-tight">UNDERSTAND</h3>
              <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
                Review ocean conditions, observations and risk for that location.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0e1117] border border-[#1f2430] space-y-2.5">
              <span className="text-xs font-mono text-neutral-400 font-bold block">STEP 04</span>
              <h3 className="text-base font-bold text-white tracking-tight">ACT</h3>
              <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
                Use the information to respond to hazards or choose a safer route.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================
            06 — WHO IT IS FOR
           ======================================================== */}
        <section className="space-y-6">
          <div className="border-b border-[#1f2430] pb-3">
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest block">05 / USERS</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
              Built for Maritime Users
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-[#0e1117] border border-[#1f2430] space-y-2.5">
              <div className="text-xs font-mono text-neutral-400 uppercase tracking-wider">Operational User</div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Fishermen
              </h3>
              <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
                Simple information about ocean conditions, hazards and local risk to support safer decisions at sea.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0e1117] border border-[#1f2430] space-y-2.5">
              <div className="text-xs font-mono text-neutral-400 uppercase tracking-wider">Command &amp; Surveillance</div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Coast Guard
              </h3>
              <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
                A broader view of ocean conditions, hazards and route risk for maritime assessment and operations.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================
            07 — FINAL CTA
           ======================================================== */}
        <section className="p-8 sm:p-10 rounded-2xl bg-[#0e1117] border border-[#1f2430] text-center space-y-5">
          <div className="max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Explore the Indian Ocean
            </h2>
            <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
              Open Leher to explore ocean conditions, assess locations and understand maritime risk.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <button
              onClick={() => navigateTo('/operations')}
              className="inline-flex items-center gap-2 py-3 px-8 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm transition-all shadow-[0_0_20px_rgba(6,182,212,0.25)] cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>Launch Platform</span>
              <ArrowRight className="w-4 h-4 opacity-80" />
            </button>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-[#1c1c1c] bg-[#050505] py-8 px-4 sm:px-6 lg:px-12 z-20">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono text-[#666666]">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Leher Logo" title="Leher" className="h-5 w-auto object-contain opacity-75" />
            <span>Leher • Indian Ocean Maritime Safety &amp; Hazard Intelligence</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigateTo('/')} className="hover:text-white cursor-pointer transition-colors">Home</button>
            <button onClick={() => navigateTo('/about')} className="text-neutral-200 hover:text-white cursor-pointer transition-colors">About</button>
            <button onClick={() => navigateTo('/operations')} className="hover:text-white cursor-pointer transition-colors">Explore / Platform</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AboutLeherPage;
