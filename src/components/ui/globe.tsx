import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Sphere, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { latLonToVector3 } from "@/lib/coordinates";
import { BathymetryLayer } from "./BathymetryLayer";
import { BathymetryLegend } from "./BathymetryLegend";

const Earth = () => {
  const texture = useTexture('/globe.jpeg');
  texture.colorSpace = THREE.SRGBColorSpace;
  
  return (
    // Rotate by -PI/2 so the center of the texture (U=0.5, originally at +X) 
    // aligns with the mathematical +Z axis (Prime Meridian).
    <group rotation={[0, -Math.PI / 2, 0]}>
      <Sphere args={[1, 64, 64]}>
        <meshStandardMaterial map={texture} />
      </Sphere>
    </group>
  );
};

const ValidationMarker = ({ lat, lon }: { lat: number, lon: number }) => {
  const pos = latLonToVector3(lat, lon, 1.01); // Slightly above the surface
  return (
    <mesh position={pos}>
      <sphereGeometry args={[0.02, 16, 16]} />
      <meshBasicMaterial color="#ff0044" />
    </mesh>
  );
};

const Globe: React.FC = () => {
  // Set initial camera position looking exactly over the Arabian Sea
  const initialCameraPos = latLonToVector3(15.4, 71.2, 2.5);

  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="relative">
        <div className="absolute -inset-2 rounded-full bg-cyan-400/20 blur-xl pointer-events-none" />
        
        <div className="relative w-[300px] h-[300px] sm:w-[360px] sm:h-[360px] lg:w-[420px] lg:h-[420px] rounded-full overflow-hidden shadow-[0_0_50px_rgba(147,210,230,0.3),-10px_0_15px_#7dd3fc_inset,20px_4px_30px_#000000_inset,-24px_-2px_34px_#7dd3fc80_inset,250px_0_44px_#000000aa_inset]">
          
          <Canvas
            className="w-full h-full pointer-events-auto"
            camera={{ position: initialCameraPos, fov: 45 }}
          >
            <ambientLight intensity={1.5} />
            <directionalLight position={[5, 3, 5]} intensity={1.5} />
            
            <Suspense fallback={null}>
              <group>
                <Earth />
                <BathymetryLayer />
                <ValidationMarker lat={15.4} lon={71.2} />
              </group>
            </Suspense>

            <OrbitControls 
              enablePan={false}
              enableZoom={true}
              minDistance={1.2}
              maxDistance={5}
              autoRotate={false}
            />
          </Canvas>

          <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-sky-950/20 pointer-events-none" />
        </div>
        
        {/* Bathymetry Depth Legend Overlay */}
        <div className="absolute -right-8 -bottom-8 pointer-events-auto">
          <BathymetryLegend />
        </div>
      </div>
    </div>
  );
};

export default Globe;
