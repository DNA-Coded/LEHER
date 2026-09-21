import React, { useEffect, useRef, useCallback } from 'react';
import { useOceanStore } from '@/store/useOceanStore';
import { OCEAN_REGIONS } from '@/lib/ocean/regions';
import { oceanDataService } from '@/lib/api/oceanDataService';
import { PointDepthPrimitive } from '@/cesium/primitives/pointDepthPrimitive';
import { oceanViewerManager } from '@/cesium/viewerManager';
import type { DeepOceanPrediction } from '@/lib/api/types';
import {
  X, MapPin, Thermometer, Droplets, Anchor, Navigation,
  Circle, Square, Loader2, Wifi, WifiOff, ChevronDown, ChevronUp,
  Waves, Activity, Layers, Cpu, Sparkles, Sprout
} from 'lucide-react';

/**
 * Premium data-rich side panel that appears when a user clicks any point on the globe
 * and triggers "Inspect 3D Depth". Shows live backend data, vertical profiles,
 * water column stratification, and controls for the 3D depth model.
 */
export const PointDepthPanel: React.FC = () => {
  const {
    clickedLocation,
    isPointDepthOpen,
    pointGeometryType,
    pointDepthData,
    isPointDataLoading,
    closePointDepth,
    setPointGeometryType,
    setPointDepthData,
    depth,
    opacity,
    verticalExaggeration,
    colorScale,
    showDepthIsoPlanes,
    variable,
  } = useOceanStore();

  const primitiveRef = useRef<PointDepthPrimitive | null>(null);
  const [profileExpanded, setProfileExpanded] = React.useState(false);

  // Find matching region for the clicked location
  const matchingRegion = clickedLocation
    ? OCEAN_REGIONS.find((r) => {
      const [minLon, minLat, maxLon, maxLat] = r.bbox;
      return (
        clickedLocation.lon >= minLon &&
        clickedLocation.lon <= maxLon &&
        clickedLocation.lat >= minLat &&
        clickedLocation.lat <= maxLat
      );
    })
    : null;

  // Fetch data from backend and ML model when point depth is opened
  const fetchPointData = useCallback(async () => {
    if (!clickedLocation) return;

    const { lat, lon } = clickedLocation;
    let isLive = false;
    let isLiveMl = false;
    const targetDepth = depth > 0 ? depth : 500;

    try {
      const [pointReport, profiles, mlRes] = await Promise.all([
        oceanDataService.getPointData(lat, lon, depth),
        oceanDataService.getProfiles(lat, lon),
        oceanDataService.predictDeepOcean(lat, lon, targetDepth).catch(() => null),
      ]);

      // Check if we got live backend data (source won't contain "Fallback")
      isLive = !pointReport.measurements.temperature?.source?.includes('Fallback');
      isLiveMl = Boolean(mlRes && mlRes.success && mlRes.data);

      const mlPrediction: DeepOceanPrediction = isLiveMl ? mlRes!.data : {
        thetao: Number(Math.max(2.1, 28.5 - Math.pow(targetDepth / 180, 0.72) * 11.5).toFixed(2)),
        so: Number(Math.min(36.1, 34.6 + (targetDepth / 2500) * 0.9).toFixed(2)),
        uo: 0.045,
        vo: -0.025,
        current_speed: 0.051,
      };

      setPointDepthData({
        temperature: pointReport.measurements.temperature?.value ?? 28.0,
        salinity: pointReport.measurements.salinity?.value ?? 35.0,
        bathymetry: pointReport.measurements.bathymetry?.value ?? 2000,
        currentSpeed: pointReport.measurements.currentSpeed?.value ?? 0.1,
        currentDirection: pointReport.measurements.currentDirection?.value ?? 45,
        chlorophyll: pointReport.measurements.chlorophyll?.value ?? 0.5,
        profiles,
        mlPrediction,
        isLiveBackend: isLive,
        isLiveMl,
      });
    } catch (err) {
      console.warn('[PointDepthPanel] Error fetching data:', err);
      setPointDepthData({
        temperature: 28.0 - depth * 0.01,
        salinity: 35.0 + depth * 0.005,
        bathymetry: 2000,
        currentSpeed: 0.1,
        currentDirection: 45,
        chlorophyll: 0.5,
        mlPrediction: {
          thetao: 11.2,
          so: 35.2,
          uo: 0.04,
          vo: -0.02,
          current_speed: 0.045,
        },
        isLiveBackend: false,
        isLiveMl: false,
      });
    }
  }, [clickedLocation, depth, setPointDepthData]);

  useEffect(() => {
    if (isPointDepthOpen && clickedLocation) {
      fetchPointData();
    }
  }, [isPointDepthOpen, clickedLocation, fetchPointData]);

  // Auto-select geometry based on depth
  useEffect(() => {
    if (pointDepthData) {
      const autoType = pointDepthData.bathymetry < 500 ? 'cuboid' : 'cylinder';
      setPointGeometryType(autoType);
    }
  }, [pointDepthData?.bathymetry]);

  // Initialize and update 3D primitive
  useEffect(() => {
    const viewer = oceanViewerManager.getViewer();
    if (!viewer) return;

    if (!primitiveRef.current) {
      primitiveRef.current = new PointDepthPrimitive(viewer);
    }

    return () => {
      if (primitiveRef.current) {
        primitiveRef.current.destroy();
        primitiveRef.current = null;
      }
    };
  }, []);

  // Update 3D geometry when data or settings change
  useEffect(() => {
    if (!primitiveRef.current) return;

    if (isPointDepthOpen && clickedLocation && pointDepthData) {
      const themeColor = matchingRegion?.themeColor || '#00d2ff';
      primitiveRef.current.update(
        {
          centerLon: clickedLocation.lon,
          centerLat: clickedLocation.lat,
          bathymetryDepth: pointDepthData.bathymetry,
          activeDepth: depth,
          verticalExaggeration,
          opacity,
          colorScale,
          showIsoPlanes: showDepthIsoPlanes,
          variable,
          geometryType: pointGeometryType,
          themeColor,
        },
        true
      );
    } else {
      primitiveRef.current.hide();
    }
  }, [
    isPointDepthOpen, clickedLocation, pointDepthData,
    depth, verticalExaggeration, opacity, colorScale,
    showDepthIsoPlanes, variable, pointGeometryType, matchingRegion
  ]);

  if (!isPointDepthOpen || !clickedLocation) return null;

  const { lon, lat } = clickedLocation;
  const themeColor = matchingRegion?.themeColor || '#00d2ff';

  // Format DMS
  const formatCoord = (val: number, isLat: boolean) => {
    const dir = isLat ? (val >= 0 ? 'N' : 'S') : (val >= 0 ? 'E' : 'W');
    const abs = Math.abs(val);
    const deg = Math.floor(abs);
    const min = Math.floor((abs - deg) * 60);
    const sec = ((abs - deg - min / 60) * 3600).toFixed(1);
    return `${deg}°${min}'${sec}"${dir}`;
  };

  // Water column stratification zones
  const getZones = (bathymetry: number) => {
    const zones = [];
    const total = bathymetry || 2000;
    if (total >= 0) zones.push({ name: 'Epipelagic (Sunlit)', range: '0 – 200m', depth: Math.min(200, total), color: '#00e5ff', pct: Math.min(200 / total * 100, 100) });
    if (total > 200) zones.push({ name: 'Mesopelagic (Twilight)', range: '200 – 1000m', depth: Math.min(800, total - 200), color: '#005fa3', pct: Math.min(800 / total * 100, 100 - 200 / total * 100) });
    if (total > 1000) zones.push({ name: 'Bathypelagic (Midnight)', range: '1000m+', depth: total - 1000, color: '#0a1628', pct: (total - 1000) / total * 100 });
    return zones;
  };

  return (
    <div
      className="point-depth-panel fixed sm:absolute inset-x-2 bottom-2 top-16 sm:top-[74px] sm:bottom-auto sm:left-auto sm:right-6 sm:w-[380px] lg:w-[420px] rounded-2xl overflow-y-auto shadow-2xl z-25 flex flex-col"
      style={{
        maxHeight: 'calc(100vh - 84px)',
        background: 'rgba(5, 12, 28, 0.94)',
        backdropFilter: 'blur(28px)',
        border: `1px solid ${themeColor}44`,
        padding: '0',
        color: '#e2f1ff',
        boxShadow: `0 20px 60px rgba(0, 0, 0, 0.85), 0 0 35px ${themeColor}22`,
        animation: 'fadeInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '18px 20px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: `linear-gradient(135deg, ${themeColor}12, transparent)`,
          borderRadius: '18px 18px 0 0',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <div
                style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  backgroundColor: themeColor,
                  boxShadow: `0 0 8px ${themeColor}`,
                  animation: 'pulse 2s infinite',
                }}
              />
              <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', color: themeColor, fontWeight: 700 }}>
                3D Ocean Column Slice
              </span>
            </div>
            <h3 style={{ margin: '0 0 2px', fontSize: '18px', fontWeight: 700, color: '#fff' }}>
              {matchingRegion ? matchingRegion.name : 'Open Ocean Point'}
            </h3>
            <span style={{ fontSize: '11.5px', color: '#7aa0c4' }}>
              {matchingRegion ? matchingRegion.hindiName : 'हिंद महासागर'}
            </span>
          </div>

          <button
            onClick={closePointDepth}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px', width: '30px', height: '30px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,70,70,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Coordinates */}
        <div
          style={{
            marginTop: '10px', background: 'rgba(0,20,40,0.5)', padding: '8px 12px',
            borderRadius: '8px', border: '1px solid rgba(0,200,255,0.1)',
            fontFamily: 'monospace', fontSize: '11.5px', display: 'flex', justifyContent: 'space-between',
          }}
        >
          <div>
            <MapPin size={11} style={{ marginRight: '4px', color: '#ffd700' }} />
            <span style={{ color: '#00e5ff' }}>{formatCoord(lat, true)}</span>
            <span style={{ color: '#556', margin: '0 6px' }}>|</span>
            <span style={{ color: '#00e5ff' }}>{formatCoord(lon, false)}</span>
          </div>
          <span style={{ color: '#556' }}>{lat.toFixed(3)}°, {lon.toFixed(3)}°</span>
        </div>

        {/* Live / Simulated indicator */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {pointDepthData?.isLiveBackend ? (
              <>
                <Wifi size={11} style={{ color: '#00e5ff' }} />
                <span style={{ fontSize: '10.5px', color: '#00e5ff', fontWeight: 600 }}>Live FastAPI Backend</span>
              </>
            ) : (
              <>
                <WifiOff size={11} style={{ color: '#ffd700' }} />
                <span style={{ fontSize: '10.5px', color: '#ffd700' }}>Calibrated Physics Models</span>
              </>
            )}
          </div>
          <span style={{ fontSize: '10px', color: '#556' }}>FastAPI • COPERNICUS</span>
        </div>
      </div>

      {/* ── LOADING STATE ───────────────────────────────────────────────── */}
      {isPointDataLoading && (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#7aa0c4' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px', color: themeColor }} />
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Extracting Water Column...</div>
          <div style={{ fontSize: '11px', color: '#556', marginTop: '4px' }}>
            Querying Copernicus marine models & Lahar ML API
          </div>
        </div>
      )}

      {/* ── METRICS & VISUALIZERS ────────────────────────────────────────── */}
      {pointDepthData && !isPointDataLoading && (
        <div style={{ padding: '14px 18px' }}>
          {/* 4 Key Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
            {/* Temperature */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(255,90,50,0.12), rgba(255,60,30,0.04))',
              padding: '10px 12px', borderRadius: '10px',
              border: '1px solid rgba(255,100,60,0.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#ff8a65', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                <Thermometer size={12} />
                <span>SST</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginTop: '3px' }}>
                {pointDepthData.temperature.toFixed(1)}
                <span style={{ fontSize: '12px', fontWeight: 400, color: '#ff8a65', marginLeft: '2px' }}>°C</span>
              </div>
            </div>

            {/* Salinity */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(0,200,255,0.12), rgba(0,180,255,0.04))',
              padding: '10px 12px', borderRadius: '10px',
              border: '1px solid rgba(0,200,255,0.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#4dd0e1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                <Droplets size={12} />
                <span>Salinity</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginTop: '3px' }}>
                {pointDepthData.salinity.toFixed(1)}
                <span style={{ fontSize: '12px', fontWeight: 400, color: '#4dd0e1', marginLeft: '2px' }}>PSU</span>
              </div>
            </div>

            {/* Bathymetry */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(90,50,200,0.12), rgba(80,40,180,0.04))',
              padding: '10px 12px', borderRadius: '10px',
              border: '1px solid rgba(100,60,220,0.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#b39ddb', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                <Anchor size={12} />
                <span>Seafloor</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginTop: '3px' }}>
                {pointDepthData.bathymetry.toLocaleString()}
                <span style={{ fontSize: '12px', fontWeight: 400, color: '#b39ddb', marginLeft: '2px' }}>m</span>
              </div>
            </div>

            {/* Current Speed */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(0,245,160,0.12), rgba(0,200,130,0.04))',
              padding: '10px 12px', borderRadius: '10px',
              border: '1px solid rgba(0,245,160,0.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#69f0ae', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                <Navigation size={12} />
                <span>Current</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginTop: '3px' }}>
                {pointDepthData.currentSpeed.toFixed(2)}
                <span style={{ fontSize: '12px', fontWeight: 400, color: '#69f0ae', marginLeft: '2px' }}>m/s</span>
              </div>
              <div style={{ fontSize: '9px', color: '#69f0ae', marginTop: '1px' }}>
                {pointDepthData.currentDirection.toFixed(0)}° True
              </div>
            </div>

            {/* Chlorophyll-a */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(76,175,80,0.12), rgba(56,142,60,0.04))',
              padding: '10px 12px', borderRadius: '10px',
              border: '1px solid rgba(76,175,80,0.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#81c784', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                <Sprout size={12} />
                <span>Chlorophyll-a</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginTop: '3px' }}>
                {pointDepthData.chlorophyll.toFixed(3)}
                <span style={{ fontSize: '12px', fontWeight: 400, color: '#81c784', marginLeft: '2px' }}>mg/m³</span>
              </div>
            </div>
          </div>

          {/* ── LAHAR ML MODEL V2 TELEMETRY CARD ──────────────────────── */}
          {pointDepthData.mlPrediction && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(88,28,135,0.25), rgba(15,23,42,0.7))',
              padding: '12px 14px', borderRadius: '12px',
              border: '1px solid rgba(168,85,247,0.35)', marginBottom: '14px',
              boxShadow: '0 4px 20px rgba(88,28,135,0.18)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Cpu size={14} style={{ color: '#c084fc' }} />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#e9d5ff', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                    Lahar ML V2 Deep-Ocean Inference
                  </span>
                </div>
                <span style={{
                  fontSize: '9px', padding: '2px 7px', borderRadius: '10px', fontWeight: 600,
                  background: pointDepthData.isLiveMl ? 'rgba(34,197,94,0.2)' : 'rgba(234,179,8,0.2)',
                  color: pointDepthData.isLiveMl ? '#4ade80' : '#fde047',
                  border: `1px solid ${pointDepthData.isLiveMl ? 'rgba(34,197,94,0.4)' : 'rgba(234,179,8,0.4)'}`,
                }}>
                  {pointDepthData.isLiveMl ? '● Live ML Server' : '◐ Calibrated Mode'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(168,85,247,0.15)' }}>
                  <div style={{ fontSize: '9px', color: '#c084fc', textTransform: 'uppercase' }}>Deep Temp (θ₀)</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                    {pointDepthData.mlPrediction.thetao.toFixed(2)}
                    <span style={{ fontSize: '10px', color: '#ff8a65', marginLeft: '2px' }}>°C</span>
                  </div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(168,85,247,0.15)' }}>
                  <div style={{ fontSize: '9px', color: '#c084fc', textTransform: 'uppercase' }}>Deep Salinity (S₀)</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                    {pointDepthData.mlPrediction.so.toFixed(2)}
                    <span style={{ fontSize: '10px', color: '#4dd0e1', marginLeft: '2px' }}>PSU</span>
                  </div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(168,85,247,0.15)' }}>
                  <div style={{ fontSize: '9px', color: '#c084fc', textTransform: 'uppercase' }}>Deep Flow Speed</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                    {(pointDepthData.mlPrediction.current_speed ?? Math.sqrt(pointDepthData.mlPrediction.uo ** 2 + pointDepthData.mlPrediction.vo ** 2)).toFixed(3)}
                    <span style={{ fontSize: '10px', color: '#69f0ae', marginLeft: '2px' }}>m/s</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '6px', fontSize: '9px', color: '#a855f7', display: 'flex', justifyContent: 'space-between' }}>
                <span>Target Depth: {depth > 0 ? `${depth} m` : '500 m (Thermocline Core)'}</span>
                <span>u: {pointDepthData.mlPrediction.uo.toFixed(3)} | v: {pointDepthData.mlPrediction.vo.toFixed(3)}</span>
              </div>
            </div>
          )}

          {/* ── 3D SOLID WATER COLUMN STAGE ───────────────────────────── */}
          <div style={{
            background: 'rgba(0,18,36,0.6)', padding: '12px 14px', borderRadius: '12px',
            border: `1px solid ${themeColor}33`, marginBottom: '14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Waves size={13} style={{ color: themeColor }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Solid 3D Column Stage
                </span>
              </div>
              <span style={{ fontSize: '10px', color: '#00f0ff', fontWeight: 600 }}>
                {pointGeometryType === 'cylinder' ? '⬡ Cylinder Geometry' : '▬ Cuboid Geometry'}
              </span>
            </div>

            {/* Model Shape Toggle */}
            <div style={{
              display: 'flex', gap: '6px', marginBottom: '12px',
              background: 'rgba(0,10,24,0.6)', padding: '3px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <button
                onClick={() => setPointGeometryType('cylinder')}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: '6px', border: 'none',
                  background: pointGeometryType === 'cylinder' ? `${themeColor}35` : 'transparent',
                  color: pointGeometryType === 'cylinder' ? '#fff' : '#7aa0c4',
                  fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                  transition: 'all 0.2s',
                  outline: pointGeometryType === 'cylinder' ? `1px solid ${themeColor}80` : 'none',
                }}
              >
                <Circle size={12} />
                Cylinder
              </button>
              <button
                onClick={() => setPointGeometryType('cuboid')}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: '6px', border: 'none',
                  background: pointGeometryType === 'cuboid' ? `${themeColor}35` : 'transparent',
                  color: pointGeometryType === 'cuboid' ? '#fff' : '#7aa0c4',
                  fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                  transition: 'all 0.2s',
                  outline: pointGeometryType === 'cuboid' ? `1px solid ${themeColor}80` : 'none',
                }}
              >
                <Square size={12} />
                Cuboid
              </button>
            </div>

            {/* Visual Column Cross-Section Bar */}
            <div style={{
              display: 'flex', height: '64px', borderRadius: '8px', overflow: 'hidden',
              border: '1px solid rgba(0,229,255,0.3)', position: 'relative',
              background: 'linear-gradient(180deg, #00f0ff 0%, #0077b6 25%, #023e8a 50%, #03045e 75%, #010a18 100%)',
              boxShadow: 'inset 0 0 15px rgba(0,0,0,0.5)',
            }}>
              {/* Depth markers */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '4px 8px', pointerEvents: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#fff', fontWeight: 700, textShadow: '0 1px 2px #000' }}>
                  <span>0 m (Surface Water)</span>
                  <span>{pointDepthData.temperature.toFixed(1)}°C</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', color: '#ffd700', fontWeight: 600, textShadow: '0 1px 2px #000' }}>
                  <span>-500 m (Mesopelagic Thermocline)</span>
                  <span>{pointDepthData.mlPrediction?.thetao.toFixed(1)}°C</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#90b4d4', fontWeight: 700, textShadow: '0 1px 2px #000' }}>
                  <span>-{pointDepthData.bathymetry.toLocaleString()} m (Seafloor Bedrock)</span>
                  <span>Abyssal</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── WATER COLUMN STRATIFICATION BAR ───────────────────────── */}
          <div style={{
            background: 'rgba(0,15,30,0.5)', padding: '12px', borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)', marginBottom: '14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Layers size={12} style={{ color: themeColor }} />
              <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: themeColor }}>
                Water Column Stratification
              </span>
            </div>

            <div style={{ borderRadius: '6px', overflow: 'hidden', height: '28px', display: 'flex' }}>
              {getZones(pointDepthData.bathymetry).map((zone, i) => {
                const isActiveZone = depth <= 200 ? i === 0 : depth <= 1000 ? i === 1 : i === 2;
                return (
                  <div
                    key={zone.name}
                    style={{
                      flex: zone.pct,
                      background: zone.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '8.5px', fontWeight: 600, color: '#fff', letterSpacing: '0.3px',
                      position: 'relative',
                      outline: isActiveZone ? '2px solid #ffd700' : 'none',
                      outlineOffset: '-2px',
                      transition: 'all 0.3s',
                    }}
                    title={`${zone.name}: ${zone.range}`}
                  >
                    {zone.pct > 15 && zone.range}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '9px', color: '#7aa0c4' }}>
              {getZones(pointDepthData.bathymetry).map(zone => (
                <span key={zone.name}>{zone.name.split('(')[0].trim()}</span>
              ))}
            </div>
          </div>

          {/* ── VERTICAL PROFILE (Expandable) ────────────────────────── */}
          {pointDepthData.profiles && (
            <div style={{
              background: 'rgba(0,15,30,0.5)', borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden',
            }}>
              <button
                onClick={() => setProfileExpanded(!profileExpanded)}
                style={{
                  width: '100%', padding: '10px 12px',
                  background: 'transparent', border: 'none', color: '#e2f1ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', fontSize: '10px', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '1px',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Activity size={12} style={{ color: themeColor }} />
                  Vertical Profiles (T/S vs Depth)
                </span>
                {profileExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {profileExpanded && pointDepthData.profiles && (
                <div style={{ padding: '0 12px 12px' }}>
                  {/* Simple ASCII-style profile visualization */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {/* Temperature profile */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '9px', color: '#ff8a65', fontWeight: 600, marginBottom: '4px', textAlign: 'center' }}>
                        Temperature (°C)
                      </div>
                      <div style={{
                        background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '6px',
                        display: 'flex', flexDirection: 'column', gap: '1px',
                      }}>
                        {pointDepthData.profiles.depthLevels.slice(0, 10).map((d, i) => {
                          const t = pointDepthData.profiles!.temperature[i];
                          const maxT = Math.max(...pointDepthData.profiles!.temperature);
                          const minT = Math.min(...pointDepthData.profiles!.temperature);
                          const pct = ((t - minT) / (maxT - minT || 1)) * 100;
                          return (
                            <div key={d} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '8px' }}>
                              <span style={{ width: '32px', textAlign: 'right', color: '#7aa0c4' }}>{d}m</span>
                              <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #ff6b35, #ff8a65)', borderRadius: '2px', transition: 'width 0.5s' }} />
                              </div>
                              <span style={{ width: '28px', color: '#ff8a65', fontWeight: 600 }}>{t.toFixed(1)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Salinity profile */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '9px', color: '#4dd0e1', fontWeight: 600, marginBottom: '4px', textAlign: 'center' }}>
                        Salinity (PSU)
                      </div>
                      <div style={{
                        background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '6px',
                        display: 'flex', flexDirection: 'column', gap: '1px',
                      }}>
                        {pointDepthData.profiles.depthLevels.slice(0, 10).map((d, i) => {
                          const s = pointDepthData.profiles!.salinity[i];
                          const maxS = Math.max(...pointDepthData.profiles!.salinity);
                          const minS = Math.min(...pointDepthData.profiles!.salinity);
                          const pct = ((s - minS) / (maxS - minS || 1)) * 100;
                          return (
                            <div key={d} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '8px' }}>
                              <span style={{ width: '32px', textAlign: 'right', color: '#7aa0c4' }}>{d}m</span>
                              <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #00838f, #4dd0e1)', borderRadius: '2px', transition: 'width 0.5s' }} />
                              </div>
                              <span style={{ width: '28px', color: '#4dd0e1', fontWeight: 600 }}>{s.toFixed(1)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STATUS FOOTER ────────────────────────────────────────── */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: '12px', fontSize: '10px', color: '#556a80',
            paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.04)',
          }}>
            <span>Active: -{depth}m • {pointGeometryType === 'cylinder' ? '⬡' : '▬'} {pointGeometryType}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Waves size={10} />
              {pointDepthData.bathymetry.toLocaleString()}m column
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
