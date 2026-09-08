import React, { useState } from "react";

interface GlobeProps {
  className?: string;
}

const Globe: React.FC<GlobeProps> = ({ className = "" }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="relative w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] lg:w-[500px] lg:h-[500px]">
        {/* Soft Atmosphere Glow Halo */}
        <div
          className="absolute -inset-4 rounded-full bg-cyan-400/25 blur-2xl pointer-events-none transition-opacity duration-1000"
          style={{ opacity: isLoaded ? 0.85 : 0.3 }}
        />
        <div
          className="absolute inset-2 rounded-full bg-sky-500/15 blur-xl pointer-events-none transition-opacity duration-1000"
          style={{ opacity: isLoaded ? 0.7 : 0.2 }}
        />

        {/* 3D Interactive Bathymetry Globe iframe */}
        <iframe
          id="leher-globe-iframe"
          src="/globe/index.html"
          title="Leher 3D Interactive Bathymetry Globe"
          className="w-full h-full border-0 bg-transparent rounded-full relative z-10 transition-opacity duration-700 cursor-grab active:cursor-grabbing touch-none select-none"
          style={{
            opacity: isLoaded ? 1 : 0,
            background: "transparent",
            colorScheme: "dark",
            touchAction: "none",
          }}
          loading="eager"
          allow="accelerometer; autoplay; encrypted-media; gyroscope"
          onLoad={() => setIsLoaded(true)}
        />
      </div>
    </div>
  );
};

export default Globe;
