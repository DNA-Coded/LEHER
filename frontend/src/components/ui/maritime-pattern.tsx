import React from "react";
import { cn } from "@/lib/utils";

interface MaritimePatternProps {
  className?: string;
  opacity?: number;
}

/**
 * High-tech Maritime Navigation & Bathymetric Pattern
 * Renders on the left side and smoothly fades out before reaching the globe on the right.
 */
export function MaritimePattern({
  className,
  opacity = 0.65,
}: MaritimePatternProps) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 w-full h-full overflow-hidden select-none z-0",
        className
      )}
      style={{
        opacity,
        // Strictly masked to fade out between 35% and 60% across the screen, leaving the right side (globe) completely clear
        maskImage:
          "linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.9) 32%, rgba(0,0,0,0.2) 48%, transparent 62%)",
        WebkitMaskImage:
          "linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.9) 32%, rgba(0,0,0,0.2) 48%, transparent 62%)",
      }}
      aria-hidden="true"
    >
      {/* 1. Fine Navigation Grid with Dot Intersections */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: `
            radial-gradient(circle at 1px 1px, rgba(56, 189, 248, 0.18) 1.2px, transparent 0),
            linear-gradient(to right, rgba(56, 189, 248, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(56, 189, 248, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: "36px 36px, 144px 144px, 144px 144px",
        }}
      />

      {/* 2. Tactical Naval SVG Rings & Bathymetric Contour Arcs */}
      <svg
        className="absolute left-0 top-0 w-[70vw] h-full"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle glow filter */}
          <filter id="pattern-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="cyan-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#1d4ed8" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="wave-grad-1" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.18" />
            <stop offset="70%" stopColor="#2563eb" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#1e40af" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Concentric Maritime Radar Range Arcs centered at Left-Center (150, 480) */}
        <circle
          cx="160"
          cy="480"
          r="160"
          stroke="url(#cyan-grad)"
          strokeWidth="1"
          strokeDasharray="4 6"
        />
        <circle
          cx="160"
          cy="480"
          r="280"
          stroke="url(#cyan-grad)"
          strokeWidth="1.2"
        />
        <circle
          cx="160"
          cy="480"
          r="420"
          stroke="url(#cyan-grad)"
          strokeWidth="1"
          strokeDasharray="6 8"
        />
        <circle
          cx="160"
          cy="480"
          r="580"
          stroke="url(#cyan-grad)"
          strokeWidth="1.2"
        />
        <circle
          cx="160"
          cy="480"
          r="740"
          stroke="url(#cyan-grad)"
          strokeWidth="1"
          strokeDasharray="8 12"
        />

        {/* Tactical Crosshair Axes centered at (160, 480) */}
        <line
          x1="0"
          y1="480"
          x2="650"
          y2="480"
          stroke="rgba(56, 189, 248, 0.15)"
          strokeWidth="1"
          strokeDasharray="3 9"
        />
        <line
          x1="160"
          y1="100"
          x2="160"
          y2="860"
          stroke="rgba(56, 189, 248, 0.15)"
          strokeWidth="1"
          strokeDasharray="3 9"
        />

        {/* Navigational Angle Rays (30 deg, 60 deg, -30 deg, -60 deg) */}
        <line
          x1="160"
          y1="480"
          x2="593"
          y2="230"
          stroke="rgba(56, 189, 248, 0.08)"
          strokeWidth="1"
          strokeDasharray="2 10"
        />
        <line
          x1="160"
          y1="480"
          x2="593"
          y2="730"
          stroke="rgba(56, 189, 248, 0.08)"
          strokeWidth="1"
          strokeDasharray="2 10"
        />

        {/* Bathymetric Depth Contour Waves on the Left */}
        <path
          d="M -50 220 Q 120 180, 240 260 T 480 280 T 700 230"
          stroke="url(#wave-grad-1)"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M -50 360 Q 150 310, 300 400 T 560 410 T 750 350"
          stroke="url(#wave-grad-1)"
          strokeWidth="1.2"
          strokeDasharray="5 5"
          fill="none"
        />
        <path
          d="M -50 620 Q 140 560, 280 670 T 540 680 T 780 600"
          stroke="url(#wave-grad-1)"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M -50 780 Q 160 720, 320 810 T 580 820 T 800 760"
          stroke="url(#wave-grad-1)"
          strokeWidth="1.2"
          strokeDasharray="6 8"
          fill="none"
        />

        {/* Tactical Cross Markers at Key Coordinate Intersections */}
        {[
          { x: 160, y: 200 },
          { x: 160, y: 760 },
          { x: 440, y: 480 },
          { x: 300, y: 340 },
          { x: 300, y: 620 },
          { x: 480, y: 260 },
          { x: 480, y: 700 },
        ].map((pt, i) => (
          <g key={i} stroke="rgba(56, 189, 248, 0.28)" strokeWidth="1.2">
            <line x1={pt.x - 5} y1={pt.y} x2={pt.x + 5} y2={pt.y} />
            <line x1={pt.x} y1={pt.y - 5} x2={pt.x} y2={pt.y + 5} />
          </g>
        ))}

        {/* Faint Telemetry Coordinates in Monospace */}
        <text
          x="30"
          y="180"
          fill="rgba(56, 189, 248, 0.22)"
          fontSize="9"
          fontFamily="monospace"
          letterSpacing="2"
        >
          INCOIS • 15.4°N 71.2°E [IO-SEC-01]
        </text>
        <text
          x="30"
          y="790"
          fill="rgba(56, 189, 248, 0.22)"
          fontSize="9"
          fontFamily="monospace"
          letterSpacing="2"
        >
          BATHYMETRY CONTOUR • 2000M ISO
        </text>
        <text
          x="440"
          y="472"
          fill="rgba(56, 189, 248, 0.20)"
          fontSize="8"
          fontFamily="monospace"
        >
          150 NM
        </text>
        <text
          x="580"
          y="472"
          fill="rgba(56, 189, 248, 0.18)"
          fontSize="8"
          fontFamily="monospace"
        >
          250 NM
        </text>
      </svg>
    </div>
  );
}

export default MaritimePattern;
