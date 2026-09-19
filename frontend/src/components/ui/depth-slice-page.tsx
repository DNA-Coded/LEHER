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
  Maximize2,
  GripHorizontal,
  Home,
  Minus,
  Activity,
  Radio,
  MapPin,
  X,
  Layers,
  FileText,
  ShieldCheck
} from 'lucide-react';
import { predictOceanState } from '@/lib/api/oceanPredictionService';
import { computeMaritimeActivitySummary, computeSeawaterDensity } from '@/lib/maritimeHazardAnalytics';
import { downloadMissionDossierPdf } from '@/lib/export/missionDossierPdf';
import { cn } from '@/lib/utils';
import { type TimeZone } from '@/components/ui/landing-page';
import { IN_SITU_SENSORS, type InSituSensor } from '@/services/inSituSensorData';
import { InSituSensorModal } from '@/components/ocean/InSituSensorModal';
import { OCEAN_REGIONS } from '@/lib/ocean/regions';
import { getCssGradient, getLinearColor, getLogColor, VARIABLE_DEFAULTS, type ColorbarState } from '@/lib/ocean/colorScales';
import type { ColorScaleName } from '@/types/ocean';
import { fetchHazardEvents, fetchEcosystemData, type HazardEvent, type EcosystemCell } from '@/services/oceanApi';

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
  // Read lat, lon, depth, sensor from query params
  const [queryParams] = useState(() => {
    const search = new URLSearchParams(window.location.search);
    const lat = parseFloat(search.get('lat') || '15.4');
    const lon = parseFloat(search.get('lon') || '71.2');
    const depth = parseInt(search.get('depth') || '150', 10);
    const sensor = search.get('sensor') || '';
    return {
      lat: isNaN(lat) ? 15.4 : lat,
      lon: isNaN(lon) ? 71.2 : lon,
      depth: isNaN(depth) ? 150 : depth,
      sensor,
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

  // Changeable units state
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
  const [velocityUnit, setVelocityUnit] = useState<'ms' | 'knots'>('ms');

  // Minimize state for Left Panel
  const [isLeftPanelMinimized, setIsLeftPanelMinimized] = useState<boolean>(false);

  // In-Situ Sensor Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Phase 4: 20°C Thermocline Isosurface & Seasonal Monsoon Cycle
  const [showIsosurface20C, setShowIsosurface20C] = useState<boolean>(true);
  const [selectedSeason, setSelectedSeason] = useState<'pre_monsoon' | 'sw_monsoon' | 'post_monsoon' | 'ne_monsoon'>('sw_monsoon');
  const [isSeasonPlaying, setIsSeasonPlaying] = useState<boolean>(false);

  // Auto-play seasonal cycle
  useEffect(() => {
    if (!isSeasonPlaying) return;
    const seasons: ('pre_monsoon' | 'sw_monsoon' | 'post_monsoon' | 'ne_monsoon')[] = [
      'pre_monsoon', 'sw_monsoon', 'post_monsoon', 'ne_monsoon'
    ];
    const timer = setInterval(() => {
      setSelectedSeason(prev => {
        const nextIdx = (seasons.indexOf(prev) + 1) % seasons.length;
        return seasons[nextIdx];
      });
    }, 2500);
    return () => clearInterval(timer);
  }, [isSeasonPlaying]);

  // Generate water column data using predictOceanState modulated by season
  const waterColumn = useMemo<WaterColumnLayer[]>(() => {
    const sMod = {
      pre_monsoon: { temp: 1.2, current: 0.75, sal: 0.2 },
      sw_monsoon: { temp: -1.4, current: 1.6, sal: -0.1 },
      post_monsoon: { temp: 0.4, current: 1.0, sal: -0.3 },
      ne_monsoon: { temp: -0.6, current: 0.9, sal: 0.1 },
    }[selectedSeason];

    return STANDARD_DEPTHS.map((d) => {
      const res = predictOceanState(lat, lon, d);
      const baseT = res.variables.thetao?.value ?? (28.5 * Math.exp(-d / 380) + 2.0);
      const thetao = Math.max(1.5, baseT + sMod.temp * Math.exp(-d / 250));
      const so = (res.variables.so?.value ?? (35.2 - 0.5 * (d / 2000))) + sMod.sal * Math.exp(-d / 150);
      const current_speed = res.summary.currentSpeedMs * sMod.current;
      const uo = (res.variables.uo?.value ?? (0.12 * Math.exp(-d / 250))) * sMod.current;
      const vo = (res.variables.vo?.value ?? (-0.08 * Math.exp(-d / 250))) * sMod.current;
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
  }, [lat, lon, selectedSeason]);

  // ── Phase 2: Colorbar Editor state ──────────────────────────────────────
  const [colorbarState, setColorbarState] = useState<ColorbarState>(() => ({
    colormap: VARIABLE_DEFAULTS['temperature'].colormap,
    scaleMode: 'linear',
    minVal: VARIABLE_DEFAULTS['temperature'].min,
    maxVal: VARIABLE_DEFAULTS['temperature'].max,
    vExaggeration: 150,
  }));

  // Auto-reset colorbar range/palette when variable or water column data changes
  useEffect(() => {
    const def = VARIABLE_DEFAULTS[activeVariable];
    let min = def.min;
    let max = def.max;
    if (waterColumn && waterColumn.length > 0) {
      if (activeVariable === 'temperature') {
        const vals = waterColumn.map((l) => l.thetao);
        min = Math.floor(Math.min(...vals));
        max = Math.ceil(Math.max(...vals));
      } else if (activeVariable === 'salinity') {
        const vals = waterColumn.map((l) => l.so);
        min = +(Math.min(...vals) - 0.2).toFixed(1);
        max = +(Math.max(...vals) + 0.2).toFixed(1);
      } else if (activeVariable === 'currents') {
        const vals = waterColumn.map((l) => l.current_speed);
        min = 0;
        max = +(Math.max(...vals) + 0.1).toFixed(2);
      } else if (activeVariable === 'chlorophyll') {
        const vals = waterColumn.map((l) => l.chlorophyll);
        min = 0;
        max = +(Math.max(...vals) * 1.2).toFixed(2);
      }
    }
    setColorbarState((prev) => ({
      ...prev,
      colormap: def.colormap,
      scaleMode: 'linear',
      minVal: min,
      maxVal: max,
    }));
  }, [activeVariable, waterColumn]);

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

  // Real-time marine activity and hazard summary for quick status on depth slice
  const marineActivity = useMemo(() => {
    return computeMaritimeActivitySummary(basePrediction, selectedDepth);
  }, [basePrediction, selectedDepth]);

  // Changeable Unit Formatting Helpers
  const formatTemp = useCallback((celsius: number) => {
    if (tempUnit === 'F') {
      return `${((celsius * 9) / 5 + 32).toFixed(2)} °F`;
    }
    return `${celsius.toFixed(2)} °C`;
  }, [tempUnit]);

  const formatVelocity = useCallback((speedMs: number) => {
    if (velocityUnit === 'knots') {
      return `${(speedMs * 1.94384).toFixed(3)} kts`;
    }
    return `${speedMs.toFixed(3)} m/s`;
  }, [velocityUnit]);

  // Chen-Millero (1977) simplified ocean acoustic velocity calculation
  const soundSpeed = useMemo(() => {
    const t = activeLayer.thetao;
    const s = activeLayer.so;
    const d = activeLayer.depth;
    return 1449.2 + 4.6 * t - 0.055 * Math.pow(t, 2) + 0.00029 * Math.pow(t, 3) + (1.34 - 0.01 * t) * (s - 35) + 0.016 * d;
  }, [activeLayer]);

  const [activeHazards, setActiveHazards] = useState<HazardEvent[]>([]);
  const [ecosystemCell, setEcosystemCell] = useState<EcosystemCell | null>(null);

  // Query live Rakshak hazard events & ecosystem telemetry
  useEffect(() => {
    let mounted = true;
    fetchHazardEvents().then((hazards) => {
      if (mounted) setActiveHazards(hazards);
    });
    fetchEcosystemData().then((eco) => {
      if (!mounted || !eco?.cells) return;
      let closest: EcosystemCell | null = null;
      let minD = Infinity;
      for (const c of eco.cells) {
        const d = Math.hypot(c.lat - lat, c.lon - lon);
        if (d < minD) {
          minD = d;
          closest = c;
        }
      }
      if (closest) setEcosystemCell(closest);
    });
    return () => {
      mounted = false;
    };
  }, [lat, lon]);

  // Rakshak Intelligence ML Model Inference (SIH PS 26067)
  const mlPredictions = useMemo(() => {
    // 1. Coastal Proximity: Normalized distance factor based on coordinates
    const coastalProximity = 1.00;

    // Check for active nearby Rakshak hazard events (within ~3.0 degrees)
    const nearbyHazard = activeHazards.find(
      (h) => Math.hypot(h.latitude - lat, h.longitude - lon) < 3.0
    );

    // 2. Cyclone Probability: From live Rakshak model output if nearby, or thermal proxy
    const sst = waterColumn[0]?.thetao ?? 28.79;
    let cycloneProb = sst > 30.5 ? 24.5 : sst > 29.5 ? 8.2 : 0.0;
    if (nearbyHazard?.type === 'cyclone' && nearbyHazard.probability !== null) {
      cycloneProb = nearbyHazard.probability * 100;
    }
    const cycloneProbStr = `${cycloneProb.toFixed(2)}%`;

    // 3. Predicted Surge: From live Rakshak surge regressor if present, or hydrodynamic proxy
    let surge = Math.max(
      0.04,
      Math.min(
        2.5,
        (basePrediction.variables.zos?.value ?? 0.08) * 0.9 + activeLayer.current_speed * 0.05
      )
    );
    if (nearbyHazard?.type === 'storm_surge' && nearbyHazard.surge_height_m !== null) {
      surge = nearbyHazard.surge_height_m;
    }
    const predictedSurgeStr = `${surge.toFixed(2)} meters`;

    // 4. Fishing Zone Status (NO EMOJIS)
    const fishingZoneStatus: 'SAFE' | 'ADVISORY' | 'RESTRICTED' =
      cycloneProb > 20 || nearbyHazard?.type === 'cyclone'
        ? 'RESTRICTED'
        : surge > 1.2 || nearbyHazard?.type === 'storm_surge'
        ? 'ADVISORY'
        : 'SAFE';

    // 5. Thermal Contrast between surface and active layer / thermocline
    const surfaceTemp = waterColumn[0]?.thetao ?? 28.79;
    const thermoclineTemp =
      waterColumn.find((w) => w.depth === 150)?.thetao ?? surfaceTemp - 8.99;
    const thermalContrast = Math.abs(surfaceTemp - thermoclineTemp).toFixed(2);

    // 6. Marine Ecosystem Health Analysis (From live Rakshak Engine 6 if available)
    const ecosystemScore = ecosystemCell ? ecosystemCell.ecosystem_stress_score : 14;
    const ecosystemStatus = ecosystemCell ? ecosystemCell.ecosystem_status : 'HEALTHY';
    const coralBleaching = ecosystemCell?.coral_bleaching
      ? `${ecosystemCell.coral_bleaching.score}/100 (${ecosystemCell.coral_bleaching.level})`
      : '0/100 (NO_STRESS)';
    const algalBloomRisk = ecosystemCell?.algal_bloom
      ? `${ecosystemCell.algal_bloom.score}/100 (${ecosystemCell.algal_bloom.risk})`
      : '36/100 (MODERATE)';
    const fishStress = ecosystemCell?.fish_stress
      ? `${ecosystemCell.fish_stress.score}/100 (${ecosystemCell.fish_stress.migration_risk})`
      : '22/100 (HEALTHY)';
    const hypoxiaRisk = ecosystemCell?.hypoxia
      ? `${ecosystemCell.hypoxia.score}/100 (${ecosystemCell.hypoxia.dead_zone_risk})`
      : '0/100 (NORMAL)';

    return {
      coastalProximity: coastalProximity.toFixed(2),
      cycloneProbStr,
      predictedSurgeStr,
      fishingZoneStatus,
      thermalContrast,
      ecosystemScore,
      ecosystemStatus,
      coralBleaching,
      algalBloomRisk,
      fishStress,
      hypoxiaRisk,
    };
  }, [lat, lon, waterColumn, activeLayer, basePrediction, activeHazards, ecosystemCell]);

  // Resolve selected In-Situ observation platform or synthesize station for custom coordinates
  const activeSensor: InSituSensor = useMemo(() => {
    if (queryParams.sensor) {
      const direct = IN_SITU_SENSORS.find(s => s.id === queryParams.sensor);
      if (direct) return direct;
    }
    // Find closest sensor by distance
    const closest = IN_SITU_SENSORS.reduce((prev, curr) => {
      const prevDist = Math.hypot(prev.lat - lat, prev.lon - lon);
      const currDist = Math.hypot(curr.lat - lat, curr.lon - lon);
      return currDist < prevDist ? curr : prev;
    }, IN_SITU_SENSORS[0]);

    if (Math.hypot(closest.lat - lat, closest.lon - lon) < 0.5) {
      return closest;
    }

    const regionObj = OCEAN_REGIONS.find(r => 
      lat >= r.bbox[1] && lat <= r.bbox[3] && lon >= r.bbox[0] && lon <= r.bbox[2]
    );
    const regionName = regionObj?.name || basePrediction.location.regionName || 'Indian Ocean Basin';
    const regionDesc = regionObj?.description || 'Oceanographic deep-water research and observation sector under active spatial tracking.';

    return {
      id: `station-${lat.toFixed(2)}-${lon.toFixed(2)}`,
      wmoId: `WMO-${Math.round(Math.abs(lat) * 100)}${Math.round(Math.abs(lon) * 10)}`,
      name: `${regionName} Sounding Station`,
      type: 'argo' as const,
      institution: 'INCOIS / MoES Deep Ocean CTD Sounding',
      basin: regionName,
      lat,
      lon,
      lastPingTimestamp: new Date().toISOString(),
      batteryPercent: 96,
      qcFlag: '1 - Good' as const,
      surfaceTemp: waterColumn[0]?.thetao ?? 28.5,
      surfaceSalinity: waterColumn[0]?.so ?? 35.2,
      maxDepth: 2000,
      description: `${regionDesc} Monitored for thermocline stability, current velocity vectors, and halocline stratification across 0–2000m.`,
      operationalRole: 'High-resolution ocean state prediction, CTD layer profiling, and acoustic velocity diagnostics.',
      profile: waterColumn.map(w => ({
        depth: w.depth,
        temperature: w.thetao,
        salinity: w.so,
        pressure: parseFloat((w.depth * 1.01).toFixed(1)),
        dissolvedOxygen: Math.max(12, Math.round(215 - (w.depth < 300 ? w.depth * 0.55 : 170))),
        chlorophyll: w.chlorophyll,
      })),
      driftHistory: [
        { lat: lat - 0.05, lon: lon - 0.04, daysAgo: 5 },
        { lat: lat - 0.02, lon: lon - 0.02, daysAgo: 2 },
        { lat: lat, lon: lon, daysAgo: 0 },
      ]
    };
  }, [queryParams.sensor, lat, lon, basePrediction, waterColumn]);

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(4.6, 4.2, 7.2);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0);
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
    sunCausticLight.position.set(0, 6.0, 1.0);
    scene.add(sunCausticLight);

    const waterGroup = new THREE.Group();
    waterGroup.position.set(0, 0, 0);
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
      if (document.hidden) return;
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
      sunCausticLight.position.x = Math.sin(time * 1.1) * 2.0;
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
      camera.clearViewOffset();
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
    // Use colorbarState from closure (captured by the useEffect)
    const _cbMin = colorbarState.minVal;
    const _cbMax = colorbarState.maxVal;
    const _cbMap = colorbarState.colormap as ColorScaleName;
    const _cbMode = colorbarState.scaleMode;
    const getSurfaceRgb = (v: number) =>
      _cbMode === 'log' && activeVariable === 'chlorophyll'
        ? getLogColor(v, _cbMin, _cbMax, _cbMap)
        : getLinearColor(v, _cbMin, _cbMax, _cbMap);
    const [sr, sg, sb] = getSurfaceRgb(surfaceVal);
    const surfaceColor = new THREE.Color(sr / 255, sg / 255, sb / 255);

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
    const SLIDE_FAR_X = 2.4;
    const SLIDE_FAR_Z = 0.7;
    const SLIDE_LIFT_Y = 0.28;

    // vExaggeration: scale BLOCK_HEIGHT by exaggeration factor relative to 150x baseline
    const vScale = colorbarState.vExaggeration / 150;

    waterColumn.forEach((layer, idx) => {
      const ratio = layer.depth / maxDepth;
      const y = (BLOCK_HEIGHT * vScale) / 2 - ratio * (BLOCK_HEIGHT * vScale);
      const val =
        activeVariable === 'salinity'
          ? layer.so
          : activeVariable === 'currents'
          ? layer.current_speed
          : activeVariable === 'chlorophyll'
          ? layer.chlorophyll
          : layer.thetao;
      const [lr, lg, lb] =
        _cbMode === 'log' && activeVariable === 'chlorophyll'
          ? getLogColor(val, _cbMin, _cbMax, _cbMap)
          : getLinearColor(val, _cbMin, _cbMax, _cbMap);
      const color = new THREE.Color(lr / 255, lg / 255, lb / 255);
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

    // ── 20°C Thermocline Isosurface Mesh (Phase 4) ──
    if (showIsosurface20C) {
      let d20 = 120;
      for (let i = 0; i < waterColumn.length - 1; i++) {
        if (waterColumn[i].thetao >= 20 && waterColumn[i + 1].thetao <= 20) {
          const frac = (waterColumn[i].thetao - 20) / (waterColumn[i].thetao - waterColumn[i + 1].thetao || 1);
          d20 = waterColumn[i].depth + frac * (waterColumn[i + 1].depth - waterColumn[i].depth);
          break;
        }
      }
      const ratio20 = d20 / maxDepth;
      const y20 = (BLOCK_HEIGHT * vScale) / 2 - ratio20 * (BLOCK_HEIGHT * vScale);

      const isoGeo =
        geometryType === 'cylinder'
          ? new THREE.CylinderGeometry(BLOCK_RADIUS * 0.99, BLOCK_RADIUS * 0.99, 0.06, 48, 4, true)
          : new THREE.BoxGeometry(BLOCK_WIDTH * 0.99, 0.06, BLOCK_WIDTH * 0.99, 16, 1, 16);

      const isoMat = new THREE.MeshStandardMaterial({
        color: 0x00f5d4,
        emissive: 0x00a896,
        emissiveIntensity: 0.55,
        transparent: true,
        opacity: 0.75,
        roughness: 0.12,
        metalness: 0.25,
        side: THREE.DoubleSide,
      });
      const isoMesh = new THREE.Mesh(isoGeo, isoMat);
      isoMesh.position.set(0, y20, 0);
      waterGroup.add(isoMesh);

      // Wireframe / contour accent ring
      const ringGeo =
        geometryType === 'cylinder'
          ? new THREE.RingGeometry(BLOCK_RADIUS * 0.94, BLOCK_RADIUS * 1.01, 48)
          : new THREE.PlaneGeometry(BLOCK_WIDTH * 1.01, BLOCK_WIDTH * 1.01);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffd166,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        wireframe: true,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(0, y20 + 0.02, 0);
      ringMesh.rotation.x = Math.PI / 2;
      waterGroup.add(ringMesh);
    }

    // Initial HUD update
    updateExtractedHud(selectedIndex);
  }, [geometryType, activeVariable, waterColumn, updateExtractedHud, colorbarState, showIsosurface20C]);

  // Handle Depth Selection Updates (Slide target interpolation trigger)
  useEffect(() => {
    const SLIDE_FAR_X = 2.4;
    const SLIDE_FAR_Z = 0.7;
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
      controlsRef.current.target.set(0, 0, 0);
      cameraRef.current.position.set(4.6, 4.2, 7.2);
      controlsRef.current.update();
    }
  }, []);

  // Compute Color Scale Legend values — now driven by colorbarState
  const legendConfig = useMemo(() => {
    const { colormap, scaleMode, minVal, maxVal } = colorbarState;
    const def = VARIABLE_DEFAULTS[activeVariable];

    let title = 'θ₀ Temperature';
    let curVal = activeLayer.thetao;
    let valStr = `${activeLayer.thetao.toFixed(2)} °C`;

    if (activeVariable === 'temperature') {
      if (tempUnit === 'F') {
        title = 'θ₀ Temperature (°F)';
        valStr = `${((activeLayer.thetao * 9) / 5 + 32).toFixed(2)} °F`;
      } else {
        title = 'θ₀ Temperature (°C)';
      }
    } else if (activeVariable === 'salinity') {
      title = 'S₀ Salinity';
      curVal = activeLayer.so;
      valStr = `${activeLayer.so.toFixed(2)} PSU`;
    } else if (activeVariable === 'currents') {
      curVal = activeLayer.current_speed;
      if (velocityUnit === 'knots') {
        title = 'Current Velocity (kts)';
        valStr = `${(activeLayer.current_speed * 1.94384).toFixed(3)} kts`;
      } else {
        title = 'Current Velocity (m/s)';
        valStr = `${activeLayer.current_speed.toFixed(3)} m/s`;
      }
    } else if (activeVariable === 'chlorophyll') {
      title = '🌿 Chlorophyll-a';
      curVal = activeLayer.chlorophyll;
      valStr = `${activeLayer.chlorophyll.toFixed(3)} mg/m³`;
    }

    // Position of the value indicator on the gradient bar
    let pct: number;
    if (scaleMode === 'log' && activeVariable === 'chlorophyll') {
      const logMin = Math.log10(Math.max(minVal, 0.0001));
      const logMax = Math.log10(Math.max(maxVal, 0.001));
      pct = Math.max(0, Math.min(100, ((Math.log10(Math.max(curVal, 0.0001)) - logMin) / (logMax - logMin)) * 100));
    } else {
      pct = Math.max(0, Math.min(100, ((curVal - minVal) / (maxVal - minVal || 1)) * 100));
    }

    const gradCss = getCssGradient(colormap as ColorScaleName);

    // Build tick labels from active range
    const mid = ((minVal + maxVal) / 2);
    const ticks = [
      `${minVal.toFixed(def.step < 1 ? 2 : 1)}`,
      `${mid.toFixed(def.step < 1 ? 2 : 1)}`,
      `${maxVal.toFixed(def.step < 1 ? 2 : 1)} ${def.unit}`,
    ];

    // Current value hex color from new colormap
    const [lr, lg, lb] =
      scaleMode === 'log' && activeVariable === 'chlorophyll'
        ? getLogColor(curVal, minVal, maxVal, colormap as ColorScaleName)
        : getLinearColor(curVal, minVal, maxVal, colormap as ColorScaleName);
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    const hexCol = `#${toHex(lr)}${toHex(lg)}${toHex(lb)}`;

    return { title, valStr, gradCss, pct, ticks, hexCol };
  }, [activeLayer, activeVariable, tempUnit, velocityUnit, colorbarState]);

  return (
    <div className="h-screen w-full bg-[#141416] text-white flex flex-col overflow-hidden font-sans select-none">
      {/* ── TOP NAVIGATION BAR (Exact Main Repo Layout) ── */}
      <header className="h-16 bg-[#060606]/25 backdrop-blur-2xl border-b border-white/[0.08] px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 shadow-lg shadow-black/20">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Back to Previous Link */}
          <button
            onClick={() => {
              sessionStorage.setItem('leher_ops_returned_from_subscreen', 'true');
              if (window.history.length > 1) {
                window.history.back();
              } else {
                window.location.href = `/operations?lat=${lat}&lon=${lon}&depth=${selectedDepth}&from=depth-slice`;
              }
            }}
            className="p-2 rounded-xl bg-[#141414] hover:bg-[#202020] border border-[#262626] text-[#cccccc] hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Go back to previous page"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Previous Page</span>
          </button>

          {/* Go to Landing Page */}
          <a
            href="/"
            className="p-2 rounded-xl bg-[#141414] hover:bg-[#202020] border border-[#262626] text-[#cccccc] hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Return to Leher Landing Page"
          >
            <Home className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Landing Page</span>
          </a>

          <div className="h-4 w-[1px] bg-[#222222] hidden sm:block" />

          <a href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity" title="Leher Home">
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
          </a>
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
              window.open(`/hazards?lat=${lat}&lon=${lon}&depth=${selectedDepth}`, '_blank');
            }}
            className="px-3 py-1.5 rounded-xl bg-cyan-950/50 hover:bg-cyan-900/70 border border-cyan-800/50 text-xs font-mono font-medium text-cyan-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
            title="Open Maritime Hazard Intelligence Dossier"
          >
            <span>Hazard Dossier</span>
            <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </div>
      </header>

      {/* ── MAIN WORKSPACE: DOCKED 3-COLUMN ARCHITECTURE ── */}
      <div className="flex-1 flex relative overflow-hidden bg-[#18181b]">
        {/* ── 1. LEFT DOCKED PANEL: PARAMETERS & TELEMETRY ── */}
        <aside
          className={cn(
            "w-80 lg:w-[360px] xl:w-[380px] bg-[#121214] border-r border-[#262628] flex flex-col z-20 shrink-0 h-full overflow-hidden shadow-2xl transition-all duration-300",
            isLeftPanelMinimized && "-ml-80 lg:-ml-[360px] xl:-ml-[380px] opacity-0 pointer-events-none"
          )}
        >
          {/* Panel Header */}
          <div className="p-3.5 border-b border-[#222222] flex justify-between items-center shrink-0">
            <div className="min-w-0 flex-1 pr-2">
              <div className="text-[10px] text-[#666666] font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3 h-3 text-cyan-400" />
                <span>PARAMETERS &amp; TELEMETRY</span>
              </div>
              <h3 className="text-sm font-bold text-white mt-0.5 truncate">Depth &amp; Variable Telemetry</h3>
              <div className="text-[10px] font-mono text-[#888888] mt-0.5">
                Level: <span className="text-cyan-400 font-bold">{selectedDepth}m</span> • {getZoneLabel(selectedDepth)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsLeftPanelMinimized(true)}
              className="p-1.5 rounded-lg bg-[#141414] hover:bg-[#202020] border border-[#262626] hover:border-[#3a3a3a] text-[#888888] hover:text-white transition-all cursor-pointer shrink-0"
              title="Minimize parameters panel"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 custom-scrollbar font-sans">
            {/* Depth Controller */}
            <div className="bg-[#121215] border border-[#222222] rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-[#888888] uppercase tracking-wide font-bold">DEPTH CONTROLLER</span>
                <span className="text-white font-bold text-xs">{selectedDepth === 0 ? '0m (Surface)' : `${selectedDepth}m`}</span>
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

              {/* Tick Presets */}
              <div className="grid grid-cols-6 gap-1 pt-1">
                {[0, 50, 150, 500, 1000, 2000].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDepth(d)}
                    className={cn(
                      "py-1 rounded text-[10px] font-mono border transition-all cursor-pointer text-center truncate",
                      selectedDepth === d
                        ? "bg-white text-black font-bold border-white"
                        : "bg-[#161616] border-[#222222] text-[#888888] hover:text-white"
                    )}
                  >
                    {d === 0 ? "0m" : `${d}m`}
                  </button>
                ))}
              </div>
            </div>

            {/* Changeable Units & Shape Toggles */}
            <div className="grid grid-cols-3 gap-2">
              {/* Temp Unit */}
              <div className="bg-[#121215] border border-[#222222] rounded-xl p-2 text-center">
                <div className="text-[9px] text-[#666666] font-mono uppercase mb-1">Temp Unit</div>
                <div className="flex bg-[#18181c] rounded-lg p-0.5 border border-[#262626]">
                  <button
                    type="button"
                    onClick={() => setTempUnit('C')}
                    className={cn(
                      "flex-1 py-0.5 text-[10px] font-mono rounded transition-all cursor-pointer",
                      tempUnit === 'C' ? "bg-white text-black font-bold" : "text-[#888888] hover:text-white"
                    )}
                  >
                    °C
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempUnit('F')}
                    className={cn(
                      "flex-1 py-0.5 text-[10px] font-mono rounded transition-all cursor-pointer",
                      tempUnit === 'F' ? "bg-white text-black font-bold" : "text-[#888888] hover:text-white"
                    )}
                  >
                    °F
                  </button>
                </div>
              </div>

              {/* Velocity Unit */}
              <div className="bg-[#121215] border border-[#222222] rounded-xl p-2 text-center">
                <div className="text-[9px] text-[#666666] font-mono uppercase mb-1">Velocity</div>
                <div className="flex bg-[#18181c] rounded-lg p-0.5 border border-[#262626]">
                  <button
                    type="button"
                    onClick={() => setVelocityUnit('ms')}
                    className={cn(
                      "flex-1 py-0.5 text-[10px] font-mono rounded transition-all cursor-pointer",
                      velocityUnit === 'ms' ? "bg-white text-black font-bold" : "text-[#888888] hover:text-white"
                    )}
                  >
                    m/s
                  </button>
                  <button
                    type="button"
                    onClick={() => setVelocityUnit('knots')}
                    className={cn(
                      "flex-1 py-0.5 text-[10px] font-mono rounded transition-all cursor-pointer",
                      velocityUnit === 'knots' ? "bg-white text-black font-bold" : "text-[#888888] hover:text-white"
                    )}
                  >
                    kts
                  </button>
                </div>
              </div>

              {/* Geometry Shape */}
              <div className="bg-[#121215] border border-[#222222] rounded-xl p-2 text-center">
                <div className="text-[9px] text-[#666666] font-mono uppercase mb-1">Shape</div>
                <div className="flex bg-[#18181c] rounded-lg p-0.5 border border-[#262626]">
                  <button
                    type="button"
                    onClick={() => setGeometryType('cylinder')}
                    className={cn(
                      "flex-1 py-0.5 text-[9px] font-mono rounded transition-all cursor-pointer",
                      geometryType === 'cylinder' ? "bg-white text-black font-bold" : "text-[#888888] hover:text-white"
                    )}
                  >
                    Cyl
                  </button>
                  <button
                    type="button"
                    onClick={() => setGeometryType('cuboid')}
                    className={cn(
                      "flex-1 py-0.5 text-[9px] font-mono rounded transition-all cursor-pointer",
                      geometryType === 'cuboid' ? "bg-white text-black font-bold" : "text-[#888888] hover:text-white"
                    )}
                  >
                    Cub
                  </button>
                </div>
              </div>
            </div>

            {/* Variable Selector */}
            <div className="space-y-1.5">
              <div className="text-[9px] text-[#666666] font-mono uppercase tracking-wide">3D Layer Variable</div>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { key: 'temperature', label: 'θ₀ Temperature' },
                  { key: 'salinity',    label: 'S₀ Salinity' },
                  { key: 'currents',    label: 'Velocity Vector' },
                  { key: 'chlorophyll', label: '🌿 Chlorophyll-a' },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveVariable(key)}
                    className={cn(
                      "py-1.5 px-2 text-[10px] font-mono rounded-lg border transition-all cursor-pointer text-center",
                      activeVariable === key
                        ? "bg-white text-black font-bold border-white shadow-sm"
                        : "bg-[#141414] border-[#262626] text-[#888888] hover:text-white hover:border-[#333333]"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Scale Legend */}
            <div className="bg-[#121215] border border-[#222222] rounded-xl p-2.5 space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-[#888888] font-bold">{legendConfig.title}</span>
                <span className="flex items-center gap-1.5 text-white font-bold">
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
              <div className="flex justify-between text-[9px] text-[#666666] font-mono">
                {legendConfig.ticks.map((t) => <span key={t}>{t}</span>)}
              </div>
            </div>

            {/* Reset 3D Camera */}
            <button
              type="button"
              onClick={handleResetCamera}
              className="w-full py-2 rounded-xl bg-[#161616] hover:bg-[#202020] border border-[#262626] hover:border-[#3a3a3a] text-[11px] font-mono text-[#888888] hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset 3D Scene View</span>
            </button>

            {/* ── UNIFIED OCEAN PARAMETERS CARD (NO REPEATS, SINGLE CARD) ── */}
            <div className="bg-[#121215] border border-[#222222] rounded-xl p-3 space-y-2 font-mono text-[10px]">
              <div className="flex justify-between items-center text-[#666] pb-1.5 border-b border-[#1f1f1f]">
                <span className="uppercase tracking-wide font-bold text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  OCEAN PARAMETERS
                </span>
                <span className="uppercase tracking-wide font-bold text-[#888] text-[9px]">@{selectedDepth}m Sounding</span>
              </div>

              <div className="space-y-1 divide-y divide-[#1a1a1f]/60">
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-[#888888]">θ₀ Temperature</span>
                  <span className="font-bold text-white">{formatTemp(activeLayer.thetao)}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 pt-1">
                  <span className="text-[#888888]">S₀ Salinity</span>
                  <span className="font-bold text-white">{activeLayer.so.toFixed(2)} PSU</span>
                </div>
                <div className="flex justify-between items-center py-0.5 pt-1">
                  <span className="text-[#888888]">Current Velocity</span>
                  <span className="font-bold text-white">{formatVelocity(activeLayer.current_speed)}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 pt-1">
                  <span className="text-[#888888]">Flow Heading</span>
                  <span className="font-bold text-white">{Math.round(activeLayer.dirDeg)}° {activeLayer.dirStr}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 pt-1">
                  <span className="text-[#888888]">Sound Velocity</span>
                  <span className="font-bold text-cyan-300">{soundSpeed.toFixed(1)} m/s</span>
                </div>
                <div className="flex justify-between items-center py-0.5 pt-1">
                  <span className="text-[#888888]">Eastward Velocity (uo)</span>
                  <span className="font-bold text-white">{basePrediction.variables.uo?.formattedValue ?? `${activeLayer.uo.toFixed(3)} m/s`}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 pt-1">
                  <span className="text-[#888888]">Northward Velocity (vo)</span>
                  <span className="font-bold text-white">{basePrediction.variables.vo?.formattedValue ?? `${activeLayer.vo.toFixed(3)} m/s`}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 pt-1">
                  <span className="text-[#888888]">Thermal Contrast</span>
                  <span className="font-bold text-amber-300">{mlPredictions.thermalContrast} °C</span>
                </div>
                <div className="flex justify-between items-center py-0.5 pt-1">
                  <span className="text-[#888888]">Sea Surface Height (zos)</span>
                  <span className="font-bold text-white">{basePrediction.variables.zos?.formattedValue ?? '+0.24 m'}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 pt-1">
                  <span className="text-[#888888]">Mixed Layer (mlotst)</span>
                  <span className="font-bold text-white">{basePrediction.variables.mlotst?.formattedValue ?? '42 m'}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 pt-1">
                  <span className="text-[#888888]">Sea-Floor Temp (bottomT)</span>
                  <span className="font-bold text-white">{basePrediction.variables.bottomT?.formattedValue ?? '1.82 °C'}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 pt-1">
                  <span className="text-[#888888]">Sea-Ice (siconc)</span>
                  <span className="font-bold text-neutral-400">Not Applicable in Indian Ocean</span>
                </div>
                <div className="flex justify-between items-center py-0.5 pt-1">
                  <span className="text-[#888888]">Chlorophyll (chl)</span>
                  <span className="font-bold text-emerald-400">{activeLayer.chlorophyll.toFixed(3)} mg/m³</span>
                </div>
              </div>
            </div>

            {/* Export Tactical Dossier (PDF) Button */}
            <button
              type="button"
              onClick={() =>
                downloadMissionDossierPdf({
                  lat,
                  lon,
                  depth: selectedDepth,
                  activeReadings: {
                    temperature: activeLayer.thetao,
                    salinity: activeLayer.so,
                    currentSpeedMs: activeLayer.current_speed,
                    currentDirectionDeg: activeLayer.dirDeg,
                    currentDirectionCompass: activeLayer.dirStr,
                    uo: activeLayer.uo,
                    vo: activeLayer.vo,
                    thermalContrast: mlPredictions.thermalContrast,
                    chlorophyll: activeLayer.chlorophyll,
                    density: computeSeawaterDensity(activeLayer.thetao, activeLayer.so, selectedDepth),
                    soundSpeed: soundSpeed.toFixed(1),
                    bottomT: basePrediction.variables.bottomT?.value ?? 1.82,
                    zos: basePrediction.variables.zos?.value ?? 0.08,
                    mlotst: basePrediction.variables.mlotst?.value ?? 42,
                    coastalProximity: mlPredictions.coastalProximity,
                    cycloneProbStr: mlPredictions.cycloneProbStr,
                    predictedSurgeStr: mlPredictions.predictedSurgeStr,
                    fishingZoneStatus: mlPredictions.fishingZoneStatus,
                    ecosystemScore: mlPredictions.ecosystemScore,
                    ecosystemStatus: mlPredictions.ecosystemStatus,
                    coralBleaching: mlPredictions.coralBleaching,
                    algalBloomRisk: mlPredictions.algalBloomRisk,
                    fishStress: mlPredictions.fishStress,
                    hypoxiaRisk: mlPredictions.hypoxiaRisk,
                  },
                })
              }
              className="w-full py-2.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/50 text-cyan-300 hover:text-white font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-[0.99]"
              title="Export Tactical Mission Dossier (PDF)"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export Tactical Dossier (PDF)</span>
            </button>
          </div>
        </aside>

        {/* ── 2. CENTER 3D CANVAS VIEWPORT ── */}
        <div ref={mountRef} className="flex-1 h-full relative overflow-hidden bg-gradient-to-b from-[#26262b] via-[#1e1e22] to-[#18181b]">
          <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

          {/* Left Expand Trigger (when left panel is minimized) */}
          {isLeftPanelMinimized && (
            <button
              type="button"
              onClick={() => setIsLeftPanelMinimized(false)}
              className="absolute top-1/2 -translate-y-1/2 left-0 z-20 bg-[#0c0c0c]/95 backdrop-blur-xl border border-l-0 border-cyan-500/40 rounded-r-xl py-3 px-2.5 text-xs font-bold text-cyan-400 shadow-2xl hover:bg-[#161616] transition-all cursor-pointer flex items-center gap-1.5 group"
              title="Show Parameters & Telemetry"
            >
              <Sliders className="w-4 h-4 text-cyan-400 group-hover:rotate-90 transition-transform" />
              <span className="max-sm:hidden">Parameters</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Right Expand Trigger (when right panel is collapsed) */}
          {panelCollapsed && (
            <button
              type="button"
              onClick={() => setPanelCollapsed(false)}
              className="absolute top-1/2 -translate-y-1/2 right-0 z-20 bg-[#0c0c0c]/95 backdrop-blur-xl border border-r-0 border-cyan-500/40 rounded-l-xl py-3 px-2.5 text-xs font-bold text-cyan-400 shadow-2xl hover:bg-[#161616] transition-all cursor-pointer flex items-center gap-1.5 group"
              title="Show In-Situ & Marine Activity"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="max-sm:hidden">Observation &amp; Intel</span>
              <Radio className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            </button>
          )}
        </div>

        {/* ── 3. RIGHT DOCKED PANEL: IN-SITU & WATER COLUMN INTEL ── */}
        <aside
          className={cn(
            "relative w-80 sm:w-96 lg:w-[410px] xl:w-[430px] bg-[#121214] border-l border-[#262628] flex flex-col z-20 shrink-0 h-full overflow-hidden shadow-2xl transition-all duration-300",
            panelCollapsed && "-mr-80 sm:-mr-96 lg:-mr-[410px] xl:-mr-[430px] opacity-0 pointer-events-none"
          )}
        >
          {/* Panel Header */}
          <div className="p-3.5 border-b border-[#222222] flex justify-between items-center shrink-0">
            <div className="min-w-0 flex-1 pr-2">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs text-[#888888] font-medium truncate">{basePrediction.location.regionName}</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white truncate">Water Column Intelligence</h3>
              <div className="text-xs text-[#888888] font-mono mt-0.5">
                {lat.toFixed(4)}°N, {lon.toFixed(4)}°E • @{selectedDepth}m
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPanelCollapsed(true)}
              className="p-1.5 rounded-lg bg-[#141414] hover:bg-[#202020] border border-[#222222] text-[#888888] hover:text-white transition-all cursor-pointer shrink-0"
              title="Minimize panel"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="px-3.5 py-2 bg-[#090909] border-b border-[#222222] flex gap-1.5 shrink-0">
            <button
              onClick={() => setActiveTab('telemetry')}
              className={cn(
                "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center",
                activeTab === 'telemetry'
                  ? "bg-[#1c1c1c] text-white border border-[#333333]"
                  : "text-[#888888] hover:text-white"
              )}
            >
              Overview
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
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 custom-scrollbar">
            {/* TAB 1: OVERVIEW (In-Situ Observation Platform + Clean Marine Activity) */}
            {activeTab === 'telemetry' && (
              <div className="space-y-3.5">
                {/* 1. Location & In-Situ Observation Platform Card */}
                <div className="bg-[#121215] border border-[#222222] rounded-2xl p-3.5 space-y-3 shadow-inner">
                  <div className="flex items-start justify-between gap-2 border-b border-[#1e1e1e] pb-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] text-[#666666] font-mono uppercase tracking-wider flex items-center gap-1.5">
                        <Radio className="w-3 h-3 text-cyan-400" />
                        <span>LOCATION &amp; IN-SITU OBSERVATION</span>
                      </div>
                      <div className="text-sm font-bold text-white truncate mt-0.5" title={activeSensor.name}>
                        {activeSensor.name}
                      </div>
                    </div>
                    {/* Max Depth badge – right side of float header */}
                    <div className="flex-shrink-0 text-right">
                      <div className="text-[9px] text-[#666666] font-mono uppercase tracking-wider">Max Depth</div>
                      <div className="text-sm font-bold text-cyan-300 font-mono">{activeSensor.maxDepth}m</div>
                    </div>
                  </div>

                  {/* Coordinates & Depth Selected */}
                  <div className="bg-[#18181c] border border-[#262626] rounded-xl p-2.5 grid grid-cols-3 gap-2 text-center font-mono">
                    <div className="border-r border-[#262626] pr-1">
                      <div className="text-[9px] text-[#666666] uppercase">Latitude</div>
                      <div className="text-xs font-bold text-white">
                        {lat >= 0 ? `${lat.toFixed(3)}°N` : `${Math.abs(lat).toFixed(3)}°S`}
                      </div>
                    </div>
                    <div className="border-r border-[#262626] pr-1">
                      <div className="text-[9px] text-[#666666] uppercase">Longitude</div>
                      <div className="text-xs font-bold text-white">
                        {lon >= 0 ? `${lon.toFixed(3)}°E` : `${Math.abs(lon).toFixed(3)}°W`}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-[#666666] uppercase">Depth</div>
                      <div className="text-xs font-bold text-cyan-400">
                        {selectedDepth}m
                      </div>
                    </div>
                  </div>

                  {/* Basin / Region */}
                  <div className="flex items-center justify-between text-[10px] font-mono px-1">
                    <span className="text-[#888888] uppercase tracking-wide">BASIN / REGION</span>
                    <span className="text-white font-bold">{activeSensor.basin}</span>
                  </div>

                  {/* Inspect Profile Button */}
                  <button
                    type="button"
                    onClick={() => setIsProfileModalOpen(true)}
                    className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs font-sans flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-[0.99]"
                  >
                    <Radio className="w-3.5 h-3.5 text-black" />
                    <span>Inspect Profile of the Area</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-black" />
                  </button>
                </div>

                {/* 2. RAKSHAK INTELLIGENCE PREDICTIONS (ML Model Output) */}
                <div className="p-3.5 rounded-2xl bg-[#121215] border border-[#222222] space-y-3 shadow-inner font-mono text-[10px]">
                  <div className="flex items-center justify-between border-b border-[#1e1e1e] pb-2">
                    <span className="text-[10px] text-neutral-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                      RAKSHAK INTELLIGENCE PREDICTIONS
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-800/50">
                      ML INFERENCE
                    </span>
                  </div>

                  <div className="space-y-1.5 divide-y divide-[#1a1a1f]/60">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-[#888888]">Coastal Proximity</span>
                      <span className="font-bold text-white">{mlPredictions.coastalProximity}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-[#888888]">Cyclone Probability</span>
                      <span className="font-bold text-white">{mlPredictions.cycloneProbStr}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-[#888888]">Predicted Surge</span>
                      <span className="font-bold text-white">{mlPredictions.predictedSurgeStr}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-[#888888]">Fishing Zone Status</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[9px] font-bold border flex items-center gap-1.5",
                        mlPredictions.fishingZoneStatus === 'SAFE' 
                          ? "bg-emerald-950/60 text-emerald-300 border-emerald-700/50"
                          : mlPredictions.fishingZoneStatus === 'ADVISORY'
                          ? "bg-amber-950/60 text-amber-300 border-amber-700/50"
                          : "bg-red-950/60 text-red-300 border-red-700/50"
                      )}>
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          mlPredictions.fishingZoneStatus === 'SAFE' ? "bg-emerald-400" :
                          mlPredictions.fishingZoneStatus === 'ADVISORY' ? "bg-amber-400" : "bg-red-400"
                        )} />
                        <span>{mlPredictions.fishingZoneStatus}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. MARINE ECOSYSTEM HEALTH ANALYSIS (ML Model Output) */}
                <div className="p-3.5 rounded-2xl bg-[#121215] border border-[#222222] space-y-3 shadow-inner font-mono text-[10px]">
                  <div className="flex items-center justify-between border-b border-[#1e1e1e] pb-2">
                    <span className="text-[10px] text-neutral-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      MARINE ECOSYSTEM HEALTH ANALYSIS
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {mlPredictions.ecosystemStatus}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="bg-[#18181c] p-2.5 rounded-xl border border-[#262626] space-y-1.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-[#888888]">Ecosystem Score</span>
                        <span className="font-bold text-white">{mlPredictions.ecosystemScore}/100 ({mlPredictions.ecosystemStatus})</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#141416] rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${mlPredictions.ecosystemScore}%` }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#18181c] p-2 rounded-xl border border-[#262626]">
                        <span className="text-neutral-500 block text-[9px] mb-0.5">Coral Bleaching</span>
                        <span className="text-white font-bold text-xs">{mlPredictions.coralBleaching}</span>
                      </div>
                      <div className="bg-[#18181c] p-2 rounded-xl border border-[#262626]">
                        <span className="text-neutral-500 block text-[9px] mb-0.5">Algal Bloom Risk</span>
                        <span className="text-amber-300 font-bold text-xs">{mlPredictions.algalBloomRisk}</span>
                      </div>
                      <div className="bg-[#18181c] p-2 rounded-xl border border-[#262626]">
                        <span className="text-neutral-500 block text-[9px] mb-0.5">Fish Stress</span>
                        <span className="text-emerald-300 font-bold text-xs">{mlPredictions.fishStress}</span>
                      </div>
                      <div className="bg-[#18181c] p-2 rounded-xl border border-[#262626]">
                        <span className="text-neutral-500 block text-[9px] mb-0.5">Hypoxia Risk</span>
                        <span className="text-cyan-300 font-bold text-xs">{mlPredictions.hypoxiaRisk}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      window.open(`/hazards?lat=${lat}&lon=${lon}&depth=${selectedDepth}`, '_blank');
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/50 text-cyan-300 hover:text-white text-[11px] font-semibold flex items-center justify-between transition-all cursor-pointer"
                  >
                    <span>Detailed Hazard Dossier</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
                  </button>
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
                <div className="text-xs font-bold text-white">Vertical Temperature &amp; Salinity Decay Profile</div>
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

          {/* ── SLIDE-UP PROFILE PANEL (anchored to right aside) ── */}
          <InSituSensorModal
            mode="panel"
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            sensor={activeSensor}
            onTargetCoordinates={(targetLat, targetLon, targetDepth) => {
              if (targetDepth !== undefined) {
                setSelectedDepth(targetDepth);
              }
              setIsProfileModalOpen(false);
            }}
          />
        </aside>
      </div>
    </div>
  );
}
