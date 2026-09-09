import * as React from "react";

export type SpinningBorderButtonProps =
  React.ButtonHTMLAttributes<HTMLButtonElement>;

export const SpinningBorderButton = React.forwardRef<
  HTMLButtonElement,
  SpinningBorderButtonProps
>(function SpinningBorderButton(
  { children = "Request Demo", className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={
        "group inline-flex overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_25px_rgba(56,189,248,0.35)] rounded-full pt-[1px] pr-[1px] pb-[1px] pl-[1px] relative items-center justify-center cursor-pointer" +
        (className ? " " + className : "")
      }
      {...props}
    >
      {/* Spinning Border Beam (Visible on Hover - Light Sky Blue) */}
      <span className="absolute inset-[-100%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_75%,#38bdf8_100%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Default Static Border */}
      <span className="absolute inset-0 rounded-full bg-zinc-800 transition-opacity duration-300 group-hover:opacity-0" />

      {/* 3D Button Surface & Content with Light Sky Inset Shadow */}
      <span className="flex items-center justify-center gap-2 uppercase transition-colors duration-300 group-hover:text-sky-200 text-xs font-medium text-zinc-400 tracking-widest bg-gradient-to-b from-zinc-800 to-zinc-950 w-full h-full rounded-full pt-2.5 pr-6 pb-2.5 pl-6 relative shadow-[inset_0_1px_0_rgba(56,189,248,0.45)]">
        <span className="relative z-10">{children}</span>
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
          className="relative z-10 transition-transform duration-300 group-hover:translate-x-0.5"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </span>
    </button>
  );
});

export default SpinningBorderButton;
