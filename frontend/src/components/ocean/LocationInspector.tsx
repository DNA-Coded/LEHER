import React from 'react';
import { useOceanStore } from '@/store/useOceanStore';
import { OCEAN_REGIONS } from '@/lib/ocean/regions';
import { oceanViewerManager } from '@/cesium/viewerManager';
import { MapPin, X, Compass, Thermometer, Copy, Check, Scan } from 'lucide-react';

export const LocationInspector: React.FC = () => {
  const {
    clickedLocation, setClickedLocation, setSelectedRegion, selectedRegion,
    isPointDepthOpen, openPointDepth,
  } = useOceanStore();
  const [copied, setCopied] = React.useState(false);

  if (!clickedLocation || isPointDepthOpen) return null;

  const { lon, lat } = clickedLocation;

  // Format DMS
  const formatCoord = (val: number, isLat: boolean) => {
    const dir = isLat ? (val >= 0 ? 'N' : 'S') : (val >= 0 ? 'E' : 'W');
    const abs = Math.abs(val);
    const deg = Math.floor(abs);
    const min = Math.floor((abs - deg) * 60);
    const sec = ((abs - deg - min / 60) * 3600).toFixed(1);
    return `${deg}° ${min}' ${sec}" ${dir}`;
  };

  // Check if coordinates belong to any known ocean region
  const matchingRegion = OCEAN_REGIONS.find((r) => {
    const [minLon, minLat, maxLon, maxLat] = r.bbox;
    return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleInspectRegion = () => {
    if (matchingRegion) {
      setSelectedRegion(matchingRegion.id);
      oceanViewerManager.flyToRegion(matchingRegion, true);
    }
  };

  const handleInspectDepth = () => {
    openPointDepth();
  };

  const themeColor = matchingRegion?.themeColor || '#00d2ff';

  return (
    <div
      style={{
        position: 'absolute',
        top: '80px',
        right: selectedRegion ? '420px' : '28px',
        width: '300px',
        background: 'rgba(5, 15, 30, 0.92)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${themeColor}55`,
        borderRadius: '14px',
        padding: '14px 16px',
        color: '#e2f1ff',
        zIndex: 22,
        boxShadow: `0 16px 40px rgba(0, 0, 0, 0.7), 0 0 16px ${themeColor}12`,
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        animation: 'fadeInUp 0.3s ease forwards',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '22px', height: '22px', borderRadius: '6px',
              background: `${themeColor}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: themeColor,
            }}
          >
            <MapPin size={12} />
          </div>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.2px', color: themeColor, fontWeight: 700 }}>
            Location Pinned
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <button
            onClick={handleCopy}
            title="Copy coordinates"
            style={{
              background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '5px',
              width: '24px', height: '24px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: copied ? '#00f5a0' : '#fff', cursor: 'pointer',
            }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
          </button>
          <button
            onClick={() => setClickedLocation(null)}
            title="Close"
            style={{
              background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '5px',
              width: '24px', height: '24px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', cursor: 'pointer',
            }}
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Basin Name */}
      <h4 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 700, color: '#fff' }}>
        {matchingRegion ? matchingRegion.name : 'Open Indian Ocean'}
      </h4>
      <div style={{ fontSize: '11px', color: '#7aa0c4', marginBottom: '10px' }}>
        {matchingRegion ? matchingRegion.hindiName : 'हिंद महासागर जलक्षेत्र'}
      </div>

      {/* Coordinates Badge */}
      <div
        style={{
          background: 'rgba(0,20,40,0.5)', padding: '7px 10px', borderRadius: '7px',
          border: '1px solid rgba(0,200,255,0.1)', marginBottom: '10px',
          fontFamily: 'monospace', fontSize: '11px',
        }}
      >
        <div style={{ color: '#00e5ff', display: 'flex', justifyContent: 'space-between' }}>
          <span>{formatCoord(lat, true)}</span>
          <span style={{ color: '#556a80' }}>({lat.toFixed(4)}°)</span>
        </div>
        <div style={{ color: '#00e5ff', display: 'flex', justifyContent: 'space-between', marginTop: '1px' }}>
          <span>{formatCoord(lon, false)}</span>
          <span style={{ color: '#556a80' }}>({lon.toFixed(4)}°)</span>
        </div>
      </div>

      {/* ── PRIMARY CTA: Inspect 3D Depth ────────────────────────────── */}
      <button
        onClick={handleInspectDepth}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: '10px',
          border: `1px solid ${themeColor}`,
          background: `linear-gradient(135deg, ${themeColor}30, ${themeColor}10)`,
          color: '#fff', fontSize: '12px', fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          cursor: 'pointer', transition: 'all 0.25s',
          boxShadow: `0 4px 16px ${themeColor}20`,
          marginBottom: matchingRegion && selectedRegion !== matchingRegion.id ? '8px' : '0',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = `linear-gradient(135deg, ${themeColor}50, ${themeColor}25)`;
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = `0 6px 20px ${themeColor}35`;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = `linear-gradient(135deg, ${themeColor}30, ${themeColor}10)`;
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = `0 4px 16px ${themeColor}20`;
        }}
      >
        <Scan size={14} style={{ color: themeColor }} />
        Extract 3D Depth Column
      </button>

      {/* Secondary: Open predefined region slice */}
      {matchingRegion && selectedRegion !== matchingRegion.id && (
        <button
          onClick={handleInspectRegion}
          style={{
            width: '100%', padding: '7px 12px', borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)',
            color: '#a0c0e0', fontSize: '11px', fontWeight: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          <Compass size={12} />
          Open Full Region Slice ({matchingRegion.name})
        </button>
      )}
    </div>
  );
};
