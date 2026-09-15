"use client";

import React, { useState } from "react";
import { LazyMotion, domAnimation, m } from "motion/react";

export interface StepPopup {
  headline: string;
  details: string[];
  tag: string;
  statusText?: string;
}

export interface Step {
  title: string;
  description: string;
  colorTheme?: "orange" | "blue" | "purple" | "cyan" | "sky" | "indigo" | "teal";
  colors?: {
    bg: string;
    text: string;
    border: string;
  };
  popup?: StepPopup;
}

export interface StepPosition {
  className?: string;
  rotate?: string;
  popupPosition?: "top-left" | "top-right";
}

interface CardProps {
  number: string;
  title: string;
  description: string;
  colorTheme?: "orange" | "blue" | "purple" | "cyan" | "sky" | "indigo" | "teal";
  className?: string;
  rotate?: string;
  cardWidthClass?: string;
  popupPosition?: "top-left" | "top-right";
  popup?: StepPopup;
  colors?: {
    bg: string;
    text: string;
    border: string;
  };
}

const Pin = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M16 3a1 1 0 0 1 .117 1.993l-.117 .007v4.764l1.894 3.789a1 1 0 0 1 .1 .331l.006 .116v2a1 1 0 0 1 -.883 .993l-.117 .007h-4v4a1 1 0 0 1 -1.993 .117l-.007 -.117v-4h-4a1 1 0 0 1 -.993 -.883l-.007 -.117v-2a1 1 0 0 1 .06 -.34l.046 -.107l1.894 -3.791v-4.762a1 1 0 0 1 -.117 -1.993l.117 -.007h8z" />
  </svg>
);

