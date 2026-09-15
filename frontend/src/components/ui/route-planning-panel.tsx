import React, { useState } from 'react';
import { 
  Navigation, 
  Route, 
  AlertTriangle, 
  ShieldCheck, 
  AlertOctagon, 
  Clock, 
  Anchor, 
  ArrowRight, 
  Layers, 
  CheckCircle2, 
  MapPin, 
  Compass, 
  SlidersHorizontal,
  ChevronDown,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RiskBadge } from '@/components/ui/risk-badge';
import { DEMO_ROUTE_COMPARISON, type RoutePlan, type SaferRouteComparison } from '@/lib/types/operational-types';

interface RoutePlanningPanelProps {
  routeData?: SaferRouteComparison;
  onSelectRouteView?: (view: 'original' | 'safer' | 'compare') => void;
  activeRouteView?: 'original' | 'safer' | 'compare';
}

export function RoutePlanningPanel({
  routeData = DEMO_ROUTE_COMPARISON,
  onSelectRouteView,
  activeRouteView = 'compare',
}: RoutePlanningPanelProps) {
  const [currentView, setCurrentView] = useState<'original' | 'safer' | 'compare'>(activeRouteView);
  const [selectedRoutePreset, setSelectedRoutePreset] = useState<string>('mum-koc');

  const { originalRoute, saferRoute } = routeData;

  const handleViewChange = (view: 'original' | 'safer' | 'compare') => {
    setCurrentView(view);
    if (onSelectRouteView) {
      onSelectRouteView(view);
    }
  };

  const activePlan: RoutePlan = currentView === 'safer' ? saferRoute : originalRoute;

  return (
    <div className="space-y-5 text-white">
      {/* 1. ROUTE CORRIDOR SELECTION & MODE SELECTOR */}
      <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Maritime Corridor Planning
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
            DEMONSTRATION ROUTE
          </span>
        </div>

        {/* Departure & Arrival Ports */}
        <div className="grid grid-cols-1 gap-2 text-xs">
          <div className="bg-[#181818] border border-[#282828] rounded-xl p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] text-[#888888] block font-mono">ORIGIN PORT</span>
                <span className="text-white font-mono font-semibold">{originalRoute.start.name}</span>
              </div>
            </div>
            <span className="text-[11px] font-mono text-[#666666]">
              {originalRoute.start.lat}°N, {originalRoute.start.lon}°E
            </span>
          </div>

          <div className="bg-[#181818] border border-[#282828] rounded-xl p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
              <div>
                <span className="text-[10px] text-[#888888] block font-mono">DESTINATION PORT</span>
                <span className="text-white font-mono font-semibold">{originalRoute.destination.name}</span>
              </div>
            </div>
            <span className="text-[11px] font-mono text-[#666666]">
              {originalRoute.destination.lat}°N, {originalRoute.destination.lon}°E
            </span>
          </div>
        </div>

        {/* Route View Switcher Tabs */}
        <div className="bg-[#0e0e0e] border border-[#222222] rounded-xl p-1 grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => handleViewChange('original')}
            className={cn(
              "py-1.5 px-2 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer text-center",
              currentView === 'original'
                ? "bg-rose-950/80 text-rose-300 border border-rose-800/60 shadow-sm"
                : "text-[#888888] hover:text-white hover:bg-white/[0.04]"
            )}
          >
            Direct Route
          </button>

          <button
            type="button"
            onClick={() => handleViewChange('safer')}
            className={cn(
              "py-1.5 px-2 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer text-center",
              currentView === 'safer'
                ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 shadow-sm"
                : "text-[#888888] hover:text-white hover:bg-white/[0.04]"
            )}
          >
            Safer Route
          </button>

          <button
            type="button"
            onClick={() => handleViewChange('compare')}
            className={cn(
              "py-1.5 px-2 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer text-center",
              currentView === 'compare'
                ? "bg-cyan-400 text-black font-bold shadow-sm"
                : "text-[#888888] hover:text-white hover:bg-white/[0.04]"
            )}
          >
            Compare Both
          </button>
        </div>
      </div>

      {/* 2. DANGER WARNING BANNER (WHEN DIRECT ROUTE OR DANGER DETECTED) */}
      {(currentView === 'original' || currentView === 'compare') && originalRoute.warningMessage && (
        <div className="bg-rose-950/30 border border-rose-800/60 rounded-2xl p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-mono font-bold text-rose-300 uppercase tracking-wider">
                Route Risk: Danger Area Detected Along Planned Route
              </span>
            </div>
            <RiskBadge level="DANGER" size="sm" />
          </div>
          <p className="text-rose-200/90 leading-relaxed font-sans text-xs">
            {originalRoute.warningMessage}
          </p>
        </div>
      )}

      {/* 3. SAFER ROUTE REASONING BANNER (WHEN SAFER ROUTE OR COMPARE) */}
      {(currentView === 'safer' || currentView === 'compare') && (
        <div className="bg-emerald-950/25 border border-emerald-800/50 rounded-2xl p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-mono font-bold text-emerald-300 uppercase tracking-wider">
                Safer Alternative Recommended
              </span>
            </div>
            <RiskBadge level="SAFE" size="sm" />
          </div>
          <p className="text-[#cccccc] leading-relaxed font-sans text-xs">
            {saferRoute.divergenceReason}
          </p>
        </div>
      )}

      {/* 4. DUAL ROUTE COMPARISON TABLE */}
      {currentView === 'compare' ? (
        <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#888888]">PASSAGE METRIC</span>
            <div className="flex items-center gap-6">
              <span className="text-rose-400">DIRECT</span>
              <span className="text-emerald-400">SAFER</span>
              <span className="text-cyan-400">DELTA (Δ)</span>
            </div>
          </div>

          <div className="space-y-2 text-xs font-mono">
            {/* Distance */}
            <div className="bg-[#181818] border border-[#262626] rounded-xl p-2.5 flex items-center justify-between">
              <span className="text-[#aaaaaa] font-sans">Total Distance</span>
              <div className="flex items-center gap-6">
                <span className="text-white w-14 text-right">{originalRoute.distanceNm} NM</span>
                <span className="text-white w-14 text-right font-bold">{saferRoute.distanceNm} NM</span>
                <span className="text-amber-400 w-16 text-right font-bold">+{saferRoute.distanceDeltaNm} NM</span>
              </div>
            </div>

            {/* Estimated Transit Time */}
            <div className="bg-[#181818] border border-[#262626] rounded-xl p-2.5 flex items-center justify-between">
              <span className="text-[#aaaaaa] font-sans">Transit Time (@ 15 kts)</span>
              <div className="flex items-center gap-6">
                <span className="text-white w-14 text-right">{originalRoute.estimatedHours} h</span>
                <span className="text-white w-14 text-right font-bold">{saferRoute.estimatedHours} h</span>
                <span className="text-amber-400 w-16 text-right font-bold">+{saferRoute.timeDeltaHours} h</span>
              </div>
            </div>

            {/* Overall Risk Level */}
            <div className="bg-[#181818] border border-[#262626] rounded-xl p-2.5 flex items-center justify-between">
              <span className="text-[#aaaaaa] font-sans">Hazard Exposure</span>
              <div className="flex items-center gap-4">
                <RiskBadge level="DANGER" size="sm" />
                <ArrowRight className="w-3.5 h-3.5 text-[#666666]" />
                <RiskBadge level="SAFE" size="sm" />
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[#888888] bg-[#161616] p-2.5 rounded-xl border border-[#242424] flex items-start gap-2 leading-relaxed">
            <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              Accepting +5.1% additional transit distance entirely clears the convective storm band in Sector 3.
            </span>
          </div>
        </div>
      ) : (
        /* SINGLE ROUTE SUMMARY (ORIGINAL OR SAFER) */
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-3">
            <span className="text-[10px] text-[#888888] block font-mono">TOTAL DISTANCE</span>
            <span className="text-white font-mono font-bold text-sm">
              {activePlan.distanceNm} NM
            </span>
          </div>

          <div className="bg-[#121212] border border-[#222222] rounded-xl p-3">
            <span className="text-[10px] text-[#888888] block font-mono">TRANSIT TIME</span>
            <span className="text-white font-mono font-bold text-sm">
              {activePlan.estimatedHours} hrs
            </span>
          </div>

          <div className="bg-[#121212] border border-[#222222] rounded-xl p-3">
            <span className="text-[10px] text-[#888888] block font-mono">RISK STATUS</span>
            <div className="mt-0.5">
              <RiskBadge level={activePlan.overallRisk} size="sm" />
            </div>
          </div>
        </div>
      )}

      {/* 5. SECTION-BY-SECTION RISK BREAKDOWN */}
      <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[#888888] font-bold uppercase tracking-wider">
            {currentView === 'safer' ? 'Safer Passage Breakdown' : 'Sector Risk Breakdown'}
          </span>
          <span className="text-cyan-400">
            {activePlan.sections.length} SECTORS
          </span>
        </div>

        <div className="space-y-2">
          {activePlan.sections.map((section, idx) => (
            <div
              key={section.id}
              className={cn(
                "p-3 rounded-xl border transition-colors",
                section.risk === 'DANGER'
                  ? "bg-rose-950/20 border-rose-800/40"
                  : section.risk === 'CAUTION'
                  ? "bg-amber-950/20 border-amber-800/40"
                  : "bg-[#181818] border-[#262626]"
              )}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="font-mono font-semibold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-white/10 text-center text-[10px] flex items-center justify-center text-[#aaaaaa]">
                    {idx + 1}
                  </span>
                  <span>{section.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px]">
                  <span className="text-[#888888]">{section.distanceRange}</span>
                  <RiskBadge level={section.risk} size="sm" />
                </div>
              </div>
              <p className="text-[11px] text-[#aaaaaa] leading-relaxed pl-7">
                {section.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 6. WAYPOINTS ACCORDION & GPX EXPORT */}
      <div className="bg-[#121212] border border-[#222222] rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[#888888]">WAYPOINTS ({activePlan.waypoints.length})</span>
          <span className="text-cyan-400 font-medium">PASSAGE TRACK</span>
        </div>

        <div className="grid grid-cols-1 gap-1 text-[11px] font-mono">
          {activePlan.waypoints.map((wp, i) => (
            <div key={i} className="flex items-center justify-between py-1 px-2 rounded bg-[#161616] text-[#aaaaaa]">
              <span className="text-white">{wp.name}</span>
              <span className="text-[#777777]">{wp.lat}°N, {wp.lon}°E</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RoutePlanningPanel;
