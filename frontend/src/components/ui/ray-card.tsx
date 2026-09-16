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
        "bg-[radial-gradient(circle_280px_at_0%_0%,#ffffff,#0c0d0d)]",
        "hover:shadow-[0_0_25px_-5px_rgba(255,255,255,0.2)]",
        className
      )}
      {...props}
    >
      {/* Animated White Orbiting Dot */}
      <div
        className="pointer-events-none absolute z-20 w-[5px] h-[5px] rounded-full bg-[#ffffff] shadow-[0_0_10px_#ffffff,0_0_20px_#ffffff]"
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
          "relative z-10 w-full h-full rounded-[15px] border border-[#202222] overflow-hidden",
          "bg-[radial-gradient(circle_320px_at_0%_0%,#444444,#0c0d0d)]",
          "p-6 flex flex-col justify-between transition-colors text-white",
          innerClassName
        )}
      >
        {/* Soft White/Grey Ray Light Beam */}
        {showRay && (
          <div
            className="pointer-events-none absolute -top-4 -left-6 w-56 h-12 rounded-full bg-[#c7c7c7] opacity-40 blur-md rotate-[40deg] origin-[10%] shadow-[0_0_50px_#ffffff]"
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
                background: 'linear-gradient(90deg, #888888 30%, #1d1f1f 70%)'
              }}
            />
            {/* Bottom Guideline */}
            <div
              className="absolute left-0 w-full h-[1px] bg-[#2c2c2c]"
              style={{ bottom: '10%' }}
            />
            {/* Left Guideline */}
            <div
              className="absolute top-0 w-[1px] h-full"
              style={{
                left: '10%',
                background: 'linear-gradient(180deg, #747474 30%, #222424 70%)'
              }}
            />
            {/* Right Guideline */}
            <div
              className="absolute top-0 w-[1px] h-full bg-[#2c2c2c]"
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
