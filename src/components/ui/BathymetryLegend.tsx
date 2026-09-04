import React from 'react';

export const BathymetryLegend: React.FC = () => {
  return (
    <div className="p-4 rounded-xl bg-[#0a0a0a]/80 backdrop-blur-md border border-[#222222] shadow-2xl flex flex-col gap-2 min-w-[200px]">
      <div className="text-[10px] font-mono text-[#888888] uppercase tracking-wider mb-1">
        Bathymetry Depth
      </div>
      
      {/* Gradient Bar: Deep to Shallow */}
      <div 
        className="h-3 w-full rounded-full border border-white/10" 
        style={{ background: 'linear-gradient(to right, #03045e, #48cae4)' }}
      />
      
      {/* Labels */}
      <div className="flex justify-between text-xs font-mono text-[#cccccc]">
        <span>-6000m</span>
        <span>0m</span>
      </div>
    </div>
  );
};
