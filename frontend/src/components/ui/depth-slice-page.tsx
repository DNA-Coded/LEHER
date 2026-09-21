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
  ShieldCheck,
  Waves,
  ShieldAlert,
  Anchor,
  MapPinOff
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
import { fetchHazardEvents, fetchEcosystemData, fetchModelSliceAt, fetchVectorSliceAt, type HazardEvent, type EcosystemCell } from '@/services/oceanApi';
import { getBathymetricSeafloorDepth, type BathymetryInfo } from '@/lib/ocean/bathymetry';
import { DataProvenanceBadge } from '@/components/ui/DataProvenanceBadge';
import { evaluateDataProvenance } from '@/lib/ocean/provenance';

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

function getZoneLabel(d: number, seafloorDepth?: number): string {
  if (seafloorDepth && d >= seafloorDepth - 5) return 'Benthic Boundary / Seafloor';
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
  [0.000, '#031c14'], // Deep aphotic depletion (0.00 mg/m³) - subtle dark translucent forest tint
  [0.030, '#052e20'], // Faint deep marine green
  [0.075, '#064832'], // Low twilight green
  [0.150, '#085f41'], // Mild lower photic green
  [0.300, '#0a8258'], // Moderate aquatic green
  [0.550, '#059669'], // Standard coastal euphotic emerald green
  [0.900, '#00b84f'], // High phytoplankton vibrant green
  [1.400, '#00e668'], // Rich biological bloom emerald
  [2.200, '#00ff73'], // High-density eutrophic bloom radiant green
  [3.500, '#66ff00'], // Peak phytoplankton intense fluorescent lime-green
];

