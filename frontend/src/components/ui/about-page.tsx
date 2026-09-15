import React from 'react';
import { ArrowRight, Compass } from 'lucide-react';
import AppNavbar from '@/components/ui/app-navbar';

export function AboutLeherPage() {
  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  // Reusable card style
  const cardStyle: React.CSSProperties = {
    padding: '20px',
    borderRadius: '10px',
    backgroundColor: 'rgb(var(--surface))',
    border: '1px solid rgb(var(--hairline))',
  };

  const sections = [
    {
      eyebrow: '01 / WHY LEHER',
      title: 'Understanding Ocean Conditions Should Be Easier',
      body: 'Ocean data can vary across location, depth and time. Bringing these conditions together in a single interactive view makes them easier to explore and interpret.',
      cards: [
        { num: '01', title: 'Complex Ocean Conditions', body: 'Temperature, salinity and currents change across the ocean and with depth.' },
        { num: '02', title: 'Different Sources of Information', body: 'Ocean models and instrument observations provide different views of the same environment.' },
        { num: '03', title: 'Hard to Interpret in Isolation', body: 'Users need a clear way to explore these conditions together and understand what they mean at a selected location.' },
      ],
      cols: 'grid-cols-1 md:grid-cols-3',
    },
    {
      eyebrow: '02 / EXPLORE',
      title: 'Explore the Ocean in One Place',
      body: 'Leher brings the main ocean variables and observations into an interactive 3D environment.',
      cards: [
        { num: '01', title: '3D Ocean View', body: 'Explore ocean conditions across location and depth in an interactive 3D view.' },
        { num: '02', title: 'Ocean Conditions', body: 'Inspect temperature, salinity and currents at different locations and depths.' },
        { num: '03', title: 'Depth & Time', body: 'Move through depth levels and time to see how ocean conditions change.' },
        { num: '04', title: 'Ocean Observations', body: 'Explore observations from instruments such as Argo floats and gliders.' },
        { num: '05', title: 'Location Assessment', body: 'Select a location to view its conditions and current risk status.' },
        { num: '06', title: 'Model & Observation View', body: 'Compare ocean model information with available observations at a selected location.' },
      ],
      cols: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    },
  ];

  return (
    <div
      className="min-h-screen flex flex-col font-sans"
      style={{ backgroundColor: 'rgb(var(--canvas))', color: 'rgb(var(--ink))' }}
    >
      <AppNavbar currentRoute="about" />

      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6 lg:px-12 max-w-5xl mx-auto w-full space-y-20">

        {/* ── HERO ────────────────────────────────────────────────── */}
        <section className="pt-6 sm:pt-10 text-center max-w-3xl mx-auto space-y-5">
          <p className="eyebrow" style={{ display: 'inline-block' }}>About Leher</p>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-tight" style={{ color: 'rgb(var(--ink))' }}>
            Understand the Ocean. Make Safer Decisions.
          </h1>

          <p className="text-base sm:text-lg leading-relaxed max-w-2xl mx-auto" style={{ color: 'rgb(var(--ink-muted))' }}>
            Leher is an interactive 3D ocean platform for exploring ocean conditions, assessing locations and understanding maritime risk across the Indian Ocean.
          </p>

          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => navigateTo('/operations')}
              className="inline-flex items-center gap-2 py-2.5 px-6 rounded-md brand-fill glow-brand text-black font-semibold text-sm transition-all cursor-pointer hover-lift"
            >
              <Compass className="w-4 h-4" />
              <span>Launch Platform</span>
              <ArrowRight className="w-4 h-4 opacity-80" />
            </button>
            <button
              onClick={() => navigateTo('/')}
              className="inline-flex items-center gap-2 py-2.5 px-5 rounded-md font-medium text-sm transition-all cursor-pointer hover-lift"
              style={{ backgroundColor: 'rgb(var(--surface))', color: 'rgb(var(--ink-muted))', border: '1px solid rgb(var(--hairline))' }}
            >
              <span>Back to Home</span>
            </button>
          </div>
        </section>

        {/* ── WHY / EXPLORE sections ───────────────────────────────── */}
        {sections.map((sec) => (
          <section key={sec.eyebrow} className="space-y-6">
            <div className="pb-4" style={{ borderBottom: '1px solid rgb(var(--hairline))' }}>
              <p className="eyebrow mb-1">{sec.eyebrow}</p>
              <h2 className="font-display text-2xl sm:text-3xl mt-1" style={{ color: 'rgb(var(--ink))' }}>{sec.title}</h2>
              <p className="text-sm mt-2 max-w-2xl leading-relaxed" style={{ color: 'rgb(var(--ink-muted))' }}>{sec.body}</p>
            </div>
            <div className={`grid ${sec.cols} gap-4`}>
              {sec.cards.map((card) => (
                <div key={card.num} style={cardStyle} className="space-y-2.5 hover-lift transition-all">
                  <span className="tnum text-xs block" style={{ color: 'rgb(var(--brand) / 0.7)' }}>{card.num}</span>
                  <h3 className="text-base font-medium" style={{ color: 'rgb(var(--ink))' }}>{card.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--ink-muted))' }}>{card.body}</p>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* ── MARITIME RISK ─────────────────────────────────────────── */}
        <section className="space-y-6">
          <div className="pb-4" style={{ borderBottom: '1px solid rgb(var(--hairline))' }}>
            <p className="eyebrow mb-1">03 / Maritime Risk</p>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mt-1">
              <h2 className="font-display text-2xl sm:text-3xl" style={{ color: 'rgb(var(--ink))' }}>See Where Conditions Become a Risk</h2>
              <span className="tnum text-xs font-medium" style={{ color: 'rgb(var(--brand))' }}>SAFE → CAUTION → DANGER</span>
            </div>
            <p className="text-sm mt-2 max-w-2xl leading-relaxed" style={{ color: 'rgb(var(--ink-muted))' }}>
              Leher connects ocean conditions with a clear view of maritime risk, helping users identify areas that may require attention.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'SAFE', sub: 'Nominal', color: 'rgb(var(--long))', body: 'Lower operational risk based on the available conditions.' },
              { label: 'CAUTION', sub: 'Advisory', color: 'rgb(var(--warn))', body: 'Conditions require additional attention before proceeding.' },
              { label: 'DANGER', sub: 'Warning', color: 'rgb(var(--short))', body: 'Conditions indicate elevated risk and require appropriate caution.' },
            ].map((risk) => (
              <div
                key={risk.label}
                className="p-5 rounded-lg space-y-2.5"
                style={{
                  backgroundColor: 'rgb(var(--surface))',
                  border: `1px solid ${risk.color.replace(')', ' / 0.25)')}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="tnum px-2.5 py-0.5 rounded font-bold uppercase tracking-wider"
                    style={{ fontSize: '11px', backgroundColor: risk.color.replace(')', ' / 0.12)'), color: risk.color }}
                  >
                    {risk.label}
                  </span>
                  <span className="tnum text-xs" style={{ color: risk.color }}>{risk.sub}</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--ink-muted))' }}>{risk.body}</p>
              </div>
            ))}
          </div>

          {/* Hazard cards */}
          <div className="pt-4 space-y-4">
            <h3 className="font-display text-xl" style={{ color: 'rgb(var(--ink))' }}>Maritime Hazards</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { num: '01', title: 'CYCLONE / STORM', body: 'Severe weather systems that can affect maritime movement and safety.' },
                { num: '02', title: 'STORM SURGE', body: 'Abnormal coastal water-level rise associated with severe weather.' },
                { num: '03', title: 'OCEAN CONDITIONS', body: 'Temperature, currents and other environmental conditions that can contribute to local risk.' },
              ].map((h) => (
                <div key={h.num} style={cardStyle} className="space-y-2">
                  <span className="tnum text-xs block" style={{ color: 'rgb(var(--brand) / 0.7)' }}>{h.num}</span>
                  <h4 className="text-sm font-semibold" style={{ color: 'rgb(var(--ink))' }}>{h.title}</h4>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--ink-muted))' }}>{h.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
        <section className="space-y-6">
          <div className="pb-3" style={{ borderBottom: '1px solid rgb(var(--hairline))' }}>
            <p className="eyebrow mb-1">04 / User Flow</p>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mt-1">
              <h2 className="font-display text-2xl sm:text-3xl" style={{ color: 'rgb(var(--ink))' }}>From Ocean Data to Action</h2>
              <span className="tnum text-xs" style={{ color: 'rgb(var(--brand))' }}>SEE → CLICK → UNDERSTAND → ACT</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {['SEE', 'CLICK', 'UNDERSTAND', 'ACT'].map((step, i) => (
              <div key={step} style={cardStyle} className="space-y-2.5">
                <span className="tnum text-xs font-bold block" style={{ color: 'rgb(var(--brand))' }}>STEP 0{i + 1}</span>
                <h3 className="font-display text-base" style={{ color: 'rgb(var(--ink))' }}>{step}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--ink-muted))' }}>
                  {[
                    'Explore the 3D ocean and identify an area of interest.',
                    'Select a location or hazard on the map.',
                    'Review ocean conditions, observations and risk for that location.',
                    'Use the information to respond to hazards or choose a safer route.',
                  ][i]}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── WHO IT'S FOR ─────────────────────────────────────────── */}
        <section className="space-y-6">
          <div className="pb-3" style={{ borderBottom: '1px solid rgb(var(--hairline))' }}>
            <p className="eyebrow mb-1">05 / Users</p>
            <h2 className="font-display text-2xl sm:text-3xl mt-1" style={{ color: 'rgb(var(--ink))' }}>Built for Maritime Users</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { role: 'Operational User', title: 'Fishermen', body: 'Simple information about ocean conditions, hazards and local risk to support safer decisions at sea.' },
              { role: 'Command & Surveillance', title: 'Coast Guard', body: 'A broader view of ocean conditions, hazards and route risk for maritime assessment and operations.' },
            ].map((u) => (
              <div key={u.title} style={{ ...cardStyle, padding: '24px' }} className="space-y-2.5">
                <p className="eyebrow">{u.role}</p>
                <h3 className="font-display text-xl" style={{ color: 'rgb(var(--ink))' }}>{u.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--ink-muted))' }}>{u.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────────────────────── */}
        <section
          className="p-8 sm:p-10 rounded-xl text-center space-y-5"
          style={{ backgroundColor: 'rgb(var(--surface))', border: '1px solid rgb(var(--hairline))' }}
        >
          <div className="max-w-xl mx-auto space-y-2">
            <h2 className="font-display text-2xl sm:text-3xl" style={{ color: 'rgb(var(--ink))' }}>Explore the Indian Ocean</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--ink-muted))' }}>
              Open Leher to explore ocean conditions, assess locations and understand maritime risk.
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <button
              onClick={() => navigateTo('/operations')}
              className="inline-flex items-center gap-2 py-3 px-8 rounded-md brand-fill glow-brand text-black font-semibold text-sm transition-all cursor-pointer hover-lift"
            >
              <Compass className="w-4 h-4" />
              <span>Launch Platform</span>
              <ArrowRight className="w-4 h-4 opacity-80" />
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t" style={{ borderColor: 'rgb(var(--hairline))' }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 px-4 sm:px-6 py-8">
          <div className="flex items-center gap-2.5 text-sm" style={{ color: 'rgb(var(--ink-faint))' }}>
            <img src="/logo.png" alt="Leher" className="h-5 w-auto object-contain" style={{ opacity: 0.75, filter: 'drop-shadow(0 0 4px rgb(var(--brand) / 0.3))' }} />
            <span>Leher · Indian Ocean Maritime Safety & Hazard Intelligence</span>
          </div>
          <div className="flex items-center gap-5 text-sm" style={{ color: 'rgb(var(--ink-muted))' }}>
            <button onClick={() => navigateTo('/')} className="hover:text-white cursor-pointer transition-colors">Home</button>
            <button onClick={() => navigateTo('/about')} className="cursor-pointer" style={{ color: 'rgb(var(--brand))' }}>About</button>
            <button onClick={() => navigateTo('/operations')} className="hover:text-white cursor-pointer transition-colors">Platform</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AboutLeherPage;
