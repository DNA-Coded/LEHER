import React, { useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import {
  RotateCcw, Box, Circle, Eye, Layers, Compass,
  Sparkles, Maximize2, ShieldCheck, Thermometer, Droplets,
  Activity, ChevronLeft, ChevronRight, Sliders, Waves,
  TrendingDown, Gauge, Navigation, Sprout, Info, MapPin, X
} from 'lucide-react';

// ============================================================================
// SELF-CONTAINED MOCK DATA (No Backend / No Zustand Store Dependencies)
// ============================================================================

export interface DepthColumnLayer {
  depth: number;
  thetao: number;       // Temperature (°C)
  so: number;           // Salinity (PSU)
  uo: number;           // Eastward velocity (m/s)
  vo: number;           // Northward velocity (m/s)
  current_speed: number;// Magnitude (m/s)
  chlorophyll: number;  // mg/m³
}

const MOCK_LOCATION = {
  lat: 15.0000,
  lon: 68.0000,
  region: 'Arabian Sea (Eastern Basin)',
  coordinates_str: '15.0000°N, 68.0000°E',
};

const MOCK_WATER_COLUMN: DepthColumnLayer[] = [
  { depth: 0,    thetao: 28.40, so: 35.85, uo:  0.185, vo: -0.112, current_speed: 0.216, chlorophyll: 0.840 },
  { depth: 10,   thetao: 28.25, so: 35.84, uo:  0.172, vo: -0.108, current_speed: 0.203, chlorophyll: 0.980 },
  { depth: 20,   thetao: 28.05, so: 35.83, uo:  0.158, vo: -0.095, current_speed: 0.184, chlorophyll: 1.250 },
  { depth: 30,   thetao: 27.60, so: 35.80, uo:  0.134, vo: -0.082, current_speed: 0.157, chlorophyll: 1.450 },
  { depth: 50,   thetao: 25.80, so: 35.65, uo:  0.095, vo: -0.054, current_speed: 0.109, chlorophyll: 0.720 },
  { depth: 75,   thetao: 22.40, so: 35.45, uo:  0.068, vo: -0.038, current_speed: 0.078, chlorophyll: 0.350 },
  { depth: 100,  thetao: 18.90, so: 35.25, uo:  0.048, vo: -0.025, current_speed: 0.054, chlorophyll: 0.140 },
  { depth: 150,  thetao: 15.20, so: 35.10, uo:  0.032, vo: -0.018, current_speed: 0.037, chlorophyll: 0.050 },
  { depth: 200,  thetao: 13.10, so: 35.02, uo:  0.024, vo: -0.012, current_speed: 0.027, chlorophyll: 0.018 },
  { depth: 300,  thetao: 10.80, so: 34.92, uo:  0.018, vo: -0.009, current_speed: 0.020, chlorophyll: 0.008 },
  { depth: 500,  thetao: 7.60,  so: 34.82, uo:  0.014, vo: -0.007, current_speed: 0.016, chlorophyll: 0.004 },
  { depth: 1000, thetao: 3.80,  so: 34.72, uo:  0.008, vo: -0.005, current_speed: 0.009, chlorophyll: 0.002 },
  { depth: 1500, thetao: 2.60,  so: 34.68, uo:  0.005, vo: -0.003, current_speed: 0.006, chlorophyll: 0.001 },
  { depth: 2000, thetao: 1.80,  so: 34.65, uo:  0.003, vo: -0.002, current_speed: 0.004, chlorophyll: 0.001 },
];

const MOCK_DERIVED_METRICS = {
  thermocline_depth: 85,
  mixed_layer_depth: 42,
  pycnocline_strength: 3.42,
  mean_column_speed: 0.053,
  brunt_vaisala: '2.84 × 10⁻³ s⁻¹',
  acoustic_ducting: 'Active (SOFAR axis at ~950m)',
  sound_speed_surface: '1542 m/s',
  sound_speed_abyss: '1488 m/s',
};

const MOCK_MODEL_META = {
  name: 'Lahar-Ocean XGBoost v3.2',
  r2_score: '98.4%',
  rmse: '0.14°C',
  latency: '14ms',
  layers_predicted: 14,
};

// ============================================================================
// 3D CONSTANTS & COLOR MAPPING
// ============================================================================

const BLOCK_HEIGHT = 6.2;
const BLOCK_RADIUS = 1.6;
const BLOCK_WIDTH = 3.0;

function getLayerColor(value: number, variable: string): THREE.Color {
  if (variable === 'salinity') {
    const t = Math.max(0, Math.min(1, (value - 34.2) / 2.0));
    return new THREE.Color().lerpColors(new THREE.Color('#00e5ff'), new THREE.Color('#ffaa00'), t);
  }

  if (variable === 'currents') {
    const t = Math.max(0, Math.min(1, value / 0.25));
    return new THREE.Color().lerpColors(new THREE.Color('#0088ff'), new THREE.Color('#00f5a0'), t);
  }

  // Default: Temperature gradient (2°C abyssal to 30°C surface)
  const t = Math.max(0, Math.min(1, (value - 2.0) / 28.0));
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

function getZoneLabel(d: number): string {
  if (d === 0) return 'Surface Photic Zone';
  if (d <= 50) return 'Epipelagic Mixed Layer';
  if (d <= 200) return 'Thermocline Transition';
  if (d <= 1000) return 'Mesopelagic Twilight';
  return 'Bathypelagic Abyss';
}

// ============================================================================
// 3D VOLUMETRIC WATER BLOCK MESH
// ============================================================================

interface WaterBlockMeshProps {
  geometryType: 'cylinder' | 'cuboid';
  layers: DepthColumnLayer[];
  selectedDepthIndex: number;
  activeVariable: string;
  onSelectLayer: (index: number) => void;
}

const WaterBlockMesh: React.FC<WaterBlockMeshProps> = ({
  geometryType,
  layers,
  selectedDepthIndex,
  activeVariable,
  onSelectLayer,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const internalRef = useRef<THREE.Group>(null);

  // Subtle floating surface shimmer animation
  useFrame((state) => {
    if (internalRef.current) {
      internalRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.03;
    }
  });

  const layerMeshes = useMemo(() => {
    if (!layers || layers.length === 0) return [];
    const maxDepth = layers[layers.length - 1].depth || 2000;

    return layers.map((layer, idx) => {
      const ratio = layer.depth / maxDepth;
      const y = BLOCK_HEIGHT / 2 - ratio * BLOCK_HEIGHT;
      const val = activeVariable === 'salinity' ? layer.so : activeVariable === 'currents' ? layer.current_speed : layer.thetao;
      const color = getLayerColor(val, activeVariable);

      return {
        ...layer,
        index: idx,
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
          ior={1.333} // Seawater index of refraction
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

      {/* ── Internal Stratification Layers (Isoslices & Current Vectors) ── */}
      <group ref={internalRef}>
        {layerMeshes.map((layer) => {
          const isHighlight = layer.isSelected;
          const arrowLength = Math.max(0.3, Math.min(1.2, layer.current_speed * 5.0));
          const angle = Math.atan2(layer.vo, layer.uo);

          return (
            <group
              key={`layer-${layer.index}`}
              position={[0, layer.y, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onSelectLayer(layer.index);
              }}
            >
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
                  emissiveIntensity={isHighlight ? 0.95 : 0.3}
                  transparent={true}
                  opacity={isHighlight ? 0.88 : 0.42}
                  depthWrite={false}
                />
              </mesh>

              {/* Glowing Rim Ring */}
              {geometryType === 'cylinder' ? (
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[BLOCK_RADIUS * 0.94, BLOCK_RADIUS * 0.99, 36]} />
                  <meshBasicMaterial
                    color={layer.color}
                    transparent={true}
                    opacity={isHighlight ? 0.98 : 0.55}
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
                <mesh position={[arrowLength / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.025, 0.025, arrowLength, 8]} />
                  <meshBasicMaterial color="#00ffcc" />
                </mesh>
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
                  0,
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

      {/* ── Seabed Base Cap ────────────────────────────────────────────── */}
      <mesh position={[0, -BLOCK_HEIGHT / 2 - 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        {geometryType === 'cylinder' ? (
          <circleGeometry args={[BLOCK_RADIUS + 0.05, 36]} />
        ) : (
          <planeGeometry args={[BLOCK_WIDTH + 0.1, BLOCK_WIDTH + 0.1]} />
        )}
        <meshStandardMaterial color="#001830" roughness={0.9} metalness={0.2} />
      </mesh>
    </group>
  );
};

// ============================================================================
// VERTICAL DEPTH AXIS RULER
// ============================================================================

const DepthAxisRuler: React.FC<{ maxDepth: number }> = ({ maxDepth }) => {
  const tickDepths = [0, 100, 500, 1000, 2000];

  return (
    <group position={[-2.4, 0, 0]}>
      {/* Vertical Spine Bar */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.018, BLOCK_HEIGHT, 8]} />
        <meshBasicMaterial color="#00aaff" transparent opacity={0.65} />
      </mesh>

      {/* Scale Tick Marks and Depth Indicators */}
      {tickDepths.map((d) => {
        const ratio = d / maxDepth;
        const y = BLOCK_HEIGHT / 2 - ratio * BLOCK_HEIGHT;
        return (
          <group key={`tick-${d}`} position={[0, y, 0]}>
            <mesh position={[0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.012, 0.012, 0.24, 6]} />
              <meshBasicMaterial color="#00e5ff" />
            </mesh>
            <Text
              position={[-0.2, 0, 0]}
              fontSize={0.24}
              color="#00e5ff"
              anchorX="right"
              anchorY="middle"
              outlineWidth={0.02}
              outlineColor="#010a18"
            >
              {`${d}m`}
            </Text>
          </group>
        );
      })}
    </group>
  );
};

// ============================================================================
// MAIN DEPTH SLICE STANDALONE COMPONENT
// ============================================================================

export interface DepthSliceStandaloneProps {
  initialDepthIndex?: number;
  initialGeometry?: 'cylinder' | 'cuboid';
  initialVariable?: 'temperature' | 'salinity' | 'currents';
  onClose?: () => void;
  className?: string;
}

export const DepthSliceStandalone: React.FC<DepthSliceStandaloneProps> = ({
  initialDepthIndex = 0,
  initialGeometry = 'cylinder',
  initialVariable = 'temperature',
  onClose,
  className = '',
}) => {
  // State
  const [selectedDepthIndex, setSelectedDepthIndex] = useState<number>(initialDepthIndex);
  const [activeTab, setActiveTab] = useState<'telemetry' | 'stratification' | 'layers' | 'profile'>('telemetry');
  const [geometryType, setGeometryType] = useState<'cylinder' | 'cuboid'>(initialGeometry);
  const [activeVariable, setActiveVariable] = useState<'temperature' | 'salinity' | 'currents'>(initialVariable);
  const [isSideTabCollapsed, setIsSideTabCollapsed] = useState<boolean>(false);

  const controlsRef = useRef<OrbitControlsImpl>(null);

  const activeLayer = MOCK_WATER_COLUMN[selectedDepthIndex] || MOCK_WATER_COLUMN[0];
  const maxDepth = MOCK_WATER_COLUMN[MOCK_WATER_COLUMN.length - 1].depth || 2000;

  // Oceanographic current direction heading
  const currentDirectionDeg = ((Math.atan2(activeLayer.uo, activeLayer.vo) * 180 / Math.PI) + 360) % 360;
  const currentHeadingStr =
    currentDirectionDeg >= 337.5 || currentDirectionDeg < 22.5 ? 'N' :
    currentDirectionDeg < 67.5 ? 'NE' :
    currentDirectionDeg < 112.5 ? 'E' :
    currentDirectionDeg < 157.5 ? 'SE' :
    currentDirectionDeg < 202.5 ? 'S' :
    currentDirectionDeg < 247.5 ? 'SW' :
    currentDirectionDeg < 292.5 ? 'W' : 'NW';

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      controlsRef.current.target.set(isSideTabCollapsed ? 0 : -1.35, 0, 0);
    }
  };

  // SVGs for Vertical Profile Charts
  const profileTempPath = useMemo(() => {
    return MOCK_WATER_COLUMN.map((l, i) => {
      const x = 40 + ((l.thetao - 1.5) / 28) * 270;
      const y = 20 + Math.pow(l.depth / maxDepth, 0.6) * 165;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }, [maxDepth]);

  const profileSalPath = useMemo(() => {
    return MOCK_WATER_COLUMN.map((l, i) => {
      const x = 40 + ((Math.max(33, Math.min(37, l.so)) - 33) / 4) * 270;
      const y = 20 + Math.pow(l.depth / maxDepth, 0.6) * 165;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }, [maxDepth]);

  return (
    <div
      className={`depth-slice-standalone-root ${className}`}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 45% 35%, #031c38 0%, #010a18 70%, #00040a 100%)',
        color: '#e2f1ff',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* ── 3D Canvas Area ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, height: '100%', position: 'relative', overflow: 'hidden' }}>
        {/* ── Top Floating Controls Bar ─────────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            right: isSideTabCollapsed ? '16px' : '400px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            zIndex: 15,
            pointerEvents: 'none',
            transition: 'right 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Left Title Card */}
          <div
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(5, 18, 38, 0.88)',
              backdropFilter: 'blur(16px)',
              padding: '8px 18px',
              borderRadius: '12px',
              border: '1px solid rgba(0, 220, 255, 0.3)',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #00d2ff, #0055ff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 14px rgba(0, 210, 255, 0.5)',
                color: '#ffffff',
                flexShrink: 0,
              }}
            >
              <Waves size={17} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.4px' }}>
                  3D Volumetric Depth Slice
                </span>
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    background: 'rgba(0, 245, 160, 0.18)',
                    color: '#00f5a0',
                    border: '1px solid rgba(0, 245, 160, 0.4)',
                    letterSpacing: '0.5px',
                  }}
                >
                  STANDALONE REACT
                </span>
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: '#7aa0c4',
                  fontFamily: "'JetBrains Mono', monospace",
                  marginTop: '1px',
                }}
              >
                {MOCK_LOCATION.coordinates_str} • {MOCK_LOCATION.region}
              </div>
            </div>
          </div>

          {/* Right Mode Toggles */}
          <div
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(5, 18, 38, 0.88)',
              backdropFilter: 'blur(16px)',
              padding: '6px 10px',
              borderRadius: '12px',
              border: '1px solid rgba(0, 220, 255, 0.3)',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
            }}
          >
            {/* Cylinder / Cuboid Toggle */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(0, 0, 0, 0.45)',
                borderRadius: '8px',
                padding: '2px',
              }}
            >
              <button
                onClick={() => setGeometryType('cylinder')}
                style={{
                  padding: '6px 11px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: geometryType === 'cylinder' ? 'linear-gradient(135deg, #00d2ff, #0088ff)' : 'transparent',
                  color: geometryType === 'cylinder' ? '#ffffff' : '#7aa0c4',
                  transition: 'all 0.2s',
                }}
              >
                <Circle size={12} />
                Cylinder
              </button>
              <button
                onClick={() => setGeometryType('cuboid')}
                style={{
                  padding: '6px 11px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: geometryType === 'cuboid' ? 'linear-gradient(135deg, #00d2ff, #0088ff)' : 'transparent',
                  color: geometryType === 'cuboid' ? '#ffffff' : '#7aa0c4',
                  transition: 'all 0.2s',
                }}
              >
                <Box size={12} />
                Cuboid
              </button>
            </div>

            {/* Variable Coloring Switcher */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(0, 0, 0, 0.45)',
                borderRadius: '8px',
                padding: '2px',
              }}
            >
              <button
                onClick={() => setActiveVariable('temperature')}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: activeVariable === 'temperature' ? 'rgba(0, 229, 255, 0.25)' : 'transparent',
                  color: activeVariable === 'temperature' ? '#00e5ff' : '#7aa0c4',
                  transition: 'all 0.2s',
                }}
              >
                Temp (θ₀)
              </button>
              <button
                onClick={() => setActiveVariable('salinity')}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: activeVariable === 'salinity' ? 'rgba(0, 229, 255, 0.25)' : 'transparent',
                  color: activeVariable === 'salinity' ? '#00e5ff' : '#7aa0c4',
                  transition: 'all 0.2s',
                }}
              >
                Salinity (S₀)
              </button>
              <button
                onClick={() => setActiveVariable('currents')}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: activeVariable === 'currents' ? 'rgba(0, 229, 255, 0.25)' : 'transparent',
                  color: activeVariable === 'currents' ? '#00e5ff' : '#7aa0c4',
                  transition: 'all 0.2s',
                }}
              >
                Velocity
              </button>
            </div>

            {/* Reset Camera */}
            <button
              onClick={handleResetCamera}
              title="Reset 3D Perspective"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#e2f1ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <RotateCcw size={14} />
            </button>

            {/* Optional Close Callback */}
            {onClose && (
              <button
                onClick={onClose}
                title="Close Depth Slice"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 100, 100, 0.3)',
                  background: 'rgba(255, 50, 50, 0.1)',
                  color: '#ff7777',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* ── Dedicated Three.js WebGL Canvas ──────────────────────────── */}
        <Canvas
          camera={{ position: [5.2, 3.8, 6.4], fov: 42 }}
          gl={{
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance',
          }}
          style={{ width: '100%', height: '100%' }}
        >
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

          {/* Lighting for oceanic physical depth */}
          <ambientLight intensity={0.8} color="#90caf9" />
          <directionalLight position={[10, 15, 8]} intensity={1.4} color="#e0f7fa" />
          <directionalLight position={[-10, -5, -8]} intensity={0.5} color="#0055ff" />
          <pointLight position={[0, 0, 0]} intensity={1.2} color="#00e5ff" distance={8} />

          {/* 3D Water Column Mesh - shifted left when side tab is open */}
          <group position={isSideTabCollapsed ? [0, 0, 0] : [-1.35, 0, 0]}>
            <WaterBlockMesh
              geometryType={geometryType}
              layers={MOCK_WATER_COLUMN}
              selectedDepthIndex={selectedDepthIndex}
              activeVariable={activeVariable}
              onSelectLayer={(idx) => setSelectedDepthIndex(idx)}
            />

            <DepthAxisRuler maxDepth={maxDepth} />
          </group>
        </Canvas>

        {/* ── Interaction Hint Pill ───────────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 16px',
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
          <span>Drag to orbit • Scroll to zoom • Right-click to pan • Click layer to inspect</span>
        </div>
      </div>

      {/* ── Collapsed Reopen Pill Trigger ──────────────────────────────── */}
      {isSideTabCollapsed && (
        <button
          onClick={() => setIsSideTabCollapsed(false)}
          title="Open Telemetry Data Panel"
          style={{
            position: 'absolute',
            top: '80px',
            right: '20px',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(3, 14, 28, 0.92)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(0, 220, 255, 0.4)',
            borderRadius: '24px',
            padding: '8px 16px',
            color: '#00e5ff',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7), 0 0 16px rgba(0, 220, 255, 0.25)',
            transition: 'all 0.2s',
          }}
        >
          <Sliders size={14} />
          <span>View Telemetry Data</span>
          <ChevronLeft size={14} />
        </button>
      )}

      {/* ── Interactive Telemetry Sidebar Panel ────────────────────────── */}
      <aside
        style={{
          width: isSideTabCollapsed ? '0px' : '385px',
          height: '100%',
          background: 'rgba(3, 14, 28, 0.94)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(0, 220, 255, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 20,
          boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.75)',
          transform: isSideTabCollapsed ? 'translateX(100%)' : 'translateX(0)',
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
        }}
      >
        {/* Panel Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(0, 220, 255, 0.06) 0%, transparent 100%)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(0, 220, 255, 0.2), rgba(0, 100, 255, 0.3))',
                border: '1px solid rgba(0, 220, 255, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00e5ff',
              }}
            >
              <Activity size={16} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                  Depth Slice Analytics
                </span>
                <span
                  style={{
                    fontSize: '8.5px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    padding: '2px 5px',
                    borderRadius: '3px',
                    background: 'rgba(0, 245, 160, 0.2)',
                    color: '#00f5a0',
                    letterSpacing: '0.5px',
                  }}
                >
                  LIVE ML
                </span>
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: '#7aa0c4',
                  fontFamily: "'JetBrains Mono', monospace",
                  marginTop: '1px',
                }}
              >
                {MOCK_LOCATION.coordinates_str}
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsSideTabCollapsed(true)}
            title="Collapse Sidebar"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#7aa0c4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <ChevronRight size={15} />
          </button>
        </div>

        {/* 4 Quick Overview Metric Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            padding: '12px 18px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.35)',
              borderRadius: '8px',
              padding: '8px 10px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div style={{ fontSize: '9px', fontWeight: 600, color: '#7aa0c4', textTransform: 'uppercase' }}>Surface</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#00e5ff', marginTop: '2px' }}>
              {MOCK_WATER_COLUMN[0].thetao.toFixed(1)}°C
            </div>
          </div>
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.35)',
              borderRadius: '8px',
              padding: '8px 10px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div style={{ fontSize: '9px', fontWeight: 600, color: '#7aa0c4', textTransform: 'uppercase' }}>Thermocline</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#00f5a0', marginTop: '2px' }}>
              {MOCK_DERIVED_METRICS.thermocline_depth}m
            </div>
          </div>
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.35)',
              borderRadius: '8px',
              padding: '8px 10px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div style={{ fontSize: '9px', fontWeight: 600, color: '#7aa0c4', textTransform: 'uppercase' }}>Abyss</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#7aa0c4', marginTop: '2px' }}>
              {MOCK_WATER_COLUMN[MOCK_WATER_COLUMN.length - 1].thetao.toFixed(1)}°C
            </div>
          </div>
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.35)',
              borderRadius: '8px',
              padding: '8px 10px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div style={{ fontSize: '9px', fontWeight: 600, color: '#7aa0c4', textTransform: 'uppercase' }}>Salinity</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffaa00', marginTop: '2px' }}>
              {MOCK_WATER_COLUMN[0].so.toFixed(1)} PSU
            </div>
          </div>
        </div>

        {/* 4 Tabs Bar */}
        <div
          style={{
            display: 'flex',
            padding: '8px 18px',
            gap: '6px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            flexShrink: 0,
          }}
        >
          {(['telemetry', 'stratification', 'layers', 'profile'] as const).map((tabKey) => {
            const labels: Record<string, string> = {
              telemetry: 'Telemetry',
              stratification: 'Stratification',
              layers: 'Layer Slices',
              profile: 'Profiles',
            };
            const isActive = activeTab === tabKey;
            return (
              <button
                key={tabKey}
                onClick={() => setActiveTab(tabKey)}
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  borderRadius: '7px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: isActive ? 'rgba(0, 220, 255, 0.18)' : 'transparent',
                  color: isActive ? '#00e5ff' : '#7aa0c4',
                  boxShadow: isActive ? 'inset 0 0 10px rgba(0, 220, 255, 0.15)' : 'none',
                  transition: 'all 0.18s',
                  textTransform: 'capitalize',
                }}
              >
                {labels[tabKey]}
              </button>
            );
          })}
        </div>

        {/* Scrollable Tab Content Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* ── TAB 1: TELEMETRY ─────────────────────────────────────────── */}
          {activeTab === 'telemetry' && (
            <>
              {/* Depth Selector Slider & Presets */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.35)',
                  borderRadius: '12px',
                  padding: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#7aa0c4', textTransform: 'uppercase' }}>
                    <Sliders size={13} color="#00e5ff" />
                    Depth Slice Selector
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      color: '#00e5ff',
                      fontFamily: "'JetBrains Mono', monospace",
                      background: 'rgba(0, 220, 255, 0.12)',
                      padding: '2px 8px',
                      borderRadius: '5px',
                    }}
                  >
                    {activeLayer.depth === 0 ? '0m (Surface)' : `${activeLayer.depth} meters`}
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: '#88a8c8', marginBottom: '10px' }}>
                  Zone: <span style={{ color: '#00f5a0', fontWeight: 600 }}>{getZoneLabel(activeLayer.depth)}</span>
                </div>

                {/* Range Slider */}
                <input
                  type="range"
                  min={0}
                  max={MOCK_WATER_COLUMN.length - 1}
                  step={1}
                  value={selectedDepthIndex}
                  onChange={(e) => setSelectedDepthIndex(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: '#00e5ff',
                    cursor: 'pointer',
                    height: '5px',
                    marginBottom: '8px',
                  }}
                />

                {/* Depth Ticks */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: '#557799', fontFamily: "'JetBrains Mono', monospace", marginBottom: '12px' }}>
                  {[0, 100, 500, 1000, 2000].map((t) => {
                    const idx = MOCK_WATER_COLUMN.findIndex((w) => w.depth >= t);
                    const safeIdx = idx >= 0 ? idx : MOCK_WATER_COLUMN.length - 1;
                    return (
                      <span
                        key={`tick-label-${t}`}
                        onClick={() => setSelectedDepthIndex(safeIdx)}
                        style={{
                          cursor: 'pointer',
                          color: selectedDepthIndex === safeIdx ? '#00e5ff' : '#557799',
                          fontWeight: selectedDepthIndex === safeIdx ? 700 : 400,
                        }}
                      >
                        {t}m
                      </span>
                    );
                  })}
                </div>

                {/* Preset Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {[
                    { label: 'Surface', depth: 0 },
                    { label: '100m', depth: 100 },
                    { label: '500m', depth: 500 },
                    { label: '2000m', depth: 2000 },
                  ].map((p) => {
                    const idx = MOCK_WATER_COLUMN.findIndex((w) => Math.abs(w.depth - p.depth) < 25);
                    const isSelected = selectedDepthIndex === idx;
                    return (
                      <button
                        key={`preset-${p.label}`}
                        onClick={() => setSelectedDepthIndex(idx)}
                        style={{
                          padding: '5px 2px',
                          borderRadius: '6px',
                          border: isSelected ? '1px solid #00e5ff' : '1px solid rgba(255, 255, 255, 0.08)',
                          background: isSelected ? 'rgba(0, 220, 255, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                          color: isSelected ? '#00e5ff' : '#7aa0c4',
                          fontSize: '10px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Primary 4 Telemetry Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {/* Temp */}
                <div
                  style={{
                    background: 'rgba(255, 122, 54, 0.07)',
                    border: '1px solid rgba(255, 122, 54, 0.25)',
                    borderRadius: '10px',
                    padding: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700, color: '#ff7a36', textTransform: 'uppercase' }}>
                    <Thermometer size={13} />
                    Potential Temp (θ₀)
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', marginTop: '6px', fontFamily: "'JetBrains Mono', monospace" }}>
                    {activeLayer.thetao.toFixed(2)}
                    <span style={{ fontSize: '13px', color: '#ff9966', marginLeft: '3px' }}>°C</span>
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#aa7766', marginTop: '4px' }}>
                    {activeLayer.depth === 0 ? 'Surface Photic Layer' : activeLayer.depth <= 200 ? 'Thermocline Gradient' : 'Deep Cold Layer'}
                  </div>
                </div>

                {/* Salinity */}
                <div
                  style={{
                    background: 'rgba(0, 229, 255, 0.07)',
                    border: '1px solid rgba(0, 229, 255, 0.25)',
                    borderRadius: '10px',
                    padding: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700, color: '#00e5ff', textTransform: 'uppercase' }}>
                    <Droplets size={13} />
                    Salinity (S₀)
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', marginTop: '6px', fontFamily: "'JetBrains Mono', monospace" }}>
                    {activeLayer.so.toFixed(2)}
                    <span style={{ fontSize: '13px', color: '#66e5ff', marginLeft: '3px' }}>PSU</span>
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#6699aa', marginTop: '4px' }}>
                    Practical Salinity Scale
                  </div>
                </div>

                {/* Velocity */}
                <div
                  style={{
                    background: 'rgba(0, 245, 160, 0.07)',
                    border: '1px solid rgba(0, 245, 160, 0.25)',
                    borderRadius: '10px',
                    padding: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700, color: '#00f5a0', textTransform: 'uppercase' }}>
                    <Gauge size={13} />
                    Current Velocity
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', marginTop: '6px', fontFamily: "'JetBrains Mono', monospace" }}>
                    {activeLayer.current_speed.toFixed(3)}
                    <span style={{ fontSize: '13px', color: '#80ffcc', marginLeft: '3px' }}>m/s</span>
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#66aa99', marginTop: '4px' }}>
                    ≈ {(activeLayer.current_speed * 1.94384).toFixed(2)} knots
                  </div>
                </div>

                {/* Heading */}
                <div
                  style={{
                    background: 'rgba(192, 132, 252, 0.07)',
                    border: '1px solid rgba(192, 132, 252, 0.25)',
                    borderRadius: '10px',
                    padding: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700, color: '#c084fc', textTransform: 'uppercase' }}>
                    <Navigation size={13} />
                    Current Heading
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', marginTop: '6px', fontFamily: "'JetBrains Mono', monospace" }}>
                    {Math.round(currentDirectionDeg)}°
                    <span style={{ fontSize: '13px', color: '#d8b4fe', marginLeft: '3px' }}>{currentHeadingStr}</span>
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#9977bb', marginTop: '4px' }}>
                    Flow vector bearing
                  </div>
                </div>
              </div>

              {/* Horizontal Velocity Components */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '10px',
                  padding: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#7aa0c4', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Horizontal Velocity Components (u₀, v₀)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', padding: '8px 10px' }}>
                    <div style={{ fontSize: '10px', color: '#7aa0c4' }}>Eastward Component (u₀)</div>
                    <div
                      style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: activeLayer.uo >= 0 ? '#00f5a0' : '#ff7a36',
                        marginTop: '3px',
                      }}
                    >
                      {activeLayer.uo >= 0 ? '+' : ''}{activeLayer.uo.toFixed(3)} m/s
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', padding: '8px 10px' }}>
                    <div style={{ fontSize: '10px', color: '#7aa0c4' }}>Northward Component (v₀)</div>
                    <div
                      style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: activeLayer.vo >= 0 ? '#00f5a0' : '#ff7a36',
                        marginTop: '3px',
                      }}
                    >
                      {activeLayer.vo >= 0 ? '+' : ''}{activeLayer.vo.toFixed(3)} m/s
                    </div>
                  </div>
                </div>
              </div>

              {/* Chlorophyll-a Concentration */}
              <div
                style={{
                  background: 'rgba(74, 222, 128, 0.06)',
                  border: '1px solid rgba(74, 222, 128, 0.22)',
                  borderRadius: '10px',
                  padding: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase' }}>
                  <Sprout size={14} />
                  Chlorophyll-a Concentration
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', marginTop: '6px', fontFamily: "'JetBrains Mono', monospace" }}>
                  {activeLayer.chlorophyll.toFixed(3)}
                  <span style={{ fontSize: '12px', color: '#86efac', marginLeft: '4px' }}>mg/m³</span>
                </div>
                <div style={{ fontSize: '10.5px', color: '#6ee7b7', marginTop: '3px' }}>
                  {activeLayer.chlorophyll > 1.0
                    ? 'High biological productivity (chlorophyll peak)'
                    : activeLayer.chlorophyll > 0.3
                    ? 'Moderate photic productivity'
                    : activeLayer.chlorophyll > 0.05
                    ? 'Oligotrophic twilight conditions'
                    : 'Deep depleted aphotic zone'}
                </div>
              </div>

              {/* Model Provenance Card */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(0, 220, 255, 0.15)',
                  borderRadius: '10px',
                  padding: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700, color: '#00e5ff', textTransform: 'uppercase', marginBottom: '8px' }}>
                  <ShieldCheck size={13} />
                  Lahar Ocean ML Model Inference
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '6px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '9px', color: '#7aa0c4' }}>Model</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>XGBoost v3.2</div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '6px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '9px', color: '#7aa0c4' }}>Accuracy (R²)</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#00f5a0', marginTop: '2px' }}>{MOCK_MODEL_META.r2_score}</div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '6px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '9px', color: '#7aa0c4' }}>Latency</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#00e5ff', marginTop: '2px' }}>{MOCK_MODEL_META.latency}</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── TAB 2: STRATIFICATION ────────────────────────────────────── */}
          {activeTab === 'stratification' && (
            <>
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.35)',
                  borderRadius: '12px',
                  padding: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#00e5ff', textTransform: 'uppercase' }}>
                  Column Stratification & Hydrodynamics
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <span style={{ fontSize: '12px', color: '#7aa0c4' }}>Thermocline Core Depth</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#00e5ff', fontFamily: "'JetBrains Mono', monospace" }}>
                    {MOCK_DERIVED_METRICS.thermocline_depth} m
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <span style={{ fontSize: '12px', color: '#7aa0c4' }}>Mixed Layer Depth (MLD)</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#00f5a0', fontFamily: "'JetBrains Mono', monospace" }}>
                    {MOCK_DERIVED_METRICS.mixed_layer_depth} m
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <span style={{ fontSize: '12px', color: '#7aa0c4' }}>Pycnocline Stability (N²)</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffaa00', fontFamily: "'JetBrains Mono', monospace" }}>
                    {MOCK_DERIVED_METRICS.pycnocline_strength} kg/m⁴
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <span style={{ fontSize: '12px', color: '#7aa0c4' }}>Mean Column Speed</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', fontFamily: "'JetBrains Mono', monospace" }}>
                    {MOCK_DERIVED_METRICS.mean_column_speed} m/s
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <span style={{ fontSize: '12px', color: '#7aa0c4' }}>Brunt-Väisälä Buoyancy Freq</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#c084fc', fontFamily: "'JetBrains Mono', monospace" }}>
                    {MOCK_DERIVED_METRICS.brunt_vaisala}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span style={{ fontSize: '12px', color: '#7aa0c4' }}>Acoustic Ducting Channel</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#00e5ff', fontFamily: "'JetBrains Mono', monospace" }}>
                    {MOCK_DERIVED_METRICS.acoustic_ducting}
                  </span>
                </div>
              </div>

              {/* Sound Velocity Profile Insight */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.35)',
                  borderRadius: '12px',
                  padding: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#7aa0c4', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Speed of Sound in Seawater (Mackenzie Formula)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '10px', color: '#7aa0c4' }}>Surface Sound Speed</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#00e5ff', marginTop: '3px' }}>
                      {MOCK_DERIVED_METRICS.sound_speed_surface}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '10px', color: '#7aa0c4' }}>Abyssal Sound Speed</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffaa00', marginTop: '3px' }}>
                      {MOCK_DERIVED_METRICS.sound_speed_abyss}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── TAB 3: LAYER SLICES ──────────────────────────────────────── */}
          {activeTab === 'layers' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '11px', color: '#7aa0c4', marginBottom: '4px' }}>
                Select any layer to inspect telemetry and highlight slice in 3D:
              </div>

              {MOCK_WATER_COLUMN.map((layer, idx) => {
                const isSelected = selectedDepthIndex === idx;
                const dirDeg = ((Math.atan2(layer.uo, layer.vo) * 180 / Math.PI) + 360) % 360;

                return (
                  <div
                    key={`layer-row-${layer.depth}`}
                    onClick={() => setSelectedDepthIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: isSelected ? 'rgba(0, 220, 255, 0.18)' : 'rgba(0, 0, 0, 0.28)',
                      border: isSelected ? '1px solid #00e5ff' : '1px solid rgba(255, 255, 255, 0.05)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {/* Depth */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: isSelected ? '#00e5ff' : '#446688',
                          boxShadow: isSelected ? '0 0 8px #00e5ff' : 'none',
                        }}
                      />
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          fontFamily: "'JetBrains Mono', monospace",
                          color: isSelected ? '#ffffff' : '#9bb8d4',
                        }}
                      >
                        {layer.depth}m
                      </span>
                    </div>

                    {/* Temp & Salinity */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#ff7a36',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {layer.thetao.toFixed(1)}°C
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#00e5ff',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {layer.so.toFixed(1)} PSU
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#00f5a0',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {layer.current_speed.toFixed(2)} m/s
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          color: '#c084fc',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {Math.round(dirDeg)}°
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── TAB 4: PROFILES ─────────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#00e5ff', textTransform: 'uppercase' }}>
                Vertical Decay Profile (0m – 2000m)
              </div>

              {/* Profile SVG Graph */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.45)',
                  borderRadius: '10px',
                  padding: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <svg viewBox="0 0 340 210" style={{ width: '100%', height: 'auto', display: 'block' }}>
                  {/* Axis lines */}
                  <line x1="40" y1="20" x2="40" y2="185" stroke="#335577" strokeWidth="1" />
                  <line x1="40" y1="20" x2="320" y2="20" stroke="#335577" strokeWidth="1" />
                  <line x1="40" y1="185" x2="320" y2="185" stroke="#335577" strokeWidth="1" />

                  {/* Axis Depth Labels */}
                  <text x="34" y="24" fill="#7aa0c4" fontSize="9" textAnchor="end">0m</text>
                  <text x="34" y="65" fill="#7aa0c4" fontSize="9" textAnchor="end">200m</text>
                  <text x="34" y="105" fill="#7aa0c4" fontSize="9" textAnchor="end">500m</text>
                  <text x="34" y="145" fill="#7aa0c4" fontSize="9" textAnchor="end">1000m</text>
                  <text x="34" y="185" fill="#7aa0c4" fontSize="9" textAnchor="end">2000m</text>

                  {/* Curves */}
                  <path d={profileTempPath} fill="none" stroke="#ff7733" strokeWidth="2.5" />
                  <path d={profileSalPath} fill="none" stroke="#00e5ff" strokeWidth="2" strokeDasharray="4 3" />
                </svg>

                {/* Graph Legend */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '10px', fontSize: '10.5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '12px', height: '3px', background: '#ff7733', borderRadius: '2px' }} />
                    <span style={{ color: '#ff9966' }}>θ₀ Temperature (°C)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '12px', height: '3px', background: '#00e5ff', borderRadius: '2px', borderBottom: '1px dashed #00e5ff' }} />
                    <span style={{ color: '#00e5ff' }}>S₀ Salinity (PSU)</span>
                  </div>
                </div>
              </div>

              {/* Profile Description */}
              <div
                style={{
                  fontSize: '11.5px',
                  color: '#88a8c8',
                  lineHeight: '1.5',
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                The vertical profile illustrates steep thermocline decay between 50m and 200m depth, transitioning smoothly from 28.4°C at the photic zone down to stable abyssal temperatures near 1.8°C.
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default DepthSliceStandalone;
