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
        `}
      </style>
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="relative">
          {/* Atmosphere Glow Halo matching screenshot */}
          <div className="absolute -inset-2 rounded-full bg-cyan-400/20 blur-xl pointer-events-none" />
          
          {/* Globe Sphere with exact shadow & glow profile */}
          <div
            className="relative w-[300px] h-[300px] sm:w-[360px] sm:h-[360px] lg:w-[420px] lg:h-[420px] rounded-full overflow-hidden shadow-[0_0_50px_rgba(147,210,230,0.3),-10px_0_15px_#7dd3fc_inset,20px_4px_30px_#000000_inset,-24px_-2px_34px_#7dd3fc80_inset,250px_0_44px_#000000aa_inset]"
            style={{
              backgroundImage: "url('https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/globe.jpeg')",
              backgroundSize: "cover",
              backgroundPosition: "left center",
              animation: "earthRotate 40s linear infinite",
            }}
          >
            {/* Soft Ocean Depth Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-sky-950/20 pointer-events-none" />
          </div>
        </div>
      </div>
    </>
  );
};

export default Globe;
