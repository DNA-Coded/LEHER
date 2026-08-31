import React from "react";

const Globe: React.FC = () => {
  return (
    <>
      <style>
        {`
          @keyframes earthRotate {
            0% { background-position: 0 0; }
            100% { background-position: 500px 0; }
          }
          @keyframes oceanPulse {
            0%, 100% { transform: scale(1); opacity: 0.6; }
            50% { transform: scale(1.08); opacity: 0.9; }
          }
          @keyframes floatBeacon {
            0%, 100% { opacity: 0.3; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.4); }
          }
          @keyframes twinkling { 0%,100% { opacity:0.15; } 50% { opacity:0.8; } }
        `}
      </style>
      <div className="flex items-center justify-center min-h-[300px]">
        {/* Outer Oceanic Atmosphere Ring */}
        <div className="relative group">
          <div 
            className="absolute -inset-6 rounded-full bg-cyan-500/10 blur-xl transition-all duration-700 group-hover:bg-cyan-500/20"
            style={{ animation: "oceanPulse 6s ease-in-out infinite" }}
          />
          <div className="absolute -inset-2 rounded-full border border-cyan-500/20 pointer-events-none animate-spin-slow" />
          
          {/* Main 3D Globe Sphere */}
          <div
            className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] lg:w-[360px] lg:h-[360px] rounded-full overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.25),-10px_0_15px_#38bdf8_inset,20px_4px_30px_#020617_inset,-30px_-4px_40px_#06b6d480_inset,280px_0_50px_#02061799_inset]"
            style={{
              backgroundImage: "url('https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/globe.jpeg')",
              backgroundSize: "cover",
              backgroundPosition: "left center",
              animation: "earthRotate 40s linear infinite",
            }}
          >
            {/* Atmospheric Overlay Layer */}
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/40 via-transparent to-blue-900/30 pointer-events-none mix-blend-overlay" />
            
            {/* Simulated Argo Float Data Points */}
            <div 
              className="absolute top-[35%] left-[45%] w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_8px_#38bdf8]"
              style={{ animation: "floatBeacon 2.5s infinite" }}
              title="Argo Float #2902345 (Arabian Sea)"
            />
            <div 
              className="absolute top-[48%] left-[65%] w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_8px_#34d399]"
              style={{ animation: "floatBeacon 3s infinite 0.7s" }}
              title="Glider SG639 (Bay of Bengal)"
            />
            <div 
              className="absolute top-[60%] left-[30%] w-1.5 h-1.5 bg-sky-300 rounded-full shadow-[0_0_6px_#7dd3fc]"
              style={{ animation: "floatBeacon 2s infinite 1.2s" }}
              title="CTD Station 14 (Equatorial Indian Ocean)"
            />

            {/* Depth Line Overlay */}
            <div className="absolute inset-0 border border-cyan-400/10 rounded-full pointer-events-none" />
          </div>

          {/* Orbit Indicator Ring */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-3 rounded-full bg-cyan-500/10 blur-md pointer-events-none" />
        </div>
      </div>
    </>
  );
};

export default Globe;
