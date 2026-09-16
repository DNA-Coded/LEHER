import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  ArrowLeft, 
  ArrowUpRight,
  RotateCcw, 
  Sliders, 
  ChevronRight, 
  ChevronLeft,
  Compass,
  Maximize2
} from 'lucide-react';
import { predictOceanState } from '@/lib/api/oceanPredictionService';
import { cn } from '@/lib/utils';
import { type TimeZone } from '@/components/ui/landing-page';

const timeZoneMap: Record<TimeZone, { name: string; timeZone: string; offsetLabel: string }> = {
  IST: { name: 'IST (India Standard)', timeZone: 'Asia/Kolkata', offsetLabel: 'UTC+05:30' },
  UTC: { name: 'UTC / GMT (Universal)', timeZone: 'UTC', offsetLabel: 'UTC+00:00' },
  EST: { name: 'EST (US Eastern)', timeZone: 'America/New_York', offsetLabel: 'UTC-05:00' },
  PST: { name: 'PST (US Pacific)', timeZone: 'America/Los_Angeles', offsetLabel: 'UTC-08:00' },
  JST: { name: 'JST (Japan Standard)', timeZone: 'Asia/Tokyo', offsetLabel: 'UTC+09:00' },
  SGT: { name: 'SGT (Singapore)', timeZone: 'Asia/Singapore', offsetLabel: 'UTC+08:00' },
};

const STANDARD_DEPTHS = [0, 30, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000];

interface WaterColumnLayer {
  depth: number;
  thetao: number; // Potential temperature °C
  so: number;     // Salinity PSU
  uo: number;     // Eastward m/s
  vo: number;     // Northward m/s
  current_speed: number;
  chlorophyll: number;
  dirDeg: number;
  dirStr: string;
}

function getZoneLabel(d: number): string {
  if (d === 0) return 'Surface Photic Zone';
  if (d <= 50) return 'Epipelagic Mixed Layer';
  if (d <= 200) return 'Thermocline Transition';
  if (d <= 1000) return 'Mesopelagic Twilight Zone';
  return 'Bathypelagic Abyss';
}

// ─── Scientifically Calibrated Oceanographic Multi-Stop Color Scales ───────────
type ColorStop = [number, string];

const TEMP_STOPS: ColorStop[] = [
  [1.5,  '#090526'], // Extreme abyssal depth frigid void
  [3.5,  '#001a5e'], // Abyssal cold (2000m)
  [6.5,  '#0038a8'], // Deep cold layer (750m)
  [10.0, '#0066ee'], // Lower thermocline (300m)
  [14.0, '#00a8ff'], // Mid thermocline (200m)
  [18.0, '#00e5d4'], // Upper thermocline transition (100m)
  [22.0, '#76ff03'], // Mixed layer threshold (22°C) - electric lime
  [25.0, '#ffd000'], // Warm sub-surface (25°C) - bright golden yellow
  [28.0, '#ff7a00'], // Warm photic layer (28°C) - vivid ocean orange
  [31.0, '#ff2e1f'], // Hot tropical surface (31°C) - vibrant flame red
  [35.0, '#d60036'], // Scorching tropical basin (35°C) - intense crimson
];

const SALINITY_STOPS: ColorStop[] = [
  [33.0, '#050a33'], // Fresh monsoonal plume / river runoff
  [34.2, '#003db3'], // Low salinity coastal
  [34.6, '#0088ff'], // Mild low salinity
  [35.0, '#00e5c0'], // Standard marine background
  [35.3, '#00f576'], // Typical Arabian Sea / open ocean emerald
  [35.7, '#bdf000'], // Elevated salinity (evaporative transition)
  [36.0, '#ffaa00'], // High salinity surface (warm amber-orange)
  [36.4, '#ff3b30'], // Very high salinity (coral red)
  [36.8, '#ff1a88'], // Hypersaline core (radiant magenta)
];

const CURRENT_STOPS: ColorStop[] = [
  [0.002, '#0a0e29'], // Stagnant abyssal drift
  [0.015, '#122475'], // Sluggish deep current
  [0.040, '#0055d4'], // Gentle mid-depth drift
  [0.080, '#00b8ff'], // Moderate subsurface flow
  [0.130, '#00e5b8'], // Active upper layer current
  [0.180, '#00e676'], // Strong current flow (bright spring green)
  [0.240, '#76ff03'], // High-velocity surface jet (neon lime)
  [0.320, '#ffff00'], // Intense current jet core (electric yellow)
];

const CHLOROPHYLL_STOPS: ColorStop[] = [
  [0.001, '#06081c'], // Deep aphotic depletion (2000m)
  [0.015, '#1e164d'], // Oligotrophic twilight zone (500m)
  [0.050, '#004c9e'], // Deep photic boundary (150m)
  [0.150, '#00a8ff'], // Lower euphotic layer (100m)
  [0.350, '#00e5bb'], // Moderate phytoplankton (75m)
  [0.600, '#00c853'], // Productive photic peak (surface-30m) - rich emerald
  [1.100, '#76ff03'], // Active phytoplankton bloom - neon lime
  [1.800, '#00ff55'], // High-density eutrophic bloom - intense green
];

function interpolateColorRamp(value: number, stops: ColorStop[]): THREE.Color {
  if (value <= stops[0][0]) return new THREE.Color(stops[0][1]);
  if (value >= stops[stops.length - 1][0]) return new THREE.Color(stops[stops.length - 1][1]);

  for (let i = 0; i < stops.length - 1; i++) {
    const [v0, c0] = stops[i];
    const [v1, c1] = stops[i + 1];
    if (value >= v0 && value <= v1) {
      const t = (value - v0) / (v1 - v0);
      return new THREE.Color(c0).lerp(new THREE.Color(c1), t);
    }
  }
  return new THREE.Color(stops[stops.length - 1][1]);
}

function getLayerColor(val: number, variable: 'temperature' | 'salinity' | 'currents' | 'chlorophyll'): THREE.Color {
  if (variable === 'salinity') return interpolateColorRamp(val, SALINITY_STOPS);
  if (variable === 'currents') return interpolateColorRamp(val, CURRENT_STOPS);
  if (variable === 'chlorophyll') return interpolateColorRamp(val, CHLOROPHYLL_STOPS);
  return interpolateColorRamp(val, TEMP_STOPS);
}

