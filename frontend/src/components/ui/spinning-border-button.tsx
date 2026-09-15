import * as React from "react";
import { cn } from "@/lib/utils";

export interface SpinningBorderButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  hideArrow?: boolean;
}

export const SpinningBorderButton = React.forwardRef<
  HTMLButtonElement,
  SpinningBorderButtonProps
>(function SpinningBorderButton(
  { children = "Request Demo", className, hideArrow = false, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "group inline-flex overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_25px_rgba(56,189,248,0.35)] rounded-full p-[1px] relative items-center justify-center cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:hover:translate-y-0 disabled:hover:shadow-none",
        className
      )}
      {...props}
    >
      {/* Spinning Border Beam (Visible on Hover - Light Sky Blue) */}
      <span className="absolute inset-[-100%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_75%,#38bdf8_100%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />

      {/* Default Static Border */}
      <span className="absolute inset-0 rounded-full bg-zinc-800 transition-opacity duration-300 group-hover:opacity-0 pointer-events-none" />

      {/* 3D Button Surface & Content with Light Sky Inset Shadow */}
      <span className="flex items-center justify-center gap-2 uppercase transition-colors duration-300 group-hover:text-sky-200 text-xs font-medium text-zinc-400 tracking-widest bg-gradient-to-b from-zinc-800 to-zinc-950 w-full h-full rounded-full py-2.5 px-6 relative shadow-[inset_0_1px_0_rgba(56,189,248,0.45)]">
        <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
        {!hideArrow && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="relative z-10 transition-transform duration-300 group-hover:translate-x-0.5 shrink-0"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        )}
      </span>
    </button>
  );
});

export default SpinningBorderButton;
