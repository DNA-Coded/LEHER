import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  const [activeVariable, setActiveVariable] = useState<'temperature' | 'salinity' | 'currents'>('temperature');
  const [panelCollapsed, setPanelCollapsed] = useState<boolean>(false);
  const [selectedTimeZone, setSelectedTimeZone] = useState<TimeZone>('IST');
  const [realTimeClock, setRealTimeClock] = useState<string>('');

  // Generate scientifically grounded water column data using predictOceanState
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

  // Derived stratification calculations
  const derivedMetrics = useMemo(() => {
    const thermoclineIdx = waterColumn.findIndex((w) => w.thetao <= 20.0);
    const thermocline_depth = thermoclineIdx >= 0 ? waterColumn[thermoclineIdx].depth : 85;
    const mixed_layer_depth = 42;
    const pycnocline_strength = 3.42;
    const mean_column_speed = waterColumn.reduce((acc, cur) => acc + cur.current_speed, 0) / waterColumn.length;

    return {
      thermocline_depth,
      mixed_layer_depth,
      pycnocline_strength,
      mean_column_speed: parseFloat(mean_column_speed.toFixed(3)),
    };
  }, [waterColumn]);

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

  // Prediction at active location for region name and status
  const basePrediction = useMemo(() => predictOceanState(lat, lon, selectedDepth), [lat, lon, selectedDepth]);

  // Three.js Canvas Reference
  const mountRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const waterGroupRef = useRef<THREE.Group | null>(null);
  const layerGroupsRef = useRef<{ grp: THREE.Group; discMat: THREE.MeshStandardMaterial; idx: number }[]>([]);

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

  // Color mapping function
  const getLayerColor = useCallback((val: number, variable: 'temperature' | 'salinity' | 'currents') => {
    if (variable === 'salinity') {
      const t = Math.max(0, Math.min(1, (val - 34.2) / 2.0));
      return new THREE.Color().lerpColors(new THREE.Color('#00e5ff'), new THREE.Color('#ffaa00'), t);
    }
    if (variable === 'currents') {
      const t = Math.max(0, Math.min(1, val / 0.25));
      return new THREE.Color().lerpColors(new THREE.Color('#0088ff'), new THREE.Color('#00f5a0'), t);
    }
    // Temperature gradient
    const t = Math.max(0, Math.min(1, (val - 2.0) / 28.0));
    const deepCold = new THREE.Color('#002244');
    const thermocline = new THREE.Color('#0088ff');
    const surfaceWarm = new THREE.Color('#00f0ff');
    const surfaceHot = new THREE.Color('#ff7700');
    if (t < 0.3) return new THREE.Color().lerpColors(deepCold, thermocline, t / 0.3);
    if (t < 0.75) return new THREE.Color().lerpColors(thermocline, surfaceWarm, (t - 0.3) / 0.45);
    return new THREE.Color().lerpColors(surfaceWarm, surfaceHot, (t - 0.75) / 0.25);
  }, []);

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

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(5.2, 3.8, 6.4);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(-0.8, 0, 0);
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

    const waterGroup = new THREE.Group();
    waterGroup.position.set(-0.8, 0, 0);
    scene.add(waterGroup);
    waterGroupRef.current = waterGroup;

    // Animation Loop
    let animationFrameId: number;
    let time = 0;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      time += 0.016;
      controls.update();

      // Gentle wave bobbing for layers
      layerGroupsRef.current.forEach((item) => {
        item.grp.position.y += Math.sin(time * 0.8 + item.idx * 0.5) * 0.00015;
      });

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

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  // Rebuild 3D Volumetric Mesh whenever geometry, variable, or waterColumn changes
  useEffect(() => {
    const waterGroup = waterGroupRef.current;
    if (!waterGroup) return;

    // Clear previous children
    while (waterGroup.children.length > 0) {
      waterGroup.remove(waterGroup.children[0]);
    }
    layerGroupsRef.current = [];

    const BLOCK_HEIGHT = 6.2;
    const BLOCK_RADIUS = 1.6;
    const BLOCK_WIDTH = 3.0;
    const maxDepth = waterColumn[waterColumn.length - 1]?.depth || 2000;

    // Outer translucent ocean block
    const outerGeo =
      geometryType === 'cylinder'
        ? new THREE.CylinderGeometry(BLOCK_RADIUS, BLOCK_RADIUS, BLOCK_HEIGHT, 48, 24, false)
        : new THREE.BoxGeometry(BLOCK_WIDTH, BLOCK_HEIGHT, BLOCK_WIDTH, 16, 24, 16);

    const outerMat = new THREE.MeshPhysicalMaterial({
      color: 0x004488,
      emissive: 0x001a33,
      emissiveIntensity: 0.25,
      transmission: 0.68,
      opacity: 0.75,
      transparent: true,
      roughness: 0.08,
      metalness: 0.05,
      ior: 1.333,
      reflectivity: 0.5,
      clearcoat: 0.3,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    waterGroup.add(outerMesh);

    // Surface water cap
    const capGeo =
      geometryType === 'cylinder'
        ? new THREE.CircleGeometry(BLOCK_RADIUS - 0.02, 48)
        : new THREE.PlaneGeometry(BLOCK_WIDTH - 0.04, BLOCK_WIDTH - 0.04);
    const capMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00aacc,
      emissiveIntensity: 0.5,
      roughness: 0.15,
      transparent: true,
      opacity: 0.85,
    });
    const capMesh = new THREE.Mesh(capGeo, capMat);
    capMesh.position.set(0, BLOCK_HEIGHT / 2 + 0.01, 0);
    capMesh.rotation.x = -Math.PI / 2;
    waterGroup.add(capMesh);

    // Slices for each depth
    waterColumn.forEach((layer, idx) => {
      const ratio = layer.depth / maxDepth;
      const y = BLOCK_HEIGHT / 2 - ratio * BLOCK_HEIGHT;
      const val =
        activeVariable === 'salinity'
          ? layer.so
          : activeVariable === 'currents'
          ? layer.current_speed
          : layer.thetao;
      const color = getLayerColor(val, activeVariable);
      const isHighlight = selectedIndex === idx;

      const grp = new THREE.Group();
      grp.position.set(0, y, 0);

      // Disc / Plate
      const discGeo =
        geometryType === 'cylinder'
          ? new THREE.CircleGeometry(BLOCK_RADIUS * 0.96, 36)
          : new THREE.PlaneGeometry(BLOCK_WIDTH * 0.96, BLOCK_WIDTH * 0.96);
      const discMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: isHighlight ? 0.9 : 0.28,
        transparent: true,
        opacity: isHighlight ? 0.9 : 0.4,
        depthWrite: false,
      });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.rotation.x = -Math.PI / 2;
      grp.add(disc);

      // Glowing Rim Ring
      if (geometryType === 'cylinder') {
        const ringGeo = new THREE.RingGeometry(BLOCK_RADIUS * 0.95, BLOCK_RADIUS * 0.99, 36);
        const ringMat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: isHighlight ? 0.95 : 0.5,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        grp.add(ring);
      } else {
        const edgeGeo = new THREE.EdgesGeometry(
          new THREE.BoxGeometry(BLOCK_WIDTH * 0.98, 0.02, BLOCK_WIDTH * 0.98)
        );
        const edgeMat = new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: isHighlight ? 0.95 : 0.45,
        });
        grp.add(new THREE.LineSegments(edgeGeo, edgeMat));
      }

      // Current Velocity 3D Arrow
      const arrowLength = Math.max(0.3, Math.min(1.2, layer.current_speed * 5.0));
      const angle = Math.atan2(layer.vo, layer.uo);
      const arrowGrp = new THREE.Group();
      arrowGrp.rotation.y = -angle;
      arrowGrp.position.y = 0.04;

      const shaftGeo = new THREE.CylinderGeometry(0.02, 0.02, arrowLength, 8);
      const shaftMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
      const shaft = new THREE.Mesh(shaftGeo, shaftMat);
      shaft.position.set(arrowLength / 2, 0, 0);
      shaft.rotation.z = Math.PI / 2;
      arrowGrp.add(shaft);

      const coneGeo = new THREE.ConeGeometry(0.07, 0.2, 10);
      const coneMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.set(arrowLength, 0, 0);
      cone.rotation.z = -Math.PI / 2;
      arrowGrp.add(cone);

      grp.add(arrowGrp);

      layerGroupsRef.current.push({ grp, discMat, idx });
      waterGroup.add(grp);
    });

    // Seabed Base
    const baseGeo =
      geometryType === 'cylinder'
        ? new THREE.CircleGeometry(BLOCK_RADIUS + 0.05, 36)
        : new THREE.PlaneGeometry(BLOCK_WIDTH + 0.1, BLOCK_WIDTH + 0.1);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x001428,
      roughness: 0.9,
      metalness: 0.2,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.set(0, -BLOCK_HEIGHT / 2 - 0.02, 0);
    baseMesh.rotation.x = Math.PI / 2;
    waterGroup.add(baseMesh);

    // Left Depth Ruler
    const rulerGrp = new THREE.Group();
    rulerGrp.position.set(-2.3, 0, 0);

    const spineGeo = new THREE.CylinderGeometry(0.015, 0.015, BLOCK_HEIGHT, 8);
    const spineMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.35 });
    rulerGrp.add(new THREE.Mesh(spineGeo, spineMat));

    [0, 100, 500, 1000, 2000].forEach((d) => {
      const ratio = d / maxDepth;
      const y = BLOCK_HEIGHT / 2 - ratio * BLOCK_HEIGHT;
      const tickGeo = new THREE.BoxGeometry(0.25, 0.015, 0.015);
      const tickMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
      const tick = new THREE.Mesh(tickGeo, tickMat);
      tick.position.set(0.12, y, 0);
      rulerGrp.add(tick);

      const labelCanvas = document.createElement('canvas');
      labelCanvas.width = 128;
      labelCanvas.height = 48;
      const ctx = labelCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#b0e0ff';
        ctx.font = 'bold 26px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`-${d}m`, 120, 34);
        const tex = new THREE.CanvasTexture(labelCanvas);
        const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.set(-0.45, y, 0);
        sprite.scale.set(0.75, 0.28, 1);
        rulerGrp.add(sprite);
      }
    });

    waterGroup.add(rulerGrp);
  }, [geometryType, activeVariable, waterColumn, getLayerColor, selectedIndex]);

  // Update highlight on depth change without full rebuild
  useEffect(() => {
    layerGroupsRef.current.forEach((item) => {
      const isHighlight = item.idx === selectedIndex;
      item.discMat.emissiveIntensity = isHighlight ? 0.9 : 0.28;
      item.discMat.opacity = isHighlight ? 0.9 : 0.4;
    });
  }, [selectedIndex]);

  const handleResetCamera = useCallback(() => {
    if (!controlsRef.current || !cameraRef.current) return;
    controlsRef.current.target.set(panelCollapsed ? 0 : -0.8, 0, 0);
    cameraRef.current.position.set(5.2, 3.8, 6.4);
    controlsRef.current.update();
  }, [panelCollapsed]);

  return (
    <div className="min-h-screen w-full bg-[#080808] text-white flex flex-col overflow-hidden font-sans select-none">
      {/* ── TOP NAVIGATION BAR ── */}
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
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                  ML WATER COLUMN
                </span>
              </div>
              <div className="text-[11px] text-[#888888] font-mono hidden md:block">
                {basePrediction.location.regionName} ({lat >= 0 ? `${lat}°N` : `${Math.abs(lat)}°S`}, {lon >= 0 ? `${lon}°E` : `${Math.abs(lon)}°W`}) @ {selectedDepth}m
              </div>
            </div>
          </div>
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
      <div className="flex-1 flex relative overflow-hidden bg-[#040404]">
        {/* 3D Visualizer Area */}
        <div ref={mountRef} className="flex-1 h-full relative overflow-hidden">
          <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

          {/* Floating Controls Bar (Top Left) */}
          <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 pointer-events-none">
            {/* Coordinates Badge */}
            <div className="pointer-events-auto bg-[#090909]/90 backdrop-blur-xl border border-[#222222] rounded-xl px-3.5 py-2 shadow-xl flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <div className="font-mono text-xs text-[#e0e0e0]">
                <strong className="text-white">{basePrediction.location.regionName}</strong> • {lat.toFixed(4)}°N, {lon.toFixed(4)}°E
              </div>
            </div>

            {/* Geometry & Variable Toggles */}
            <div className="pointer-events-auto bg-[#090909]/90 backdrop-blur-xl border border-[#222222] rounded-xl p-1.5 shadow-xl flex items-center gap-2">
              {/* Geometry Toggle */}
              <div className="flex bg-[#141414] rounded-lg p-0.5 border border-[#262626]">
                <button
                  onClick={() => setGeometryType('cylinder')}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                    geometryType === 'cylinder'
                      ? "bg-white text-black font-bold shadow"
                      : "text-[#888888] hover:text-white"
                  )}
                >
                  Cylinder
                </button>
                <button
                  onClick={() => setGeometryType('cuboid')}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                    geometryType === 'cuboid'
                      ? "bg-white text-black font-bold shadow"
                      : "text-[#888888] hover:text-white"
                  )}
                >
                  Cuboid
                </button>
              </div>

              {/* Variable Toggle */}
              <div className="flex bg-[#141414] rounded-lg p-0.5 border border-[#262626]">
                <button
                  onClick={() => setActiveVariable('temperature')}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer",
                    activeVariable === 'temperature'
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "text-[#888888] hover:text-white"
                  )}
                >
                  θ₀ Temp
                </button>
                <button
                  onClick={() => setActiveVariable('salinity')}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer",
                    activeVariable === 'salinity'
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "text-[#888888] hover:text-white"
                  )}
                >
                  S₀ Salinity
                </button>
                <button
                  onClick={() => setActiveVariable('currents')}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer",
                    activeVariable === 'currents'
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "text-[#888888] hover:text-white"
                  )}
                >
                  Velocity
                </button>
              </div>

              {/* Reset Camera */}
              <button
                onClick={handleResetCamera}
                className="p-1.5 rounded-lg bg-[#181818] hover:bg-[#252525] border border-[#2a2a2a] text-[#aaaaaa] hover:text-white transition-all cursor-pointer"
                title="Reset Camera View"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Bottom Controls: Depth Range Bar + Orbit Hint */}
          <div className="absolute bottom-4 left-4 right-4 z-10 flex justify-between items-center pointer-events-none">
            {/* Orbit Hint */}
            <div className="pointer-events-auto hidden md:flex items-center gap-2 bg-[#090909]/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs font-mono text-[#888888]">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>Left-click drag to orbit • Scroll to zoom • Right-click to pan</span>
            </div>

            {/* Floating Depth Bar */}
            <div className="pointer-events-auto bg-[#090909]/90 backdrop-blur-xl border border-[#222222] rounded-xl px-4 py-2 flex items-center gap-3.5 shadow-2xl mx-auto md:mx-0">
              <span className="text-xs font-mono text-cyan-400 font-bold whitespace-nowrap">
                Depth: <strong className="text-white">{activeLayer.depth}m</strong>
              </span>
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
                className="w-36 sm:w-48 accent-white h-1 bg-[#222222] rounded appearance-none cursor-pointer"
              />
              <span className="text-[11px] font-mono text-[#888888] hidden sm:inline">
                {getZoneLabel(activeLayer.depth)}
              </span>
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

        {/* ── SIDE TELEMETRY DATA PANEL ── */}
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
                <span className="text-[10px] font-mono uppercase font-bold text-[#aaaaaa] bg-white/10 px-2 py-0.5 rounded border border-white/10">
                  ML Telemetry
                </span>
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
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[#141414] border border-[#262626] text-white">
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

                {/* 2. Operations Page Output Section (Image 1 Exact Layout) */}
                <div className="space-y-4 text-xs font-sans pt-2 border-t border-[#222222]">
                  {/* Top Header: Region & Status */}
                  <div className="flex justify-between items-center pb-1">
                    <div className="text-white font-bold text-sm">
                      {basePrediction.location.regionName}
                    </div>
                    <span className={cn(
                      "text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold uppercase",
                      basePrediction.summary.riskStatus === 'SAFE' 
                        ? "bg-emerald-950/60 border-emerald-800/60 text-emerald-400"
                        : basePrediction.summary.riskStatus === 'ADVISORY'
                        ? "bg-amber-950/60 border-amber-800/60 text-amber-400"
                        : "bg-red-950/60 border-red-800/60 text-red-400"
                    )}>
                      {basePrediction.summary.riskStatus}
                    </span>
                  </div>

                  {/* Clean Parameters Box (Identical to screenshot) */}
                  <div className="rounded-2xl border border-[#1f1f1f] bg-[#0c0c0c] p-4 space-y-2.5 shadow-inner">
                    <div className="flex justify-between items-center text-xs pb-1.5 border-b border-[#181818]">
                      <span className="text-[#888888]">Current speed</span>
                      <span className="font-bold text-white font-mono">{basePrediction.summary.currentSpeedMs} m s⁻¹</span>
                    </div>
                    <div className="flex justify-between items-center text-xs pb-1.5 border-b border-[#181818]">
                      <span className="text-[#888888]">Current bearing</span>
                      <span className="font-bold text-white font-mono">{basePrediction.summary.currentDirectionCompass} ({basePrediction.summary.currentDirectionDeg}°)</span>
                    </div>
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

                  {/* Actions: Open 3D Depth Slice & View Parameter Dossier */}
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
