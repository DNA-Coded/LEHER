import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ArrowLeft, 
  ChevronDown, 
  RefreshCw, 
  ArrowUpRight,
  ExternalLink,
  Clock,
  Activity,
  Map as MapIcon,
  Sliders,
  AlertTriangle,
  Leaf,
  Fish,
  ShieldCheck,
  Compass,
  Waves,
  Gauge,
  LifeBuoy,
  Anchor,
  Radio,
  Eye,
  CheckCircle2,
  AlertCircle,
  Thermometer,
  Droplets,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PROJECTION_LIST, PROJECTION_METADATA, type TimeZone } from '@/components/ui/landing-page';
import { predictOceanState, type OceanPredictionResult } from '@/lib/api/oceanPredictionService';

const timeZoneMap: Record<TimeZone, { name: string; timeZone: string; offsetLabel: string }> = {
  IST: { name: 'IST (India Standard)', timeZone: 'Asia/Kolkata', offsetLabel: 'UTC+05:30' },
  UTC: { name: 'UTC / GMT (Universal)', timeZone: 'UTC', offsetLabel: 'UTC+00:00' },
  EST: { name: 'EST (US Eastern)', timeZone: 'America/New_York', offsetLabel: 'UTC-05:00' },
  PST: { name: 'PST (US Pacific)', timeZone: 'America/Los_Angeles', offsetLabel: 'UTC-08:00' },
  JST: { name: 'JST (Japan Standard)', timeZone: 'Asia/Tokyo', offsetLabel: 'UTC+09:00' },
  SGT: { name: 'SGT (Singapore)', timeZone: 'Asia/Singapore', offsetLabel: 'UTC+08:00' },
};

export type IntelOption = 'all' | 'cyclone' | 'ecosystem' | 'fishing' | 'safezone' | 'physics';

