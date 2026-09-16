import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import { useOceanStore } from '@/store/useOceanStore';
import type { DepthColumnLayer } from '@/lib/api/types';
import {
  RotateCcw, Box, Circle, Eye, Layers, Compass,
  Sparkles, Maximize2, ShieldCheck, Thermometer, Droplets
} from 'lucide-react';

// Height and width scaling factors for the 3D water block
const BLOCK_HEIGHT = 6.2;
const BLOCK_RADIUS = 1.6;
const BLOCK_WIDTH = 3.0;

// Color scales for depth and variables
function getLayerColor(thetao: number, variable: string, normalizedDepth: number): THREE.Color {
  if (variable === 'salinity') {
    // Salinity: 34.0 PSU (teal) to 36.5 PSU (amber)
    const t = Math.max(0, Math.min(1, (thetao - 34.2) / 2.0));
    return new THREE.Color().lerpColors(
      new THREE.Color('#00e5ff'),
      new THREE.Color('#ffaa00'),
      t
    );
  }

  if (variable === 'currents') {
    // Current speed
    const t = Math.max(0, Math.min(1, thetao / 0.25));
    return new THREE.Color().lerpColors(
      new THREE.Color('#0088ff'),
      new THREE.Color('#00f5a0'),
      t
    );
  }

  // Default: Thermal gradient based on real temperature (2°C abyssal to 30°C tropical surface)
  const t = Math.max(0, Math.min(1, (thetao - 2.0) / 28.0));
  const deepCold = new THREE.Color('#002244');
  const thermocline = new THREE.Color('#0088ff');
  const surfaceWarm = new THREE.Color('#00f0ff');
  const surfaceHot = new THREE.Color('#ff7700');

  if (t < 0.3) {
    return new THREE.Color().lerpColors(deepCold, thermocline, t / 0.3);
  } else if (t < 0.75) {
    return new THREE.Color().lerpColors(thermocline, surfaceWarm, (t - 0.3) / 0.45);
  } else {
    return new THREE.Color().lerpColors(surfaceWarm, surfaceHot, (t - 0.75) / 0.25);
  }
}

/**
 * 3D Solid Volumetric Water Block Mesh (Cylinder or Cuboid)
 * with translucent oceanic physical material, internal stratification,
 * and realistic sea-water refraction.
 */
