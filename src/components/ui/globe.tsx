import React, { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Sphere, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { latLonToVector3, vector3ToLatLon } from "@/lib/coordinates";
import { oceanDataService } from "@/lib/api/oceanDataService";
import type { DeepOceanPrediction } from "@/lib/api/types";

interface EarthProps {
  onGlobeClick: (lat: number, lon: number) => void;
}

const Earth: React.FC<EarthProps> = ({ onGlobeClick }) => {
  const texture = useTexture('/globe.jpeg');
  texture.colorSpace = THREE.SRGBColorSpace;
  
  return (
    // Rotate by -PI/2 so the center of the texture (U=0.5, originally at +X) 
    // aligns with the mathematical +Z axis (Prime Meridian).
    <group rotation={[0, -Math.PI / 2, 0]}>
      <Sphere 
        args={[1, 64, 64]} 
        onClick={(e) => {
          e.stopPropagation();
          const { lat, lon } = vector3ToLatLon(e.point);
          onGlobeClick(lat, lon);
        }}
      >
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

  const [selectedPoint, setSelectedPoint] = useState<{lat: number, lon: number} | null>(null);
  const [depthInput, setDepthInput] = useState<string>("1000");
  const [prediction, setPrediction] = useState<DeepOceanPrediction | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGlobeClick = (lat: number, lon: number) => {
    setSelectedPoint({ lat, lon });
    setPrediction(null);
    setError(null);
  };

  const handlePredict = async () => {
    if (!selectedPoint) return;
    const depthVal = parseFloat(depthInput);
    if (isNaN(depthVal)) {
      setError("Invalid depth");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await oceanDataService.predictDeepOcean(
        selectedPoint.lat,
        selectedPoint.lon,
        depthVal
      );
      setPrediction(response.data);
    } catch (err: any) {
      setError(err.message || "Prediction failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4">
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
                  <Earth onGlobeClick={handleGlobeClick} />
                  {selectedPoint && (
                    <ValidationMarker lat={selectedPoint.lat} lon={selectedPoint.lon} />
                  )}
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
        </div>
      </div>

      {selectedPoint && (
        <div className="bg-slate-900/80 backdrop-blur border border-sky-500/30 p-4 rounded-xl text-white max-w-md w-full">
          <h3 className="text-lg font-bold text-sky-400 mb-2">Deep Ocean ML Prediction</h3>
          <p className="text-sm text-slate-300 mb-4">
            Location: {selectedPoint.lat.toFixed(2)}°N, {selectedPoint.lon.toFixed(2)}°E
          </p>
          
          <div className="flex gap-2 items-end mb-4">
            <div className="flex-1">
              <label className="block text-xs text-sky-300 mb-1">Depth (m)</label>
              <input 
                type="number" 
                value={depthInput}
                onChange={(e) => setDepthInput(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <button 
              onClick={handlePredict}
              disabled={isLoading}
              className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded font-medium disabled:opacity-50"
            >
              {isLoading ? "Predicting..." : "Predict"}
            </button>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-2 rounded text-sm mb-4">
              {error}
            </div>
          )}

          {prediction && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-slate-800/50 p-3 rounded">
                <div className="text-xs text-slate-400">Temperature</div>
                <div className="font-mono text-xl text-orange-400">{prediction.thetao.toFixed(2)}°C</div>
              </div>
              <div className="bg-slate-800/50 p-3 rounded">
                <div className="text-xs text-slate-400">Salinity</div>
                <div className="font-mono text-xl text-teal-400">{prediction.so.toFixed(2)} PSU</div>
              </div>
              <div className="bg-slate-800/50 p-3 rounded">
                <div className="text-xs text-slate-400">Current Speed</div>
                <div className="font-mono text-xl text-cyan-400">{prediction.current_speed?.toFixed(3)} m/s</div>
              </div>
              <div className="bg-slate-800/50 p-3 rounded">
                <div className="text-xs text-slate-400">Velocity (u, v)</div>
                <div className="font-mono text-sm text-cyan-200">
                  {prediction.uo.toFixed(3)}, {prediction.vo.toFixed(3)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Globe;
