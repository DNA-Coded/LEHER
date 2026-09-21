import React, { useState } from 'react';
import { Database, Cpu, AlertTriangle, CheckCircle2, Info, X, Radio } from 'lucide-react';
import type { DataProvenanceInfo } from '@/lib/ocean/provenance';

interface DataProvenanceBadgeProps {
  provenance: DataProvenanceInfo;
  className?: string;
  compact?: boolean;
  align?: 'left' | 'right';
}

export const DataProvenanceBadge: React.FC<DataProvenanceBadgeProps> = ({
  provenance,
  className = '',
  compact = false,
  align = 'left',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toneConfig = {
    live: {
      bg: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/60',
      dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]',
      icon: CheckCircle2,
      badgeText: 'LIVE REANALYSIS',
    },
    simulation: {
      bg: 'bg-amber-950/40 border-amber-500/30 text-amber-300 hover:bg-amber-950/60',
      dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
      icon: Cpu,
      badgeText: 'EDGE SIMULATION',
    },
    warning: {
      bg: 'bg-rose-950/40 border-rose-500/30 text-rose-300 hover:bg-rose-950/60',
      dot: 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse',
      icon: AlertTriangle,
      badgeText: 'GRID OFFSET WARN',
    },
  }[provenance.badgeTone];

  const Icon = toneConfig.icon;

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Interactive Trigger Pill */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Click to view data provenance & model source"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono tracking-wider font-semibold transition-all duration-200 cursor-pointer shadow-sm ${toneConfig.bg}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${toneConfig.dot}`} />
        <Icon className="w-3 h-3" />
        <span>{provenance.badgeLabel}</span>
        {!compact && (
          <span className="text-[9px] opacity-70 border-l border-current/20 pl-1.5 ml-0.5">
            {provenance.oceanDataSource === 'LIVE_COPERNICUS' ? 'GLORYS' : 'PHYSICS'}
          </span>
        )}
      </button>

      {/* Detail Popover Modal / Card */}
      {isOpen && (
        <>
          {/* Backdrop for click outside */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] p-4 rounded-xl border border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-2xl z-50 text-slate-200 font-sans animate-in fade-in zoom-in-95 duration-150`}>
            {/* Header */}
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg border ${toneConfig.bg}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white tracking-wide">
                    {provenance.title}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Radio className="w-3 h-3 text-cyan-400" />
                    <span>Data Lineage & Provenance</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Description & Notice */}
            <p className="text-[11px] text-slate-300 my-3 leading-relaxed">
              {provenance.description}
            </p>

            {/* Diagnostic Table */}
            <div className="space-y-1.5 p-2.5 rounded-lg bg-black/40 border border-white/5 font-mono text-[10px]">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-400 flex items-center gap-1">
                  <Database className="w-3 h-3 text-cyan-400" /> Primary Dataset:
                </span>
                <span className="text-slate-200 font-semibold truncate max-w-[160px]" title={provenance.details.dataset}>
                  {provenance.details.dataset}
                </span>
              </div>

              <div className="flex justify-between items-center py-0.5 border-t border-white/5">
                <span className="text-slate-400 flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-indigo-400" /> ML / Math Engine:
                </span>
                <span className="text-slate-200 font-semibold truncate max-w-[160px]" title={provenance.details.engine}>
                  {provenance.details.engine}
                </span>
              </div>

              <div className="flex justify-between items-center py-0.5 border-t border-white/5">
                <span className="text-slate-400">Nearest Grid Cell:</span>
                <span className="text-cyan-300 font-semibold">{provenance.details.nearestGridPoint}</span>
              </div>

              <div className="flex justify-between items-center py-0.5 border-t border-white/5">
                <span className="text-slate-400">Spatial Snapping Offset:</span>
                <span className={provenance.isSparseOrOffset ? "text-rose-400 font-bold" : "text-emerald-400 font-semibold"}>
                  {provenance.details.snappingDistance}
                </span>
              </div>
            </div>

            {/* Status Note or Warning */}
            {provenance.details.statusNote && (
              <div className={`mt-3 p-2 rounded-lg text-[10px] leading-relaxed border flex items-start gap-2 ${
                provenance.badgeTone === 'live'
                  ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-300'
                  : provenance.badgeTone === 'warning'
                  ? 'bg-rose-950/30 border-rose-500/20 text-rose-300'
                  : 'bg-amber-950/30 border-amber-500/20 text-amber-300'
              }`}>
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{provenance.details.statusNote}</span>
              </div>
            )}

            {/* Educational Disclaimer */}
            <div className="mt-2 text-[9px] text-slate-500 text-center">
              Leher Maritime Protocol • SIH PS 26067
            </div>
          </div>
        </>
      )}
    </div>
  );
};