const Card = ({
  number,
  title,
  description,
  colorTheme = "blue",
  className,
  rotate,
  cardWidthClass,
  popupPosition = "top-left",
  popup,
  colors: customColors,
}: CardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const defaultBgColors: Record<string, string> = {
    orange: "bg-orange-50 dark:bg-orange-500/10",
    blue: "bg-blue-50 dark:bg-blue-500/10",
    purple: "bg-purple-50 dark:bg-purple-500/10",
    cyan: "bg-cyan-50 dark:bg-cyan-500/10",
    sky: "bg-sky-50 dark:bg-sky-500/10",
    indigo: "bg-indigo-50 dark:bg-indigo-500/10",
    teal: "bg-teal-50 dark:bg-teal-500/10",
  };
  const defaultTextColors: Record<string, string> = {
    orange: "text-orange-500 dark:text-orange-400",
    blue: "text-blue-600 dark:text-blue-400",
    purple: "text-purple-600 dark:text-purple-400",
    cyan: "text-cyan-500 dark:text-cyan-400",
    sky: "text-sky-500 dark:text-sky-400",
    indigo: "text-indigo-500 dark:text-indigo-400",
    teal: "text-teal-500 dark:text-teal-400",
  };
  const defaultBorderColors: Record<string, string> = {
    orange: "border-orange-100 dark:border-orange-500/20",
    blue: "border-blue-100 dark:border-blue-500/20",
    purple: "border-purple-100 dark:border-purple-500/20",
    cyan: "border-cyan-100 dark:border-cyan-500/20",
    sky: "border-sky-100 dark:border-sky-500/20",
    indigo: "border-indigo-100 dark:border-indigo-500/20",
    teal: "border-teal-100 dark:border-teal-500/20",
  };

  const bgColor = customColors?.bg || defaultBgColors[colorTheme] || defaultBgColors.blue;
  const textColor = customColors?.text || defaultTextColors[colorTheme] || defaultTextColors.blue;
  const borderColor = customColors?.border || defaultBorderColors[colorTheme] || defaultBorderColors.blue;
  const widthClass = cardWidthClass || "w-full md:w-[260px]";

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setIsHovered((prev) => !prev)}
      className={`relative ${widthClass} transition-all duration-300 ${rotate || ""} ${className || ""} ${
        isHovered ? "z-[60] scale-105" : "z-20"
      } cursor-pointer group`}
    >
      <div className="bg-[#0e1117] dark:bg-neutral-900 p-2.5 rounded-[25px] shadow-[0px_12px_28px_rgba(0,0,0,0.65)] border border-white/10 group-hover:border-cyan-400/50 transition-colors">
        <Pin className={`w-8 h-8 ${textColor} z-20 mb-3 mx-auto group-hover:animate-bounce`} />
        <div
          className={`${bgColor} border ${borderColor} rounded-[15px] p-[15px] h-full flex flex-col relative overflow-hidden`}
        >
          <span
            className={`${textColor} text-3xl sm:text-4xl font-handwriting mb-2.5`}
            style={{
              fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif',
            }}
          >
            {number}
          </span>
          <h3 className="text-xl sm:text-2xl font-semibold text-neutral-100 leading-tight mb-2">
            {title}
          </h3>
          <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed tracking-tight">
            {description}
          </p>
        </div>
      </div>

      {/* Interactive Hover Popup positioned below the card in the generous vertical gap */}
      {popup && (
        <div
          className={`absolute z-[100] w-[270px] sm:w-[290px] p-3.5 rounded-2xl bg-[#080d16]/95 backdrop-blur-2xl border border-cyan-400/50 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(6,182,212,0.25)] transition-all duration-300 pointer-events-none top-full mt-3 ${
            popupPosition === "top-right" ? "right-0" : "left-0"
          } ${
            isHovered
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 pointer-events-none -translate-y-2"
          }`}
        >
          {/* Caret arrow pointing UP to card */}
          <div
            className={`absolute -top-1.5 w-3 h-3 bg-[#080d16] border-l border-t border-cyan-400/50 rotate-45 ${
              popupPosition === "top-right" ? "right-8" : "left-8"
            }`}
          />

          <div className="space-y-2 text-left">
            <h4 className="text-sm font-bold text-white tracking-tight">
              {popup.headline}
            </h4>

            <ul className="space-y-1 pt-0.5">
              {popup.details.map((point, idx) => (
                <li key={idx} className="text-xs text-neutral-300 flex items-start gap-1.5 leading-snug">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export interface HowItWorksProps {
  features?: Step[];
  className?: string;
  stepPositions?: StepPosition[];
  align?: "center" | "left";
}

const DEFAULT_CARD_POSITIONS: StepPosition[] = [
  { className: "md:absolute md:top-0 md:left-[15%]", rotate: "rotate-8", popupPosition: "top-left" },
  {
    className: "md:absolute md:top-[120px] md:right-[15%]",
    rotate: "-rotate-8",
    popupPosition: "top-right",
  },
  { className: "md:absolute md:top-[450px] md:left-[15%]", rotate: "rotate-8", popupPosition: "top-left" },
  {
    className: "md:absolute md:top-[570px] md:right-[10%]",
    rotate: "-rotate-8",
    popupPosition: "top-right",
  },
  { className: "md:absolute md:top-[850px] md:left-[15%]", rotate: "rotate-8", popupPosition: "top-left" },
];

const LEFT_ALIGNED_POSITIONS: StepPosition[] = [
  { className: "md:absolute md:top-[30px] md:left-0", rotate: "rotate-3", popupPosition: "top-left" },
  { className: "md:absolute md:top-[180px] md:right-0", rotate: "-rotate-3", popupPosition: "top-right" },
  { className: "md:absolute md:top-[480px] md:left-0", rotate: "rotate-3", popupPosition: "top-left" },
  { className: "md:absolute md:top-[630px] md:right-0", rotate: "-rotate-3", popupPosition: "top-right" },
];

export default function HowItWorks({
  features,
  className,
  stepPositions,
  align = "center",
}: HowItWorksProps) {
  const defaultFeatures: Step[] = [
    {
      title: "Explore Ocean",
      description:
        "Observe dynamic currents, wave fields, and thermal gradients across the 3D Indian Ocean globe.",
      colorTheme: "cyan",
      popup: {
        tag: "3D BASIN TELEMETRY",
        headline: "Live Ocean Environment",
        statusText: "Active Stream",
        details: [
          "Real-time sea surface temperature layers",
          "High-resolution hydrodynamic current vectors",
          "Subsurface salinity & density gradients"
        ]
      }
    },
    {
      title: "Select Location",
      description:
        "Click anywhere on the interactive map or specify GPS coordinates and transit depth layers.",
      colorTheme: "sky",
      popup: {
        tag: "COORDINATE INSPECTOR",
        headline: "Target Inspection & Locking",
        statusText: "Point-Specific",
        details: [
          "Click anywhere on map to lock GPS coordinates",
          "Inspect depth layers from 0m to 2000m",
          "Auto-detect vessel location via GPS"
        ]
      }
    },
    {
      title: "Assess Risk",
      description:
        "Review standardized CMEMS telemetry and multi-sensory risk levels (SAFE, CAUTION, DANGER).",
      colorTheme: "blue",
      popup: {
        tag: "SAFETY INDEXING",
        headline: "Standardized Risk Triad",
        statusText: "CMEMS Analysis",
        details: [
          "SAFE: Nominal conditions for standard transit",
          "CAUTION: Rising swell or currents; watchkeeping",
          "DANGER: Severe squalls or hazards; sheltering"
        ]
      }
    },
    {
      title: "Safer Action",
      description:
        "Identify maritime hazards, adjust voyage departure windows, and execute safer navigational routes.",
      colorTheme: "indigo",
      popup: {
        tag: "DECISION SUPPORT",
        headline: "Operational Route Decision",
        statusText: "Safer Trajectory",
        details: [
          "Compare planned route risk against alternatives",
          "Identify severe storms and maritime hazards",
          "Determine safer departure and transit windows"
        ]
      }
    },
  ];

  const data = features && features.length > 0 ? features : defaultFeatures;
  const isLeft = align === "left";
  const positions = stepPositions || (isLeft ? LEFT_ALIGNED_POSITIONS : DEFAULT_CARD_POSITIONS);

  let height = 1130;
  if (isLeft) {
    height = data.length <= 2 ? 450 : data.length === 3 ? 750 : 1080;
  } else {
    if (data.length === 1) height = 400;
    else if (data.length === 2) height = 450;
    else if (data.length === 3) height = 800;
    else if (data.length === 4) height = 900;
    else height = 1130;
  }

  const containerMaxWidth = isLeft ? "max-w-[640px]" : "max-w-[1000px]";
  const cardWidthClass = isLeft ? "w-full md:w-[260px]" : "w-full md:w-[280px]";

  return (
    <LazyMotion features={domAnimation}>
      <div
        className={`bg-transparent ${isLeft ? "p-0" : "px-8 md:py-20 max-md:pt-10 max-md:pb-25"} relative ${className || ""}`}
      >
        <div className="w-full relative z-10">
          <div
            className={`relative w-full ${containerMaxWidth} ${isLeft ? "" : "mx-auto"} flex flex-col space-y-8 md:space-y-0 md:block h-auto md:h-[var(--md-height)]`}
            style={{ "--md-height": `${height}px` } as React.CSSProperties}
          >
            {data.length > 1 && (
              <svg
                className="absolute top-0 left-0 w-full h-full pointer-events-none hidden md:block z-0"
                viewBox={isLeft ? `0 0 640 ${height}` : `0 0 1000 ${height}`}
                preserveAspectRatio="none"
              >
                {(() => {
                  let pathD = "";
                  if (isLeft) {
                    // S-curve connecting card centers in the left half
                    pathD = data.reduce((acc, _, index) => {
                      if (index >= data.length - 1) return acc;
                      if (index === 0)
                        return "M 130 170 C 320 170, 320 320, 510 320"; // Card 1 -> Card 2
                      if (index === 1)
                        return acc + " C 510 470, 130 470, 130 620"; // Card 2 -> Card 3
                      if (index === 2)
                        return acc + " C 320 620, 320 770, 510 770"; // Card 3 -> Card 4
                      return acc;
                    }, "");
                  } else {
                    pathD = data.reduce((acc, _, index) => {
                      if (index >= data.length - 1) return acc;
                      if (index === 0)
                        return "M 290 150 C 500 150, 550 270, 710 270";
                      if (index === 1)
                        return acc + " C 850 270, 500 350, 290 450";
                      if (index === 2)
                        return acc + " C 290 600, 550 720, 750 720";
                      if (index === 3)
                        return acc + " C 950 720, 500 800, 290 850";
                      return acc;
                    }, "");
                  }

                  return (
                    <m.path
                      d={pathD}
                      stroke="currentColor"
                      className="text-cyan-500/40 dark:text-cyan-500/30"
                      strokeWidth="2.5"
                      strokeDasharray="8 6"
                      fill="none"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                      initial={{ strokeDashoffset: 0 }}
                      animate={{
                        strokeDashoffset: -140,
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                  );
                })()}
              </svg>
            )}

            {data.map((step, index) => {
              const position = positions[index % positions.length];

              return (
                <Card
                  key={step.title}
                  number={`0${index + 1}`}
                  title={step.title}
                  description={step.description}
                  colorTheme={step.colorTheme || "blue"}
                  colors={step.colors}
                  rotate={position.rotate}
                  cardWidthClass={cardWidthClass}
                  popupPosition={position.popupPosition}
                  popup={step.popup}
                  className={position.className}
                />
              );
            })}
          </div>
        </div>
      </div>
    </LazyMotion>
  );
}