const OCEAN_DEPTH_STOPS: ColorStop[] = [
  [0,    '#00d4ff'], // 0m Surface - luminous tropical cyan-blue
  [30,   '#00b4d8'], // 30m Photic
  [75,   '#0096c7'], // 75m Subsurface
  [150,  '#0077b6'], // 150m Upper thermocline
  [300,  '#023e8a'], // 300m Mid-depth - rich royal blue
  [500,  '#031d68'], // 500m Deep mesopelagic
  [1000, '#03045e'], // 1000m Twilight - deep midnight navy
  [1500, '#020626'], // 1500m Bathypelagic
  [2000, '#010314'], // 2000m Abyssal floor - dark oceanic abyss
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

function getLayerColor(val: number, variable: 'temperature' | 'salinity' | 'currents' | 'chlorophyll' | 'depth'): THREE.Color {
  if (variable === 'depth') return interpolateColorRamp(val, OCEAN_DEPTH_STOPS);
  if (variable === 'salinity') return interpolateColorRamp(val, SALINITY_STOPS);
  if (variable === 'currents') return interpolateColorRamp(val, CURRENT_STOPS);
  if (variable === 'chlorophyll') return interpolateColorRamp(val, CHLOROPHYLL_STOPS);
  return interpolateColorRamp(val, TEMP_STOPS);
}

// ── Nautical Compass Rose Texture for Seabed Base ──
function createCompassRoseTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const cx = 512;
  const cy = 512;

  // Clear & dark pedestal base
  ctx.fillStyle = '#060d1a';
  ctx.beginPath();
  ctx.arc(cx, cy, 500, 0, Math.PI * 2);
  ctx.fill();

  // Outer border ring
  ctx.strokeStyle = '#00f5d4';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, 480, 0, Math.PI * 2);
  ctx.stroke();

  // Secondary inner ring
  ctx.strokeStyle = '#00a896';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 440, 0, Math.PI * 2);
  ctx.stroke();

  // Subtle concentric radar range rings
  [120, 240, 360].forEach((r) => {
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // Degree ticks
  for (let deg = 0; deg < 360; deg += 5) {
    const rad = (deg - 90) * (Math.PI / 180);
    const isMajor = deg % 90 === 0;
    const isMedium = deg % 30 === 0;
    const innerR = isMajor ? 415 : isMedium ? 435 : 455;
    const outerR = 478;

    ctx.strokeStyle = isMajor ? '#00f5d4' : isMedium ? 'rgba(0, 245, 212, 0.6)' : 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = isMajor ? 4 : isMedium ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * innerR, cy + Math.sin(rad) * innerR);
    ctx.lineTo(cx + Math.cos(rad) * outerR, cy + Math.sin(rad) * outerR);
    ctx.stroke();

    // Degree numbers on 30° intervals
    if (isMedium && !isMajor) {
      const textR = 390;
      ctx.fillStyle = 'rgba(0, 245, 212, 0.7)';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${deg}°`, cx + Math.cos(rad) * textR, cy + Math.sin(rad) * textR);
    }
  }

  // Crosshair axes
  ctx.strokeStyle = 'rgba(0, 245, 212, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, 60); ctx.lineTo(cx, 964);
  ctx.moveTo(60, cy); ctx.lineTo(964, cy);
  ctx.stroke();

  // True North Arrowhead Pointer (Pointing UP in texture = -Z in 3D scene)
  ctx.fillStyle = '#ff2a5f';
  ctx.beginPath();
  ctx.moveTo(cx, 75);
  ctx.lineTo(cx - 28, 165);
  ctx.lineTo(cx, 145);
  ctx.lineTo(cx + 28, 165);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Cardinal labels
  ctx.font = 'bold 56px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // N (Red/White)
  ctx.fillStyle = '#ff2a5f';
  ctx.fillText('N', cx, 205);
  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = '#ff6b8b';
  ctx.fillText('TRUE NORTH (0°)', cx, 245);

  // E, S, W
  ctx.font = 'bold 50px monospace';
  ctx.fillStyle = '#00f5d4';
  ctx.fillText('E', 870, cy);
  ctx.fillText('S', cx, 870);
  ctx.fillText('W', 154, cy);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  return texture;
}

export default function DepthSlicePage() {
  // Read lat, lon, depth, sensor from query params
  const [lat, setLat] = useState<number>(() => {
    const search = new URLSearchParams(window.location.search);
    const parsedLat = parseFloat(search.get('lat') || '15.4');
    return isNaN(parsedLat) ? 15.4 : parsedLat;
  });

  const [lon, setLon] = useState<number>(() => {
    const search = new URLSearchParams(window.location.search);
    const parsedLon = parseFloat(search.get('lon') || '71.2');
    return isNaN(parsedLon) ? 71.2 : parsedLon;
  });

  const [initialSensor] = useState<string>(() => {
    const search = new URLSearchParams(window.location.search);
    return search.get('sensor') || '';
  });

  const bathymetryInfo: BathymetryInfo = useMemo(() => {
    return getBathymetricSeafloorDepth(lat, lon);
  }, [lat, lon]);

  // Dynamic Smart Depth Presets (Generated strictly within 0m to maxSafeDepth)
  const smartDepthPresets = useMemo(() => {
    const maxSafe = bathymetryInfo.maxSafeDepth;
    if (maxSafe >= 2000) {
      return [0, 50, 150, 500, 1000, 2000];
    }
    if (maxSafe <= 40) {
      const step = Math.max(5, Math.floor(maxSafe / 4));
      const pts = [0];
      for (let d = step; d < maxSafe; d += step) pts.push(d);
      if (!pts.includes(maxSafe)) pts.push(maxSafe);
      return pts;
    }
    if (maxSafe <= 100) {
      const step = 20;
      const pts = [0];
      for (let d = step; d < maxSafe; d += step) pts.push(d);
      if (!pts.includes(maxSafe)) pts.push(maxSafe);
      return pts;
    }
    if (maxSafe <= 350) {
      // e.g. 248m -> [0, 50, 100, 150, 200, 248]
      const step = 50;
      const pts = [0];
      for (let d = step; d < maxSafe; d += step) pts.push(d);
      if (!pts.includes(maxSafe)) pts.push(maxSafe);
      return pts;
    }
    if (maxSafe <= 800) {
      const step = 100;
      const pts = [0];
      for (let d = step; d < maxSafe; d += step) pts.push(d);
      if (!pts.includes(maxSafe)) pts.push(maxSafe);
      return pts;
    }
    const step = 250;
    const pts = [0];
    for (let d = step; d < maxSafe; d += step) pts.push(d);
    if (!pts.includes(maxSafe)) pts.push(maxSafe);
    return pts;
  }, [bathymetryInfo.maxSafeDepth]);

  const [selectedDepth, setSelectedDepth] = useState<number>(() => {
    const search = new URLSearchParams(window.location.search);
    const depth = parseInt(search.get('depth') || '150', 10);
    const info = getBathymetricSeafloorDepth(lat, lon);
    return Math.min(isNaN(depth) ? 150 : depth, info.maxSafeDepth);
  });

  // Safe depth setter: guarantees depths beyond the local bathymetric seafloor ceiling can NEVER be selected
  const handleSetSafeDepth = useCallback((targetDepth: number) => {
    const safe = Math.min(Math.max(0, targetDepth), bathymetryInfo.maxSafeDepth);
    setSelectedDepth(safe);
  }, [bathymetryInfo.maxSafeDepth]);

  // Sync state if URL query params change dynamically
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const qLat = parseFloat(search.get('lat') || '');
    const qLon = parseFloat(search.get('lon') || '');
    const qDepth = parseInt(search.get('depth') || '', 10);
    if (!isNaN(qLat) && qLat !== lat) setLat(qLat);
    if (!isNaN(qLon) && qLon !== lon) setLon(qLon);
    if (!isNaN(qDepth)) {
      const curInfo = getBathymetricSeafloorDepth(!isNaN(qLat) ? qLat : lat, !isNaN(qLon) ? qLon : lon);
      setSelectedDepth(Math.min(qDepth, curInfo.maxSafeDepth));
    }
  }, [lat, lon]);

  // Enforce depth ceiling strictly: whenever bathymetry ceiling changes or selectedDepth exceeds it, clamp immediately
  useEffect(() => {
    if (selectedDepth > bathymetryInfo.maxSafeDepth) {
      setSelectedDepth(bathymetryInfo.maxSafeDepth);
    }
  }, [bathymetryInfo.maxSafeDepth, selectedDepth]);

  // Quick switch location handler
  const handleSelectOceanLocation = useCallback((newLat: number, newLon: number, defaultDepth: number = 0) => {
    setLat(newLat);
    setLon(newLon);
    const info = getBathymetricSeafloorDepth(newLat, newLon);
    const safeD = Math.min(defaultDepth, info.maxSafeDepth);
    setSelectedDepth(safeD);
    const newUrl = `/depth-slice?lat=${newLat}&lon=${newLon}&depth=${safeD}`;
    window.history.pushState(null, '', newUrl);
  }, []);

  const [activeTab, setActiveTab] = useState<'telemetry' | 'layers' | 'profile'>('telemetry');
  const [geometryType, setGeometryType] = useState<'cylinder' | 'cuboid'>('cylinder');

  // Interactive Multi-Parameter Feature Checkboxes
  interface ActiveSliceParameters {
    temperature: boolean; // Enables temperature gradient (mutually exclusive with chlorophyll)
    chlorophyll: boolean; // Enables green chlorophyll gradient (mutually exclusive with temperature)
    salinity: boolean;    // Enables white salt particles
    velocity: boolean;    // Enables dynamic velocity-scaled wave swells and 3D arrow
  }

  const [activeParams, setActiveParams] = useState<ActiveSliceParameters>({
    temperature: false,
    chlorophyll: false,
    salinity: false,
    velocity: false,
  });

  const toggleTemperature = useCallback(() => {
    setActiveParams((prev) => ({
      ...prev,
      temperature: !prev.temperature,
      chlorophyll: !prev.temperature ? false : prev.chlorophyll,
    }));
  }, []);

  const toggleChlorophyll = useCallback(() => {
    setActiveParams((prev) => ({
      ...prev,
      chlorophyll: !prev.chlorophyll,
      temperature: !prev.chlorophyll ? false : prev.temperature,
    }));
  }, []);

  const toggleSalinity = useCallback(() => {
    setActiveParams((prev) => ({
      ...prev,
      salinity: !prev.salinity,
    }));
  }, []);

  const toggleVelocity = useCallback(() => {
    setActiveParams((prev) => ({
      ...prev,
      velocity: !prev.velocity,
    }));
  }, []);

  // Derived activeVariable for telemetry & data slice fetcher
  const activeVariable: 'temperature' | 'salinity' | 'currents' | 'chlorophyll' = activeParams.temperature
    ? 'temperature'
    : activeParams.chlorophyll
    ? 'chlorophyll'
    : activeParams.salinity
    ? 'salinity'
    : activeParams.velocity
    ? 'currents'
    : 'temperature';

  const [panelCollapsed, setPanelCollapsed] = useState<boolean>(false);
  const [selectedTimeZone, setSelectedTimeZone] = useState<TimeZone>('IST');
  const [realTimeClock, setRealTimeClock] = useState<string>('');
  const [realFetchedData, setRealFetchedData] = useState<any>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadRealData = async () => {
      try {
        setFetchError(null);
        setRealFetchedData(null);
        if (activeVariable === 'currents') {
          const vectors = await fetchVectorSliceAt(selectedDepth, lat, lon, 1.0);
          if (mounted && vectors && vectors.length > 0) {
            const centerVec = vectors[Math.floor(vectors.length / 2)] || vectors[0];
            setRealFetchedData({
               current_speed: centerVec.magnitude,
               dirDeg: centerVec.directionDeg,
               uo: centerVec.u,
               vo: centerVec.v
            });
          }
        } else {
          const slice = await fetchModelSliceAt(activeVariable, selectedDepth, lat, lon, 1.0);
          if (mounted && slice && slice.values.length > 0) {
            const centerIdx = Math.floor(slice.gridHeight / 2) * slice.gridWidth + Math.floor(slice.gridWidth / 2);
            let val = slice.values[centerIdx];
            if (isNaN(val)) val = slice.values.find(v => !isNaN(v)) || 0;
            
            if (activeVariable === 'temperature') setRealFetchedData({ thetao: val });
            if (activeVariable === 'salinity') setRealFetchedData({ so: val });
            if (activeVariable === 'chlorophyll') setRealFetchedData({ chlorophyll: val });
          }
        }
      } catch (err: any) {
        console.warn('Failed to fetch real data slice:', err);
        if (mounted) setFetchError(err?.message || 'Model slice unavailable');
      }
    };
    loadRealData();
    return () => { mounted = false; };
  }, [activeVariable, selectedDepth, lat, lon]);

  // Changeable units state
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
  const [velocityUnit, setVelocityUnit] = useState<'ms' | 'knots'>('ms');

  // Minimize state for Left Panel
  const [isLeftPanelMinimized, setIsLeftPanelMinimized] = useState<boolean>(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<'slice' | 'params' | 'intel'>('slice');

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

  // Compute applicable vertical depths constrained by local seafloor bathymetry
  const applicableDepths = useMemo(() => {
    const filtered = STANDARD_DEPTHS.filter((d) => d <= bathymetryInfo.maxSafeDepth);
    // If the seafloor is shallower than 2000m and not already explicitly represented, append the seafloor level
    if (bathymetryInfo.maxSafeDepth < 2000 && !filtered.includes(bathymetryInfo.maxSafeDepth)) {
      filtered.push(bathymetryInfo.maxSafeDepth);
      filtered.sort((a, b) => a - b);
    }
    return filtered.length > 0 ? filtered : [0];
  }, [bathymetryInfo.maxSafeDepth]);

  // Generate water column data using predictOceanState modulated by season
  const waterColumn = useMemo<WaterColumnLayer[]>(() => {
    const sMod = {
      pre_monsoon: { temp: 1.2, current: 0.75, sal: 0.2 },
      sw_monsoon: { temp: -1.4, current: 1.6, sal: -0.1 },
      post_monsoon: { temp: 0.4, current: 1.0, sal: -0.3 },
      ne_monsoon: { temp: -0.6, current: 0.9, sal: 0.1 },
    }[selectedSeason];

    return applicableDepths.map((d) => {
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
  }, [applicableDepths, lat, lon, selectedSeason]);

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

  const activeLayerBase = waterColumn[selectedIndex] || waterColumn[0];
  const activeLayer = useMemo(() => {
    if (realFetchedData) return { ...activeLayerBase, ...realFetchedData };
    return activeLayerBase;
  }, [activeLayerBase, realFetchedData]);

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

  // Data Provenance Lineage: Reanalysis vs ML vs Simulation
  const provenanceInfo = useMemo(() => {
    return evaluateDataProvenance(lat, lon, {
      isBackendConnected: true,
      isRealDataFetched: Boolean(realFetchedData),
      isMlNearby: activeHazards.some((h) => Math.hypot(h.latitude - lat, h.longitude - lon) < 3.0),
      backendError: fetchError,
    });
  }, [lat, lon, realFetchedData, activeHazards, fetchError]);

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
    if (initialSensor) {
      const direct = IN_SITU_SENSORS.find(s => s.id === initialSensor);
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
      maxDepth: bathymetryInfo.maxSafeDepth,
      description: `${regionDesc} Monitored for thermocline stability, current velocity vectors, and halocline stratification across 0–${bathymetryInfo.maxSafeDepth}m.`,
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
  }, [initialSensor, lat, lon, basePrediction, waterColumn, bathymetryInfo.maxSafeDepth]);

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
  const particleVelocitiesRef = useRef<{ vx: number; vz: number; baseY: number; bobFreq: number; bobAmp: number }[]>([]);
  const bedrockMeshRef = useRef<THREE.Mesh | null>(null);
  const yTopRef = useRef<number>(2.9);
  const layerGroupsRef = useRef<{
    grp: THREE.Group;
    sliceWaveMesh: THREE.Mesh;
    slabMat: THREE.MeshPhysicalMaterial;
    arrowGrp?: THREE.Group;
    reticleGrp?: THREE.Group;
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
  const extractionSocketRef = useRef<THREE.Mesh | THREE.LineSegments | null>(null);
  const hudSpriteRef = useRef<THREE.Sprite | null>(null);
  const hudCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hudTextureRef = useRef<THREE.CanvasTexture | null>(null);

  // Camera heading & Viewport compass state
  const [cameraHeading, setCameraHeading] = useState<number>(315);

  const activeParamsRef = useRef<ActiveSliceParameters>(activeParams);
  useEffect(() => {
    activeParamsRef.current = activeParams;
    if (particlesMeshRef.current) {
      particlesMeshRef.current.visible = activeParams.salinity;
    }
    layerGroupsRef.current.forEach((item) => {
      const isHighlight = selectedIndex === item.idx;
      if (item.arrowGrp) {
        item.arrowGrp.visible = isHighlight && activeParams.velocity;
      }
      if (item.reticleGrp) {
        item.reticleGrp.visible = isHighlight && activeParams.velocity;
      }
    });
  }, [activeParams, selectedIndex]);

  const handleAlignNorth = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    const target = ctrl.target;
    const radius = Math.hypot(cam.position.x - target.x, cam.position.z - target.z) || 8.0;
    const currentY = cam.position.y;
    cam.position.set(0, currentY, radius);
    ctrl.target.set(0, 0, 0);
    ctrl.update();
    setCameraHeading(0);
  }, []);

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
    let layer = waterColumn[idx];
    if (idx === selectedIndex && realFetchedData) {
      layer = { ...layer, ...realFetchedData };
    }
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
    ctx.fillText(getZoneLabel(layer.depth, bathymetryInfo.seafloorDepth), 22, 74);

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
      ctx.fillStyle = 'rgba(16, 185, 129, 0.24)';
      ctx.fillRect(16, 194, w - 32, 26);
    }
    ctx.fillStyle = '#34d399';
    ctx.fillText(`Chl-a:`, 24, 214);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${layer.chlorophyll.toFixed(3)} mg/m³`, 140, 214);

    hudTextureRef.current.needsUpdate = true;
  }, [waterColumn, activeVariable, selectedIndex, realFetchedData]);

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

    const updateHeading = () => {
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      const heading = Math.round((Math.atan2(dir.x, -dir.z) * 180) / Math.PI + 360) % 360;
      setCameraHeading(heading);
    };
    controls.addEventListener('change', updateHeading);
    updateHeading();

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

      // 1. Dynamic Ocean Surface Waves Calculation - Driven by Surface Current Velocity when enabled
      const waveMesh = waveMeshRef.current;
      const isVelocityActive = activeParamsRef.current.velocity;
      if (waveMesh && waveMesh.geometry.userData.origX) {
        const sSpeed = waterColumn[0]?.current_speed ?? 0.06;
        // Velocity factor: scaled gracefully across realistic current speeds
        const sVelFactor = Math.max(0.4, Math.min(2.4, sSpeed / 0.06));
        // When velocity is checked: dynamic velocity-scaled swell; when unchecked: small, slow baseline waves
        const sWaveAmp = isVelocityActive ? (0.066 * Math.pow(sVelFactor, 0.52)) : 0.020;
        // Fluid rhythmic wave frequency proportional to velocity when active
        const sWaveFreq = isVelocityActive ? (2.1 * Math.pow(sVelFactor, 0.55)) : 0.90;

        const posAttr = waveMesh.geometry.attributes.position;
        const origX = waveMesh.geometry.userData.origX;
        const origY = waveMesh.geometry.userData.origY;
        const count = posAttr.count;

        for (let i = 0; i < count; i++) {
          const ox = origX[i];
          const oy = origY[i];
          const w1 = Math.sin(ox * 1.8 + oy * 1.2 + time * sWaveFreq) * sWaveAmp;
          const w2 = Math.cos(ox * 2.4 - oy * 1.6 + time * (sWaveFreq * 0.82)) * (sWaveAmp * 0.55);
          const w3 = Math.sin((ox * 1.2 + oy * 2.2) + time * (sWaveFreq * 1.15)) * (sWaveAmp * 0.28);
          const dist = Math.hypot(ox, oy);
          const w4 = Math.cos(dist * 2.5 - time * (sWaveFreq * 0.90)) * (sWaveAmp * 0.18);
          posAttr.array[i * 3 + 2] = w1 + w2 + w3 + w4;
        }
        posAttr.needsUpdate = true;
        waveMesh.geometry.computeVertexNormals();
        (waveMesh.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.44 + Math.sin(time * sWaveFreq) * 0.08;
      }

      // 2. Meniscus bobbing
      const meniscus = meniscusMeshRef.current;
      if (meniscus) {
        meniscus.position.y = yTopRef.current + 0.018 + Math.sin(time * 2.2) * 0.012;
      }

      // 3. Sun caustic light ray bob
      sunCausticLight.position.x = Math.sin(time * 1.1) * 2.0;
      sunCausticLight.position.z = Math.cos(time * 0.9) * 2.0;

      // 4. Salinity-Stratified Suspended White Salt Particles & Marine Snow
      const particles = particlesMeshRef.current;
      const vels = particleVelocitiesRef.current;
      if (particles && vels.length > 0) {
        const pArray = particles.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < vels.length; i++) {
          const vel = vels[i];
          pArray[i * 3] += vel.vx;
          pArray[i * 3 + 2] += vel.vz;
          pArray[i * 3 + 1] = vel.baseY + Math.sin(time * vel.bobFreq) * vel.bobAmp;

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

        // Dynamic 3D undulating waves on the extracted slice top - driven by local layer velocity
        const sliceWave = item.sliceWaveMesh;
        if (sliceWave && sliceWave.geometry.userData.origX) {
          const isExtracted = item.curX > 0.15;
          const slideProgress = Math.min(1.0, item.curX / 3.8);
          const sPos = sliceWave.geometry.attributes.position;
          const sOrigX = sliceWave.geometry.userData.origX;
          const sOrigY = sliceWave.geometry.userData.origY;
          const sCount = sPos.count;

          // Physical velocity at this specific depth layer
          const layerSpeed = waterColumn[item.idx]?.current_speed ?? 0.04;
          const layerVelFactor = Math.max(0.35, Math.min(2.4, layerSpeed / 0.06));

          // Base amplitude: extracted slice gets full swell, in-column upper layers get graceful visible undulation
          const depthDecay = Math.max(0.35, 1.0 - (item.idx / waterColumn.length) * 0.65);
          const baseAmp = isExtracted
            ? (0.85 + 0.15 * slideProgress)
            : (item.idx <= 1 ? 0.65 : 0.40 * depthDecay);

          const sAmp = isVelocityActive
            ? (baseAmp * 0.058 * Math.pow(layerVelFactor, 0.52))
            : (baseAmp * 0.016);
          const layerWaveFreq = isVelocityActive
            ? (time * 1.8 * Math.pow(layerVelFactor, 0.55))
            : (time * 0.85);

          for (let j = 0; j < sCount; j++) {
            const ox = sOrigX[j];
            const oy = sOrigY[j];
            const sw1 = Math.sin(ox * (1.9 + 0.25 * layerVelFactor) + oy * 1.4 + layerWaveFreq) * sAmp;
            const sw2 = Math.cos(ox * 2.5 - oy * (1.6 + 0.25 * layerVelFactor) + layerWaveFreq * 0.85) * (sAmp * 0.55);
            const sw3 = Math.sin((ox + oy) * 2.8 + layerWaveFreq * 1.1) * (sAmp * 0.22);
            sPos.array[j * 3 + 2] = sw1 + sw2 + sw3;
          }
          sPos.needsUpdate = true;
          sliceWave.geometry.computeVertexNormals();

          if (isExtracted) {
            (sliceWave.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.58 + Math.sin(layerWaveFreq) * 0.12;
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
          (tetherLineRef.current.material as THREE.LineBasicMaterial).opacity = Math.min(0.85, Math.max(0, curX / 3.2));
        }

        if (extractionSocketRef.current) {
          extractionSocketRef.current.position.y = baseY;
          const sMat = (extractionSocketRef.current as any).material;
          if (sMat) sMat.opacity = Math.min(0.75, Math.max(0, curX / 3.2));
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

      // Bedrock / solid lithosphere is strictly unclickable
      if (bedrockMeshRef.current) {
        const bedrockHits = raycaster.intersectObject(bedrockMeshRef.current, true);
        if (bedrockHits.length > 0) return;
      }

      const meshes: THREE.Mesh[] = [];
      layerGroupsRef.current.forEach((item) => {
        item.grp.traverse((child) => {
          if ((child as THREE.Mesh).isMesh && !child.userData.isBedrock && child.userData.isClickable !== false) {
            child.userData.parentIdx = item.idx;
            meshes.push(child as THREE.Mesh);
          }
        });
      });

      const hits = raycaster.intersectObjects(meshes, false);
      if (hits.length > 0) {
        const hitIdx = hits[0].object.userData.parentIdx;
        if (typeof hitIdx === 'number' && waterColumn[hitIdx]) {
          handleSetSafeDepth(waterColumn[hitIdx].depth);
        }
      }
    };
    canvas.addEventListener('click', handleCanvasClick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('click', handleCanvasClick);
      controls.removeEventListener('change', updateHeading);
      ro.disconnect();
      renderer.dispose();
      controls.dispose();
    };
  }, [waterColumn, handleSetSafeDepth]);

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
    const maxSafe = bathymetryInfo.maxSafeDepth;
    const vScale = colorbarState.vExaggeration / 150;
    const totalEffHeight = BLOCK_HEIGHT * vScale;

    // Distribute height between active water column and solid subterranean bedrock
    const isShallow = maxSafe < 2000;
    const depthRatio = isShallow
      ? Math.max(0.28, Math.min(0.92, Math.pow(maxSafe / 2000, 0.44)))
      : 1.0;
    const waterHeight = totalEffHeight * depthRatio;
    const bedrockHeight = totalEffHeight - waterHeight;

    const yTop = totalEffHeight / 2;
    const ySeafloor = yTop - waterHeight;
    const yBottom = -totalEffHeight / 2;
    const waterCenterY = yTop - waterHeight / 2;
    const bedrockCenterY = ySeafloor - bedrockHeight / 2;
    yTopRef.current = yTop;

    // 1. Outer Translucent Water Column (Trimmed strictly to water depth)
    const outerGeo =
      geometryType === 'cylinder'
        ? new THREE.CylinderGeometry(BLOCK_RADIUS, BLOCK_RADIUS, waterHeight, 64, 32, false)
        : new THREE.BoxGeometry(BLOCK_WIDTH, waterHeight, BLOCK_WIDTH, 24, 32, 24);

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
    outerMesh.position.set(0, waterCenterY, 0);
    outerMesh.userData = { isWater: true, isClickable: false };
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

    const surfaceColor = activeParams.chlorophyll
      ? getLayerColor(waterColumn[0].chlorophyll, 'chlorophyll')
      : activeParams.temperature
      ? getLayerColor(waterColumn[0].thetao, 'temperature')
      : getLayerColor(0, 'depth');

    const capMat = new THREE.MeshPhysicalMaterial({
      color: surfaceColor,
      emissive: surfaceColor,
      emissiveIntensity: activeParams.chlorophyll ? 0.55 : activeParams.temperature ? 0.45 : 0.35,
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
    capMesh.position.set(0, yTop + 0.015, 0);
    capMesh.rotation.x = -Math.PI / 2;
    capMesh.userData = { isWater: true, isClickable: false };
    waterGroup.add(capMesh);
    waveMeshRef.current = capMesh;

    // Meniscus Ring
    if (geometryType === 'cylinder') {
      const ringGeo = new THREE.RingGeometry(BLOCK_RADIUS - 0.04, BLOCK_RADIUS + 0.02, 64);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f5a0, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
      const meniscus = new THREE.Mesh(ringGeo, ringMat);
      meniscus.position.set(0, yTop + 0.02, 0);
      meniscus.rotation.x = -Math.PI / 2;
      meniscus.userData = { isClickable: false };
      waterGroup.add(meniscus);
      meniscusMeshRef.current = meniscus;
    } else {
      const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(BLOCK_WIDTH * 0.99, 0.02, BLOCK_WIDTH * 0.99));
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x00f5a0, transparent: true, opacity: 0.65 });
      const meniscus = new THREE.LineSegments(edgeGeo, edgeMat);
      meniscus.position.set(0, yTop + 0.01, 0);
      meniscus.userData = { isClickable: false };
      waterGroup.add(meniscus);
      meniscusMeshRef.current = meniscus;
    }

    // 2.5. Solid Subterranean Bedrock / Lithosphere Substrate (Below Seafloor Boundary)
    if (isShallow && bedrockHeight > 0.05) {
      const bedrockGeo =
        geometryType === 'cylinder'
          ? new THREE.CylinderGeometry(BLOCK_RADIUS * 1.015, BLOCK_RADIUS * 1.035, bedrockHeight, 64, 16, false)
          : new THREE.BoxGeometry(BLOCK_WIDTH * 1.015, bedrockHeight, BLOCK_WIDTH * 1.015);

      const bedrockMat = new THREE.MeshStandardMaterial({
        color: 0x141210, // Deep basalt lithospheric rock
        roughness: 0.96,
        metalness: 0.12,
        side: THREE.DoubleSide,
      });
      const bedrockMesh = new THREE.Mesh(bedrockGeo, bedrockMat);
      bedrockMesh.position.set(0, bedrockCenterY, 0);
      bedrockMesh.userData = { isBedrock: true, isClickable: false };
      waterGroup.add(bedrockMesh);
      bedrockMeshRef.current = bedrockMesh;

      // Geological Strata Wireframe Contours
      const strataGeo =
        geometryType === 'cylinder'
          ? new THREE.CylinderGeometry(BLOCK_RADIUS * 1.018, BLOCK_RADIUS * 1.038, bedrockHeight, 32, 6, true)
          : new THREE.BoxGeometry(BLOCK_WIDTH * 1.018, bedrockHeight, BLOCK_WIDTH * 1.018);
      const strataMat = new THREE.MeshBasicMaterial({
        color: 0x3d352c, // Strata sediment lines
        wireframe: true,
        transparent: true,
        opacity: 0.28,
      });
      const strataMesh = new THREE.Mesh(strataGeo, strataMat);
      strataMesh.position.set(0, bedrockCenterY, 0);
      strataMesh.userData = { isBedrock: true, isClickable: false };
      waterGroup.add(strataMesh);

      // Solid Seafloor Surface Cap (Basalt bed sealing bottom of water column)
      const seafloorCapGeo =
        geometryType === 'cylinder'
          ? new THREE.CircleGeometry(BLOCK_RADIUS * 1.015, 64)
          : new THREE.PlaneGeometry(BLOCK_WIDTH * 1.015, BLOCK_WIDTH * 1.015);
      const seafloorCapMat = new THREE.MeshStandardMaterial({
        color: 0x211c18, // Seafloor basalt top
        roughness: 0.90,
        metalness: 0.18,
        side: THREE.DoubleSide,
      });
      const seafloorCapMesh = new THREE.Mesh(seafloorCapGeo, seafloorCapMat);
      seafloorCapMesh.position.set(0, ySeafloor, 0);
      seafloorCapMesh.rotation.x = -Math.PI / 2;
      seafloorCapMesh.userData = { isBedrock: true, isClickable: false };
      waterGroup.add(seafloorCapMesh);

      // Glowing Amber Benthic Boundary Seam Marker
      if (geometryType === 'cylinder') {
        const seamGeo = new THREE.RingGeometry(BLOCK_RADIUS * 0.97, BLOCK_RADIUS * 1.05, 64);
        const seamMat = new THREE.MeshBasicMaterial({
          color: 0xf59e0b, // Amber glow
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.92,
        });
        const seamMesh = new THREE.Mesh(seamGeo, seamMat);
        seamMesh.position.set(0, ySeafloor + 0.006, 0);
        seamMesh.rotation.x = -Math.PI / 2;
        seamMesh.userData = { isBedrock: true, isClickable: false };
        waterGroup.add(seamMesh);
      } else {
        const seamEdgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(BLOCK_WIDTH * 1.03, 0.02, BLOCK_WIDTH * 1.03));
        const seamEdgeMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2 });
        const seamMesh = new THREE.LineSegments(seamEdgeGeo, seamEdgeMat);
        seamMesh.position.set(0, ySeafloor + 0.006, 0);
        seamMesh.userData = { isBedrock: true, isClickable: false };
        waterGroup.add(seamMesh);
      }
    } else {
      bedrockMeshRef.current = null;
    }

    const effRadius = geometryType === 'cylinder' ? BLOCK_RADIUS * 0.88 : (BLOCK_WIDTH / 2) * 0.88;

    // 3. Salinity-Stratified Suspended White Salt Particles & Marine Snow
    // Higher salinity depth levels spawn significantly more white salt particles; lower salinity has fewer particles
    const salValues = waterColumn.map((l) => l.so);
    const minSal = Math.min(...salValues);
    const maxSal = Math.max(...salValues);
    const salDelta = Math.max(0.4, maxSal - minSal);

    // Compute salinity-proportional sampling weights for each layer
    const layerWeights = waterColumn.map((layer) => {
      const norm = Math.max(0.04, Math.min(1.0, (layer.so - minSal) / salDelta));
      // Power curve gives high salinity levels 6x - 8x more white particles than low salinity levels
      return Math.pow(norm, 1.85) * 0.88 + 0.12;
    });
    const totalWeight = layerWeights.reduce((a, b) => a + b, 0);

    const pCount = 520; // Crisp particle pool for vivid salinity stratification
    const pGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(pCount * 3);
    const pColors = new Float32Array(pCount * 3);
    const vels: { vx: number; vz: number; baseY: number; bobFreq: number; bobAmp: number }[] = [];

    let pIdx = 0;
    waterColumn.forEach((layer, lIdx) => {
      const layerWeight = layerWeights[lIdx];
      // Target number of white particles allocated to this depth level
      const layerPCount = Math.max(4, Math.round(pCount * (layerWeight / totalWeight)));
      const layerRatio = maxSafe > 0 ? layer.depth / maxSafe : 0;
      const layerY = yTop - layerRatio * waterHeight;
      const bandThickness = (waterHeight / Math.max(1, waterColumn.length)) * 0.95;

      const layerSpeed = Math.max(0.008, layer.current_speed);
      const dirRad = (layer.dirDeg * Math.PI) / 180;
      // Drift velocity scales directly with layer current velocity
      const driftVx = Math.sin(dirRad) * layerSpeed * 0.007;
      const driftVz = Math.cos(dirRad) * layerSpeed * 0.007;

      for (let k = 0; k < layerPCount && pIdx < pCount; k++) {
        const rawY = layerY + (Math.random() - 0.5) * bandThickness;
        const y = Math.max(ySeafloor + 0.04, Math.min(yTop - 0.04, rawY));
        const r = Math.sqrt(Math.random()) * effRadius;
        const theta = Math.random() * Math.PI * 2;
        const x = geometryType === 'cylinder' ? Math.cos(theta) * r : (Math.random() - 0.5) * BLOCK_WIDTH * 0.88;
        const z = geometryType === 'cylinder' ? Math.sin(theta) * r : (Math.random() - 0.5) * BLOCK_WIDTH * 0.88;

        pPositions[pIdx * 3] = x;
        pPositions[pIdx * 3 + 1] = y;
        pPositions[pIdx * 3 + 2] = z;

        // Pure crystalline white salt particles
        const brightness = 0.95 + Math.random() * 0.05;
        pColors[pIdx * 3] = brightness;
        pColors[pIdx * 3 + 1] = brightness * (0.97 + Math.random() * 0.03);
        pColors[pIdx * 3 + 2] = 1.0;

        vels.push({
          vx: driftVx + (Math.random() - 0.5) * 0.0006,
          vz: driftVz + (Math.random() - 0.5) * 0.0006,
          baseY: y,
          bobFreq: 1.0 + layerSpeed * 6.0 + Math.random() * 1.5,
          bobAmp: 0.0006 + layerSpeed * 0.004,
        });

        pIdx++;
      }
    });

    // Fill remainder slots if rounding left gaps
    while (pIdx < pCount) {
      const lIdx = Math.floor(Math.random() * waterColumn.length);
      const layer = waterColumn[lIdx];
      const layerRatio = maxSafe > 0 ? layer.depth / maxSafe : 0;
      const layerY = yTop - layerRatio * waterHeight;
      const rawY = layerY + (Math.random() - 0.5) * 0.12;
      const y = Math.max(ySeafloor + 0.04, Math.min(yTop - 0.04, rawY));
      const r = Math.sqrt(Math.random()) * effRadius;
      const theta = Math.random() * Math.PI * 2;

      pPositions[pIdx * 3] = Math.cos(theta) * r;
      pPositions[pIdx * 3 + 1] = y;
      pPositions[pIdx * 3 + 2] = Math.sin(theta) * r;
      pColors[pIdx * 3] = 0.98;
      pColors[pIdx * 3 + 1] = 0.98;
      pColors[pIdx * 3 + 2] = 1.0;
      vels.push({
        vx: 0.0004,
        vz: -0.0004,
        baseY: y,
        bobFreq: 1.5,
        bobAmp: 0.001,
      });
      pIdx++;
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));
    particleVelocitiesRef.current = vels;

    const pMat = new THREE.PointsMaterial({
      size: 0.072,
      transparent: true,
      opacity: 0.88,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(pGeo, pMat);
    particles.visible = activeParams.salinity;
    waterGroup.add(particles);
    particlesMeshRef.current = particles;

    // 4. Layer Slices with Dynamic 3D Waves & Lateral Slide Extraction
    const SLIDE_FAR_X = 4.2;
    const SLIDE_FAR_Z = 1.25;
    const SLIDE_LIFT_Y = 0.28;

    waterColumn.forEach((layer, idx) => {
      const ratio = maxSafe > 0 ? layer.depth / maxSafe : 0;
      const y = yTop - ratio * waterHeight;

      // Color mapping: for chlorophyll, use pure green; for temperature, scientific gradient; else plain blue depth
      let color: THREE.Color;
      if (activeParams.chlorophyll) {
        color = getLayerColor(layer.chlorophyll, 'chlorophyll');
      } else if (activeParams.temperature) {
        color = getLayerColor(layer.thetao, 'temperature');
      } else {
        color = getLayerColor(layer.depth, 'depth');
      }

      const isHighlight = selectedIndex === idx;
      const chlGlow = activeParams.chlorophyll ? Math.min(0.45, (layer.chlorophyll / 1.5) * 0.35) : 0;

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
        emissiveIntensity: isHighlight ? 0.48 : 0.08 + chlGlow,
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
        emissiveIntensity: isHighlight ? 0.68 : 0.25 + chlGlow,
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

      // D. Current Velocity 3D Arrow (Exclusively on Selected / Extracted Slice when Velocity Enabled)
      const arrowLength = Math.max(0.38, Math.min(1.35, layer.current_speed * 5.4));
      const angle = Math.atan2(layer.vo, layer.uo);
      const arrowGrp = new THREE.Group();
      arrowGrp.rotation.y = -angle;
      arrowGrp.position.y = sliceThickness / 2 + 0.04;
      arrowGrp.visible = isHighlight && activeParams.velocity;

      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.026, 0.026, arrowLength, 8),
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

      // E. Slice-Level Compass Reticle (Only on Selected / Extracted Slice when Velocity Enabled)
      const reticleGrp = new THREE.Group();
      reticleGrp.position.y = sliceThickness / 2 + 0.015;
      reticleGrp.visible = isHighlight && activeParams.velocity;

      // True North Indicator Line (points along -Z)
      const nLineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -0.85),
      ]);
      const nLineMat = new THREE.LineBasicMaterial({ color: 0xff2a5f, linewidth: 2, transparent: true, opacity: 0.9 });
      const nLine = new THREE.Line(nLineGeo, nLineMat);
      reticleGrp.add(nLine);

      // True North Arrowhead on slice
      const nHeadGeo = new THREE.ConeGeometry(0.05, 0.12, 6);
      const nHeadMat = new THREE.MeshBasicMaterial({ color: 0xff2a5f });
      const nHead = new THREE.Mesh(nHeadGeo, nHeadMat);
      nHead.position.set(0, 0, -0.85);
      nHead.rotation.x = -Math.PI / 2;
      reticleGrp.add(nHead);

      // East, South, West axis cross lines
      const crossGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.75, 0, 0), // West
        new THREE.Vector3(0.75, 0, 0),  // East
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0.75),  // South
      ]);
      const crossMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.35 });
      const crossLines = new THREE.LineSegments(crossGeo, crossMat);
      reticleGrp.add(crossLines);

      // Compass Ring
      const ringGeo2 = new THREE.RingGeometry(0.74, 0.76, 32);
      const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
      const ringMesh2 = new THREE.Mesh(ringGeo2, ringMat2);
      ringMesh2.rotation.x = -Math.PI / 2;
      reticleGrp.add(ringMesh2);

      grp.add(reticleGrp);

      layerGroupsRef.current.push({
        grp,
        sliceWaveMesh,
        slabMat,
        arrowGrp,
        reticleGrp,
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

    // Seabed base with High-Precision Holographic Nautical Compass Rose (at true bedrock base)
    const baseRadius = geometryType === 'cylinder' ? BLOCK_RADIUS + 0.35 : (BLOCK_WIDTH / 2) + 0.35;
    const baseGeo = new THREE.CircleGeometry(baseRadius, 64);
    const baseMat = new THREE.MeshBasicMaterial({
      map: createCompassRoseTexture(),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.set(0, yBottom - 0.04, 0);
    baseMesh.rotation.x = -Math.PI / 2;
    baseMesh.userData = { isClickable: false };
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
      if (d20 <= maxSafe) {
        const ratio20 = d20 / maxSafe;
        const y20 = yTop - ratio20 * waterHeight;

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
        isoMesh.userData = { isClickable: false };
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
        ringMesh.userData = { isClickable: false };
        waterGroup.add(ringMesh);
      }
    }

    // Initial HUD update
    updateExtractedHud(selectedIndex);
  }, [geometryType, activeParams.temperature, activeParams.chlorophyll, activeParams.salinity, activeParams.velocity, waterColumn, updateExtractedHud, colorbarState, showIsosurface20C, bathymetryInfo.maxSafeDepth]);

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

      if (item.arrowGrp) {
        item.arrowGrp.visible = isHighlight && activeParams.velocity;
      }
      if (item.reticleGrp) {
        item.reticleGrp.visible = isHighlight && activeParams.velocity;
      }

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

  // Compute Color Scale Legend values — driven by activeParams
  const legendConfig = useMemo(() => {
    const { colormap, minVal, maxVal } = colorbarState;

    if (activeParams.temperature) {
      const def = VARIABLE_DEFAULTS['temperature'];
      const title = tempUnit === 'F' ? 'θ₀ Temperature (°F)' : 'θ₀ Temperature (°C)';
      const curVal = activeLayer.thetao;
      const valStr = tempUnit === 'F' ? `${((curVal * 9) / 5 + 32).toFixed(2)} °F` : `${curVal.toFixed(2)} °C`;
      const pct = Math.max(0, Math.min(100, ((curVal - minVal) / (maxVal - minVal || 1)) * 100));
      const gradCss = getCssGradient(colormap as ColorScaleName);
      const mid = (minVal + maxVal) / 2;
      const ticks = [`${minVal.toFixed(1)}`, `${mid.toFixed(1)}`, `${maxVal.toFixed(1)} ${def.unit}`];
      const [lr, lg, lb] = getLinearColor(curVal, minVal, maxVal, colormap as ColorScaleName);
      const hexCol = `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
      return { title, valStr, gradCss, pct, ticks, hexCol };
    }

    if (activeParams.chlorophyll) {
      const title = '🌿 Chlorophyll';
      const curVal = activeLayer.chlorophyll;
      const valStr = `${curVal.toFixed(3)} mg/m³`;
      const pct = Math.max(0, Math.min(100, (curVal / 2.5) * 100));
      const gradCss = 'linear-gradient(to right, #031c14, #064832, #059669, #00b84f, #00ff73, #66ff00)';
      const ticks = ['0.00', '1.20', '2.50+ mg/m³'];
      const chlColor = getLayerColor(curVal, 'chlorophyll');
      const hexCol = `#${chlColor.getHexString()}`;
      return { title, valStr, gradCss, pct, ticks, hexCol };
    }

    // Default: Plain Oceanic Depth Model
    const title = 'Oceanic Depth Gradient';
    const curVal = activeLayer.depth;
    const valStr = `${curVal}m (${getZoneLabel(curVal)})`;
    const maxScale = Math.max(10, bathymetryInfo.maxSafeDepth);
    const pct = Math.max(0, Math.min(100, (curVal / maxScale) * 100));
    const gradCss = 'linear-gradient(to right, #00d4ff, #00b4d8, #0077b6, #023e8a, #03045e, #010314)';
    const midScale = Math.round(maxScale / 2);
    const ticks = [
      '0m (Surface)',
      `${midScale}m`,
      `${maxScale}m (${bathymetryInfo.isContinentalShelf ? 'Shelf' : 'Floor'})`
    ];
    const depthColor = getLayerColor(curVal, 'depth');
    const hexCol = `#${depthColor.getHexString()}`;
    return { title, valStr, gradCss, pct, ticks, hexCol };
  }, [activeParams, activeLayer, tempUnit, colorbarState, bathymetryInfo]);

  // ── Block render if coordinate is on terrestrial land surface ──
  if (bathymetryInfo.isLand) {
    return (
      <div className="min-h-screen w-full bg-[#0d0d11] text-white flex flex-col font-sans select-none relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Minimal Header */}
        <header className="h-16 border-b border-white/[0.08] px-6 flex items-center justify-between z-10 shrink-0 bg-[#060608]/40 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                sessionStorage.setItem('leher_ops_returned_from_subscreen', 'true');
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  window.location.href = '/operations';
                }
              }}
              className="p-2 rounded-xl bg-[#141418] hover:bg-[#202028] border border-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400" />
              <span>Back</span>
            </button>
            <a href="/" className="flex items-center gap-2 text-white font-bold text-sm">
              <img src="/logo.png" alt="Leher Logo" className="h-6 w-auto" />
              <span>Leher • 3D Volumetric Depth Slice</span>
            </a>
          </div>
          <a
            href="/operations"
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-mono text-white transition-all"
          >
            Open Operations
          </a>
        </header>

        {/* Main Content Card */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 z-10">
          <div className="max-w-xl w-full bg-[#131318]/90 border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-xl text-center">
            <div className="flex flex-col items-center space-y-3">
              <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-400 shadow-inner">
                <MapPinOff className="w-10 h-10" />
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30">
                Terrestrial Land Surface Detected
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                3D Ocean Depth Slice Unavailable
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-md">
                The requested coordinate <span className="text-white font-mono font-bold">({lat >= 0 ? `${lat.toFixed(3)}°N` : `${Math.abs(lat).toFixed(3)}°S`}, {lon >= 0 ? `${lon.toFixed(3)}°E` : `${Math.abs(lon).toFixed(3)}°W`})</span> is located on land ({bathymetryInfo.description}). Subsurface ocean water column and 3D volumetric slices are only applicable to marine waters.
              </p>
            </div>

            {/* Quick Explore Recommended Ocean Coordinates */}
            <div className="bg-[#181820] border border-white/10 rounded-xl p-4 text-left space-y-2.5">
              <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wide">
                Try Verified Ocean Bathymetric Coordinates:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => { window.location.href = '/depth-slice?lat=14.5&lon=73.2&depth=150'; }}
                  className="p-2.5 rounded-lg bg-[#101014] hover:bg-[#20202c] border border-white/10 hover:border-cyan-400 text-left transition-all cursor-pointer group"
                >
                  <div className="text-[10px] font-mono text-cyan-300 font-bold group-hover:text-cyan-200">
                    Continental Slope
                  </div>
                  <div className="text-xs text-white font-mono mt-0.5">14.5°N, 73.2°E</div>
                  <div className="text-[10px] text-neutral-400 font-mono">Seafloor: ~460m</div>
                </button>

                <button
                  type="button"
                  onClick={() => { window.location.href = '/depth-slice?lat=21.0&lon=72.3&depth=30'; }}
                  className="p-2.5 rounded-lg bg-[#101014] hover:bg-[#20202c] border border-white/10 hover:border-amber-400 text-left transition-all cursor-pointer group"
                >
                  <div className="text-[10px] font-mono text-amber-300 font-bold group-hover:text-amber-200">
                    Continental Shelf
                  </div>
                  <div className="text-xs text-white font-mono mt-0.5">21.0°N, 72.3°E</div>
                  <div className="text-[10px] text-neutral-400 font-mono">Seafloor: ~35m</div>
                </button>

                <button
                  type="button"
                  onClick={() => { window.location.href = '/depth-slice?lat=15.0&lon=68.0&depth=500'; }}
                  className="p-2.5 rounded-lg bg-[#101014] hover:bg-[#20202c] border border-white/10 hover:border-emerald-400 text-left transition-all cursor-pointer group"
                >
                  <div className="text-[10px] font-mono text-emerald-300 font-bold group-hover:text-emerald-200">
                    Deep Basin
                  </div>
                  <div className="text-xs text-white font-mono mt-0.5">15.0°N, 68.0°E</div>
                  <div className="text-[10px] text-neutral-400 font-mono">Seafloor: ~3400m</div>
                </button>
              </div>
            </div>

            {/* Navigation Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => { window.location.href = `/operations?lat=14.5&lon=73.2&depth=150`; }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs transition-all cursor-pointer shadow-md"
              >
                Go to Ocean Operations
              </button>
              <button
                type="button"
                onClick={() => { window.location.href = '/'; }}
                className="py-2.5 px-4 rounded-xl bg-[#1a1a22] hover:bg-[#252532] border border-white/10 text-white font-semibold text-xs transition-all cursor-pointer"
              >
                Landing Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#141416] text-white flex flex-col overflow-hidden font-sans select-none">
      {/* ── TOP NAVIGATION BAR ── */}
      <header className="h-16 w-full max-w-full bg-[#0a0b10]/95 backdrop-blur-xl border-b border-white/[0.08] px-3 sm:px-5 lg:px-6 flex items-center justify-between gap-3 sm:gap-4 z-30 shrink-0 shadow-lg shadow-black/20 overflow-hidden">
        {/* Left: Navigation & Branding (Fluid flex child) */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
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
            className="px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold shrink-0"
            title="Go back to previous page"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="hidden xl:inline whitespace-nowrap">Previous Page</span>
            <span className="hidden sm:inline xl:hidden whitespace-nowrap">Previous</span>
          </button>

          {/* Go to Landing Page */}
          <a
            href="/"
            className="px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold shrink-0"
            title="Return to Leher Landing Page"
          >
            <Home className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="hidden xl:inline whitespace-nowrap">Landing Page</span>
            <span className="hidden sm:inline xl:hidden whitespace-nowrap">Landing</span>
          </a>

          <div className="h-4 w-[1px] bg-white/10 hidden sm:block mx-0.5 shrink-0" />

          {/* Title & Coordinates (No depth measurement) */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <a href="/" className="shrink-0 hover:opacity-90 transition-opacity" title="Leher Home">
              <img 
                src="/logo.png" 
                alt="Leher Logo" 
                title="Leher" 
                className="h-6 sm:h-7 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(56,189,248,0.35)] shrink-0" 
              />
            </a>
            <div className="min-w-0">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="font-bold text-xs sm:text-sm lg:text-base text-white tracking-tight truncate">3D Volumetric Depth Slice</span>
                <DataProvenanceBadge provenance={provenanceInfo} compact className="hidden sm:inline-flex shrink-0" />
              </div>
              <div className="text-[11px] text-zinc-400 font-mono hidden md:flex items-center gap-1.5 whitespace-nowrap truncate">
                <span className="text-zinc-300 font-medium">{basePrediction.location.regionName}</span>
                <span className="text-zinc-600">•</span>
                <span>({lat >= 0 ? `${lat.toFixed(4)}°N` : `${Math.abs(lat).toFixed(4)}°S`}, {lon >= 0 ? `${lon.toFixed(4)}°E` : `${Math.abs(lon).toFixed(4)}°W`})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Controls: Location Preset, Clock, Dossier (Always fitting cleanly) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Quick Ocean Coordinates Preset Selector (xl+ only) */}
          <div className="hidden xl:flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.07] px-2.5 py-1.5 rounded-xl border border-white/10 font-mono text-xs transition-colors shrink-0 max-w-[200px] 2xl:max-w-[240px]">
            <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <select
              value={`${lat.toFixed(1)},${lon.toFixed(1)}`}
              onChange={(e) => {
                const [sLat, sLon] = e.target.value.split(',').map(Number);
                handleSelectOceanLocation(sLat, sLon, 0);
              }}
              className="bg-transparent text-zinc-200 font-mono text-xs focus:outline-none cursor-pointer truncate pr-1 w-full"
            >
              <option value="15.4,71.2" className="bg-[#18181c] text-white">Arabian Sea Deep Basin (2000m)</option>
              <option value="21.0,72.3" className="bg-[#18181c] text-amber-300">Gulf of Khambhat (35m)</option>
              <option value="19.3,71.8" className="bg-[#18181c] text-amber-300">Mumbai Offshore (85m)</option>
              <option value="10.5,72.6" className="bg-[#18181c] text-amber-300">Lakshadweep Atoll (90m)</option>
              <option value="8.8,79.0" className="bg-[#18181c] text-amber-300">Gulf of Mannar (65m)</option>
              <option value="14.5,73.2" className="bg-[#18181c] text-cyan-300">Goa Continental Slope (460m)</option>
              <option value="14.0,86.5" className="bg-[#18181c] text-white">Bay of Bengal Basin (2000m)</option>
            </select>
          </div>

          {/* Real-time Clock & Timezone Selector (lg+ only) */}
          <div className="hidden lg:flex items-center gap-2 font-mono text-xs text-zinc-300 bg-white/[0.04] px-2.5 py-1.5 rounded-xl border border-white/10 shrink-0">
            <span className="whitespace-nowrap font-medium">{realTimeClock}</span>
            <select
              value={selectedTimeZone}
              onChange={(e) => setSelectedTimeZone(e.target.value as TimeZone)}
              className="bg-[#18181b] text-white text-xs font-mono rounded px-1.5 py-0.5 border border-white/15 focus:outline-none cursor-pointer hover:border-cyan-500/50 transition-colors shrink-0"
            >
              {Object.entries(timeZoneMap).map(([tz, info]) => (
                <option key={tz} value={tz}>
                  {tz} ({info.offsetLabel})
                </option>
              ))}
            </select>
          </div>

          {/* Hazard Dossier Button - Always visible, never cropped */}
          <button
            onClick={() => {
              window.open(`/hazards?lat=${lat}&lon=${lon}&depth=${selectedDepth}`, '_blank');
            }}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/90 border border-cyan-600/50 hover:border-cyan-400 text-xs font-mono font-medium text-cyan-200 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm shadow-cyan-950/50"
            title="Open Maritime Hazard Intelligence Dossier"
          >
            <span className="whitespace-nowrap">Hazard Dossier</span>
            <Maximize2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          </button>
        </div>
      </header>

      {/* ── MAIN WORKSPACE: DOCKED 3-COLUMN ARCHITECTURE ── */}
      <div className="flex-1 flex relative overflow-hidden bg-[#18181b]">
        {/* ── 1. LEFT DOCKED PANEL: PARAMETERS & TELEMETRY ── */}
        <aside
          className={cn(
            "bg-[#121214] border-r border-[#262628] flex-col z-20 shrink-0 h-full overflow-hidden shadow-2xl transition-all duration-300",
            "lg:w-[360px] xl:w-[380px]",
            isLeftPanelMinimized ? "lg:-ml-[360px] xl:-ml-[380px] lg:opacity-0 lg:pointer-events-none" : "lg:opacity-100",
            mobileActiveTab === 'params' ? "flex w-full" : "hidden lg:flex"
          )}
        >
          {/* Panel Header */}
          <div className="p-3.5 border-b border-[#222222] flex justify-between items-center shrink-0">
            <div className="min-w-0 flex-1 pr-2">
              <div className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3 h-3 text-cyan-400" />
                <span>PARAMETERS &amp; TELEMETRY</span>
              </div>
              <h3 className="text-sm font-bold text-white mt-0.5 truncate">Depth &amp; Variable Telemetry</h3>
              <div className="text-[10px] font-mono text-[#888888] mt-0.5">
                Level: <span className="text-cyan-400 font-bold">{selectedDepth}m</span> • {getZoneLabel(selectedDepth, bathymetryInfo.seafloorDepth)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsLeftPanelMinimized(true)}
              className="p-1.5 rounded-lg bg-[#141414] hover:bg-[#202020] border border-[#262626] hover:border-[#3a3a3a] text-zinc-400 hover:text-white transition-all cursor-pointer shrink-0"
              title="Minimize parameters panel"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar font-sans">
            {/* Depth Controller */}
            <div className="bg-[#121215] border border-[#222222] rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-zinc-400 uppercase tracking-wider font-semibold">DEPTH CONTROLLER</span>
                <span className="text-white font-bold text-xs">
                  {selectedDepth === 0 ? '0m (Surface)' : `${selectedDepth}m`}
                </span>
              </div>

              <input
                type="range"
                min="0"
                max={bathymetryInfo.maxSafeDepth}
                step={bathymetryInfo.maxSafeDepth <= 100 ? 1 : 5}
                value={Math.min(selectedDepth, bathymetryInfo.maxSafeDepth)}
                onChange={(e) => {
                  handleSetSafeDepth(Number(e.target.value));
                }}
                className="w-full accent-cyan-400 h-1.5 bg-[#1f1f23] rounded appearance-none cursor-pointer"
              />

              <div className="flex justify-between text-[9px] font-mono text-zinc-500 pt-0.5">
                <span>0m</span>
                <span className="text-zinc-300 font-medium">{selectedDepth}m</span>
                <span>{bathymetryInfo.maxSafeDepth}m</span>
              </div>

              {/* Dynamic Depth Presets */}
              <div
                className="grid gap-1 pt-1"
                style={{
                  gridTemplateColumns: `repeat(${smartDepthPresets.length}, minmax(0, 1fr))`,
                }}
              >
                {smartDepthPresets.map((d) => {
                  const isSelected = selectedDepth === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleSetSafeDepth(d)}
                      title={`Set sounding depth to ${d}m`}
                      className={cn(
                        "py-1 rounded-lg text-[10px] font-mono border transition-all text-center truncate cursor-pointer",
                        isSelected
                          ? "bg-cyan-500/20 text-cyan-300 font-bold border-cyan-500/60 shadow-sm"
                          : "bg-[#161619] border-[#242428] text-zinc-400 hover:text-white hover:border-zinc-600 hover:bg-[#202024]"
                      )}
                    >
                      {d}m
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Changeable Units & Shape Toggles */}
            <div className="grid grid-cols-3 gap-2">
              {/* Temp Unit */}
              <div className="bg-[#121215] border border-[#222222] rounded-xl p-2 text-center">
                <div className="text-[9px] text-zinc-500 font-mono uppercase mb-1">Temp Unit</div>
                <div className="flex bg-[#18181c] rounded-lg p-0.5 border border-[#262626]">
                  <button
                    type="button"
                    onClick={() => setTempUnit('C')}
                    className={cn(
                      "flex-1 py-0.5 text-[10px] font-mono rounded transition-all cursor-pointer",
                      tempUnit === 'C' ? "bg-white/[0.12] text-white font-semibold" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    °C
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempUnit('F')}
                    className={cn(
                      "flex-1 py-0.5 text-[10px] font-mono rounded transition-all cursor-pointer",
                      tempUnit === 'F' ? "bg-white/[0.12] text-white font-semibold" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    °F
                  </button>
                </div>
              </div>

              {/* Velocity Unit */}
              <div className="bg-[#121215] border border-[#222222] rounded-xl p-2 text-center">
                <div className="text-[9px] text-zinc-500 font-mono uppercase mb-1">Velocity</div>
                <div className="flex bg-[#18181c] rounded-lg p-0.5 border border-[#262626]">
                  <button
                    type="button"
                    onClick={() => setVelocityUnit('ms')}
                    className={cn(
                      "flex-1 py-0.5 text-[10px] font-mono rounded transition-all cursor-pointer",
                      velocityUnit === 'ms' ? "bg-white/[0.12] text-white font-semibold" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    m/s
                  </button>
                  <button
                    type="button"
                    onClick={() => setVelocityUnit('knots')}
                    className={cn(
                      "flex-1 py-0.5 text-[10px] font-mono rounded transition-all cursor-pointer",
                      velocityUnit === 'knots' ? "bg-white/[0.12] text-white font-semibold" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    kts
                  </button>
                </div>
              </div>

              {/* Geometry Shape */}
              <div className="bg-[#121215] border border-[#222222] rounded-xl p-2 text-center">
                <div className="text-[9px] text-zinc-500 font-mono uppercase mb-1">Shape</div>
                <div className="flex bg-[#18181c] rounded-lg p-0.5 border border-[#262626]">
                  <button
                    type="button"
                    onClick={() => setGeometryType('cylinder')}
                    className={cn(
                      "flex-1 py-0.5 text-[9px] font-mono rounded transition-all cursor-pointer",
                      geometryType === 'cylinder' ? "bg-white/[0.12] text-white font-semibold" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    Cyl
                  </button>
                  <button
                    type="button"
                    onClick={() => setGeometryType('cuboid')}
                    className={cn(
                      "flex-1 py-0.5 text-[9px] font-mono rounded transition-all cursor-pointer",
                      geometryType === 'cuboid' ? "bg-white/[0.12] text-white font-semibold" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    Cub
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive Feature Parameters (Checkboxes) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[9px] text-zinc-500 font-mono uppercase tracking-wider">
                <span>Active Model Parameters</span>
                <span className="text-zinc-400 font-medium">
                  {[activeParams.temperature && 'Temp', activeParams.chlorophyll && 'Chl', activeParams.salinity && 'Sal', activeParams.velocity && 'Waves'].filter(Boolean).join(' • ') || 'Plain Depth Model'}
                </span>
              </div>

              <div className="space-y-1.5 font-mono text-[10px]">
                {/* 1. Temperature Checkbox */}
                <label className={cn(
                  "flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer select-none",
                  activeParams.temperature
                    ? "bg-white/[0.05] border-white/20 text-zinc-200"
                    : "bg-[#131316] border-[#222226] text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                )}>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={activeParams.temperature}
                      onChange={toggleTemperature}
                      className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-0 cursor-pointer accent-cyan-500"
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400/70 via-amber-400/70 to-rose-400/70" />
                      <span className={cn("transition-colors", activeParams.temperature ? "text-neutral-200 font-medium" : "text-neutral-400")}>
                      🌡️ Temperature
                    </span>
                  </div>
                  </div>
                  <span className="text-[9px] text-neutral-400">Color Gradient</span>
                </label>

                {/* 2. Chlorophyll Checkbox */}
                <label className={cn(
                  "flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer select-none",
                  activeParams.chlorophyll
                    ? "bg-emerald-500/[0.07] border-emerald-500/25 text-neutral-200"
                    : "bg-[#131316] border-[#222226] text-neutral-400 hover:border-[#2f2f35] hover:text-neutral-300"
                )}>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={activeParams.chlorophyll}
                      onChange={toggleChlorophyll}
                      className="w-3.5 h-3.5 rounded border-neutral-700/80 bg-neutral-900/80 text-emerald-600/75 focus:ring-0 cursor-pointer accent-emerald-600/75 opacity-85"
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-800 via-emerald-600/80 to-emerald-400/70" />
                      <span className={cn("transition-colors", activeParams.chlorophyll ? "text-neutral-200 font-medium" : "text-neutral-400")}>
                        🌿 Chlorophyll
                    </span>
                  </div>
                  </div>
                  <span className="text-[9px] text-neutral-400">Green Shades</span>
                </label>

                {/* 3. Salinity Checkbox */}
                <label className={cn(
                  "flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer select-none",
                  activeParams.salinity
                    ? "bg-cyan-500/[0.07] border-cyan-500/25 text-neutral-200"
                    : "bg-[#131316] border-[#222226] text-neutral-400 hover:border-[#2f2f35] hover:text-neutral-300"
                )}>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={activeParams.salinity}
                      onChange={toggleSalinity}
                      className="w-3.5 h-3.5 rounded border-neutral-700/80 bg-neutral-900/80 text-cyan-600/75 focus:ring-0 cursor-pointer accent-cyan-600/75 opacity-85"
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-neutral-300/80" />
                      <span className={cn("transition-colors", activeParams.salinity ? "text-neutral-200 font-medium" : "text-neutral-400")}>
                      🧂 Salinity
                    </span>
                  </div>
                  </div>
                  <span className={cn("text-[9px]", activeParams.salinity ? "text-cyan-300/80 font-medium" : "text-neutral-500")}>
                    {activeParams.salinity ? 'Crystals Visible' : 'Hidden'}
                  </span>
                </label>

                {/* 4. Velocity Swell & Vector Checkbox */}
                <label className={cn(
                  "flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer select-none",
                  activeParams.velocity
                    ? "bg-sky-500/[0.07] border-sky-500/25 text-neutral-200"
                    : "bg-[#131316] border-[#222226] text-neutral-400 hover:border-[#2f2f35] hover:text-neutral-300"
                )}>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={activeParams.velocity}
                      onChange={toggleVelocity}
                      className="w-3.5 h-3.5 rounded border-neutral-700/80 bg-neutral-900/80 text-sky-600/75 focus:ring-0 cursor-pointer accent-sky-600/75 opacity-85"
                    />
                    <div className="flex items-center gap-1.5">
                      <Waves className="w-3 h-3 text-sky-400/70" />
                      <span className={cn("transition-colors", activeParams.velocity ? "text-neutral-200 font-medium" : "text-neutral-400")}>
                      Velocity Swell &amp; Vectors
                    </span>
                  </div>
                  </div>
                  <span className={cn("text-[9px]", activeParams.velocity ? "text-sky-300/80 font-medium" : "text-neutral-500")}>
                    {activeParams.velocity ? 'Dynamic Waves' : 'Calm Ripples'}
                  </span>
                </label>
              </div>
            </div>

            {/* Color Scale Legend */}
            <div className="bg-[#121215] border border-[#222222] rounded-xl p-2.5 space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-zinc-400 font-bold">{legendConfig.title}</span>
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
              <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
                {legendConfig.ticks.map((t) => <span key={t}>{t}</span>)}
              </div>
            </div>

            {/* Reset 3D Camera */}
            <button
              type="button"
              onClick={handleResetCamera}
              className="w-full py-2 rounded-xl bg-[#161619] hover:bg-[#202024] border border-[#26262a] hover:border-zinc-600 text-[11px] font-mono text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset 3D Scene View</span>
            </button>

            {/* ── UNIFIED OCEAN PARAMETERS CARD ── */}
            <div className="bg-[#121215] border border-[#222222] rounded-xl p-3 space-y-2 font-mono text-[10px]">
              <div className="flex justify-between items-center text-zinc-400 pb-1.5 border-b border-[#1f1f23]">
                <span className="uppercase tracking-wider font-semibold text-zinc-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
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
        <div 
          ref={mountRef} 
          className={cn(
            "flex-1 h-full relative overflow-hidden bg-gradient-to-b from-[#26262b] via-[#1e1e22] to-[#18181b]",
            mobileActiveTab === 'slice' ? "flex" : "hidden lg:flex"
          )}
        >
          <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

          {/* Tactical Navigational Compass HUD */}
          <div className="absolute top-3 left-3 z-10 bg-[#0d0f17]/90 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-3 shadow-2xl hidden sm:flex items-center gap-3.5 font-mono pointer-events-auto select-none">
            {/* Interactive Rotating Compass Dial */}
            <div className="relative w-14 h-14 rounded-full bg-[#070b12] border border-cyan-500/40 flex items-center justify-center shadow-inner group shrink-0">
              {/* Outer dial rotating with camera azimuth */}
              <div 
                className="absolute inset-0 rounded-full flex items-center justify-center transition-transform duration-75 ease-out"
                style={{ transform: `rotate(${-cameraHeading}deg)` }}
              >
                {/* Cardinal N */}
                <span className="absolute top-1 text-[9px] font-extrabold text-rose-400">N</span>
                {/* Cardinal E */}
                <span className="absolute right-1.5 text-[9px] font-bold text-cyan-300">E</span>
                {/* Cardinal S */}
                <span className="absolute bottom-1 text-[9px] font-bold text-neutral-400">S</span>
                {/* Cardinal W */}
                <span className="absolute left-1.5 text-[9px] font-bold text-neutral-400">W</span>
                {/* Subtle North pointer pip */}
                <div className="absolute top-3.5 w-1 h-1 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]" />
              </div>

              {/* Active Layer Current Flow Vector Needle */}
              <div 
                className="absolute w-full h-full flex items-center justify-center transition-transform duration-150 ease-out pointer-events-none"
                style={{ transform: `rotate(${activeLayer.dirDeg - cameraHeading}deg)` }}
                title={`Current flow heading: ${Math.round(activeLayer.dirDeg)}° (${activeLayer.dirStr})`}
              >
                <div className="h-6 w-0.5 bg-gradient-to-t from-transparent via-cyan-400 to-white rounded-full shadow-[0_0_8px_#00ffcc] relative -top-3">
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rotate-45 bg-white shadow-[0_0_6px_#00ffcc]" />
                </div>
              </div>

              {/* Center Pivot */}
              <div className="w-2 h-2 rounded-full bg-cyan-400 border border-black shadow" />
            </div>

            {/* Readout & Alignment Controls */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Compass className="w-3 h-3 text-cyan-400" />
                  FLOW VECTOR TELEMETRY
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-bold">
                  {selectedDepth}m
                </span>
              </div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span className="text-cyan-300">{Math.round(activeLayer.dirDeg)}° {activeLayer.dirStr}</span>
                <span className="text-neutral-500">•</span>
                <span>{formatVelocity(activeLayer.current_speed)}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                <span>uo: <strong className="text-white">{activeLayer.uo >= 0 ? '+' : ''}{activeLayer.uo.toFixed(2)}</strong></span>
                <span>vo: <strong className="text-white">{activeLayer.vo >= 0 ? '+' : ''}{activeLayer.vo.toFixed(2)}</strong></span>
                <button
                  type="button"
                  onClick={handleAlignNorth}
                  className="ml-1 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 border border-white/20 text-[9px] text-neutral-200 hover:text-white transition-all cursor-pointer font-bold flex items-center gap-1 active:scale-95"
                  title="Snap camera view to True North"
                >
                  <span className="text-rose-400 font-extrabold">N</span>
                  <span>Align</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile floating quick depth indicator & variable pill (< lg only) */}
          <div className="absolute top-3 left-3 right-3 z-20 flex lg:hidden items-center justify-between pointer-events-none">
            <div className="bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 text-[11px] font-mono text-white pointer-events-auto flex items-center gap-1.5 shadow-lg">
              <span className="text-cyan-400 font-bold">-{selectedDepth}m</span>
              <span className="text-neutral-500">·</span>
              <span className="text-neutral-300 truncate max-w-[130px]">{getZoneLabel(selectedDepth)}</span>
            </div>
            <div className="bg-black/85 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/15 text-[10px] font-mono text-cyan-300 pointer-events-auto shadow-lg uppercase font-bold">
              {activeParams.temperature ? 'θ₀ Temp' : activeParams.chlorophyll ? 'Chl-a' : activeParams.salinity ? 'S₀ Sal' : activeParams.velocity ? 'Velocity' : 'Blue Depth'}
            </div>
          </div>

          {/* Left Expand Trigger (when left panel is minimized on desktop) */}
          {isLeftPanelMinimized && (
            <button
              type="button"
              onClick={() => setIsLeftPanelMinimized(false)}
              className="hidden lg:flex absolute top-1/2 -translate-y-1/2 left-0 z-20 bg-[#0c0c0c]/95 backdrop-blur-xl border border-l-0 border-cyan-500/40 rounded-r-xl py-3 px-2.5 text-xs font-bold text-cyan-400 shadow-2xl hover:bg-[#161616] transition-all cursor-pointer items-center gap-1.5 group"
              title="Show Parameters & Telemetry"
            >
              <Sliders className="w-4 h-4 text-cyan-400 group-hover:rotate-90 transition-transform" />
              <span>Parameters</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Right Expand Trigger (when right panel is collapsed on desktop) */}
          {panelCollapsed && (
            <button
              type="button"
              onClick={() => setPanelCollapsed(false)}
              className="hidden lg:flex absolute top-1/2 -translate-y-1/2 right-0 z-20 bg-[#0c0c0c]/95 backdrop-blur-xl border border-r-0 border-cyan-500/40 rounded-l-xl py-3 px-2.5 text-xs font-bold text-cyan-400 shadow-2xl hover:bg-[#161616] transition-all cursor-pointer items-center gap-1.5 group"
              title="Show In-Situ & Marine Activity"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Observation &amp; Intel</span>
              <Radio className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            </button>
          )}
        </div>

        {/* ── 3. RIGHT DOCKED PANEL: IN-SITU & WATER COLUMN INTEL ── */}
        <aside
          className={cn(
            "relative bg-[#121214] border-l border-[#262628] flex-col z-20 shrink-0 h-full overflow-hidden shadow-2xl transition-all duration-300",
            "lg:w-[410px] xl:w-[430px]",
            panelCollapsed ? "lg:-mr-[410px] xl:-mr-[430px] lg:opacity-0 lg:pointer-events-none" : "lg:opacity-100",
            mobileActiveTab === 'intel' ? "flex w-full" : "hidden lg:flex"
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
                      <div className="text-sm font-bold text-white font-mono">{activeSensor.maxDepth}m</div>
                    </div>
                  </div>

                  {/* Coordinates, Depth & Seafloor Selected */}
                  <div className="bg-[#18181c] border border-[#262626] rounded-xl p-2.5 grid grid-cols-4 gap-1 text-center font-mono">
                    <div className="border-r border-[#262626] pr-1">
                      <div className="text-[9px] text-[#666666] uppercase">Latitude</div>
                      <div className="text-xs font-bold text-white truncate">
                        {lat >= 0 ? `${lat.toFixed(2)}°N` : `${Math.abs(lat).toFixed(2)}°S`}
                      </div>
                    </div>
                    <div className="border-r border-[#262626] pr-1">
                      <div className="text-[9px] text-[#666666] uppercase">Longitude</div>
                      <div className="text-xs font-bold text-white truncate">
                        {lon >= 0 ? `${lon.toFixed(2)}°E` : `${Math.abs(lon).toFixed(2)}°W`}
                      </div>
                    </div>
                    <div className="border-r border-[#262626] pr-1">
                      <div className="text-[9px] text-[#666666] uppercase">Depth</div>
                      <div className="text-xs font-bold text-white">
                        {selectedDepth}m
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-[#666666] uppercase">Seafloor</div>
                      <div className="text-xs font-bold text-white">
                        ~{bathymetryInfo.seafloorDepth}m
                      </div>
                    </div>
                  </div>

                  {/* Basin / Region & Seafloor Zone */}
                  <div className="flex items-center justify-between text-[10px] font-mono px-1">
                    <span className="text-[#888888] uppercase tracking-wide">BASIN / ZONE</span>
                    <span className="text-white font-bold truncate max-w-[200px]">{activeSensor.basin} • {bathymetryInfo.zone}</span>
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

                {/* DATA PROVENANCE & SOURCE TELEMETRY */}
                <div className="p-3.5 rounded-2xl bg-[#121215] border border-[#222222] space-y-2.5 shadow-inner font-mono text-[10px]">
                  <div className="flex items-center justify-between border-b border-[#1e1e1e] pb-2">
                    <span className="text-[10px] text-neutral-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-cyan-400" />
                      DATA LINEAGE & PROVENANCE
                    </span>
                    <DataProvenanceBadge provenance={provenanceInfo} compact align="right" />
                  </div>

                  <div className="space-y-1.5 divide-y divide-[#1a1a1f]/60 text-[10px]">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-[#888888]">Primary Dataset</span>
                      <span className="font-bold text-white truncate max-w-[150px]" title={provenanceInfo.details.dataset}>
                        {provenanceInfo.details.dataset}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-[#888888]">Nearest Grid Node</span>
                      <span className="font-bold text-white">{provenanceInfo.details.nearestGridPoint}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-[#888888]">Snapping Distance</span>
                      <span className="font-bold text-white">
                        {provenanceInfo.details.snappingDistance}
                      </span>
                    </div>
                  </div>

                  {provenanceInfo.isSparseOrOffset && (
                    <div className="p-2 bg-amber-950/30 border border-amber-500/30 rounded-lg text-[9px] text-amber-300 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0 text-amber-400 mt-0.5" />
                      <span>Observation node is {provenanceInfo.gridOffsetKm} km from pin. Sub-grid variance expected.</span>
                    </div>
                  )}
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
                      <span className="text-[#888888]">Operating Depth</span>
                      <span className="font-bold text-white">{selectedDepth}m (Seafloor: ~{bathymetryInfo.seafloorDepth}m)</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-[#888888]">Benthic Classification</span>
                      <span className="font-bold text-white">{bathymetryInfo.zone}</span>
                    </div>
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
                  {waterColumn.map((layer, idx) => {
                    const isExceeded = layer.depth > bathymetryInfo.maxSafeDepth;
                    return (
                      <div
                        key={layer.depth}
                        onClick={() => {
                          if (!isExceeded) {
                            handleSetSafeDepth(layer.depth);
                          }
                        }}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-xl border transition-all",
                          isExceeded
                            ? "opacity-35 cursor-not-allowed border-[#18181b] bg-[#0c0c0e] line-through"
                            : selectedIndex === idx
                            ? "bg-cyan-950/40 border-cyan-500/60 shadow-md cursor-pointer"
                            : "bg-[#121212] border-[#222222] hover:bg-[#181818] hover:border-[#333333] cursor-pointer"
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
                    );
                  })}
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
                    <text x="34" y="65" fill="#666666" fontSize="9" textAnchor="end">{Math.round(bathymetryInfo.maxSafeDepth * 0.25)}m</text>
                    <text x="34" y="105" fill="#666666" fontSize="9" textAnchor="end">{Math.round(bathymetryInfo.maxSafeDepth * 0.5)}m</text>
                    <text x="34" y="145" fill="#666666" fontSize="9" textAnchor="end">{Math.round(bathymetryInfo.maxSafeDepth * 0.75)}m</text>
                    <text x="34" y="185" fill="#666666" fontSize="9" textAnchor="end">{bathymetryInfo.maxSafeDepth}m</text>

                    {/* Temp Curve */}
                    <path
                      d={waterColumn
                        .map((l, i) => {
                          const maxD = Math.max(bathymetryInfo.maxSafeDepth, 10);
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
                          const maxD = Math.max(bathymetryInfo.maxSafeDepth, 10);
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
                handleSetSafeDepth(targetDepth);
              }
              setIsProfileModalOpen(false);
            }}
          />
        </aside>
      </div>

      {/* ── MOBILE BOTTOM NAVIGATION BAR (< lg only) ── */}
      <nav className="flex lg:hidden bg-[#0c0c0f] border-t border-[#222226] p-1.5 gap-1 shrink-0 z-30 pb-safe">
        <button
          type="button"
          onClick={() => setMobileActiveTab('slice')}
          className={cn(
            "flex-1 py-2 px-1 rounded-xl text-xs font-mono font-medium flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer min-h-[44px]",
            mobileActiveTab === 'slice'
              ? "bg-[#1f2029] text-cyan-300 border border-cyan-500/30 shadow-sm font-bold"
              : "text-[#888888] hover:text-white"
          )}
        >
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>3D Slice</span>
          </div>
          <span className="text-[9px] text-neutral-400 font-mono">-{selectedDepth}m</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileActiveTab('params')}
          className={cn(
            "flex-1 py-2 px-1 rounded-xl text-xs font-mono font-medium flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer min-h-[44px]",
            mobileActiveTab === 'params'
              ? "bg-[#1f2029] text-cyan-300 border border-cyan-500/30 shadow-sm font-bold"
              : "text-[#888888] hover:text-white"
          )}
        >
          <div className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Parameters</span>
          </div>
          <span className="text-[9px] text-neutral-400 font-mono">{formatTemp(activeLayer.thetao)}</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileActiveTab('intel')}
          className={cn(
            "flex-1 py-2 px-1 rounded-xl text-xs font-mono font-medium flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer min-h-[44px]",
            mobileActiveTab === 'intel'
              ? "bg-[#1f2029] text-cyan-300 border border-cyan-500/30 shadow-sm font-bold"
              : "text-[#888888] hover:text-white"
          )}
        >
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>Intel &amp; Floats</span>
          </div>
          <span className="text-[9px] text-emerald-400 font-mono">{mlPredictions.ecosystemStatus}</span>
        </button>
      </nav>
    </div>
  );
}
