import React from 'react';
import { ArrowRight, Compass, Wind, CloudRain } from 'lucide-react';
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
      {/* Dynamic Ethereal Ocean Blue Shadow Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <EtherealShadow
          color="rgba(14, 165, 233, 0.9)"
          animation={{ scale: 100, speed: 80 }}
          noise={{ opacity: 0.6, scale: 1.2 }}
          sizing="fill"
          className="w-full h-full opacity-85"
        />
        {/* Ambient deep ocean blue radial aura */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_25%,rgba(14,165,233,0.14),transparent_75%)] pointer-events-none" />
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
            01 — ABOUT LEHER (HERO)
           ======================================================== */}
        <section className="pt-8 sm:pt-14 text-center max-w-3xl mx-auto space-y-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.15]">
            Understand the Ocean. Make Safer Decisions.
          </h1>

          <div className="space-y-2 max-w-2xl mx-auto">
            <p className="text-base sm:text-lg text-neutral-300 leading-relaxed font-normal">
              Leher is an interactive 3D ocean platform for exploring ocean conditions, observations and maritime risk across the Indian Ocean.
            </p>
            <p className="text-sm sm:text-base text-neutral-400 leading-relaxed font-normal">
              It helps users move from understanding a location to identifying hazards and making informed maritime decisions.
            </p>
          </div>

          <div className="pt-3 flex flex-wrap items-center justify-center gap-4">
            <ShinyButton
              onClick={() => navigateTo('/operations')}
              className="py-2.5 px-6 text-xs sm:text-sm font-semibold shadow-lg"
            >
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Launch Platform</span>
              <ArrowRight className="w-4 h-4 opacity-80" />
            </ShinyButton>
            <SpinningBorderButton
              onClick={() => navigateTo('/')}
              hideArrow
            >
              <span>Back to Home</span>
            </SpinningBorderButton>
          </div>
        </section>

        {/* ========================================================
            02 — THE PROBLEM
           ======================================================== */}
        <section className="space-y-8 pt-4">
          <div className="border-b border-[#1c1c1c] pb-5">
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest block">
              01 / THE PROBLEM
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1.5">
              Understanding the Ocean Is Not Just About One Variable
            </h2>
            <p className="text-sm text-neutral-400 mt-2 max-w-2xl leading-relaxed">
              Ocean conditions change with location, depth and time. Different observations and environmental factors need to be understood together before a user can judge what a location means for maritime activity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <RayCard>
              <span className="text-xs font-mono text-cyan-400 block">CARD 01</span>
              <h3 className="text-base font-semibold text-white tracking-tight mt-2">
                Conditions Change
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed mt-2">
                Temperature, salinity and currents vary across location and depth.
              </p>
            </RayCard>

            <RayCard>
              <span className="text-xs font-mono text-cyan-400 block">CARD 02</span>
              <h3 className="text-base font-semibold text-white tracking-tight mt-2">
                Information Comes From Different Sources
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed mt-2">
                Ocean models and in-situ observations provide different views of the same environment.
              </p>
            </RayCard>

            <RayCard>
              <span className="text-xs font-mono text-cyan-400 block">CARD 03</span>
              <h3 className="text-base font-semibold text-white tracking-tight mt-2">
                Context Matters
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed mt-2">
                A condition becomes more useful when it can be understood for a specific location, time and surrounding risk.
              </p>
            </RayCard>
          </div>
        </section>

        {/* ========================================================
            03 — WHAT LEHER BRINGS TOGETHER
           ======================================================== */}
        <section className="space-y-8">
          <div className="border-b border-[#1c1c1c] pb-5">
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest block">
              02 / THE PLATFORM
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1.5">
              One View of the Ocean and Its Risk
            </h2>
            <p className="text-sm text-neutral-400 mt-2 max-w-2xl leading-relaxed">
              Leher brings the main information a maritime user needs into one interactive environment.
            </p>
          </div>

          {/* Connected Flow: OCEAN -> OBSERVATIONS -> LOCATION -> DECISION */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {/* Block 01 */}
            <RayCard innerClassName="p-5">
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-mono text-cyan-400 font-semibold tracking-wider">01 — OCEAN</span>
                </div>
                <h3 className="text-base font-semibold text-white">
                  Ocean Conditions
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  Explore temperature, salinity and currents across location and depth.
                </p>
              </div>
              <div className="pt-4 text-[11px] font-mono text-neutral-500 flex items-center gap-1.5">
                <span>Connects to</span>
                <span className="text-cyan-400 font-medium">→ Observations</span>
              </div>
            </RayCard>

            {/* Block 02 */}
            <RayCard innerClassName="p-5">
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-mono text-cyan-400 font-semibold tracking-wider">02 — OBSERVATIONS</span>
                </div>
                <h3 className="text-base font-semibold text-white">
                  Ocean Observations
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  View observations from instruments such as Argo floats and gliders alongside the ocean environment.
                </p>
              </div>
              <div className="pt-4 text-[11px] font-mono text-neutral-500 flex items-center gap-1.5">
                <span>Connects to</span>
                <span className="text-cyan-400 font-medium">→ Location</span>
              </div>
            </RayCard>

            {/* Block 03 */}
            <RayCard innerClassName="p-5">
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-mono text-cyan-400 font-semibold tracking-wider">03 — LOCATION</span>
                </div>
                <h3 className="text-base font-semibold text-white">
                  Location Assessment
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  Select a location to understand its conditions, observations and current risk status.
                </p>
              </div>
              <div className="pt-4 text-[11px] font-mono text-neutral-500 flex items-center gap-1.5">
                <span>Connects to</span>
                <span className="text-cyan-400 font-medium">→ Decision</span>
              </div>
            </RayCard>

            {/* Block 04 */}
            <RayCard innerClassName="p-5">
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-mono text-cyan-400 font-semibold tracking-wider">04 — DECISION</span>
                </div>
                <h3 className="text-base font-semibold text-white">
                  Maritime Decision Support
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  Use the available information to identify hazards, understand risk and support safer maritime decisions.
                </p>
              </div>
              <div className="pt-4 text-[11px] font-mono text-neutral-400 flex items-center gap-1.5">
                <span>Outcome</span>
                <span className="text-white font-medium">→ Safer Decisions</span>
              </div>
            </RayCard>
          </div>
        </section>

        {/* ========================================================
            04 — RISK & HAZARDS
           ======================================================== */}
        <section className="space-y-8">
          <div className="border-b border-[#1c1c1c] pb-5">
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest block">
              03 / MARITIME RISK
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1.5">
              Understand What Makes a Location Risky
            </h2>
            <p className="text-sm text-neutral-400 mt-2 max-w-2xl leading-relaxed">
              Leher presents environmental conditions and detected hazards in a way that helps users understand the safety status of a selected location.
            </p>
          </div>

          {/* RISK STATES */}
          <div className="space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 block">
              RISK STATES
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <RayCard innerClassName="p-5">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono text-xs font-bold w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>SAFE</span>
                </div>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed pt-2">
                  Conditions indicate lower operational risk.
                </p>
              </RayCard>

              <RayCard innerClassName="p-5">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-950/60 border border-amber-800/60 text-amber-400 font-mono text-xs font-bold w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>CAUTION</span>
                </div>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed pt-2">
                  Conditions require additional attention before proceeding.
                </p>
              </RayCard>

              <RayCard innerClassName="p-5">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-rose-950/60 border border-rose-800/60 text-rose-400 font-mono text-xs font-bold w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span>DANGER</span>
                </div>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed pt-2">
                  Conditions indicate elevated maritime risk.
                </p>
              </RayCard>
            </div>
          </div>

          {/* RISK FACTORS & HAZARDS (2-column layout) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            {/* Risk Factors */}
            <RayCard className="lg:col-span-7" innerClassName="p-6">
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-300 font-semibold block mb-3">
                WHAT CAN AFFECT RISK?
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="space-y-1">
                  <span className="font-semibold text-white block">1. Ocean Conditions</span>
                  <p className="text-neutral-400 text-xs leading-relaxed">
                    Temperature, currents and other local environmental conditions.
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="font-semibold text-white block">2. Severe Weather</span>
                  <p className="text-neutral-400 text-xs leading-relaxed">
                    Cyclone and storm conditions that can affect maritime activity.
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="font-semibold text-white block">3. Storm Surge</span>
                  <p className="text-neutral-400 text-xs leading-relaxed">
                    Abnormal coastal water-level rise associated with severe weather.
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="font-semibold text-white block">4. Local Conditions</span>
                  <p className="text-neutral-400 text-xs leading-relaxed">
                    Conditions at a selected location that may change its overall safety status.
                  </p>
                </div>
              </div>
            </RayCard>

            {/* Compact Hazards List */}
            <RayCard className="lg:col-span-5" innerClassName="p-6">
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-300 font-semibold block mb-3">
                HAZARDS
              </span>
              <div className="space-y-3.5">
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs font-mono">
                    <Wind className="w-3.5 h-3.5" />
                    <span>CYCLONE / STORM</span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Severe weather that can affect maritime movement and safety.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs font-mono">
                    <CloudRain className="w-3.5 h-3.5" />
                    <span>STORM SURGE</span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Abnormal coastal water-level rise associated with severe weather.
                  </p>
                </div>
              </div>
            </RayCard>
          </div>
        </section>

        {/* ========================================================
            05 — HOW LEHER WORKS
           ======================================================== */}
        <section className="space-y-8">
          <div className="border-b border-[#1c1c1c] pb-5">
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest block">
              04 / USER FLOW
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1.5">
              From Ocean Conditions to Action
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
            <RayCard innerClassName="p-5">
              <span className="text-xs font-mono text-cyan-400 block">STEP 01</span>
              <h3 className="text-base font-bold text-white tracking-tight mt-1">
                SEE
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed mt-2">
                Explore the 3D ocean environment and identify an area of interest.
              </p>
            </RayCard>

            <RayCard innerClassName="p-5">
              <span className="text-xs font-mono text-cyan-400 block">STEP 02</span>
              <h3 className="text-base font-bold text-white tracking-tight mt-1">
                CLICK
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed mt-2">
                Select a location or hazard on the map.
              </p>
            </RayCard>

            <RayCard innerClassName="p-5">
              <span className="text-xs font-mono text-cyan-400 block">STEP 03</span>
              <h3 className="text-base font-bold text-white tracking-tight mt-1">
                UNDERSTAND
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed mt-2">
                Review ocean conditions, observations and risk for that location.
              </p>
            </RayCard>

            <RayCard innerClassName="p-5">
              <span className="text-xs font-mono text-cyan-400 block">STEP 04</span>
              <h3 className="text-base font-bold text-white tracking-tight mt-1">
                ACT
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed mt-2">
                Use the information to respond to hazards or support a safer route decision.
              </p>
            </RayCard>
          </div>
        </section>

        {/* ========================================================
            06 — WHO IT IS FOR
           ======================================================== */}
        <section className="space-y-8">
          <div className="border-b border-[#1c1c1c] pb-5">
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest block">
              05 / USERS
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1.5">
              Designed Around Maritime Use
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RayCard innerClassName="p-6">
              <span className="text-xs font-mono text-cyan-400 font-semibold block">USER GROUP 01</span>
              <h3 className="text-lg font-bold text-white tracking-tight mt-1">
                FISHERMEN
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed mt-2">
                Quickly understand conditions, hazards and local risk before making decisions at sea.
              </p>
            </RayCard>

            <RayCard innerClassName="p-6">
              <span className="text-xs font-mono text-cyan-400 font-semibold block">USER GROUP 02</span>
              <h3 className="text-lg font-bold text-white tracking-tight mt-1">
                COAST GUARD
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed mt-2">
                Inspect ocean conditions, hazards and route risk when assessing maritime situations.
              </p>
            </RayCard>
          </div>
        </section>

        {/* ========================================================
            07 — FINAL CTA
           ======================================================== */}
        <section className="pt-4 text-center max-w-xl mx-auto space-y-5 border-t border-[#1c1c1c]">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Explore Leher
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            Explore ocean conditions, assess locations and understand maritime risk across the Indian Ocean.
          </p>

          <div className="pt-2 flex justify-center">
            <ShinyButton
              onClick={() => navigateTo('/operations')}
              className="py-3 px-8 text-sm font-semibold shadow-xl"
            >
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Launch Platform</span>
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
            <span>Leher • Indian Ocean Maritime Safety &amp; Risk Intelligence</span>
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
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AboutLeherPage;
