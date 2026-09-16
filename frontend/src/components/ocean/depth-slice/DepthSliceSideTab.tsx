import React, { useState } from 'react';
import { useOceanStore } from '@/store/useOceanStore';
import {
  X, Thermometer, Droplets, Compass, Activity, Waves,
  Cpu, Layers, ChevronRight, ChevronLeft, Info, ShieldCheck, MapPin,
  TrendingDown, Gauge, Navigation, Sliders, Sprout
} from 'lucide-react';

export const DepthSliceSideTab: React.FC = () => {
  const {
    depthColumnData,
    clickedLocation,
    closePointDepth,
    isPointDataLoading,
    selectedDepthIndex,
    setSelectedDepthIndex,
    isSideTabCollapsed,
    toggleSideTabCollapsed,
  } = useOceanStore();

  const [activeTab, setActiveTab] = useState<'telemetry' | 'layers' | 'profile'>('telemetry');

  if (!depthColumnData && !isPointDataLoading) return null;

  const location = depthColumnData?.location;
  const metrics = depthColumnData?.derived_metrics;
  const metadata = depthColumnData?.metadata;
  const waterColumn = depthColumnData?.water_column || [];
  const activeLayer = waterColumn[selectedDepthIndex] || waterColumn[0] || {
    depth: 0, thetao: 28.5, so: 35.2, uo: 0.12, vo: -0.08, current_speed: 0.144, chlorophyll: 0.5
  };

  // Direction in degrees from uo, vo (oceanographic heading)
  const currentDirectionDeg = ((Math.atan2(activeLayer.uo, activeLayer.vo) * 180 / Math.PI) + 360) % 360;

  // Determine oceanographic zone label
  const getZoneLabel = (d: number) => {
    if (d === 0) return 'Surface Photic Zone';
    if (d <= 50) return 'Epipelagic Mixed Layer';
    if (d <= 200) return 'Thermocline Transition';
    if (d <= 1000) return 'Mesopelagic Twilight';
    return 'Bathypelagic Abyss';
  };

  return (
    <>
      {/* ── Collapsed Floating Trigger Pill (Visible when panel is collapsed) ── */}
      {isSideTabCollapsed && (
        <button
          onClick={toggleSideTabCollapsed}
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
            animation: 'fadeIn 0.25s ease forwards',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(0, 40, 80, 0.95)';
            e.currentTarget.style.transform = 'scale(1.03)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(3, 14, 28, 0.92)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <ChevronLeft size={16} />
          <span>Show Telemetry Data ({activeLayer.depth}m)</span>
        </button>
      )}

      {/* ── Main Data SideTab Container ───────────────────────────────────── */}
      <div
        id="depth-slice-sidetab"
        style={{
          position: 'absolute',
          top: '75px',
          right: '20px',
          bottom: '80px',
          width: '380px',
          maxWidth: 'calc(100vw - 40px)',
          background: 'rgba(3, 14, 28, 0.94)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(0, 220, 255, 0.3)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 16px 50px rgba(0, 0, 0, 0.85), 0 0 25px rgba(0, 180, 255, 0.15)',
          zIndex: 25,
          overflow: 'hidden',
          color: '#e2f1ff',
          transform: isSideTabCollapsed ? 'translateX(calc(100% + 40px))' : 'translateX(0)',
          transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid rgba(0, 220, 255, 0.15)',
            background: 'linear-gradient(180deg, rgba(0, 220, 255, 0.08) 0%, transparent 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  padding: '2px 7px',
                  borderRadius: '5px',
                  background: 'rgba(0, 229, 255, 0.18)',
                  color: '#00e5ff',
                  border: '1px solid rgba(0, 229, 255, 0.35)',
                }}
              >
                ML Telemetry
              </span>
              <span style={{ fontSize: '12px', color: '#7aa0c4', fontWeight: 600 }}>
                {location?.basin || 'Indian Ocean'}
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#ffffff' }}>
              Water Column Intelligence
            </h3>
            <div style={{ fontSize: '11px', color: '#00d2ff', fontFamily: 'monospace', marginTop: '2px' }}>
              {clickedLocation ? `${clickedLocation.lat.toFixed(4)}°N, ${clickedLocation.lon.toFixed(4)}°E` : '15.4000°N, 71.2000°E'}
            </div>
          </div>

          {/* Action Buttons: Minimize & Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={toggleSideTabCollapsed}
              title="Minimize panel to see full 3D model"
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#80d8ff',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0, 210, 255, 0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
            >
              <ChevronRight size={15} />
            </button>
            <button
              onClick={closePointDepth}
              title="Close 3D Depth Slice"
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 60, 60, 0.35)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Sub-navigation Tabs ─────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            padding: '6px 14px',
            background: 'rgba(0, 0, 0, 0.25)',
            borderBottom: '1px solid rgba(0, 220, 255, 0.1)',
            gap: '6px',
          }}
        >
          <button
            onClick={() => setActiveTab('telemetry')}
            style={{
              flex: 1,
              padding: '6px 0',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'telemetry' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
              color: activeTab === 'telemetry' ? '#00e5ff' : '#7aa0c4',
              transition: 'all 0.2s',
            }}
          >
            All Predictions
          </button>
          <button
            onClick={() => setActiveTab('layers')}
            style={{
              flex: 1,
              padding: '6px 0',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'layers' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
              color: activeTab === 'layers' ? '#00e5ff' : '#7aa0c4',
              transition: 'all 0.2s',
            }}
          >
            Layer Slices ({waterColumn.length})
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              flex: 1,
              padding: '6px 0',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'profile' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
              color: activeTab === 'profile' ? '#00e5ff' : '#7aa0c4',
              transition: 'all 0.2s',
            }}
          >
            Profiles (T-z / S-z)
          </button>
        </div>

        {/* ── Scrollable Body ────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
          {activeTab === 'telemetry' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* ── INTERACTIVE DEPTH SLIDEBAR (Replaced Dropdown) ─────────── */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 25, 55, 0.75) 0%, rgba(0, 15, 35, 0.85) 100%)',
                  border: '1px solid rgba(0, 229, 255, 0.35)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
                }}
              >
                {/* Header Row: Label & Active Depth Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <Sliders size={14} color="#00e5ff" />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2f1ff' }}>
                      Depth Slice Selector
                    </span>
                  </div>
                  <div
                    style={{
                      background: 'rgba(0, 245, 160, 0.15)',
                      border: '1px solid rgba(0, 245, 160, 0.4)',
                      padding: '2px 9px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 800,
                      color: '#00f5a0',
                      fontFamily: 'monospace',
                    }}
                  >
                    {activeLayer.depth === 0 ? '0m (Surface)' : `${activeLayer.depth} meters`}
                  </div>
                </div>

                {/* Oceanographic Zone Classification Tag */}
                <div style={{ fontSize: '11px', color: '#7aa0c4', marginBottom: '10px' }}>
                  Zone: <span style={{ color: '#00e5ff', fontWeight: 600 }}>{getZoneLabel(activeLayer.depth)}</span>
                </div>

                {/* Range Slider Track */}
                <div style={{ position: 'relative', margin: '6px 0 10px' }}>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, waterColumn.length - 1)}
                    step={1}
                    value={selectedDepthIndex}
                    onChange={(e) => setSelectedDepthIndex(Number(e.target.value))}
                    style={{
                      width: '100%',
                      height: '6px',
                      borderRadius: '3px',
                      outline: 'none',
                      cursor: 'pointer',
                      background: 'linear-gradient(90deg, #00f0ff 0%, #0077ff 50%, #001f4d 100%)',
                      WebkitAppearance: 'none',
                    }}
                  />
                </div>

                {/* Depth Tick Marks along the slider */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '10px',
                    color: '#6088aa',
                    fontFamily: 'monospace',
                    padding: '0 2px',
                  }}
                >
                  <span
                    onClick={() => setSelectedDepthIndex(0)}
                    style={{ cursor: 'pointer', color: selectedDepthIndex === 0 ? '#00f5a0' : 'inherit' }}
                  >
                    0m
                  </span>
                  <span
                    onClick={() => {
                      const idx = waterColumn.findIndex(w => w.depth >= 100);
                      if (idx >= 0) setSelectedDepthIndex(idx);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    100m
                  </span>
                  <span
                    onClick={() => {
                      const idx = waterColumn.findIndex(w => w.depth >= 500);
                      if (idx >= 0) setSelectedDepthIndex(idx);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    500m
                  </span>
                  <span
                    onClick={() => {
                      const idx = waterColumn.findIndex(w => w.depth >= 1000);
                      if (idx >= 0) setSelectedDepthIndex(idx);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    1000m
                  </span>
                  <span
                    onClick={() => setSelectedDepthIndex(waterColumn.length - 1)}
                    style={{ cursor: 'pointer', color: selectedDepthIndex === waterColumn.length - 1 ? '#00f5a0' : 'inherit' }}
                  >
                    2000m
                  </span>
                </div>

                {/* Quick Preset Jump Pills */}
                <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                  {[
                    { label: 'Surface (0m)', depth: 0 },
                    { label: 'Thermocline (100m)', depth: 100 },
                    { label: 'Mid (500m)', depth: 500 },
                    { label: 'Abyss (2000m)', depth: 2000 },
                  ].map((preset, pIdx) => {
                    const idx = waterColumn.findIndex(w => Math.abs(w.depth - preset.depth) < 25);
                    const isCur = idx >= 0 && selectedDepthIndex === idx;
                    return (
                      <button
                        key={pIdx}
                        onClick={() => {
                          if (idx >= 0) setSelectedDepthIndex(idx);
                        }}
                        style={{
                          flex: 1,
                          padding: '4px 2px',
                          borderRadius: '6px',
                          fontSize: '9px',
                          fontWeight: 700,
                          border: isCur ? '1px solid #00f5a0' : '1px solid rgba(255, 255, 255, 0.08)',
                          background: isCur ? 'rgba(0, 245, 160, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                          color: isCur ? '#00f5a0' : '#88aacc',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Primary Predictions Grid ───────────────────────────────── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px' }}>
                {/* Temperature (thetao) */}
                <div
                  style={{
                    background: 'rgba(0, 30, 60, 0.5)',
                    border: '1px solid rgba(255, 120, 60, 0.3)',
                    borderRadius: '10px',
                    padding: '11px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Thermometer size={14} color="#ff7a36" />
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#ff9d6b', textTransform: 'uppercase' }}>
                      Potential Temp (θ₀)
                    </span>
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff' }}>
                    {activeLayer.thetao.toFixed(2)}
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#ffaa77', marginLeft: '4px' }}>°C</span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#7aa0c4', marginTop: '2px' }}>
                    {activeLayer.depth === 0 ? 'Surface Photic Layer' : activeLayer.depth <= 200 ? 'Thermocline Gradient' : 'Deep Cold Layer'}
                  </div>
                </div>

                {/* Salinity (so) */}
                <div
                  style={{
                    background: 'rgba(0, 30, 60, 0.5)',
                    border: '1px solid rgba(0, 229, 255, 0.3)',
                    borderRadius: '10px',
                    padding: '11px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Droplets size={14} color="#00e5ff" />
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#00e5ff', textTransform: 'uppercase' }}>
                      Salinity (S₀)
                    </span>
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff' }}>
                    {activeLayer.so.toFixed(2)}
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#88e0ff', marginLeft: '4px' }}>PSU</span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#7aa0c4', marginTop: '2px' }}>
                    Practical Salinity Scale
                  </div>
                </div>

                {/* Current Velocity Speed */}
                <div
                  style={{
                    background: 'rgba(0, 30, 60, 0.5)',
                    border: '1px solid rgba(0, 245, 160, 0.3)',
                    borderRadius: '10px',
                    padding: '11px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Waves size={14} color="#00f5a0" />
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#00f5a0', textTransform: 'uppercase' }}>
                      Current Velocity
                    </span>
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff' }}>
                    {activeLayer.current_speed.toFixed(3)}
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#70ffcc', marginLeft: '4px' }}>m/s</span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#7aa0c4', marginTop: '2px' }}>
                    ≈ {(activeLayer.current_speed * 1.94384).toFixed(2)} knots
                  </div>
                </div>

                {/* Current Direction Heading */}
                <div
                  style={{
                    background: 'rgba(0, 30, 60, 0.5)',
                    border: '1px solid rgba(160, 100, 255, 0.3)',
                    borderRadius: '10px',
                    padding: '11px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Navigation size={14} color="#c084fc" />
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#c084fc', textTransform: 'uppercase' }}>
                      Current Heading
                    </span>
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff' }}>
                    {Math.round(currentDirectionDeg)}°
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#c084fc', marginLeft: '6px' }}>
                      {currentDirectionDeg >= 337.5 || currentDirectionDeg < 22.5 ? 'N' :
                       currentDirectionDeg < 67.5 ? 'NE' :
                       currentDirectionDeg < 112.5 ? 'E' :
                       currentDirectionDeg < 157.5 ? 'SE' :
                       currentDirectionDeg < 202.5 ? 'S' :
                       currentDirectionDeg < 247.5 ? 'SW' :
                       currentDirectionDeg < 292.5 ? 'W' : 'NW'}
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#7aa0c4', marginTop: '2px' }}>
                    Flow vector bearing
                  </div>
                </div>
              </div>

              {/* Velocity Vectors (uo, vo) Detailed Card */}
              <div
                style={{
                  background: 'rgba(0, 20, 45, 0.5)',
                  border: '1px solid rgba(0, 220, 255, 0.18)',
                  borderRadius: '10px',
                  padding: '11px 13px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#8ec5fc', marginBottom: '8px' }}>
                  Horizontal Velocity Components (u₀, v₀)
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ flex: 1, background: 'rgba(0, 0, 0, 0.3)', padding: '7px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: '#7aa0c4' }}>Eastward (u₀)</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: activeLayer.uo >= 0 ? '#00f5a0' : '#ff7a7a' }}>
                      {activeLayer.uo >= 0 ? `+${activeLayer.uo.toFixed(3)}` : activeLayer.uo.toFixed(3)} m/s
                    </div>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(0, 0, 0, 0.3)', padding: '7px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: '#7aa0c4' }}>Northward (v₀)</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: activeLayer.vo >= 0 ? '#00f5a0' : '#ff7a7a' }}>
                      {activeLayer.vo >= 0 ? `+${activeLayer.vo.toFixed(3)}` : activeLayer.vo.toFixed(3)} m/s
                    </div>
                  </div>
                </div>
              </div>

              {/* Chlorophyll-a Concentration Card */}
              {activeLayer.chlorophyll !== undefined && (
                <div
                  style={{
                    background: 'rgba(0, 35, 20, 0.5)',
                    border: '1px solid rgba(76, 175, 80, 0.3)',
                    borderRadius: '10px',
                    padding: '11px 13px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Sprout size={14} color="#81c784" />
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#81c784', textTransform: 'uppercase' }}>
                      Chlorophyll-a Concentration
                    </span>
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff' }}>
                    {activeLayer.chlorophyll.toFixed(3)}
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#a5d6a7', marginLeft: '4px' }}>mg/m³</span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#7aa0c4', marginTop: '2px' }}>
                    {activeLayer.chlorophyll > 1.0 ? 'High productivity (bloom likely)' :
                     activeLayer.chlorophyll > 0.3 ? 'Moderate productivity' :
                     activeLayer.chlorophyll > 0.1 ? 'Oligotrophic waters' : 'Deep depleted zone'}
                  </div>
                </div>
              )}

              {/* Oceanographic Stratification Telemetry */}
              {metrics && (
                <div
                  style={{
                    background: 'rgba(0, 25, 55, 0.6)',
                    border: '1px solid rgba(0, 220, 255, 0.25)',
                    borderRadius: '12px',
                    padding: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
                    <Activity size={14} color="#00e5ff" />
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.4px' }}>
                      Water Column Stratification Metrics
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '7px 9px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '10px', color: '#7aa0c4' }}>Thermocline Core</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#00e5ff' }}>
                        {metrics.thermocline_depth} m
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '7px 9px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '10px', color: '#7aa0c4' }}>Mixed Layer Depth</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#00f5a0' }}>
                        {metrics.mixed_layer_depth} m
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '7px 9px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '10px', color: '#7aa0c4' }}>Pycnocline Gradient</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffd166' }}>
                        {metrics.pycnocline_strength} <span style={{ fontSize: '9px' }}>×10⁻² °C/m</span>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '7px 9px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '10px', color: '#7aa0c4' }}>Column Mean Speed</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#c084fc' }}>
                        {metrics.mean_column_speed.toFixed(3)} m/s
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Model Architecture & Provenance */}
              {metadata && (
                <div
                  style={{
                    background: 'rgba(0, 15, 35, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <Cpu size={13} color="#00f5a0" />
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#00f5a0' }}>
                      {metadata.model_name} (v{metadata.model_version})
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px', textAlign: 'center' }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '5px 2px', borderRadius: '6px' }}>
                      <div style={{ fontSize: '9px', color: '#7aa0c4' }}>R² (θ₀)</div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#00f5a0' }}>0.9978</div>
                    </div>
                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '5px 2px', borderRadius: '6px' }}>
                      <div style={{ fontSize: '9px', color: '#7aa0c4' }}>R² (S₀)</div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#00f5a0' }}>0.9868</div>
                    </div>
                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '5px 2px', borderRadius: '6px' }}>
                      <div style={{ fontSize: '9px', color: '#7aa0c4' }}>R² (u₀)</div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#00e5ff' }}>0.7628</div>
                    </div>
                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '5px 2px', borderRadius: '6px' }}>
                      <div style={{ fontSize: '9px', color: '#7aa0c4' }}>R² (v₀)</div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#00e5ff' }}>0.6560</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'layers' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <div style={{ fontSize: '11px', color: '#7aa0c4', marginBottom: '4px' }}>
                Click any depth level to inspect in 3D scene:
              </div>
              {waterColumn.map((layer, idx) => {
                const isSelected = selectedDepthIndex === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDepthIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 11px',
                      borderRadius: '8px',
                      background: isSelected ? 'rgba(0, 229, 255, 0.2)' : 'rgba(0, 20, 40, 0.4)',
                      border: isSelected ? '1px solid #00e5ff' : '1px solid rgba(255, 255, 255, 0.06)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '22px',
                          borderRadius: '4px',
                          background: 'rgba(0, 0, 0, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: isSelected ? '#00f5a0' : '#8ec5fc',
                        }}
                      >
                        {layer.depth}m
                      </div>
                      <div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                          {layer.thetao.toFixed(1)}°C
                        </span>
                        <span style={{ fontSize: '10px', color: '#7aa0c4', marginLeft: '7px' }}>
                          {layer.so.toFixed(1)} PSU
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#00f5a0' }}>
                      {layer.current_speed.toFixed(3)} m/s
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                Vertical Temperature & Salinity Decay Profile
              </div>
              <div
                style={{
                  width: '100%',
                  height: '240px',
                  background: 'rgba(0, 10, 25, 0.6)',
                  borderRadius: '10px',
                  border: '1px solid rgba(0, 220, 255, 0.2)',
                  padding: '10px',
                  position: 'relative',
                }}
              >
                <svg width="100%" height="100%" viewBox="0 0 340 210">
                  {/* Axes */}
                  <line x1="40" y1="20" x2="40" y2="185" stroke="#335577" strokeWidth="1" />
                  <line x1="40" y1="20" x2="320" y2="20" stroke="#335577" strokeWidth="1" />
                  <line x1="40" y1="185" x2="320" y2="185" stroke="#335577" strokeWidth="1" />

                  {/* Depth tick labels */}
                  <text x="34" y="24" fill="#7aa0c4" fontSize="9" textAnchor="end">0m</text>
                  <text x="34" y="65" fill="#7aa0c4" fontSize="9" textAnchor="end">200m</text>
                  <text x="34" y="105" fill="#7aa0c4" fontSize="9" textAnchor="end">500m</text>
                  <text x="34" y="145" fill="#7aa0c4" fontSize="9" textAnchor="end">1000m</text>
                  <text x="34" y="185" fill="#7aa0c4" fontSize="9" textAnchor="end">2000m</text>

                  {/* Temperature curve */}
                  <path
                    d={waterColumn.map((layer, i) => {
                      const x = 40 + (Math.max(0, Math.min(32, layer.thetao)) / 32) * 270;
                      const y = 20 + Math.pow(layer.depth / 2000, 0.6) * 165;
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#ff7733"
                    strokeWidth="2.5"
                  />

                  {/* Salinity curve */}
                  <path
                    d={waterColumn.map((layer, i) => {
                      const x = 40 + ((Math.max(33, Math.min(37, layer.so)) - 33) / 4) * 270;
                      const y = 20 + Math.pow(layer.depth / 2000, 0.6) * 165;
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#00e5ff"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                  />
                </svg>

                <div style={{ display: 'flex', gap: '14px', marginTop: '6px', fontSize: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '12px', height: '3px', background: '#ff7733' }} />
                    <span style={{ color: '#ff9966' }}>θ₀ Temperature (°C)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '12px', height: '2px', background: '#00e5ff', borderBottom: '1px dashed #00e5ff' }} />
                    <span style={{ color: '#00e5ff' }}>S₀ Salinity (PSU)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
export default DepthSliceSideTab;