const WaterBlockMesh: React.FC<{
  geometryType: 'cylinder' | 'cuboid';
  layers: DepthColumnLayer[];
  selectedDepthIndex: number | null;
  activeVariable: string;
}> = ({ geometryType, layers, selectedDepthIndex, activeVariable }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const internalRef = useRef<THREE.Group>(null);

  // Subtle rotation / surface shimmer
  useFrame((state) => {
    if (internalRef.current) {
      internalRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.03;
    }
  });

  // Calculate layer heights normalized to 3D scene [-BLOCK_HEIGHT/2, BLOCK_HEIGHT/2]
  const layerMeshes = useMemo(() => {
    if (!layers || layers.length === 0) return [];
    const maxDepth = layers[layers.length - 1].depth || 2000;

    return layers.map((layer, idx) => {
      // Y goes from +BLOCK_HEIGHT/2 (surface = 0m) to -BLOCK_HEIGHT/2 (max depth)
      const ratio = layer.depth / maxDepth;
      const y = BLOCK_HEIGHT / 2 - ratio * BLOCK_HEIGHT;
      const val = activeVariable === 'salinity' ? layer.so : activeVariable === 'currents' ? layer.current_speed : layer.thetao;
      const color = getLayerColor(val, activeVariable, ratio);

      return {
        ...layer,
        y,
        color,
        isSelected: selectedDepthIndex === idx,
      };
    });
  }, [layers, activeVariable, selectedDepthIndex]);

  return (
    <group>
      {/* ── Outer Translucent Solid Water Block ──────────────────────────── */}
      <mesh ref={meshRef} position={[0, 0, 0]}>
        {geometryType === 'cylinder' ? (
          <cylinderGeometry args={[BLOCK_RADIUS, BLOCK_RADIUS, BLOCK_HEIGHT, 48, 24, false]} />
        ) : (
          <boxGeometry args={[BLOCK_WIDTH, BLOCK_HEIGHT, BLOCK_WIDTH, 16, 24, 16]} />
        )}
        <meshPhysicalMaterial
          color="#0066aa"
          emissive="#002b4d"
          emissiveIntensity={0.25}
          transmission={0.65}
          opacity={0.78}
          transparent={true}
          roughness={0.08}
          metalness={0.04}
          ior={1.333} // Refractive index of seawater
          reflectivity={0.5}
          clearcoat={0.3}
          clearcoatRoughness={0.1}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* ── Surface Water Caustic Cap ────────────────────────────────────── */}
      <mesh position={[0, BLOCK_HEIGHT / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {geometryType === 'cylinder' ? (
          <circleGeometry args={[BLOCK_RADIUS - 0.02, 48]} />
        ) : (
          <planeGeometry args={[BLOCK_WIDTH - 0.04, BLOCK_WIDTH - 0.04]} />
        )}
        <meshStandardMaterial
          color="#00ffff"
          emissive="#00bfff"
          emissiveIntensity={0.6}
          roughness={0.15}
          transparent={true}
          opacity={0.88}
        />
      </mesh>

      {/* ── Internal Stratification Layers (Isoplanes & Vectors) ─────────── */}
      <group ref={internalRef}>
        {layerMeshes.map((layer, idx) => {
          const isHighlight = layer.isSelected;
          const arrowLength = Math.max(0.3, Math.min(1.2, layer.current_speed * 5.0));
          const angle = Math.atan2(layer.vo, layer.uo);

          return (
            <group key={`layer-${idx}`} position={[0, layer.y, 0]}>
              {/* Horizontal Stratification Slice Disc / Plate */}
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                {geometryType === 'cylinder' ? (
                  <circleGeometry args={[BLOCK_RADIUS * 0.96, 36]} />
                ) : (
                  <planeGeometry args={[BLOCK_WIDTH * 0.96, BLOCK_WIDTH * 0.96]} />
                )}
                <meshStandardMaterial
                  color={layer.color}
                  emissive={layer.color}
                  emissiveIntensity={isHighlight ? 0.85 : 0.3}
                  transparent={true}
                  opacity={isHighlight ? 0.85 : 0.42}
                  depthWrite={false}
                />
              </mesh>

              {/* Glowing Rim Ring */}
              {geometryType === 'cylinder' ? (
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[BLOCK_RADIUS * 0.95, BLOCK_RADIUS * 0.99, 36]} />
                  <meshBasicMaterial
                    color={layer.color}
                    transparent={true}
                    opacity={isHighlight ? 0.95 : 0.55}
                  />
                </mesh>
              ) : (
                <lineSegments>
                  <edgesGeometry
                    attach="geometry"
                    args={[new THREE.BoxGeometry(BLOCK_WIDTH * 0.98, 0.02, BLOCK_WIDTH * 0.98)]}
                  />
                  <lineBasicMaterial
                    color={layer.color}
                    transparent={true}
                    opacity={isHighlight ? 0.95 : 0.5}
                  />
                </lineSegments>
              )}

              {/* 3D Current Velocity Vector Arrow */}
              <group rotation={[0, -angle, 0]} position={[0, 0.04, 0]}>
                {/* Arrow shaft */}
                <mesh position={[arrowLength / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.025, 0.025, arrowLength, 8]} />
                  <meshBasicMaterial color="#00ffcc" />
                </mesh>
                {/* Arrow cone head */}
                <mesh position={[arrowLength, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                  <coneGeometry args={[0.08, 0.22, 10]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
              </group>

              {/* Depth Label on Side */}
              <Text
                position={[
                  geometryType === 'cylinder' ? BLOCK_RADIUS + 0.35 : BLOCK_WIDTH / 2 + 0.35,
                  0,
                  0
                ]}
                fontSize={0.22}
                color={isHighlight ? '#00f5a0' : '#88c0d0'}
                anchorX="left"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="#020b18"
              >
                {`${Math.round(layer.depth)}m`}
              </Text>
            </group>
          );
        })}
      </group>

      {/* ── Vertical Seabed Base Cap ─────────────────────────────────────── */}
      <mesh position={[0, -BLOCK_HEIGHT / 2 - 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        {geometryType === 'cylinder' ? (
          <circleGeometry args={[BLOCK_RADIUS + 0.05, 36]} />
        ) : (
          <planeGeometry args={[BLOCK_WIDTH + 0.1, BLOCK_WIDTH + 0.1]} />
        )}
        <meshStandardMaterial
          color="#001830"
          roughness={0.9}
          metalness={0.2}
        />
      </mesh>
    </group>
  );
};

/**
 * Vertical Depth Ruler and Axis Grid
 */
const DepthAxisRuler: React.FC<{ maxDepth: number }> = ({ maxDepth }) => {
  const tickDepths = [0, 100, 500, 1000, 2000];

  return (
    <group position={[-2.4, 0, 0]}>
      {/* Vertical Spine */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, BLOCK_HEIGHT, 8]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.4} />
      </mesh>

      {/* Ticks and Labels */}
      {tickDepths.map((d, i) => {
        const ratio = d / maxDepth;
        const y = BLOCK_HEIGHT / 2 - ratio * BLOCK_HEIGHT;
        return (
          <group key={`tick-${i}`} position={[0, y, 0]}>
            <mesh position={[0.15, 0, 0]}>
              <boxGeometry args={[0.3, 0.02, 0.02]} />
              <meshBasicMaterial color="#00e5ff" />
            </mesh>
            <Text
              position={[-0.2, 0, 0]}
              fontSize={0.24}
              color="#e0f7fa"
              anchorX="right"
              anchorY="middle"
              outlineWidth={0.02}
              outlineColor="#020b18"
            >
              {`-${d}m`}
            </Text>
          </group>
        );
      })}
    </group>
  );
};

export const StandaloneDepthSliceViewer: React.FC = () => {
  const {
    depthColumnData,
    pointGeometryType,
    setPointGeometryType,
    isPointDataLoading,
    clickedLocation,
    selectedDepthIndex,
    isSideTabCollapsed,
  } = useOceanStore();

  const [activeVariable, setActiveVariable] = useState<'temperature' | 'salinity' | 'currents'>('temperature');
  const controlsRef = useRef<any>(null);

  const layers = depthColumnData?.water_column || [];
  const maxDepth = layers.length > 0 ? layers[layers.length - 1].depth : 2000;

  const handleResetCamera = () => {
    if (controlsRef.current) {
      const offsetX = isSideTabCollapsed ? 0 : -1.35;
      controlsRef.current.target.set(offsetX, 0, 0);
      controlsRef.current.object.position.set(5.2 + offsetX, 3.8, 6.4);
      controlsRef.current.update();
    }
  };

  return (
    <div
      id="standalone-depth-slice-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'radial-gradient(ellipse at 50% 30%, #031c38 0%, #010a18 70%, #00040a 100%)',
        overflow: 'hidden',
        borderLeft: '1px solid rgba(0, 220, 255, 0.25)',
        boxShadow: 'inset 20px 0 60px rgba(0, 0, 0, 0.8)',
      }}
    >
      {/* ── Top Viewport Controls Dock ───────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          right: isSideTabCollapsed ? '20px' : '410px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          zIndex: 10,
          pointerEvents: 'none',
          transition: 'right 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Title & Coordinate Badge */}
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(5, 18, 38, 0.85)',
            backdropFilter: 'blur(16px)',
            padding: '8px 16px',
            borderRadius: '12px',
            border: '1px solid rgba(0, 229, 255, 0.3)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #00d2ff, #0055ff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 14px rgba(0, 210, 255, 0.6)',
            }}
          >
            <Layers size={16} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.5px' }}>
                3D Volumetric Depth Slice
              </span>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(0, 245, 160, 0.18)',
                  color: '#00f5a0',
                  border: '1px solid rgba(0, 245, 160, 0.4)',
                }}
              >
                Independent 3D Scene
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#7aa0c4', fontFamily: 'monospace' }}>
              {clickedLocation
                ? `${clickedLocation.lat.toFixed(4)}°N, ${clickedLocation.lon.toFixed(4)}°E • ${depthColumnData?.location.basin || 'Indian Ocean'}`
                : 'Interactive Water Column Model'}
            </div>
          </div>
        </div>

        {/* Shape & Variable Controls Dock */}
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(5, 18, 38, 0.85)',
            backdropFilter: 'blur(16px)',
            padding: '6px 12px',
            borderRadius: '12px',
            border: '1px solid rgba(0, 229, 255, 0.25)',
          }}
        >
          {/* Geometry Toggle: Cylinder / Cuboid */}
          <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '8px', padding: '2px' }}>
            <button
              onClick={() => setPointGeometryType('cylinder')}
              title="Cylindrical Water Column"
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 600,
                background: pointGeometryType === 'cylinder' ? 'linear-gradient(135deg, #00d2ff, #0088ff)' : 'transparent',
                color: pointGeometryType === 'cylinder' ? '#fff' : '#7aa0c4',
                transition: 'all 0.2s',
              }}
            >
              <Circle size={12} />
              Cylinder
            </button>
            <button
              onClick={() => setPointGeometryType('cuboid')}
              title="Cuboid Water Block"
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 600,
                background: pointGeometryType === 'cuboid' ? 'linear-gradient(135deg, #00d2ff, #0088ff)' : 'transparent',
                color: pointGeometryType === 'cuboid' ? '#fff' : '#7aa0c4',
                transition: 'all 0.2s',
              }}
            >
              <Box size={12} />
              Cuboid
            </button>
          </div>

          {/* Color Mode Toggle */}
          <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '8px', padding: '2px' }}>
            <button
              onClick={() => setActiveVariable('temperature')}
              title="Color by Temperature"
              style={{
                padding: '6px 9px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
                background: activeVariable === 'temperature' ? 'rgba(0, 229, 255, 0.25)' : 'transparent',
                color: activeVariable === 'temperature' ? '#00e5ff' : '#7aa0c4',
              }}
            >
              θ₀ Temp
            </button>
            <button
              onClick={() => setActiveVariable('salinity')}
              title="Color by Salinity"
              style={{
                padding: '6px 9px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
                background: activeVariable === 'salinity' ? 'rgba(0, 229, 255, 0.25)' : 'transparent',
                color: activeVariable === 'salinity' ? '#00e5ff' : '#7aa0c4',
              }}
            >
              S₀ Salinity
            </button>
            <button
              onClick={() => setActiveVariable('currents')}
              title="Color by Current Velocity"
              style={{
                padding: '6px 9px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
                background: activeVariable === 'currents' ? 'rgba(0, 229, 255, 0.25)' : 'transparent',
                color: activeVariable === 'currents' ? '#00e5ff' : '#7aa0c4',
              }}
            >
              Velocity
            </button>
          </div>

          {/* Reset Camera Button */}
          <button
            onClick={handleResetCamera}
            title="Reset 3D Perspective"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#e2f1ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* ── Dedicated Three.js WebGL Canvas ──────────────────────────────── */}
      <Canvas
        camera={{ position: [5.2, 3.8, 6.4], fov: 42 }}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
        }}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Independent Camera Controls (Rotate, Zoom, Pan) */}
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          target={isSideTabCollapsed ? [0, 0, 0] : [-1.35, 0, 0]}
          minDistance={2.5}
          maxDistance={18}
          maxPolarAngle={Math.PI / 2 + 0.25}
        />

        {/* Ambient & Directional Lighting for Photorealistic Ocean Volumetrics */}
        <ambientLight intensity={0.8} color="#90caf9" />
        <directionalLight position={[10, 15, 8]} intensity={1.4} color="#e0f7fa" />
        <directionalLight position={[-10, -5, -8]} intensity={0.5} color="#0055ff" />
        <pointLight position={[0, 0, 0]} intensity={1.2} color="#00e5ff" distance={8} />

        {/* 3D Water Column Mesh - shifted to left so sidebar never blocks it */}
        <group position={isSideTabCollapsed ? [0, 0, 0] : [-1.35, 0, 0]}>
          <WaterBlockMesh
            geometryType={pointGeometryType}
            layers={layers}
            selectedDepthIndex={selectedDepthIndex}
            activeVariable={activeVariable}
          />

          {/* Depth Scale Ruler on Left */}
          <DepthAxisRuler maxDepth={maxDepth} />
        </group>
      </Canvas>

      {/* ── Interactive Interaction Helper Pill ──────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '20px',
          background: 'rgba(2, 11, 24, 0.75)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 220, 255, 0.2)',
          color: '#7aa0c4',
          fontSize: '11px',
          pointerEvents: 'none',
        }}
      >
        <Compass size={13} color="#00d2ff" />
        <span>Drag to orbit • Scroll to zoom • Right-click to pan</span>
      </div>

      {/* Loading Overlay when querying ML Model */}
      {isPointDataLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(2, 11, 24, 0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 30,
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              border: '3px solid rgba(0, 229, 255, 0.2)',
              borderTopColor: '#00e5ff',
              animation: 'spin 1s linear infinite',
              marginBottom: '16px',
            }}
          />
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
            Predicting Water Column Profile
          </div>
          <div style={{ fontSize: '12px', color: '#7aa0c4' }}>
            Querying Lahar Ocean XGBoost Model across 14 stratified depth layers...
          </div>
        </div>
      )}
    </div>
  );
};
export default StandaloneDepthSliceViewer;