export default function OperationsPage() {
  // Read coordinates, depth, and active tab from URL query parameters
  const [params] = useState(() => {
    const search = new URLSearchParams(window.location.search);
    const lat = parseFloat(search.get('lat') || '15.4');
    const lon = parseFloat(search.get('lon') || '71.2');
    const depth = parseInt(search.get('depth') || '150', 10);
    const tabParam = (search.get('tab') || 'all') as IntelOption;
    const validTab = (['all', 'cyclone', 'ecosystem', 'fishing', 'safezone', 'physics'] as IntelOption[]).includes(tabParam)
      ? tabParam
      : 'all';
    return {
      lat: isNaN(lat) ? 15.4 : lat,
      lon: isNaN(lon) ? 71.2 : lon,
      depth: isNaN(depth) ? 150 : depth,
      tab: validTab,
    };
  });

  const [inputLat, setInputLat] = useState<number>(params.lat);
  const [inputLon, setInputLon] = useState<number>(params.lon);
  const [workbenchDepth, setWorkbenchDepth] = useState<number>(params.depth);
  const [activeIntelOption, setActiveIntelOption] = useState<IntelOption>(params.tab);

  const handleLatBlur = () => {
    setInputLat((prev) => Math.min(25, Math.max(4, prev)));
  };

  const handleLonBlur = () => {
    setInputLon((prev) => Math.min(99, Math.max(53, prev)));
  };

  const [activeProjection, setActiveProjection] = useState<string>('concentric_region');
  const [activeMobileTab, setActiveMobileTab] = useState<'hud' | 'map' | 'controls'>('hud');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [selectedTimeZone, setSelectedTimeZone] = useState<TimeZone>('IST');
  const [realTimeClock, setRealTimeClock] = useState<string>('');



  const LOCATION_PRESETS = [
    { label: "Arabian Sea", lat: 15.4, lon: 71.2 },
    { label: "Bay of Bengal", lat: 14.0, lon: 86.5 },
    { label: "Indian Ocean", lat: 0.0, lon: 80.5 },
    { label: "Lakshadweep", lat: 10.5, lon: 72.6 },
    { label: "Andaman Sea", lat: 11.7, lon: 93.0 },
    { label: "Gulf of Mannar", lat: 8.8, lon: 79.0 },
    { label: "Maldives", lat: 3.2, lon: 73.2 },
    { label: "South Sri Lanka", lat: 5.5, lon: 80.5 },
  ];

  // Send message to Earth iframe
  const sendToEarthIframe = useCallback((data: { action: string; projection?: string; latitude?: number; longitude?: number }) => {
    const iframes = document.querySelectorAll<HTMLIFrameElement>('iframe[title*="Earth"]');
    iframes.forEach((iframe) => {
      try {
        iframe.contentWindow?.postMessage(data, "*");
      } catch (err) {
        console.warn("Unable to postMessage to Earth iframe", err);
      }
    });
  }, []);

  // Listen for coordinates from Earth iframe inspection
  useEffect(() => {
    const handleEarthMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "earth:location") {
        const lat = typeof e.data.latitude === "number" ? e.data.latitude : 0;
        const lon = typeof e.data.longitude === "number" ? e.data.longitude : 0;
        setInputLat(parseFloat(lat.toFixed(4)));
        setInputLon(parseFloat(lon.toFixed(4)));
      }
    };
    window.addEventListener("message", handleEarthMessage);
    return () => window.removeEventListener("message", handleEarthMessage);
  }, []);

  // Sync coordinates with Earth iframe whenever inputLat or inputLon changes
  useEffect(() => {
    if (typeof inputLat === "number" && typeof inputLon === "number") {
      sendToEarthIframe({
        action: "setLocation",
        latitude: inputLat,
        longitude: inputLon,
      });
    }
  }, [inputLat, inputLon, sendToEarthIframe]);

  // Handle Predict & Open Depth Slice Page
  const handlePredict = useCallback(() => {
    setIsPredicting(true);
    const targetUrl = `/depth-slice?lat=${inputLat}&lon=${inputLon}&depth=${workbenchDepth}`;
    setTimeout(() => {
      setIsPredicting(false);
      window.location.href = targetUrl;
    }, 280);
  }, [inputLat, inputLon, workbenchDepth]);

  // Locate yourself via Geolocation
  const handleLocateMe = useCallback(() => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(4));
          const lon = parseFloat(pos.coords.longitude.toFixed(4));
          setInputLat(lat);
          setInputLon(lon);
          sendToEarthIframe({ action: "locateMe" });
          setIsLocating(false);
        },
        () => {
          sendToEarthIframe({ action: "locateMe" });
          setIsLocating(false);
        },
        { timeout: 6000 }
      );
    } else {
      sendToEarthIframe({ action: "locateMe" });
      setIsLocating(false);
    }
  }, [sendToEarthIframe]);

  const handleSelectProjection = useCallback((projKey: string) => {
    setActiveProjection(projKey);
    sendToEarthIframe({ action: "setProjection", projection: projKey });
  }, [sendToEarthIframe]);

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
        const formatted = formatter.format(now).replace(', ', ' ');
        setRealTimeClock(`${formatted} ${selectedTimeZone}`);
      } catch {
        setRealTimeClock(`${now.toISOString().substring(0, 19).replace('T', ' ')} ${selectedTimeZone}`);
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [selectedTimeZone]);

  // Oceanographic prediction calculation based on current coordinates & depth
  const prediction: OceanPredictionResult = useMemo(() => {
    return predictOceanState(inputLat, inputLon, workbenchDepth);
  }, [inputLat, inputLon, workbenchDepth]);

  const depthLayerClassification = useMemo(() => {
    if (workbenchDepth === 0) return "Surface Boundary Layer (0-10m)";
    if (workbenchDepth <= 50) return "Epipelagic Euphotic Zone (0-50m)";
    if (workbenchDepth <= 200) return "Mesopelagic Thermocline Core (50-200m)";
    if (workbenchDepth <= 1000) return "Bathypelagic Intermediate Water (200-1000m)";
    return "Abyssal Plain Subsurface (>1000m)";
  }, [workbenchDepth]);

  // Acoustic sound speed calculation (Mackenzie formulation)
  const soundSpeed = useMemo(() => {
    const T = prediction.variables.thetao.value;
    const S = prediction.variables.so.value;
    const D = workbenchDepth;
    const c = 1448.96 + 4.591 * T - 0.05304 * (T ** 2) + 0.0002374 * (T ** 3) + 1.340 * (S - 35) + 0.0163 * D + 1.675e-7 * (D ** 2);
    return c.toFixed(1);
  }, [prediction.variables.thetao.value, prediction.variables.so.value, workbenchDepth]);

  // Seawater in-situ density approximation (kg/m3)
  const seawaterDensity = useMemo(() => {
    const T = prediction.variables.thetao.value;
    const S = prediction.variables.so.value;
    const rho = 1000 + 28.15 - 0.18 * (T - 15) + 0.78 * (S - 35) + 0.0044 * workbenchDepth;
    return rho.toFixed(2);
  }, [prediction.variables.thetao.value, prediction.variables.so.value, workbenchDepth]);

  // --- 1. HAZARD & CYCLONE TRACKER METRICS ---
  const cycloneTrackerData = useMemo(() => {
    const sst = prediction.variables.thetao.value;
    const currentSpeed = Number(prediction.summary.currentSpeedKnots) || 0;
    const mld = prediction.variables.mlotst.value;
    
    // Wave height approximation based on drift and pressure gradient
    const baseWave = 0.5 + currentSpeed * 2.2;
    const waveHeight = Math.min(baseWave, 8.5).toFixed(1);
    const waveNum = parseFloat(waveHeight);

    // Douglas Sea State Scale
    let seaStateLabel = 'Slight (0.5 - 1.25m)';
    if (waveNum < 0.5) seaStateLabel = 'Calm Glassy (<0.5m)';
    else if (waveNum <= 1.25) seaStateLabel = 'Smooth to Slight (0.5-1.25m)';
    else if (waveNum <= 2.5) seaStateLabel = 'Moderate (1.25-2.5m)';
    else if (waveNum <= 4.0) seaStateLabel = 'Rough (2.5-4.0m)';
    else seaStateLabel = 'Very Rough to High (>4.0m)';

    // Tropical Cyclogenesis Energy Potential (SST 26.5°C threshold)
    let threatLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
    let riskColor = 'text-emerald-400';
    let riskBg = 'bg-emerald-950/40 border-emerald-800/50';
    let badgeText = 'LOW RISK';
    let advisoryNote = 'Conditions calm. Standard navigational watches apply.';

    if (sst >= 29.0 && currentSpeed > 0.8) {
      threatLevel = 'CRITICAL';
      riskColor = 'text-red-400';
      riskBg = 'bg-red-950/50 border-red-700/60';
      badgeText = 'CRITICAL';
      advisoryNote = 'Extreme heat reservoir with high shear. High cyclogenesis probability.';
    } else if (sst >= 28.0 && currentSpeed > 0.4) {
      threatLevel = 'HIGH';
      riskColor = 'text-red-400';
      riskBg = 'bg-red-950/50 border-red-700/60';
      badgeText = 'HIGH RISK';
      advisoryNote = 'SST exceeds 28°C. Thermal reservoir supportive of tropical depressions.';
    } else if (sst >= 26.5) {
      threatLevel = 'MODERATE';
      riskColor = 'text-amber-400';
      riskBg = 'bg-amber-950/40 border-amber-700/50';
      badgeText = 'WATCH';
      advisoryNote = 'SST at 26.5°C threshold. Monitor barometric pressure gradients.';
    }

    // Cyclone Heat Potential proxy (kJ/cm²)
    const tchp = Math.max(15, Math.round(sst * 2.8 + mld * 0.4));

    return {
      threatLevel,
      riskColor,
      riskBg,
      badgeText,
      advisoryNote,
      sst: sst.toFixed(1),
      waveHeight,
      seaStateLabel,
      tchp,
      currentSpeed: prediction.summary.currentSpeedKnots,
      windShearStatus: currentSpeed > 0.9 ? 'Strong Vertical Shear' : 'Low to Moderate Shear',
      evacuationWindow: threatLevel === 'CRITICAL' ? 'Immediate 6h Window' : threatLevel === 'HIGH' ? '12h Advisory Horizon' : 'Clear Maritime Corridor',
    };
  }, [prediction.variables.thetao.value, prediction.summary.currentSpeedKnots, prediction.variables.mlotst.value]);

  // --- 2. MARINE ECOSYSTEM HEALTH METRICS ---
  const ecosystemHealthData = useMemo(() => {
    const sst = prediction.variables.thetao.value;
    const salinity = prediction.variables.so.value;
    const mld = prediction.variables.mlotst.value;
    
    // Composite Health Score (0 - 100)
    let score = 96;
    if (sst > 29.5) score -= 22; // thermal stress
    else if (sst > 28.5) score -= 10;
    else if (sst < 18.0) score -= 14;

    if (salinity < 32.0) score -= 18; // freshwater dilution / estuarine shock
    else if (salinity > 37.0) score -= 12; // hyper-saline

    if (mld < 15) score -= 12; // stratified euphotic zone
    score = Math.max(10, Math.min(100, Math.round(score)));

    let status: 'PRISTINE' | 'HEALTHY' | 'MODERATE STRESS' | 'VULNERABLE' = 'HEALTHY';
    let statusColor = 'text-emerald-400';
    let barColor = 'bg-emerald-500';

    if (score >= 85) {
      status = 'PRISTINE';
      statusColor = 'text-emerald-400';
      barColor = 'bg-emerald-500';
    } else if (score >= 70) {
      status = 'HEALTHY';
      statusColor = 'text-emerald-400';
      barColor = 'bg-emerald-500';
    } else if (score >= 50) {
      status = 'MODERATE STRESS';
      statusColor = 'text-amber-400';
      barColor = 'bg-amber-500';
    } else {
      status = 'VULNERABLE';
      statusColor = 'text-red-400';
      barColor = 'bg-red-500';
    }

    // Coral Bleaching Degree Heating Weeks (DHW) Proxy
    const dhw = sst >= 29.5 ? 'Warning (DHW 4-8)' : sst >= 28.8 ? 'Watch (DHW 1-4)' : 'No Thermal Stress';
    const primaryProd = mld < 35 && sst >= 24 && sst <= 28.5 ? 'High (Upwelling Enriched)' : 'Moderate Pelagic';
    const hypoxiaStatus = workbenchDepth > 200 && sst < 15 ? 'Hypoxic Layer (OMZ Core)' : 'Normoxic Aerated';

    return {
      score,
      status,
      statusColor,
      barColor,
      dhw,
      primaryProd,
      hypoxiaStatus,
      sst: sst.toFixed(1),
      salinity: salinity.toFixed(1),
      mld: mld.toFixed(0),
      phProxy: (8.15 - (sst - 20) * 0.015).toFixed(2),
      chlorophyllProxy: mld < 30 ? '0.84 mg/m³ (Rich)' : '0.28 mg/m³ (Clear)',
    };
  }, [prediction.variables.thetao.value, prediction.variables.so.value, prediction.variables.mlotst.value, workbenchDepth]);

  // --- 3. FISHING ADVISORY (POTENTIAL FISHING ZONE - PFZ) ---
  const fishingAdvisoryData = useMemo(() => {
    const sst = prediction.variables.thetao.value;
    const salinity = prediction.variables.so.value;
    const mld = prediction.variables.mlotst.value;
    const currentSpeed = Number(prediction.summary.currentSpeedKnots) || 0;
    
    // Upwelling front detection: moderate drift + shallow thermocline boundary + optimal SST (23-28°C)
    const isUpwellingFront = mld <= 40 && currentSpeed >= 0.25 && currentSpeed <= 1.1;
    const optimalTemp = sst >= 22.0 && sst <= 28.2;
    const optimalSalinity = salinity >= 34.0 && salinity <= 36.5;

    let rating: 'EXCELLENT' | 'HIGH' | 'MODERATE' | 'POOR' = 'MODERATE';
    let ratingColor = 'text-white';
    let ratingBg = 'bg-[#161616] border-[#262626]';

    if (isUpwellingFront && optimalTemp && optimalSalinity) {
      rating = 'EXCELLENT';
    } else if (optimalTemp && (isUpwellingFront || optimalSalinity)) {
      rating = 'HIGH';
    } else if (sst > 29.5 || currentSpeed > 1.4) {
      rating = 'POOR';
    }

    // Commercial species forecast based on thermal layer
    let speciesList = ['Indian Mackerel', 'Yellowfin Tuna', 'Oil Sardine'];
    if (sst < 24) speciesList = ['Skipjack Tuna', 'Carangids', 'Ribbonfish'];
    else if (sst > 28) speciesList = ['Pelagic Squid', 'Anchovies', 'Seer Fish'];

    const optimalDepthHorizon = workbenchDepth <= 40 ? 'Surface Seine (0-40m)' : workbenchDepth <= 120 ? 'Mesopelagic Longline (40-120m)' : 'Deep Demersal Trawl';

    return {
      rating,
      ratingColor,
      ratingBg,
      species: speciesList.join(', '),
      frontType: isUpwellingFront ? 'Active Ocean Front / Upwelling' : 'Dispersed Pelagic Zone',
      optimalDepthHorizon,
      feedingAggregation: isUpwellingFront ? 'High Plankton Density' : 'Moderate Biomass',
      advisoryText: rating === 'EXCELLENT'
        ? 'High probability of pelagic schooling near frontal temperature gradient. Optimal fishing window.'
        : rating === 'HIGH'
        ? 'Favorable sea conditions with active nutrient convergence. Good catch expected.'
        : rating === 'POOR'
        ? 'High thermal stratification or rapid drift dispersing fish schools. Limited catch yield.'
        : 'Moderate potential. Target coastal convergence zones and thermocline depth margin.',
      driftStrategy: 'Deploy gillnets & longlines along ESE oceanic shear lines during dawn/dusk twilight.',
    };
  }, [prediction.variables.thetao.value, prediction.variables.so.value, prediction.variables.mlotst.value, prediction.summary.currentSpeedKnots, workbenchDepth]);

  // --- 4. SAFE ZONE & MARITIME NAVIGATION METRICS ---
  const safeZoneData = useMemo(() => {
    const currentSpeed = Number(prediction.summary.currentSpeedKnots) || 0;
    const sst = prediction.variables.thetao.value;
    const mld = prediction.variables.mlotst.value;
    const waveHeight = parseFloat(cycloneTrackerData.waveHeight);

    let safetyScore = 98;
    if (currentSpeed > 1.2) safetyScore -= 30;
    else if (currentSpeed > 0.7) safetyScore -= 12;

    if (waveHeight > 3.0) safetyScore -= 35;
    else if (waveHeight > 1.8) safetyScore -= 15;

    if (cycloneTrackerData.threatLevel === 'CRITICAL') safetyScore -= 45;
    else if (cycloneTrackerData.threatLevel === 'HIGH') safetyScore -= 25;
    else if (cycloneTrackerData.threatLevel === 'MODERATE') safetyScore -= 10;

    safetyScore = Math.max(10, Math.min(100, safetyScore));

    let status: 'SAFE ZONE' | 'CAUTION ZONE' | 'HAZARDOUS / RESTRICTED' = 'SAFE ZONE';
    let statusColor = 'text-emerald-400';
    let statusBg = 'bg-emerald-950/40 border-emerald-800/50';
    let iconColor = 'text-emerald-400';

    if (safetyScore >= 78) {
      status = 'SAFE ZONE';
      statusColor = 'text-emerald-400';
      statusBg = 'bg-emerald-950/40 border-emerald-800/50';
      iconColor = 'text-emerald-400';
    } else if (safetyScore >= 50) {
      status = 'CAUTION ZONE';
      statusColor = 'text-amber-400';
      statusBg = 'bg-amber-950/40 border-amber-700/50';
      iconColor = 'text-amber-400';
    } else {
      status = 'HAZARDOUS / RESTRICTED';
      statusColor = 'text-red-400';
      statusBg = 'bg-red-950/50 border-red-700/60';
      iconColor = 'text-red-400';
    }

    const underwaterVisibility = mld > 35 ? 'Clear Acoustic & Optical (>45m)' : 'Moderate Turbidity (15-30m)';
    const hullStress = currentSpeed > 1.0 ? 'Elevated Shear Margin' : 'Nominal Resistance (<5%)';

    return {
      safetyScore,
      status,
      statusColor,
      statusBg,
      iconColor,
      waveHeight: `${waveHeight}m`,
      underwaterVisibility,
      hullStress,
      navigationalMargin: status === 'SAFE ZONE' ? 'Full Operational Envelope' : status === 'CAUTION ZONE' ? 'Restricted Speed / Watch Required' : 'Immediate Port Egress Recommended',
      sarRisk: currentSpeed > 0.8 ? 'High Drift Divergence' : 'Controlled Drift Basin',
    };
  }, [prediction.summary.currentSpeedKnots, prediction.variables.thetao.value, prediction.variables.mlotst.value, cycloneTrackerData]);

  const handleBackToHome = () => {
    window.location.href = '/';
  };

  const earthIframeUrl = useMemo(() => {
    const projName = activeProjection || 'concentric_region';
    return `/earth/index.html?hidebadge=1#current/ocean/surface/currents/overlay=ocean/${projName}`;
  }, [activeProjection]);

  return (
    <div className="h-screen w-screen bg-[#050505] text-white flex flex-col overflow-hidden font-sans">
      {/* TOP HEADER BAR */}
      <header className="h-16 bg-[#090909] border-b border-[#222222] px-4 sm:px-6 flex justify-between items-center z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToHome}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs font-mono text-[#cccccc] hover:text-white transition-all cursor-pointer shadow-sm"
            title="Return to Home"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Home</span>
          </button>

          <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <img 
              src="/logo.png" 
              alt="Leher Logo" 
              title="Leher" 
              className="h-7 w-auto object-contain" 
            />
            <span className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
              <span>Operations &amp; Analytics Console</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Real-time Clock */}
          <div className="hidden md:flex items-center gap-2 font-mono text-xs text-[#aaaaaa] bg-[#141414] px-3 py-1.5 rounded-xl border border-[#262626]">
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
            <span>{realTimeClock}</span>
            <select
              value={selectedTimeZone}
              onChange={(e) => setSelectedTimeZone(e.target.value as TimeZone)}
              className="bg-[#1f1f1f] text-white text-xs font-mono rounded px-1.5 py-0.5 border border-[#333333] focus:outline-none cursor-pointer hover:border-neutral-400 transition-colors ml-1"
            >
              {Object.entries(timeZoneMap).map(([tz, info]) => (
                <option key={tz} value={tz}>
                  {tz} ({info.offsetLabel})
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* MOBILE PANEL SWITCHER (< lg only; hidden on desktop) */}
      <div className="flex lg:hidden bg-[#0c0c0c] border-b border-[#222222] p-1.5 gap-1 shrink-0 z-20">
        <button
          type="button"
          onClick={() => setActiveMobileTab('hud')}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-lg text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
            activeMobileTab === 'hud'
              ? "bg-[#181818] text-white border border-[#333333] shadow-sm"
              : "text-[#888888] hover:text-white"
          )}
        >
          <Activity className="w-3.5 h-3.5 text-neutral-400" />
          <span>HUD Intel</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('map')}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-lg text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
            activeMobileTab === 'map'
              ? "bg-[#181818] text-white border border-[#333333] shadow-sm"
              : "text-[#888888] hover:text-white"
          )}
        >
          <MapIcon className="w-3.5 h-3.5 text-neutral-400" />
          <span>3D Map</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('controls')}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-lg text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
            activeMobileTab === 'controls'
              ? "bg-[#181818] text-white border border-[#333333] shadow-sm"
              : "text-[#888888] hover:text-white"
          )}
        >
          <Sliders className="w-3.5 h-3.5 text-neutral-400" />
          <span>Operations</span>
        </button>
      </div>

      {/* MAIN WORKSPACE: 3-COLUMN SYMMETRIC LAYOUT (LEFT FIXED PANEL | CENTER 3D MAP | RIGHT FIXED PANEL) */}
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        {/* LEFT DOCKED PANEL: MARITIME INTELLIGENCE & OCEAN TELEMETRY (MATCHING RIGHT PANEL SPACING & WIDTH) */}
        <div className={cn(
          "w-full lg:w-[310px] xl:w-[330px] lg:h-full bg-[#0c0c0c] border-b lg:border-b-0 lg:border-r border-[#222222] p-3 space-y-2.5 overflow-y-auto z-20 shadow-2xl shrink-0 max-h-none lg:max-h-full",
          activeMobileTab === 'hud' ? "flex-1 block" : "hidden lg:block"
        )}>
          {/* Header */}
          <div className="border-b border-[#222222] pb-2.5 flex justify-between items-center">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-neutral-400" />
              <span>MARITIME INTELLIGENCE HUD</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#161616] border border-[#262626] text-neutral-400">
              LIVE SENSORS
            </span>
          </div>

          {/* Card 1: Tactical Basin & Depth Profile (Always Top) */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
              <span className="uppercase tracking-wide">TACTICAL REGION</span>
              <span>
                {inputLat >= 0 ? `${inputLat.toFixed(2)}°N` : `${Math.abs(inputLat).toFixed(2)}°S`}, {inputLon >= 0 ? `${inputLon.toFixed(2)}°E` : `${Math.abs(inputLon).toFixed(2)}°W`}
              </span>
            </div>
            <div className="text-sm font-bold text-white tracking-tight flex items-center justify-between">
              <span className="truncate">{prediction.location.regionName}</span>
              <span className="text-[10px] font-mono font-normal text-neutral-400">GEO-WGS84</span>
            </div>
            <div className="pt-1.5 border-t border-[#1c1c1c] flex items-center justify-between text-[11px] text-neutral-400">
              <span>Depth Level: <strong className="text-white font-mono">{workbenchDepth}m</strong></span>
              <span className="text-neutral-400 truncate max-w-[170px] text-right text-[10px]">
                {depthLayerClassification}
              </span>
            </div>
          </div>

          {/* Card 2: Risk Status */}
          <div className={`border rounded-xl p-3 space-y-1 ${prediction.summary.riskStatus === 'HIGH RISK' || prediction.summary.riskStatus === 'CRITICAL' ? 'bg-red-950/30 border-red-800/50' : prediction.summary.riskStatus === 'MODERATE' ? 'bg-amber-950/30 border-amber-700/40' : 'bg-emerald-950/30 border-emerald-800/40'}`}>
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="uppercase tracking-wide text-neutral-400">RISK STATUS</span>
              <span className={`font-bold text-[10px] font-mono ${prediction.summary.riskStatus === 'HIGH RISK' || prediction.summary.riskStatus === 'CRITICAL' ? 'text-red-400' : prediction.summary.riskStatus === 'MODERATE' ? 'text-amber-400' : 'text-emerald-400'}`}>
                {prediction.summary.riskStatus}
              </span>
            </div>
          </div>

          {/* HUD INTELLIGENCE MODE DROPDOWN */}
          <div className="space-y-1.5">
            <div className="relative w-[160px]">
              <select
                value={activeIntelOption}
                onChange={(e) => setActiveIntelOption(e.target.value as IntelOption)}
                className="w-full bg-[#141414] text-white text-xs font-mono font-bold rounded-lg px-3 py-2 border border-[#2a2a2a] hover:border-[#444444] focus:border-white/60 focus:outline-none cursor-pointer transition-all appearance-none pr-8"
              >
                <option value="all">All Intel</option>
                <option value="cyclone">Cyclone</option>
                <option value="ecosystem">Ecosystem</option>
                <option value="fishing">Fishing</option>
                <option value="safezone">Safe Zone</option>
                <option value="physics">Physics</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-500">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Quick 4-Metric Live Status Banner */}
            <div className="grid grid-cols-4 gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => setActiveIntelOption('cyclone')}
                className={cn(
                  "p-1.5 rounded-lg border text-center transition-all cursor-pointer",
                  activeIntelOption === 'cyclone' ? "border-white/80 bg-[#222222]" : "border-[#222222] bg-[#141414] hover:border-neutral-700"
                )}
              >
                <div className="text-[8px] font-mono text-neutral-400 uppercase truncate">Cyclone</div>
                <div className={`text-[10px] font-bold font-mono truncate ${cycloneTrackerData.riskColor}`}>
                  {cycloneTrackerData.threatLevel}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveIntelOption('ecosystem')}
                className={cn(
                  "p-1.5 rounded-lg border text-center transition-all cursor-pointer",
                  activeIntelOption === 'ecosystem' ? "border-white/80 bg-[#222222]" : "border-[#222222] bg-[#141414] hover:border-neutral-700"
                )}
              >
                <div className="text-[8px] font-mono text-neutral-400 uppercase truncate">Eco</div>
                <div className={`text-[10px] font-bold font-mono truncate ${ecosystemHealthData.statusColor}`}>
                  {ecosystemHealthData.score}%
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveIntelOption('fishing')}
                className={cn(
                  "p-1.5 rounded-lg border text-center transition-all cursor-pointer",
                  activeIntelOption === 'fishing' ? "border-white/80 bg-[#222222]" : "border-[#222222] bg-[#141414] hover:border-neutral-700"
                )}
              >
                <div className="text-[8px] font-mono text-neutral-400 uppercase truncate">Fishing</div>
                <div className="text-[10px] font-bold font-mono truncate text-white">
                  {fishingAdvisoryData.rating}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveIntelOption('safezone')}
                className={cn(
                  "p-1.5 rounded-lg border text-center transition-all cursor-pointer",
                  activeIntelOption === 'safezone' ? "border-white/80 bg-[#222222]" : "border-[#222222] bg-[#141414] hover:border-neutral-700"
                )}
              >
                <div className="text-[8px] font-mono text-neutral-400 uppercase truncate">Safety</div>
                <div className={`text-[10px] font-bold font-mono truncate ${safeZoneData.statusColor}`}>
                  {safeZoneData.status === 'SAFE ZONE' ? 'SAFE' : safeZoneData.status === 'CAUTION ZONE' ? 'CAUTION' : 'ALERT'}
                </div>
              </button>
            </div>
          </div>

          {/* DYNAMIC CONTENT AREA BASED ON SELECTED OPTION */}

          {/* === OPTION 1: HAZARD & CYCLONE TRACKER DEEP DIVE === */}
          {(activeIntelOption === 'cyclone' || activeIntelOption === 'all') && (
            <div className={`border rounded-xl p-3 space-y-2.5 ${cycloneTrackerData.riskBg}`}>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="uppercase tracking-wide flex items-center gap-1.5 font-bold text-white">
                  <AlertTriangle className={`w-3.5 h-3.5 ${cycloneTrackerData.riskColor}`} />
                  CYCLONE TRACKER
                </span>
                <span className={`px-2 py-0.5 rounded font-mono font-bold text-[9px] border ${cycloneTrackerData.riskBg} ${cycloneTrackerData.riskColor}`}>
                  {cycloneTrackerData.badgeText}
                </span>
              </div>

              {/* Status Banner */}
              <div className={`rounded-lg border p-2.5 space-y-1.5 ${cycloneTrackerData.riskBg}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold tracking-tight ${cycloneTrackerData.riskColor}`}>
                    {cycloneTrackerData.threatLevel}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">TCHP: {cycloneTrackerData.tchp} kJ/cm²</span>
                </div>
                <p className="text-[11px] text-neutral-300 leading-snug">
                  {cycloneTrackerData.advisoryNote}
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-1.5">
                <div className="bg-[#161616] border border-[#222222] rounded-lg p-2 space-y-0.5">
                  <div className="text-[9px] text-neutral-400 font-mono">SEA SURFACE (SST)</div>
                  <div className="text-xs font-bold font-mono text-white flex items-baseline gap-1">
                    <span>{cycloneTrackerData.sst}</span>
                    <span className="text-[9px] font-normal text-neutral-400">°C</span>
                  </div>
                  <div className="text-[8px] text-neutral-500">Threshold: 26.5°C</div>
                </div>

                <div className="bg-[#161616] border border-[#222222] rounded-lg p-2 space-y-0.5">
                  <div className="text-[9px] text-neutral-400 font-mono">EST. WAVE HT (Hs)</div>
                  <div className="text-xs font-bold font-mono text-white flex items-baseline gap-1">
                    <span>~{cycloneTrackerData.waveHeight}</span>
                    <span className="text-[9px] font-normal text-neutral-400">m</span>
                  </div>
                  <div className="text-[8px] text-neutral-500 truncate">{cycloneTrackerData.seaStateLabel.split(' ')[0]}</div>
                </div>

                <div className="bg-[#161616] border border-[#222222] rounded-lg p-2 space-y-0.5">
                  <div className="text-[9px] text-neutral-400 font-mono">DRIFT CURRENT</div>
                  <div className="text-xs font-bold font-mono text-white flex items-baseline gap-1">
                    <span>{cycloneTrackerData.currentSpeed}</span>
                    <span className="text-[9px] font-normal text-neutral-400">kts</span>
                  </div>
                  <div className="text-[8px] text-neutral-500 truncate">{prediction.summary.currentDirectionCompass} ({prediction.summary.currentDirectionDeg}°)</div>
                </div>
              </div>

              {/* Additional Context details when deep dived */}
              {activeIntelOption === 'cyclone' && (
                <div className="space-y-2 pt-1 border-t border-[#1c1c1c]">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-neutral-400">Atmospheric-Ocean Shear</span>
                    <span className="text-white font-mono text-[10px]">{cycloneTrackerData.windShearStatus}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-neutral-400">Vessel Evacuation Window</span>
                    <span className="text-white font-mono text-[10px]">{cycloneTrackerData.evacuationWindow}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-neutral-400">Basin Cyclone History</span>
                    <span className="text-neutral-300 font-mono text-[10px]">North Indian Ocean Monsoonal</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === OPTION 2: MARINE ECOSYSTEM HEALTH DEEP DIVE === */}
          {(activeIntelOption === 'ecosystem' || activeIntelOption === 'all') && (
            <div className="bg-[#121212] border border-[#222222] rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="uppercase tracking-wide flex items-center gap-1.5 font-bold text-white">
                  <Leaf className={`w-3.5 h-3.5 ${ecosystemHealthData.statusColor}`} />
                  ECOSYSTEM HEALTH
                </span>
                <span className={`px-2 py-0.5 rounded font-mono font-bold text-[9px] border bg-[#161616] border-[#262626] ${ecosystemHealthData.statusColor}`}>
                  {ecosystemHealthData.status}
                </span>
              </div>

              {/* Gauge Progress Bar */}
              <div className="space-y-1.5 bg-[#161616] border border-[#222222] rounded-lg p-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-300 font-medium">Health Index</span>
                  <span className={`font-mono font-bold ${ecosystemHealthData.statusColor}`}>
                    {ecosystemHealthData.score} / 100
                  </span>
                </div>
                <div className="w-full h-2 bg-[#0c0c0c] rounded-full overflow-hidden p-0.5 border border-white/5">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${ecosystemHealthData.barColor}`}
                    style={{ width: `${ecosystemHealthData.score}%` }}
                  />
                </div>
              </div>

              {/* Ecological Parameters Matrix */}
              <div className="grid grid-cols-3 gap-1.5">
                <div className="bg-[#161616] border border-[#222222] rounded-lg p-2 space-y-0.5">
                  <div className="text-[9px] text-neutral-400 font-mono">CORAL STRESS</div>
                  <div className="text-[11px] font-bold text-white truncate">{ecosystemHealthData.dhw.split(' ')[0]}</div>
                  <div className="text-[8px] text-neutral-500 truncate">{ecosystemHealthData.dhw}</div>
                </div>

                <div className="bg-[#161616] border border-[#222222] rounded-lg p-2 space-y-0.5">
                  <div className="text-[9px] text-neutral-400 font-mono">PRIMARY PROD.</div>
                  <div className="text-[11px] font-bold text-white truncate">{ecosystemHealthData.primaryProd.split(' ')[0]}</div>
                  <div className="text-[8px] text-neutral-500 truncate">Chlorophyll Proxy</div>
                </div>

                <div className="bg-[#161616] border border-[#222222] rounded-lg p-2 space-y-0.5">
                  <div className="text-[9px] text-neutral-400 font-mono">OXYGEN STATE</div>
                  <div className="text-[11px] font-bold text-white truncate">{ecosystemHealthData.hypoxiaStatus.split(' ')[0]}</div>
                  <div className="text-[8px] text-neutral-500 truncate">{workbenchDepth > 150 ? 'Subsurface OMZ' : 'Aerated Epipelagic'}</div>
                </div>
              </div>

              {/* Extra details when deep dived */}
              {activeIntelOption === 'ecosystem' && (
                <div className="space-y-1.5 pt-1 border-t border-[#1c1c1c] text-[11px]">
                  <div className="flex justify-between text-neutral-400">
                    <span>Chlorophyll Concentration</span>
                    <span className="text-white font-mono text-[10px]">{ecosystemHealthData.chlorophyllProxy}</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Estimated Seawater pH</span>
                    <span className="text-white font-mono text-[10px]">{ecosystemHealthData.phProxy} (Normal Oceanic)</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Pycnocline MLD Barrier</span>
                    <span className="text-white font-mono text-[10px]">{ecosystemHealthData.mld}m (Nutrient Trap)</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === OPTION 3: FISHING ADVISORY (PFZ) DEEP DIVE === */}
          {(activeIntelOption === 'fishing' || activeIntelOption === 'all') && (
            <div className="bg-[#121212] border border-[#222222] rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
                <span className="uppercase tracking-wide flex items-center gap-1.5 font-bold text-white">
                  <Fish className="w-3.5 h-3.5 text-neutral-400" />
                  FISHING ADVISORY (PFZ)
                </span>
                <span className="px-2 py-0.5 rounded font-mono font-bold text-[9px] border bg-[#161616] border-[#262626] text-neutral-300">
                  {fishingAdvisoryData.rating} POTENTIAL
                </span>
              </div>

              {/* Target Catch Card */}
              <div className="bg-[#161616] border border-[#222222] rounded-lg p-2.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[9px] text-neutral-400 font-mono">TARGET COMMERCIAL SPECIES</div>
                    <div className="text-xs font-bold text-white mt-0.5">{fishingAdvisoryData.species}</div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1e1e1e] text-neutral-300 border border-[#2e2e2e] whitespace-nowrap">
                    PFZ Active
                  </span>
                </div>
                <p className="text-[11px] text-neutral-300 leading-snug border-t border-[#222222] pt-1.5">
                  {fishingAdvisoryData.advisoryText}
                </p>
              </div>

              {/* Grid: Front Type & Horizon */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="bg-[#161616] border border-[#222222] rounded-lg p-2 space-y-0.5">
                  <div className="text-[9px] text-neutral-400 font-mono">THERMAL FRONT</div>
                  <div className="text-[11px] font-bold text-white truncate">{fishingAdvisoryData.frontType}</div>
                  <div className="text-[8px] text-neutral-500">Upwelling Convergence</div>
                </div>

                <div className="bg-[#161616] border border-[#222222] rounded-lg p-2 space-y-0.5">
                  <div className="text-[9px] text-neutral-400 font-mono">OPTIMAL HORIZON</div>
                  <div className="text-[11px] font-bold text-white truncate">{fishingAdvisoryData.optimalDepthHorizon}</div>
                  <div className="text-[8px] text-neutral-500">Feed Layer Depth</div>
                </div>
              </div>

              {/* Extra details when deep dived */}
              {activeIntelOption === 'fishing' && (
                <div className="space-y-1.5 pt-1 border-t border-[#1c1c1c] text-[11px]">
                  <div className="flex justify-between text-neutral-400">
                    <span>Tactical Drift Setting</span>
                    <span className="text-neutral-200 text-right text-[10px] max-w-[200px]">Dawn (04:30) &amp; Twilight along ESE drift</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Plankton Concentration</span>
                    <span className="text-white font-mono text-[10px]">{fishingAdvisoryData.feedingAggregation}</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Artisanal Vessel Suitability</span>
                    <span className="text-white font-mono text-[10px]">Favorable (Safe Seastate)</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === OPTION 4: SAFE ZONE ASSESSMENT DEEP DIVE === */}
          {(activeIntelOption === 'safezone' || activeIntelOption === 'all') && (
            <div className={`border rounded-xl p-3 space-y-2.5 ${safeZoneData.statusBg}`}>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="uppercase tracking-wide flex items-center gap-1.5 font-bold text-white">
                  <ShieldCheck className={`w-3.5 h-3.5 ${safeZoneData.iconColor}`} />
                  SAFE ZONE
                </span>
                <span className={`px-2 py-0.5 rounded font-mono font-bold text-[9px] border ${safeZoneData.statusBg} ${safeZoneData.statusColor}`}>
                  {safeZoneData.status}
                </span>
              </div>

              {/* Safe Zone Alert Box */}
              <div className={`rounded-lg border p-2.5 space-y-1.5 ${safeZoneData.statusBg}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold flex items-center gap-1.5 ${safeZoneData.statusColor}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${safeZoneData.iconColor}`} />
                    <span>Safety Score: {safeZoneData.safetyScore}%</span>
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">{safeZoneData.navigationalMargin}</span>
                </div>
              </div>

              {/* Matrix */}
              <div className="grid grid-cols-3 gap-1.5">
                <div className="bg-[#161616] border border-[#222222] rounded-lg p-2 space-y-0.5">
                  <div className="text-[9px] text-neutral-400 font-mono">WAVE ENVELOPE</div>
                  <div className="text-xs font-bold font-mono text-white">{safeZoneData.waveHeight}</div>
                  <div className="text-[8px] text-neutral-500">Low Hull Resistance</div>
                </div>

                <div className="bg-[#161616] border border-[#222222] rounded-lg p-2 space-y-0.5">
                  <div className="text-[9px] text-neutral-400 font-mono">SONAR CLARITY</div>
                  <div className="text-[11px] font-bold text-white truncate">Clear (Sound SVP)</div>
                  <div className="text-[8px] text-neutral-500">c: {soundSpeed} m/s</div>
                </div>

                <div className="bg-[#161616] border border-[#222222] rounded-lg p-2 space-y-0.5">
                  <div className="text-[9px] text-neutral-400 font-mono">SAR DRIFT RISK</div>
                  <div className="text-[11px] font-bold text-white truncate">{safeZoneData.sarRisk.split(' ')[0]}</div>
                  <div className="text-[8px] text-neutral-500">Stable Boundary</div>
                </div>
              </div>

              {/* Extra details when deep dived */}
              {activeIntelOption === 'safezone' && (
                <div className="space-y-1.5 pt-1 border-t border-[#1c1c1c] text-[11px]">
                  <div className="flex justify-between text-neutral-400">
                    <span>Hull Dynamic Stress Factor</span>
                    <span className="text-white font-mono text-[10px]">{safeZoneData.hullStress}</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Underwater Acoustic Transmission</span>
                    <span className="text-white font-mono text-[10px]">{safeZoneData.underwaterVisibility}</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Emergency Shelter Corridor</span>
                    <span className="text-neutral-300 font-mono text-[10px]">Bearing 045° to Indian Coastline</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === OPTION 5: HYDRODYNAMIC & ACOUSTIC PHYSICAL MODEL === */}
          {(activeIntelOption === 'physics' || activeIntelOption === 'all') && (
            <>
              {/* Card: Hydrodynamic Telemetry Matrix */}
              <div className="bg-[#121212] border border-[#222222] rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
                  <span className="uppercase tracking-wide flex items-center gap-1.5 text-white font-bold">
                    <Compass className="w-3.5 h-3.5 text-neutral-400" />
                    HYDRODYNAMIC METRICS
                  </span>
                  <span className="text-neutral-400 font-mono">PHYSICAL MODEL</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {/* Current Velocity & Drift */}
                  <div className="bg-[#161616] border border-[#222222] rounded-lg p-2 space-y-0.5">
                    <div className="text-[10px] text-neutral-400">Current Drift</div>
                    <div className="text-xs font-bold font-mono text-white flex items-baseline gap-1">
                      <span>{prediction.summary.currentSpeedKnots}</span>
                      <span className="text-[10px] font-normal text-neutral-400">kts</span>
                      <span className="text-[9px] font-mono text-neutral-500">({prediction.summary.currentSpeedMs} m/s)</span>
                    </div>
                    <div className="text-[9px] font-mono text-neutral-300">
                      <span>{prediction.summary.currentDirectionCompass} ({prediction.summary.currentDirectionDeg}°)</span>
                    </div>
                  </div>

                  {/* Water Temp */}
                  <div className="bg-[#161616] border border-[#222222] rounded-lg p-2 space-y-0.5">
                    <div className="text-[10px] text-neutral-400">Water Temp (θ)</div>
                    <div className="text-xs font-bold font-mono text-white">
                      {prediction.variables.thetao.formattedValue}
                    </div>
                    <div className="text-[9px] text-neutral-500 truncate">
                      {workbenchDepth < 50 ? 'Upper Mixed Layer' : workbenchDepth < 250 ? 'Thermocline' : 'Abyssal Deep'}
                    </div>
                  </div>

                  {/* Salinity */}
                  <div className="bg-[#161616] border border-[#222222] rounded-lg p-2 space-y-0.5">
                    <div className="text-[10px] text-neutral-400">Salinity (Sp)</div>
                    <div className="text-xs font-bold font-mono text-white">
                      {prediction.variables.so.formattedValue}
                    </div>
                    <div className="text-[9px] text-neutral-500 truncate">
                      {prediction.location.regionName.includes('Bay of Bengal') ? 'Runoff Dilution' : 'Normal Oceanic'}
                    </div>
                  </div>

                  {/* Mixed Layer */}
                  <div className="bg-[#161616] border border-[#222222] rounded-lg p-2 space-y-0.5">
                    <div className="text-[10px] text-neutral-400">Mixed Layer</div>
                    <div className="text-xs font-bold font-mono text-white">
                      {prediction.variables.mlotst.formattedValue}
                    </div>
                    <div className="text-[9px] text-neutral-500 truncate">
                      Pycnocline boundary
                    </div>
                  </div>

                  {/* Dynamic Height */}
                  <div className="bg-[#161616] border border-[#222222] rounded-lg p-2 space-y-0.5">
                    <div className="text-[10px] text-neutral-400">Dynamic Height</div>
                    <div className="text-xs font-bold font-mono text-white">
                      {prediction.variables.zos.formattedValue}
                    </div>
                    <div className="text-[9px] text-neutral-500 truncate">
                      Geoid deviation
                    </div>
                  </div>

                  {/* Benthic Temp */}
                  <div className="bg-[#161616] border border-[#222222] rounded-lg p-2 space-y-0.5">
                    <div className="text-[10px] text-neutral-400">Benthic Temp</div>
                    <div className="text-xs font-bold font-mono text-white">
                      {prediction.variables.bottomT.formattedValue}
                    </div>
                    <div className="text-[9px] text-neutral-500 truncate">
                      Deep sea-floor layer
                    </div>
                  </div>
                </div>
              </div>

              {/* Card: Acoustic & Sensor Intel */}
              <div className="bg-[#121212] border border-[#222222] rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
                  <span className="uppercase tracking-wide flex items-center gap-1.5 text-white font-bold">
                    <Radio className="w-3.5 h-3.5 text-neutral-400" />
                    ACOUSTIC &amp; SENSOR INTEL
                  </span>
                  <span className="text-neutral-400 font-mono">SONAR / SVP</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#161616] border border-[#222222] rounded-lg p-2 space-y-0.5">
                    <div className="text-[10px] text-neutral-400">Sound Speed (c)</div>
                    <div className="text-xs font-bold font-mono text-white flex items-baseline gap-1">
                      <span>{soundSpeed}</span>
                      <span className="text-[10px] font-normal text-neutral-400">m/s</span>
                    </div>
                    <div className="text-[9px] text-neutral-500 truncate">
                      {workbenchDepth < 80 ? 'Surface Sonic Layer' : workbenchDepth < 350 ? 'Thermocline Gradient' : 'Deep SOFAR Channel'}
                    </div>
                  </div>

                  <div className="bg-[#161616] border border-[#222222] rounded-lg p-2 space-y-0.5">
                    <div className="text-[10px] text-neutral-400">In-situ Density (ρ)</div>
                    <div className="text-xs font-bold font-mono text-white flex items-baseline gap-1">
                      <span>{seawaterDensity}</span>
                      <span className="text-[9px] font-neutral-400">kg/m³</span>
                    </div>
                    <div className="text-[9px] text-neutral-500 truncate">
                      Pycnocline gradient
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons (Always Present at Bottom of HUD) */}
          <div className="space-y-1.5 pt-1">
            <button
              type="button"
              onClick={handlePredict}
              disabled={isPredicting}
              className="w-full py-2.5 px-3 rounded-lg bg-white hover:bg-neutral-200 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-[0.99]"
            >
              <span>Open 3D Depth Slice ({workbenchDepth}m)</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-black" />
            </button>

            <a
              href={`/details?lat=${inputLat}&lon=${inputLon}&depth=${workbenchDepth}`}
              className="w-full py-1.5 px-3 rounded-lg bg-[#161616] hover:bg-[#1f1f1f] border border-[#262626] text-neutral-300 hover:text-white text-[10px] font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center"
            >
              <span>Inspect Copernicus Variable Matrix</span>
              <ExternalLink className="w-3 h-3 text-neutral-500" />
            </a>
          </div>
        </div>

        {/* CENTER COLUMN: 3D EARTH MAP (CENTERED IN THE PAGE) */}
        <div className={cn(
          "flex-1 h-full relative bg-[#040404] overflow-hidden min-h-[300px]",
          activeMobileTab === 'map' ? "block" : "hidden lg:block"
        )}>
          <iframe
            key={activeProjection}
            src={earthIframeUrl}
            title="Leher Fullscreen 3D Earth"
            className="w-full h-full border-0 absolute inset-0"
            onLoad={() => {
              sendToEarthIframe({
                action: "setLocation",
                latitude: inputLat,
                longitude: inputLon,
              });
            }}
          />

          {/* Center Floating Coordinate HUD */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="bg-[#000000]/85 backdrop-blur-lg px-5 py-3 rounded-2xl border border-white/10 shadow-2xl pointer-events-auto flex flex-col items-center gap-1 min-w-[220px]">
              <div className="flex items-center gap-2 font-mono">
                <span className="text-white font-bold text-base tracking-tight">
                  {inputLat >= 0 ? `${inputLat.toFixed(2)}°N` : `${Math.abs(inputLat).toFixed(2)}°S`}
                  <span className="text-neutral-500 mx-1.5">·</span>
                  {inputLon >= 0 ? `${inputLon.toFixed(2)}°E` : `${Math.abs(inputLon).toFixed(2)}°W`}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400">
                <span className="text-neutral-300 font-semibold">{prediction.location.regionName}</span>
                <span className="text-neutral-600">·</span>
                <span>{workbenchDepth}m depth</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT DOCKED PANEL: OPERATIONS & ANALYTICS WORKBENCH (EXACT SAME WIDTH & MATCHING CARDS) */}
        <div className={cn(
          "w-full lg:w-[310px] xl:w-[330px] lg:h-full bg-[#0c0c0c] border-t lg:border-t-0 lg:border-l border-[#222222] p-3 space-y-2.5 overflow-y-auto z-20 shadow-2xl shrink-0 max-h-none lg:max-h-full",
          activeMobileTab === 'controls' ? "flex-1 block" : "hidden lg:block"
        )}>
          {/* Header */}
          <div className="border-b border-[#222222] pb-2.5 flex justify-between items-center">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              ANALYTICS
            </h3>
          </div>

          {/* Card 1: Projection & Display */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-3 space-y-2">
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wide">MAP PROJECTION</div>
            <div className="relative">
              <select
                value={activeProjection}
                onChange={(e) => handleSelectProjection(e.target.value)}
                className="w-full bg-[#161616] text-white text-xs font-mono rounded-lg px-3 py-2 border border-[#262626] hover:border-[#444444] focus:border-white focus:outline-none cursor-pointer transition-all appearance-none pr-8 truncate"
              >
                {PROJECTION_LIST.map((p) => (
                  <option key={p.key} value={p.key} className="bg-[#141414] text-white font-mono">
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-500">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Card 2: Target Coordinates & Quick Presets */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-3 space-y-2">
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wide">COORDINATES</div>

            {/* Latitude */}
            <div className="bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 flex items-center justify-between focus-within:border-white/80 transition-colors">
              <span className="text-[#888888] text-xs">Latitude</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="4"
                  max="25"
                  value={inputLat}
                  onChange={(e) => setInputLat(parseFloat(e.target.value) || 0)}
                  onBlur={handleLatBlur}
                  className="w-20 bg-transparent text-white font-bold text-xs text-right focus:outline-none font-mono"
                  placeholder="15.40"
                />
                <span className="text-[#666666] font-mono text-xs w-6 text-right">
                  {inputLat >= 0 ? "°N" : "°S"}
                </span>
              </div>
            </div>

            {/* Longitude */}
            <div className="bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 flex items-center justify-between focus-within:border-white/80 transition-colors">
              <span className="text-[#888888] text-xs">Longitude</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="53"
                  max="99"
                  value={inputLon}
                  onChange={(e) => setInputLon(parseFloat(e.target.value) || 0)}
                  onBlur={handleLonBlur}
                  className="w-20 bg-transparent text-white font-bold text-xs text-right focus:outline-none font-mono"
                  placeholder="71.20"
                />
                <span className="text-[#666666] font-mono text-xs w-6 text-right">
                  {inputLon >= 0 ? "°E" : "°W"}
                </span>
              </div>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-4 gap-1 pt-0.5">
              {LOCATION_PRESETS.map((loc) => {
                const isSelected = Math.abs(inputLat - loc.lat) < 0.05 && Math.abs(inputLon - loc.lon) < 0.05;
                const isOutOfBounds = loc.lat < 4 || loc.lat > 25 || loc.lon < 53 || loc.lon > 99;
                return (
                  <button
                    key={loc.label}
                    type="button"
                    disabled={isOutOfBounds}
                    onClick={() => {
                      if (isOutOfBounds) return;
                      setInputLat(loc.lat);
                      setInputLon(loc.lon);
                    }}
                    title={isOutOfBounds ? `${loc.label} is outside data coverage (4°N–25°N, 53°–99°E)` : loc.label}
                    className={cn(
                      "px-1.5 py-1 rounded-lg text-[10px] border transition-all text-center truncate font-sans",
                      isOutOfBounds
                        ? "opacity-30 border-[#1a1a1a] bg-[#111111] text-[#555555] cursor-not-allowed"
                        : isSelected
                        ? "bg-white text-black font-semibold border-white cursor-pointer"
                        : "bg-[#161616] border-[#222222] text-[#888888] hover:text-white hover:border-[#333333] cursor-pointer"
                    )}
                  >
                    {loc.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 3: Depth Profile Measurement */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-3 space-y-2">
            <div className="flex justify-between items-center text-[10px] font-mono text-neutral-500">
              <span className="uppercase tracking-wide">DEPTH PROFILE</span>
            </div>
            
            <input 
              type="range" 
              min="0" 
              max="2000" 
              step="10" 
              value={workbenchDepth} 
              onChange={(e) => setWorkbenchDepth(Number(e.target.value))} 
              className="w-full accent-white h-1 bg-[#222222] rounded appearance-none cursor-pointer"
            />
            
            <div className="grid grid-cols-6 gap-1 text-center pt-0.5">
              {[0, 50, 150, 500, 1000, 2000].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setWorkbenchDepth(d)}
                  className={cn(
                    "py-1 rounded text-[10px] font-mono border transition-all cursor-pointer",
                    workbenchDepth === d
                      ? "bg-white text-black font-bold border-white"
                      : "bg-[#161616] border-[#222222] text-neutral-400 hover:text-white"
                  )}
                >
                  {d === 0 ? "0m" : `${d}m`}
                </button>
              ))}
            </div>
          </div>

          {/* Card 4: Action & Execution */}
          <div className="bg-[#121212] border border-[#222222] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
              <span>ACTION &amp; SENSORS</span>
              <span className="text-neutral-400">READY</span>
            </div>

            <button
              type="button"
              onClick={handleLocateMe}
              disabled={isLocating}
              className="w-full py-2 px-3 rounded-lg bg-[#161616] hover:bg-[#1f1f1f] border border-[#262626] hover:border-[#3a3a3a] text-neutral-200 text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
            >
              <span>{isLocating ? "Acquiring GPS Fix..." : "Locate My Coordinates"}</span>
            </button>

            <div className="pt-0.5">
              <button
                type="button"
                onClick={handlePredict}
                disabled={isPredicting}
                className="w-full py-2.5 px-3 rounded-lg bg-white hover:bg-neutral-200 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-[0.99] disabled:opacity-75"
              >
                {isPredicting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                    <span>Generating 3D Depth Slice...</span>
                  </>
                ) : (
                  <>
                    <span>Predict Ocean State &amp; Open 3D Slice</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-black" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
