import React from 'react';
import { cn } from '@/lib/utils';

export interface RayCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  showRay?: boolean;
  showLines?: boolean;
}

export function RayCard({
  children,
  className,
  innerClassName,
  showRay = true,
  showLines = true,
  ...props
}: RayCardProps) {
  return (
    <div
      className={cn(
        "group relative rounded-2xl p-[1px] transition-all duration-300",
        "bg-[radial-gradient(circle_300px_at_0%_0%,rgba(56,189,248,0.5),rgba(14,165,233,0.18)_50%,rgba(15,23,42,0.6)_85%,rgba(8,10,14,0.9)_100%)]",
        "hover:shadow-[0_0_25px_-5px_rgba(56,189,248,0.25)]",
        className
      )}
      {...props}
    >
      {/* Animated Light Sky Orbiting Dot */}
      <div
        className="pointer-events-none absolute z-20 w-[5px] h-[5px] rounded-full bg-[#38bdf8] shadow-[0_0_10px_#38bdf8,0_0_20px_#0284c7]"
        style={{
          animation: 'moveDot 6s linear infinite',
          right: '10%',
          top: '10%'
        }}
        aria-hidden="true"
      />

      {/* Inner Card */}
      <div
        className={cn(
          "relative z-10 w-full h-full rounded-[15px] border border-[#1e293b]/70 overflow-hidden",
          "bg-[radial-gradient(circle_320px_at_0%_0%,rgba(14,165,233,0.12),#0c0e12_65%,#08090b_100%)]",
          "p-6 flex flex-col justify-between transition-colors",
          innerClassName
        )}
      >
        {/* Light Sky Ray Light Beam */}
        {showRay && (
          <div
            className="pointer-events-none absolute -top-4 -left-6 w-56 h-12 rounded-full bg-[#38bdf8] opacity-25 blur-xl rotate-[40deg] origin-[10%] shadow-[0_0_45px_#38bdf8]"
            aria-hidden="true"
          />
        )}

        {/* Technical Grid Guideline Crosshairs */}
        {showLines && (
          <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
            {/* Top Guideline */}
            <div
              className="absolute left-0 w-full h-[1px]"
              style={{
                top: '10%',
                background: 'linear-gradient(90deg, rgba(56,189,248,0.4) 15%, rgba(30,41,59,0.2) 70%)'
              }}
            />
            {/* Bottom Guideline */}
            <div
              className="absolute left-0 w-full h-[1px] bg-[#1e293b]/30"
              style={{ bottom: '10%' }}
            />
            {/* Left Guideline */}
            <div
              className="absolute top-0 w-[1px] h-full"
              style={{
                left: '10%',
                background: 'linear-gradient(180deg, rgba(56,189,248,0.4) 15%, rgba(30,41,59,0.2) 70%)'
              }}
            />
            {/* Right Guideline */}
            <div
              className="absolute top-0 w-[1px] h-full bg-[#1e293b]/30"
              style={{ right: '10%' }}
            />
          </div>
        )}

        {/* Card Content */}
        <div className="relative z-10 w-full h-full flex flex-col justify-between">
          {children}
        </div>
      </div>
    </div>
  );
}

export default RayCard;