export default function DepthSlicePage() {
  // Read lat, lon, depth from query params
  const [queryParams] = useState(() => {
    const search = new URLSearchParams(window.location.search);
    const lat = parseFloat(search.get('lat') || '15.4');
    const lon = parseFloat(search.get('lon') || '71.2');
    const depth = parseInt(search.get('depth') || '150', 10);
    return {
      lat: isNaN(lat) ? 15.4 : lat,
      lon: isNaN(lon) ? 71.2 : lon,
      depth: isNaN(depth) ? 150 : depth,
    };
  });

  const [lat] = useState<number>(queryParams.lat);
  const [lon] = useState<number>(queryParams.lon);
  const [selectedDepth, setSelectedDepth] = useState<number>(queryParams.depth);
  const [activeTab, setActiveTab] = useState<'telemetry' | 'layers' | 'profile'>('telemetry');
  const [geometryType, setGeometryType] = useState<'cylinder' | 'cuboid'>('cylinder');
  const [activeVariable, setActiveVariable] = useState<'temperature' | 'salinity' | 'currents' | 'chlorophyll'>('temperature');
  const [panelCollapsed, setPanelCollapsed] = useState<boolean>(false);
  const [selectedTimeZone, setSelectedTimeZone] = useState<TimeZone>('IST');
  const [realTimeClock, setRealTimeClock] = useState<string>('');

  // Generate water column data using predictOceanState
  const waterColumn = useMemo<WaterColumnLayer[]>(() => {
    return STANDARD_DEPTHS.map((d) => {
      const res = predictOceanState(lat, lon, d);
      const thetao = res.variables.thetao?.value ?? (28.5 * Math.exp(-d / 380) + 2.0);
      const so = res.variables.so?.value ?? (35.2 - 0.5 * (d / 2000));
      const uo = res.variables.uo?.value ?? (0.12 * Math.exp(-d / 250));
      const vo = res.variables.vo?.value ?? (-0.08 * Math.exp(-d / 250));
      const current_speed = res.summary.currentSpeedMs;
      const dirDeg = res.summary.currentDirectionDeg;
      const dirStr = res.summary.currentDirectionCompass;
      const chlorophyll = res.variables.chl?.value ?? Math.max(0.001, 0.52 * Math.exp(-d / 120));

      return {
        depth: d,
        thetao: parseFloat(thetao.toFixed(2)),
        so: parseFloat(so.toFixed(2)),
        uo: parseFloat(uo.toFixed(3)),
        vo: parseFloat(vo.toFixed(3)),
        current_speed: parseFloat(current_speed.toFixed(3)),
        chlorophyll: parseFloat(chlorophyll.toFixed(3)),
        dirDeg,
        dirStr,
      };
    });
  }, [lat, lon]);

  // Find closest layer index to selectedDepth
  const selectedIndex = useMemo(() => {
    let bestIdx = 0;
    let minDiff = Infinity;
    waterColumn.forEach((w, idx) => {
      const diff = Math.abs(w.depth - selectedDepth);
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = idx;
      }
    });
    return bestIdx;
  }, [waterColumn, selectedDepth]);

  const activeLayer = waterColumn[selectedIndex] || waterColumn[0];

  // Base prediction for region name and telemetry stats
  const basePrediction = useMemo(() => predictOceanState(lat, lon, selectedDepth), [lat, lon, selectedDepth]);

  // Three.js References
  const mountRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const waterGroupRef = useRef<THREE.Group | null>(null);

  // 3D Elements references
  const waveMeshRef = useRef<THREE.Mesh | null>(null);
  const meniscusMeshRef = useRef<THREE.Mesh | THREE.LineSegments | null>(null);
  const particlesMeshRef = useRef<THREE.Points | null>(null);
  const particleVelocitiesRef = useRef<{ vx: number; vz: number; bobFreq: number; bobAmp: number }[]>([]);
  const layerGroupsRef = useRef<{
    grp: THREE.Group;
    sliceWaveMesh: THREE.Mesh;
    slabMat: THREE.MeshPhysicalMaterial;
    idx: number;
    baseY: number;
    curX: number;
    curZ: number;
    curLift: number;
    targetX: number;
    targetZ: number;
    targetLift: number;
    curScale: number;
    targetScale: number;
  }[]>([]);

  const tetherLineRef = useRef<THREE.Line | null>(null);
  const tetherPointerLineRef = useRef<THREE.Line | null>(null);
  const extractionSocketRef = useRef<THREE.Mesh | THREE.LineSegments | null>(null);
  const hudSpriteRef = useRef<THREE.Sprite | null>(null);
  const hudCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hudTextureRef = useRef<THREE.CanvasTexture | null>(null);

  // Real-time clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      try {
        const options: Intl.DateTimeFormatOptions = {
          timeZone: timeZoneMap[selectedTimeZone].timeZone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        };
        const formatter = new Intl.DateTimeFormat('en-CA', options);
        const parts = formatter.formatToParts(now);
        const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';
        const dateStr = `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
        const timeStr = `${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
        setRealTimeClock(`${dateStr}  ${timeStr} ${selectedTimeZone}`);
      } catch {
        setRealTimeClock(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
      }
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [selectedTimeZone]);

  // Update Floating Holographic HUD Card
  const updateExtractedHud = useCallback((idx: number) => {
    if (!hudCanvasRef.current || !hudTextureRef.current) return;
    const layer = waterColumn[idx];
    if (!layer) return;

    const canvas = hudCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Cybernetic dark glass background
    ctx.fillStyle = 'rgba(2, 12, 28, 0.94)';
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.85)';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.roundRect(8, 8, w - 16, h - 16, 16);
    ctx.fill();
    ctx.stroke();

    // Header banner
    ctx.fillStyle = 'rgba(0, 229, 255, 0.18)';
    ctx.fillRect(8, 8, w - 16, 44);

    // Tech corners
    ctx.strokeStyle = '#00f5a0';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(8, 28); ctx.lineTo(8, 8); ctx.lineTo(28, 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w - 28, h - 8); ctx.lineTo(w - 8, h - 8); ctx.lineTo(w - 8, h - 28); ctx.stroke();

    // Header texts
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`EXTRACTED SLICE: -${layer.depth}m`, 22, 38);

    ctx.fillStyle = '#00f5a0';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('LIVE TELEMETRY', w - 24, 36);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#7aa0c4';
    ctx.font = '500 14px sans-serif';
    ctx.fillText(getZoneLabel(layer.depth), 22, 74);

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(22, 86); ctx.lineTo(w - 22, 86); ctx.stroke();

    // Metrics with active variable highlight
    ctx.font = '600 16px monospace';

    // Temp
    if (activeVariable === 'temperature') {
      ctx.fillStyle = 'rgba(255, 122, 54, 0.24)';
      ctx.fillRect(16, 98, w - 32, 26);
    }
    ctx.fillStyle = '#ff7a36';
    ctx.fillText(`θ₀ Temp:`, 24, 118);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${layer.thetao.toFixed(2)} °C`, 140, 118);

    // Salinity
    if (activeVariable === 'salinity') {
      ctx.fillStyle = 'rgba(0, 229, 255, 0.24)';
      ctx.fillRect(16, 130, w - 32, 26);
    }
    ctx.fillStyle = '#00e5ff';
    ctx.fillText(`S₀ Salinity:`, 24, 150);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${layer.so.toFixed(2)} PSU`, 140, 150);

    // Current
    if (activeVariable === 'currents') {
      ctx.fillStyle = 'rgba(0, 245, 160, 0.24)';
      ctx.fillRect(16, 162, w - 32, 26);
    }
    ctx.fillStyle = '#00f5a0';
    ctx.fillText(`Current:`, 24, 182);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${layer.current_speed.toFixed(3)} m/s (${Math.round(layer.dirDeg)}°)`, 140, 182);

    // Chlorophyll
    if (activeVariable === 'chlorophyll') {
      ctx.fillStyle = 'rgba(192, 132, 252, 0.24)';
      ctx.fillRect(16, 194, w - 32, 26);
    }
    ctx.fillStyle = '#c084fc';
    ctx.fillText(`Chl-a:`, 24, 214);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${layer.chlorophyll.toFixed(3)} mg/m³`, 140, 214);

    hudTextureRef.current.needsUpdate = true;
  }, [waterColumn, activeVariable]);

  // Initialize Three.js scene once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(3.1, 3.8, 6.4);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(-3.0, 0, 0);
    controls.minDistance = 2.5;
    controls.maxDistance = 18;
    controls.maxPolarAngle = Math.PI / 2 + 0.25;
    controlsRef.current = controls;

    // Lighting
    scene.add(new THREE.AmbientLight(0x90caf9, 0.85));
    const dirLight1 = new THREE.DirectionalLight(0xe0f7fa, 1.4);
    dirLight1.position.set(10, 15, 8);
    scene.add(dirLight1);
    const dirLight2 = new THREE.DirectionalLight(0x0055ff, 0.6);
    dirLight2.position.set(-10, -5, -8);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0x00e5ff, 1.3, 10);
    scene.add(pointLight);

    const sunCausticLight = new THREE.PointLight(0xd0f8ff, 2.0, 12);
    sunCausticLight.position.set(-3.0, 6.0, 1.0);
    scene.add(sunCausticLight);

    const waterGroup = new THREE.Group();
    waterGroup.position.set(-3.0, 0, 0);
    scene.add(waterGroup);
    waterGroupRef.current = waterGroup;

    // HUD sprite removed

    // ── Animation Loop ──
    let animationFrameId: number;
    let time = 0;
    const BLOCK_HEIGHT = 5.8;
    const BLOCK_RADIUS = 1.6;
    const BLOCK_WIDTH = 3.0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      time += 0.016;
      controls.update();

      // 1. Dynamic Ocean Surface Waves Calculation
      const waveMesh = waveMeshRef.current;
      if (waveMesh && waveMesh.geometry.userData.origX) {
        const posAttr = waveMesh.geometry.attributes.position;
        const origX = waveMesh.geometry.userData.origX;
        const origY = waveMesh.geometry.userData.origY;
        const count = posAttr.count;

        for (let i = 0; i < count; i++) {
          const ox = origX[i];
          const oy = origY[i];
          const w1 = Math.sin(ox * 2.2 + oy * 1.5 + time * 2.4) * 0.055;
          const w2 = Math.cos(ox * 3.1 - oy * 2.0 + time * 1.9) * 0.035;
          const w3 = Math.sin((ox + oy) * 4.6 + time * 3.4) * 0.018;
          const dist = Math.hypot(ox, oy);
          const w4 = Math.cos(dist * 4.0 - time * 2.7) * 0.016;
          posAttr.array[i * 3 + 2] = w1 + w2 + w3 + w4;
        }
        posAttr.needsUpdate = true;
        waveMesh.geometry.computeVertexNormals();
        (waveMesh.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.42 + Math.sin(time * 2.5) * 0.08;
      }

      // 2. Meniscus bobbing
      const meniscus = meniscusMeshRef.current;
      if (meniscus) {
        meniscus.position.y = BLOCK_HEIGHT / 2 + 0.018 + Math.sin(time * 2.2) * 0.012;
      }

      // 3. Sun caustic light ray bob
      sunCausticLight.position.x = Math.sin(time * 1.1) * 2.0 - 3.0;
      sunCausticLight.position.z = Math.cos(time * 0.9) * 2.0;

      // 4. Suspended Marine Snow & Plankton Drift
      const particles = particlesMeshRef.current;
      const vels = particleVelocitiesRef.current;
      if (particles && vels.length > 0) {
        const pArray = particles.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < vels.length; i++) {
          const vel = vels[i];
          pArray[i * 3] += vel.vx;
          pArray[i * 3 + 2] += vel.vz;
          pArray[i * 3 + 1] += Math.sin(time * vel.bobFreq) * vel.bobAmp;

          // Wrap boundaries
          const dSq = pArray[i * 3] * pArray[i * 3] + pArray[i * 3 + 2] * pArray[i * 3 + 2];
          if (dSq > BLOCK_RADIUS * BLOCK_RADIUS * 0.85) {
            pArray[i * 3] *= -0.92;
            pArray[i * 3 + 2] *= -0.92;
          }
        }
        particles.geometry.attributes.position.needsUpdate = true;
      }

      // 5. Lateral Slide-out Physics Animation & Wave Dynamics for Extracted Slices
      layerGroupsRef.current.forEach((item) => {
        item.curX += (item.targetX - item.curX) * 0.085;
        item.curZ += (item.targetZ - item.curZ) * 0.085;
        item.curLift += (item.targetLift - item.curLift) * 0.085;
        item.curScale += (item.targetScale - item.curScale) * 0.085;

        item.grp.position.x = item.curX;
        item.grp.position.z = item.curZ;
        item.grp.scale.setScalar(item.curScale);
        item.grp.position.y = item.baseY + item.curLift + Math.sin(time * 1.3 + item.idx * 0.45) * 0.012;

        // Dynamic 3D undulating waves on the extracted slice top
        const sliceWave = item.sliceWaveMesh;
        if (sliceWave && sliceWave.geometry.userData.origX) {
          const isExtracted = item.curX > 0.15;
          const slideProgress = Math.min(1.0, item.curX / 3.0);
          const sPos = sliceWave.geometry.attributes.position;
          const sOrigX = sliceWave.geometry.userData.origX;
          const sOrigY = sliceWave.geometry.userData.origY;
          const sCount = sPos.count;
          const sAmp = (isExtracted ? 1.35 : 0.2) * Math.max(0.15, slideProgress);

          for (let j = 0; j < sCount; j++) {
            const ox = sOrigX[j];
            const oy = sOrigY[j];
            const sw1 = Math.sin(ox * 3.0 + oy * 2.2 + time * 3.0) * (0.045 * sAmp);
            const sw2 = Math.cos(ox * 3.8 - oy * 2.6 + time * 2.3) * (0.032 * sAmp);
            sPos.array[j * 3 + 2] = sw1 + sw2;
          }
          sPos.needsUpdate = true;
          sliceWave.geometry.computeVertexNormals();

          if (isExtracted) {
            (sliceWave.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.55 + Math.sin(time * 2.8) * 0.15;
          }
        }
      });

      // 6. Tether & socket updates
      const currentSelectedIdx = (controls as any).userData?.selectedIndex ?? 0;
      const activeItem = layerGroupsRef.current[currentSelectedIdx];
      if (activeItem) {
        const { curX, curZ, baseY } = activeItem;
        const curY = activeItem.grp.position.y;

        if (tetherLineRef.current) {
          const tPos = tetherLineRef.current.geometry.attributes.position.array as Float32Array;
          tPos[0] = 0;    tPos[1] = baseY; tPos[2] = 0;
          tPos[3] = curX; tPos[4] = curY;  tPos[5] = curZ;
          tetherLineRef.current.geometry.attributes.position.needsUpdate = true;
          (tetherLineRef.current.material as THREE.LineBasicMaterial).opacity = Math.min(0.85, Math.max(0, curX / 2.5));
        }

        if (tetherPointerLineRef.current) {
          const pPos = tetherPointerLineRef.current.geometry.attributes.position.array as Float32Array;
          pPos[0] = curX; pPos[1] = curY + 0.65; pPos[2] = curZ;
          pPos[3] = curX; pPos[4] = curY + 0.15; pPos[5] = curZ;
          tetherPointerLineRef.current.geometry.attributes.position.needsUpdate = true;
          (tetherPointerLineRef.current.material as THREE.LineBasicMaterial).opacity = Math.min(0.75, Math.max(0, (curX - 0.5) / 2.0));
        }

        if (extractionSocketRef.current) {
          extractionSocketRef.current.position.y = baseY;
          const sMat = (extractionSocketRef.current as any).material;
          if (sMat) sMat.opacity = Math.min(0.75, Math.max(0, curX / 2.5));
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const ro = new ResizeObserver(() => {
      handleResize();
    });
    if (mountRef.current) {
      ro.observe(mountRef.current);
    }

    // ── 3D Raycasting Slice Selection ──
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleCanvasClick = (e: MouseEvent) => {
      if (!canvas || !camera) return;
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes: THREE.Mesh[] = [];
      layerGroupsRef.current.forEach((item) => {
        item.grp.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.userData.parentIdx = item.idx;
            meshes.push(child as THREE.Mesh);
          }
        });
      });

      const hits = raycaster.intersectObjects(meshes, false);
      if (hits.length > 0) {
        const hitIdx = hits[0].object.userData.parentIdx;
        if (typeof hitIdx === 'number' && waterColumn[hitIdx]) {
          setSelectedDepth(waterColumn[hitIdx].depth);
        }
      }
    };
    canvas.addEventListener('click', handleCanvasClick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('click', handleCanvasClick);
      ro.disconnect();
      renderer.dispose();
      controls.dispose();
    };
  }, [waterColumn]);

  // Keep control's userData updated with selectedIndex for animation loop
  useEffect(() => {
    if (controlsRef.current) {
      (controlsRef.current as any).userData = { selectedIndex };
    }
  }, [selectedIndex]);

  // Rebuild 3D Volumetric Water Column whenever geometryType, activeVariable, or waterColumn changes
  useEffect(() => {
    const waterGroup = waterGroupRef.current;
    if (!waterGroup) return;

    // Clear previous children except HUD sprite
    const hud = hudSpriteRef.current;
    const toRemove = waterGroup.children.filter((c) => c !== hud);
    toRemove.forEach((c) => waterGroup.remove(c));

    layerGroupsRef.current = [];
    particleVelocitiesRef.current = [];

    const BLOCK_HEIGHT = 5.8;
    const BLOCK_RADIUS = 1.6;
    const BLOCK_WIDTH = 3.0;
    const maxDepth = waterColumn[waterColumn.length - 1]?.depth || 2000;

    // 1. Outer Translucent Water Column
    const outerGeo =
      geometryType === 'cylinder'
        ? new THREE.CylinderGeometry(BLOCK_RADIUS, BLOCK_RADIUS, BLOCK_HEIGHT, 64, 32, false)
        : new THREE.BoxGeometry(BLOCK_WIDTH, BLOCK_HEIGHT, BLOCK_WIDTH, 24, 32, 24);

    const outerMat = new THREE.MeshPhysicalMaterial({
      color: 0x004c8c,
      emissive: 0x001428,
      emissiveIntensity: 0.28,
      transmission: 0.84,
      opacity: 0.82,
      transparent: true,
      roughness: 0.05,
      metalness: 0.03,
      ior: 1.333,
      reflectivity: 0.65,
      clearcoat: 0.8,
      clearcoatRoughness: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    waterGroup.add(outerMesh);

    // 2. Realistic 3D Dynamic Ocean Water Surface with Waves (Main Column Cap)
    const capGeo =
      geometryType === 'cylinder'
        ? new THREE.RingGeometry(0.001, BLOCK_RADIUS - 0.015, 64, 32)
        : new THREE.PlaneGeometry(BLOCK_WIDTH - 0.03, BLOCK_WIDTH - 0.03, 56, 56);

    const vCount = capGeo.attributes.position.count;
    const origX = new Float32Array(vCount);
    const origY = new Float32Array(vCount);
    const posArr = capGeo.attributes.position.array;
    for (let i = 0; i < vCount; i++) {
      origX[i] = posArr[i * 3];
      origY[i] = posArr[i * 3 + 1];
    }
    capGeo.userData = { origX, origY };

    const surfaceVal =
      activeVariable === 'salinity'
        ? waterColumn[0].so
        : activeVariable === 'currents'
        ? waterColumn[0].current_speed
        : activeVariable === 'chlorophyll'
        ? waterColumn[0].chlorophyll
        : waterColumn[0].thetao;
    const surfaceColor = getLayerColor(surfaceVal, activeVariable);

    const capMat = new THREE.MeshPhysicalMaterial({
      color: surfaceColor,
      emissive: surfaceColor,
      emissiveIntensity: 0.45,
      roughness: 0.08,
      metalness: 0.1,
      transmission: 0.62,
      transparent: true,
      opacity: 0.88,
      ior: 1.333,
      reflectivity: 0.85,
      clearcoat: 0.95,
      clearcoatRoughness: 0.06,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const capMesh = new THREE.Mesh(capGeo, capMat);
    capMesh.position.set(0, BLOCK_HEIGHT / 2 + 0.015, 0);
    capMesh.rotation.x = -Math.PI / 2;
    waterGroup.add(capMesh);
    waveMeshRef.current = capMesh;

    // Meniscus Ring
    if (geometryType === 'cylinder') {
      const ringGeo = new THREE.RingGeometry(BLOCK_RADIUS - 0.04, BLOCK_RADIUS + 0.02, 64);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f5a0, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
      const meniscus = new THREE.Mesh(ringGeo, ringMat);
      meniscus.position.set(0, BLOCK_HEIGHT / 2 + 0.02, 0);
      meniscus.rotation.x = -Math.PI / 2;
      waterGroup.add(meniscus);
      meniscusMeshRef.current = meniscus;
    } else {
      const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(BLOCK_WIDTH * 0.99, 0.02, BLOCK_WIDTH * 0.99));
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x00f5a0, transparent: true, opacity: 0.65 });
      const meniscus = new THREE.LineSegments(edgeGeo, edgeMat);
      meniscus.position.set(0, BLOCK_HEIGHT / 2 + 0.01, 0);
      waterGroup.add(meniscus);
      meniscusMeshRef.current = meniscus;
    }

    // 3. Suspended Marine Snow & Plankton Particles
    const pCount = 280;
    const pGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(pCount * 3);
    const pColors = new Float32Array(pCount * 3);
    const vels: { vx: number; vz: number; bobFreq: number; bobAmp: number }[] = [];

    for (let i = 0; i < pCount; i++) {
      const y = (Math.random() - 0.5) * (BLOCK_HEIGHT * 0.92);
      const r = Math.sqrt(Math.random()) * (BLOCK_RADIUS * 0.88);
      const theta = Math.random() * Math.PI * 2;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      pPositions[i * 3] = x;
      pPositions[i * 3 + 1] = y;
      pPositions[i * 3 + 2] = z;

      const depthRatio = (BLOCK_HEIGHT / 2 - y) / BLOCK_HEIGHT;
      if (depthRatio < 0.22) {
        pColors[i * 3] = 0.1; pColors[i * 3 + 1] = 0.95; pColors[i * 3 + 2] = 0.85;
      } else {
        pColors[i * 3] = 0.65; pColors[i * 3 + 1] = 0.85; pColors[i * 3 + 2] = 1.0;
      }

      const decay = Math.exp(-depthRatio * 3.2);
      vels.push({
        vx: (0.16 * decay + (Math.random() - 0.5) * 0.03) * 0.007,
        vz: (-0.10 * decay + (Math.random() - 0.5) * 0.03) * 0.007,
        bobFreq: 1.2 + Math.random() * 2.2,
        bobAmp: 0.001 + Math.random() * 0.0025,
      });
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));
    particleVelocitiesRef.current = vels;

    const pMat = new THREE.PointsMaterial({
      size: 0.065,
      transparent: true,
      opacity: 0.8,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(pGeo, pMat);
    waterGroup.add(particles);
    particlesMeshRef.current = particles;

    // 4. Layer Slices with Dynamic 3D Waves & Lateral Slide Extraction
    const SLIDE_FAR_X = 4.2;
    const SLIDE_FAR_Z = 1.25;
    const SLIDE_LIFT_Y = 0.28;

    waterColumn.forEach((layer, idx) => {
      const ratio = layer.depth / maxDepth;
      const y = BLOCK_HEIGHT / 2 - ratio * BLOCK_HEIGHT;
      const val =
        activeVariable === 'salinity'
          ? layer.so
          : activeVariable === 'currents'
          ? layer.current_speed
          : activeVariable === 'chlorophyll'
          ? layer.chlorophyll
          : layer.thetao;
      const color = getLayerColor(val, activeVariable);
      const isHighlight = selectedIndex === idx;

      const grp = new THREE.Group();
      grp.position.set(isHighlight ? SLIDE_FAR_X : 0, y + (isHighlight ? SLIDE_LIFT_Y : 0), isHighlight ? SLIDE_FAR_Z : 0);

      // A. Physical Slab Thickness
      const sliceThickness = 0.26;
      const slabGeo =
        geometryType === 'cylinder'
          ? new THREE.CylinderGeometry(BLOCK_RADIUS * 0.98, BLOCK_RADIUS * 0.98, sliceThickness, 48, 1, false)
          : new THREE.BoxGeometry(BLOCK_WIDTH * 0.98, sliceThickness, BLOCK_WIDTH * 0.98);

      const slabMat = new THREE.MeshPhysicalMaterial({
        color,
        emissive: color,
        emissiveIntensity: isHighlight ? 0.42 : 0.08,
        transmission: 0.78,
        transparent: true,
        opacity: isHighlight ? 0.94 : 0.22,
        roughness: 0.06,
        metalness: 0.04,
        ior: 1.333,
        clearcoat: 0.88,
        clearcoatRoughness: 0.06,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const slabMesh = new THREE.Mesh(slabGeo, slabMat);
      grp.add(slabMesh);

      // B. Dynamic Undulating 3D Water Wave Surface on Top of Extracted Slice
      const sliceWaveGeo =
        geometryType === 'cylinder'
          ? new THREE.RingGeometry(0.001, BLOCK_RADIUS * 0.97, 48, 22)
          : new THREE.PlaneGeometry(BLOCK_WIDTH * 0.97, BLOCK_WIDTH * 0.97, 40, 40);

      const sCount = sliceWaveGeo.attributes.position.count;
      const sOrigX = new Float32Array(sCount);
      const sOrigY = new Float32Array(sCount);
      const sPosArr = sliceWaveGeo.attributes.position.array;
      for (let j = 0; j < sCount; j++) {
        sOrigX[j] = sPosArr[j * 3];
        sOrigY[j] = sPosArr[j * 3 + 1];
      }
      sliceWaveGeo.userData = { origX: sOrigX, origY: sOrigY };

      const sliceWaveMat = new THREE.MeshPhysicalMaterial({
        color,
        emissive: color,
        emissiveIntensity: isHighlight ? 0.68 : 0.25,
        roughness: 0.08,
        metalness: 0.08,
        transmission: 0.65,
        transparent: true,
        opacity: isHighlight ? 0.94 : 0.42,
        ior: 1.333,
        reflectivity: 0.85,
        clearcoat: 0.95,
        clearcoatRoughness: 0.06,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const sliceWaveMesh = new THREE.Mesh(sliceWaveGeo, sliceWaveMat);
      sliceWaveMesh.rotation.x = -Math.PI / 2;
      sliceWaveMesh.position.y = sliceThickness / 2 + 0.005;
      grp.add(sliceWaveMesh);

      // C. Meniscus Rim Edge
      if (geometryType === 'cylinder') {
        const ringGeo = new THREE.RingGeometry(BLOCK_RADIUS * 0.95, BLOCK_RADIUS * 0.99, 48);
        const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: isHighlight ? 0.95 : 0.55 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = sliceThickness / 2 + 0.01;
        grp.add(ring);
      } else {
        const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(BLOCK_WIDTH * 0.98, 0.02, BLOCK_WIDTH * 0.98));
        const edgeMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: isHighlight ? 0.95 : 0.5 });
        const edges = new THREE.LineSegments(edgeGeo, edgeMat);
        edges.position.y = sliceThickness / 2 + 0.01;
        grp.add(edges);
      }

      // D. Current Velocity 3D Arrow
      const arrowLength = Math.max(0.35, Math.min(1.3, layer.current_speed * 5.2));
      const angle = Math.atan2(layer.vo, layer.uo);
      const arrowGrp = new THREE.Group();
      arrowGrp.rotation.y = -angle;
      arrowGrp.position.y = sliceThickness / 2 + 0.04;

      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, arrowLength, 8),
        new THREE.MeshBasicMaterial({ color: 0x00ffcc })
      );
      shaft.position.set(arrowLength / 2, 0, 0);
      shaft.rotation.z = Math.PI / 2;
      arrowGrp.add(shaft);

      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.22, 10),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      cone.position.set(arrowLength, 0, 0);
      cone.rotation.z = -Math.PI / 2;
      arrowGrp.add(cone);
      grp.add(arrowGrp);

      layerGroupsRef.current.push({
        grp,
        sliceWaveMesh,
        slabMat,
        idx,
        baseY: y,
        curX: isHighlight ? SLIDE_FAR_X : 0,
        curZ: isHighlight ? SLIDE_FAR_Z : 0,
        curLift: isHighlight ? SLIDE_LIFT_Y : 0,
        targetX: isHighlight ? SLIDE_FAR_X : 0,
        targetZ: isHighlight ? SLIDE_FAR_Z : 0,
        targetLift: isHighlight ? SLIDE_LIFT_Y : 0,
        curScale: isHighlight ? 1.08 : 1.0,
        targetScale: isHighlight ? 1.08 : 1.0,
      });

      waterGroup.add(grp);
    });

    // 5. Holographic Extraction Tether & Socket
    const tetherGeo = new THREE.BufferGeometry();
    tetherGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const tetherMat = new THREE.LineBasicMaterial({ color: 0x00f5a0, transparent: true, opacity: 0 });
    const tether = new THREE.Line(tetherGeo, tetherMat);
    waterGroup.add(tether);
    tetherLineRef.current = tether;

    const pointerGeo = new THREE.BufferGeometry();
    pointerGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const pointerMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0 });
    const pointer = new THREE.Line(pointerGeo, pointerMat);
    waterGroup.add(pointer);
    tetherPointerLineRef.current = pointer;

    if (geometryType === 'cylinder') {
      const socketGeo = new THREE.RingGeometry(BLOCK_RADIUS * 0.96, BLOCK_RADIUS * 1.01, 48);
      const socketMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0, side: THREE.DoubleSide });
      const socket = new THREE.Mesh(socketGeo, socketMat);
      socket.rotation.x = -Math.PI / 2;
      waterGroup.add(socket);
      extractionSocketRef.current = socket;
    } else {
      const socketGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(BLOCK_WIDTH * 0.99, 0.04, BLOCK_WIDTH * 0.99));
      const socketMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0 });
      const socket = new THREE.LineSegments(socketGeo, socketMat);
      waterGroup.add(socket);
      extractionSocketRef.current = socket;
    }

    // Seabed base
    const baseGeo =
      geometryType === 'cylinder'
        ? new THREE.CircleGeometry(BLOCK_RADIUS + 0.08, 48)
        : new THREE.PlaneGeometry(BLOCK_WIDTH + 0.15, BLOCK_WIDTH + 0.15);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x001428, roughness: 0.92, metalness: 0.2 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.set(0, -BLOCK_HEIGHT / 2 - 0.02, 0);
    baseMesh.rotation.x = Math.PI / 2;
    waterGroup.add(baseMesh);

    // Initial HUD update
    updateExtractedHud(selectedIndex);
  }, [geometryType, activeVariable, waterColumn, updateExtractedHud]);

  // Handle Depth Selection Updates (Slide target interpolation trigger)
  useEffect(() => {
    const SLIDE_FAR_X = 4.2;
    const SLIDE_FAR_Z = 1.25;
    const SLIDE_LIFT_Y = 0.28;

    layerGroupsRef.current.forEach((item) => {
      const isHighlight = selectedIndex === item.idx;
      item.targetX = isHighlight ? SLIDE_FAR_X : 0;
      item.targetZ = isHighlight ? SLIDE_FAR_Z : 0;
      item.targetLift = isHighlight ? SLIDE_LIFT_Y : 0;
      item.targetScale = isHighlight ? 1.08 : 1.0;

      if (item.sliceWaveMesh) {
        (item.sliceWaveMesh.material as THREE.MeshPhysicalMaterial).emissiveIntensity = isHighlight ? 0.68 : 0.25;
        (item.sliceWaveMesh.material as THREE.MeshPhysicalMaterial).opacity = isHighlight ? 0.94 : 0.42;
      }
      if (item.slabMat) {
        item.slabMat.opacity = isHighlight ? 0.94 : 0.22;
        item.slabMat.emissiveIntensity = isHighlight ? 0.42 : 0.08;
      }
    });

    updateExtractedHud(selectedIndex);
  }, [selectedIndex, updateExtractedHud]);

  // Handle camera reset
  const handleResetCamera = useCallback(() => {
    if (controlsRef.current && cameraRef.current) {
      controlsRef.current.target.set(-3.0, 0, 0);
      cameraRef.current.position.set(3.1, 3.8, 6.4);
      controlsRef.current.update();
    }
  }, []);

  // Compute Color Scale Legend values
  const legendConfig = useMemo(() => {
    let title = 'θ₀ Temperature';
    let valStr = `${activeLayer.thetao.toFixed(2)} °C`;
    let stops = TEMP_STOPS;
    let curVal = activeLayer.thetao;
    let ticks = ['1.5°C', '12°C', '22°C', '35°C'];

    if (activeVariable === 'salinity') {
      title = 'S₀ Salinity';
      valStr = `${activeLayer.so.toFixed(2)} PSU`;
      stops = SALINITY_STOPS;
      curVal = activeLayer.so;
      ticks = ['33.0', '34.8', '35.7', '36.8 PSU'];
    } else if (activeVariable === 'currents') {
      title = 'Current Velocity';
      valStr = `${activeLayer.current_speed.toFixed(3)} m/s`;
      stops = CURRENT_STOPS;
      curVal = activeLayer.current_speed;
      ticks = ['0.00', '0.08', '0.18', '0.32 m/s'];
    } else if (activeVariable === 'chlorophyll') {
      title = '🌿 Chlorophyll-a';
      valStr = `${activeLayer.chlorophyll.toFixed(3)} mg/m³`;
      stops = CHLOROPHYLL_STOPS;
      curVal = activeLayer.chlorophyll;
      ticks = ['0.00', '0.15', '0.60', '1.80 mg/m³'];
    }

    const minV = stops[0][0];
    const maxV = stops[stops.length - 1][0];
    const pct = Math.max(0, Math.min(100, ((curVal - minV) / (maxV - minV)) * 100));

    const gradParts = stops.map(([v, c]) => {
      const p = ((v - minV) / (maxV - minV) * 100).toFixed(1);
      return `${c} ${p}%`;
    });
    const gradCss = `linear-gradient(to right, ${gradParts.join(', ')})`;
    const layerCol = getLayerColor(curVal, activeVariable);
    const hexCol = '#' + layerCol.getHexString();

    return { title, valStr, gradCss, pct, ticks, hexCol };
  }, [activeLayer, activeVariable]);

  return (
    <div className="h-screen w-full bg-[#080808] text-white flex flex-col overflow-hidden font-sans select-none">
      {/* ── TOP NAVIGATION BAR (Exact Main Repo Layout) ── */}
      <header className="h-16 bg-[#090909]/95 backdrop-blur-xl border-b border-[#222222] px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 shadow-md">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                window.location.href = `/operations?lat=${lat}&lon=${lon}&depth=${selectedDepth}`;
              }
            }}
            className="p-2 rounded-xl bg-[#141414] hover:bg-[#202020] border border-[#262626] text-[#cccccc] hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Return to Operations Console"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Operations</span>
          </button>

          <div className="h-4 w-[1px] bg-[#222222] hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <img 
              src="/logo.png" 
              alt="Leher Logo" 
              title="Leher" 
              className="h-7 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(56,189,248,0.35)]" 
            />
            <div>
              <div className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <span>3D Volumetric Depth Slice</span>
              </div>
              <div className="text-[11px] text-[#888888] font-mono hidden md:block">
                {basePrediction.location.regionName} ({lat >= 0 ? `${lat.toFixed(4)}°N` : `${Math.abs(lat).toFixed(4)}°S`}, {lon >= 0 ? `${lon.toFixed(4)}°E` : `${Math.abs(lon).toFixed(4)}°W`}) @ {selectedDepth}m
              </div>
            </div>
          </div>
        </div>

        {/* Center Primary Navigation */}
        <div className="hidden lg:flex items-center gap-1 text-xs font-medium">
          <a
            href="/"
            className="px-3 py-1.5 rounded-xl text-[#888888] hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            Home
          </a>
          <a
            href="/about"
            className="px-3 py-1.5 rounded-xl text-[#888888] hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            About
          </a>
          <a
            href="/operations"
            className="px-3 py-1.5 rounded-xl text-[#888888] hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            Explore / Platform
          </a>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 font-mono text-xs text-[#aaaaaa] bg-[#141414] px-3 py-1.5 rounded-xl border border-[#262626]">
            <span>{realTimeClock}</span>
            <select
              value={selectedTimeZone}
              onChange={(e) => setSelectedTimeZone(e.target.value as TimeZone)}
              className="bg-[#1f1f1f] text-white text-xs font-mono rounded px-1.5 py-0.5 border border-[#333333] focus:outline-none cursor-pointer hover:border-cyan-500 transition-colors"
            >
              {Object.entries(timeZoneMap).map(([tz, info]) => (
                <option key={tz} value={tz}>
                  {tz} ({info.offsetLabel})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              window.open(`/details?lat=${lat}&lon=${lon}&depth=${selectedDepth}`, '_blank');
            }}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-medium text-white transition-all cursor-pointer flex items-center gap-1.5"
            title="Open CMEMS Parameter Dossier"
          >
            <span>Parameter Dossier</span>
            <Maximize2 className="w-3.5 h-3.5 text-[#aaaaaa]" />
          </button>
        </div>
      </header>

      {/* ── MAIN WORKSPACE: 3D CANVAS + TELEMETRY PANEL ── */}
      <div className="flex-1 flex relative overflow-hidden bg-[#1c1c1c]">
        {/* 3D Visualizer Area */}
        <div ref={mountRef} className="flex-1 h-full relative overflow-hidden">
          <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

          {/* Top Left: Coordinates Badge */}
          <div className="absolute top-4 left-4 z-10 pointer-events-none">
            <div className="pointer-events-auto bg-[#090909]/90 backdrop-blur-xl border border-[#222222] rounded-xl px-3.5 py-2 shadow-xl flex items-center gap-2">
              <div className="font-mono text-xs text-[#e0e0e0]">
                <strong className="text-white">{basePrediction.location.regionName}</strong> • {lat.toFixed(4)}°N, {lon.toFixed(4)}°E
              </div>
            </div>
          </div>

          {/* ── UNIFIED TOP-RIGHT CARD: Controls + Telemetry ── */}
          <div className="absolute top-4 right-4 z-10 pointer-events-none w-64">
            <div className="pointer-events-auto bg-[#0c0c0c]/95 backdrop-blur-xl border border-[#222222] rounded-2xl overflow-hidden shadow-2xl">

              {/* Region Header */}
              <div className="px-4 pt-3.5 pb-2 border-b border-[#1e1e1e]">
                <div className="text-[10px] text-[#666666] font-mono">{basePrediction.location.regionName}</div>
                <div className="text-xs font-bold text-white mt-0.5">{getZoneLabel(activeLayer.depth)}</div>
                <div className="text-[10px] font-mono text-[#555555] mt-0.5">{lat.toFixed(4)}°N, {lon.toFixed(4)}°E • <span className="text-cyan-500">{activeLayer.depth}m</span></div>
              </div>

              {/* Geometry Toggle */}
              <div className="px-3 pt-3 pb-1.5">
                <div className="text-[9px] text-[#555555] font-mono uppercase tracking-widest mb-1.5">Shape</div>
                <div className="flex bg-[#141414] rounded-lg p-0.5 border border-[#262626] w-full">
                  <button
                    onClick={() => setGeometryType('cylinder')}
                    className={cn(
                      "flex-1 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                      geometryType === 'cylinder' ? "bg-white text-black font-bold shadow" : "text-[#666666] hover:text-white"
                    )}
                  >Cylinder</button>
                  <button
                    onClick={() => setGeometryType('cuboid')}
                    className={cn(
                      "flex-1 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                      geometryType === 'cuboid' ? "bg-white text-black font-bold shadow" : "text-[#666666] hover:text-white"
                    )}
                  >Cuboid</button>
                </div>
              </div>

              {/* Variable Selector */}
              <div className="px-3 pb-2">
                <div className="text-[9px] text-[#555555] font-mono uppercase tracking-widest mb-1.5">Variable</div>
                <div className="grid grid-cols-2 gap-1">
                  {([
                    { key: 'temperature', label: 'θ₀ Temp' },
                    { key: 'salinity',    label: 'S₀ Salinity' },
                    { key: 'currents',    label: 'Velocity' },
                    { key: 'chlorophyll', label: '🌿 Chl-a' },
                  ] as const).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setActiveVariable(key)}
                      className={cn(
                        "py-1 px-2 text-[10px] font-medium rounded-lg border transition-all cursor-pointer text-center",
                        activeVariable === key
                          ? key === 'chlorophyll'
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold"
                            : "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-bold"
                          : "bg-[#141414] border-[#262626] text-[#666666] hover:text-white hover:border-[#333333]"
                      )}
                    >{label}</button>
                  ))}
                </div>
              </div>

              {/* Color Scale Legend */}
              <div className="px-3 pb-2.5 border-t border-[#1a1a1a] pt-2.5">
                <div className="flex justify-between items-center text-[10px] font-mono mb-1.5">
                  <span className="text-[#888888] font-bold">{legendConfig.title}</span>
                  <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
                    <span className="w-2 h-2 rounded-full border border-white/30" style={{ backgroundColor: legendConfig.hexCol }} />
                    {legendConfig.valStr}
                  </span>
                </div>
                <div className="relative w-full h-2 rounded-full border border-white/10 overflow-visible">
                  <div className="w-full h-full rounded-full" style={{ background: legendConfig.gradCss }} />
                  <div
                    className="absolute -top-1 w-1.5 h-4 bg-white rounded-full shadow-[0_0_6px_#fff] -translate-x-1/2 pointer-events-none transition-all duration-300"
                    style={{ left: `${legendConfig.pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-[#555555] font-mono mt-1">
                  {legendConfig.ticks.map((t) => <span key={t}>{t}</span>)}
                </div>
              </div>

              {/* Divider */}
              <div className="mx-3 h-px bg-[#1e1e1e]" />

              {/* Telemetry Rows */}
              <div className="px-3 py-2.5 space-y-1.5">
                {[
                  { label: 'Temperature', value: `${activeLayer.thetao.toFixed(2)} °C` },
                  { label: 'Salinity',    value: `${activeLayer.so.toFixed(2)} PSU` },
                  { label: 'Current',     value: `${activeLayer.current_speed.toFixed(3)} m/s` },
                  { label: 'Direction',   value: `${Math.round(activeLayer.dirDeg)}° ${activeLayer.dirStr}` },
                  { label: 'Chl-a',       value: `${activeLayer.chlorophyll.toFixed(3)} mg/m³` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-[10px] text-[#666666]">{label}</span>
                    <span className="text-[10px] font-bold font-mono text-white">{value}</span>
                  </div>
                ))}
              </div>

              {/* Reset Camera Footer */}
              <div className="px-3 pb-3">
                <button
                  onClick={handleResetCamera}
                  className="w-full py-1.5 rounded-lg bg-[#141414] hover:bg-[#1e1e1e] border border-[#262626] hover:border-[#333333] text-[10px] font-mono text-[#888888] hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset Camera
                </button>
              </div>
            </div>
          </div>



          {/* Collapse Trigger (When panel is minimized) */}
          {panelCollapsed && (
            <button
              onClick={() => setPanelCollapsed(false)}
              className="absolute top-20 right-4 z-20 bg-[#0c0c0c]/95 backdrop-blur-xl border border-cyan-500/40 rounded-xl px-4 py-2.5 text-xs font-bold text-cyan-400 shadow-2xl hover:bg-[#161616] transition-all cursor-pointer flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Show Telemetry ({activeLayer.depth}m)</span>
            </button>
          )}
        </div>

        {/* ── SIDE TELEMETRY DATA PANEL (Exact Main Repo Layout) ── */}
        <aside
          className={cn(
            "w-88 sm:w-96 lg:w-[420px] bg-[#0c0c0c] border-l border-[#222222] flex flex-col z-20 shadow-2xl transition-all duration-300 shrink-0",
            panelCollapsed && "translate-x-full absolute right-0 top-0 bottom-0 pointer-events-none opacity-0"
          )}
        >
          {/* Panel Header */}
          <div className="p-4 border-b border-[#222222] flex justify-between items-center shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs text-[#888888] font-medium">{basePrediction.location.regionName}</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">Water Column Intelligence</h3>
              <div className="text-xs text-[#888888] font-mono mt-0.5">
                {lat.toFixed(4)}°N, {lon.toFixed(4)}°E • @{selectedDepth}m
              </div>
            </div>

            <button
              onClick={() => setPanelCollapsed(true)}
              className="p-1.5 rounded-lg bg-[#141414] hover:bg-[#202020] border border-[#222222] text-[#888888] hover:text-white transition-all cursor-pointer"
              title="Minimize panel"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="px-4 py-2 bg-[#090909] border-b border-[#222222] flex gap-1.5 shrink-0">
            <button
              onClick={() => setActiveTab('telemetry')}
              className={cn(
                "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center",
                activeTab === 'telemetry'
                  ? "bg-[#1c1c1c] text-white border border-[#333333]"
                  : "text-[#888888] hover:text-white"
              )}
            >
              All Predictions
            </button>
            <button
              onClick={() => setActiveTab('layers')}
              className={cn(
                "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center",
                activeTab === 'layers'
                  ? "bg-[#1c1c1c] text-white border border-[#333333]"
                  : "text-[#888888] hover:text-white"
              )}
            >
              Layer Slices ({waterColumn.length})
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={cn(
                "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center",
                activeTab === 'profile'
                  ? "bg-[#1c1c1c] text-white border border-[#333333]"
                  : "text-[#888888] hover:text-white"
              )}
            >
              Profiles (T-z / S-z)
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* TAB 1: TELEMETRY & CARDS */}
            {activeTab === 'telemetry' && (
              <div className="space-y-4">
                {/* 1. Depth Slice Selector Card (Clean Monochrome) */}
                <div className="rounded-2xl border border-[#1f1f1f] bg-[#0c0c0c] p-4 space-y-2.5 shadow-inner">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      Depth Slice Selector
                    </span>
                    <span className="text-xs font-mono text-neutral-400 font-bold">
                      {activeLayer.depth === 0 ? '0m (Surface)' : `${activeLayer.depth} meters`}
                    </span>
                  </div>

                  <div className="text-[11px] text-[#888888]">
                    Zone: <strong className="text-white">{getZoneLabel(activeLayer.depth)}</strong>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max={waterColumn.length - 1}
                    step="1"
                    value={selectedIndex}
                    onChange={(e) => {
                      const idx = parseInt(e.target.value, 10);
                      if (waterColumn[idx]) setSelectedDepth(waterColumn[idx].depth);
                    }}
                    className="w-full accent-white h-1.5 bg-[#1f1f1f] rounded appearance-none cursor-pointer"
                  />

                  {/* Tick Marks */}
                  <div className="flex justify-between text-[10px] font-mono text-[#666666] pt-0.5">
                    {[0, 100, 500, 1000, 2000].map((d) => (
                      <span
                        key={d}
                        onClick={() => setSelectedDepth(d)}
                        className={cn(
                          "cursor-pointer hover:text-white transition-colors",
                          activeLayer.depth === d && "text-cyan-400 font-bold"
                        )}
                      >
                        {d}m
                      </span>
                    ))}
                  </div>

                  {/* Presets */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {[
                      { label: 'Surface (0m)', depth: 0 },
                      { label: 'Thermo (100m)', depth: 100 },
                      { label: 'Mid (500m)', depth: 500 },
                      { label: 'Abyss (2000m)', depth: 2000 },
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setSelectedDepth(p.depth)}
                        className={cn(
                          "py-1 px-1 rounded-lg text-[10px] font-mono border transition-all cursor-pointer text-center truncate",
                          activeLayer.depth === p.depth
                            ? "bg-[#1f1f1f] border-white/40 text-white font-bold"
                            : "bg-[#141414] border-[#222222] text-[#888888] hover:text-white hover:border-[#333333]"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Operations Page Output Section */}
                <div className="space-y-4 text-xs font-sans pt-2 border-t border-[#222222]">
                  <div className="flex justify-between items-center pb-1">
                    <div className="text-white font-bold text-sm">
                      {basePrediction.location.regionName}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {Object.values(basePrediction.variables).map((v) => (
                      <div key={v.variable} className="flex justify-between items-center text-xs">
                        <span className="text-[#888888]">
                          {v.commonName}
                        </span>
                        <span className="font-bold text-white font-mono">
                          {v.formattedValue}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Actions: Reset View & Parameter Dossier */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleResetCamera}
                      className="py-2.5 px-3 rounded-xl bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      title="Reset 3D Depth Slice View"
                    >
                      <span>3D Depth Slice</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        window.open(`/details?lat=${lat}&lon=${lon}&depth=${selectedDepth}`, '_blank');
                      }}
                      className="py-2.5 px-3 rounded-xl bg-[#141414] hover:bg-[#1a1a1a] border border-[#262626] hover:border-[#3a3a3a] text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      title="Open Full Parameter Dossier"
                    >
                      <span>Full Dossier</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#888888]" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LAYER SLICES LIST */}
            {activeTab === 'layers' && (
              <div className="space-y-2">
                <div className="text-xs text-[#888888] pb-1">Click any depth level to inspect in 3D scene:</div>
                <div className="space-y-1.5">
                  {waterColumn.map((layer, idx) => (
                    <div
                      key={layer.depth}
                      onClick={() => setSelectedDepth(layer.depth)}
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer",
                        selectedIndex === idx
                          ? "bg-cyan-950/40 border-cyan-500/60 shadow-md"
                          : "bg-[#121212] border-[#222222] hover:bg-[#181818] hover:border-[#333333]"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "w-11 h-6 rounded-md flex items-center justify-center font-mono text-[10px] font-bold",
                            selectedIndex === idx
                              ? "bg-cyan-500 text-black font-extrabold"
                              : "bg-[#1c1c1c] text-[#888888]"
                          )}
                        >
                          {layer.depth}m
                        </div>
                        <div className="space-x-2">
                          <span className="text-xs font-bold text-white font-mono">{layer.thetao.toFixed(1)}°C</span>
                          <span className="text-xs text-[#888888] font-mono">{layer.so.toFixed(1)} PSU</span>
                        </div>
                      </div>
                      <div className="text-xs font-mono text-emerald-400 font-medium">
                        {layer.current_speed.toFixed(3)} m/s
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: PROFILES (T-z / S-z) */}
            {activeTab === 'profile' && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-white">Vertical Temperature & Salinity Decay Profile</div>
                <div className="w-full h-64 bg-[#0a0a0a] rounded-2xl border border-[#222222] p-3 shadow-inner relative flex flex-col justify-between">
                  <svg viewBox="0 0 340 210" className="w-full h-full overflow-visible">
                    {/* Grid lines */}
                    <line x1="40" y1="20" x2="40" y2="185" stroke="#262626" strokeWidth="1" />
                    <line x1="40" y1="20" x2="320" y2="20" stroke="#262626" strokeWidth="1" />
                    <line x1="40" y1="185" x2="320" y2="185" stroke="#262626" strokeWidth="1" />

                    {/* Depth markers */}
                    <text x="34" y="24" fill="#666666" fontSize="9" textAnchor="end">0m</text>
                    <text x="34" y="65" fill="#666666" fontSize="9" textAnchor="end">200m</text>
                    <text x="34" y="105" fill="#666666" fontSize="9" textAnchor="end">500m</text>
                    <text x="34" y="145" fill="#666666" fontSize="9" textAnchor="end">1000m</text>
                    <text x="34" y="185" fill="#666666" fontSize="9" textAnchor="end">2000m</text>

                    {/* Temp Curve */}
                    <path
                      d={waterColumn
                        .map((l, i) => {
                          const maxD = 2000;
                          const x = 40 + (Math.max(0, Math.min(32, l.thetao)) / 32) * 270;
                          const y = 20 + Math.pow(l.depth / maxD, 0.6) * 165;
                          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke="#ff7733"
                      strokeWidth="2.5"
                    />

                    {/* Salinity Curve */}
                    <path
                      d={waterColumn
                        .map((l, i) => {
                          const maxD = 2000;
                          const x = 40 + ((Math.max(33, Math.min(37, l.so)) - 33) / 4) * 270;
                          const y = 20 + Math.pow(l.depth / maxD, 0.6) * 165;
                          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke="#00e5ff"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                    />
                  </svg>

                  {/* Legend */}
                  <div className="flex gap-4 text-[10px] font-mono justify-center pt-2 border-t border-[#1a1a1a]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-1 bg-[#ff7733] rounded" />
                      <span className="text-orange-400">θ₀ Temp (°C)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-1 bg-[#00e5ff] rounded" />
                      <span className="text-cyan-400">S₀ Salinity (PSU)</span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-[#888888] leading-relaxed">
                  Steep thermocline decay is observed between <strong>0m and 200m</strong>, leveling out into the stable deep isothermal water layer beyond <strong>1000m</strong>.
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
