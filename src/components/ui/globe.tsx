import React, { useState } from "react";

interface GlobeProps {
  className?: string;
}

const Globe: React.FC<GlobeProps> = ({ className = "" }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="relative w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] lg:w-[500px] lg:h-[500px]">
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
