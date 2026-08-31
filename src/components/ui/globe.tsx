import React from "react";

const Globe: React.FC = () => {
  return (
    <>
      <style>
        {`
          @keyframes earthRotate {
            0% { background-position: 0 0; }
            100% { background-position: 450px 0; }
          }
          @keyframes subtlePulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.8; }
          }
        `}
      </style>
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="relative">
          {/* Subtle Outer Atmosphere Glow */}
          <div className="absolute -inset-4 rounded-full bg-cyan-500/10 blur-xl pointer-events-none" />
          
          {/* Main 3D Globe Sphere (Clean Earth Visual) */}
          <div
            className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] lg:w-[380px] lg:h-[380px] rounded-full overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.2),-8px_0_12px_#38bdf8_inset,15px_3px_25px_#020617_inset,-20px_-3px_30px_#06b6d460_inset,250px_0_40px_#020617aa_inset]"
            style={{
              backgroundImage: "url('https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/globe.jpeg')",
              backgroundSize: "cover",
              backgroundPosition: "left center",
              animation: "earthRotate 36s linear infinite",
            }}
          >
            {/* Soft Ocean Ambient Shading */}
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/60 via-transparent to-sky-950/20 pointer-events-none mix-blend-multiply" />
            
            {/* Subtle Data Station Indicators */}
            <div 
              className="absolute top-[38%] left-[46%] w-1.5 h-1.5 bg-cyan-300 rounded-full shadow-[0_0_6px_#38bdf8]"
              style={{ animation: "subtlePulse 3s ease-in-out infinite" }}
              title="Argo Station (Arabian Sea)"
            />
            <div 
              className="absolute top-[52%] left-[64%] w-1.5 h-1.5 bg-sky-300 rounded-full shadow-[0_0_6px_#7dd3fc]"
              style={{ animation: "subtlePulse 3s ease-in-out infinite 1s" }}
              title="Glider Transect (Bay of Bengal)"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default Globe;
