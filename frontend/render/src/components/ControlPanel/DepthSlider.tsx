import React from 'react';
import { useOceanStore } from '../../store/useOceanStore';
import { getRegionById } from '../../utils/regions';
import { ArrowDown } from 'lucide-react';

export const DepthSlider: React.FC = () => {
  const { depth, setDepth, selectedRegion } = useOceanStore();
  const region = selectedRegion ? getRegionById(selectedRegion) : null;

  // Native ocean model depth levels
  const nativeLevels = region?.nativeDepthLevels || [0, 20, 50, 100, 200, 500, 1000, 1500, 2000, 3000, 4000];
  const maxDepth = region?.maxSupportedDepth || 4000;

  // Determine oceanographic zone name based on active depth
  const getZoneName = (d: number) => {
    if (d === 0) return 'Surface Water';
    if (d <= 200) return 'Epipelagic (Sunlit / Photic)';
    if (d <= 1000) return 'Mesopelagic (Twilight / Thermocline)';
    if (d <= 4000) return 'Bathypelagic (Midnight Abyss)';
    return 'Abyssal Zone';
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = Number(e.target.value);
    // Snap to nearest native ocean level
    let closest = nativeLevels[0];
    let minDiff = Math.abs(rawVal - closest);
    for (const level of nativeLevels) {
      const diff = Math.abs(rawVal - level);
      if (diff < minDiff) {
        minDiff = diff;
        closest = level;
      }
    }
    setDepth(closest);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '220px' }}>
      {/* Top Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: '#88b8de' }}>
          <ArrowDown size={13} style={{ color: '#00e5ff' }} />
          <span>Depth:</span>
          <span style={{ color: '#ffffff', fontWeight: 700, fontFamily: 'monospace', fontSize: '12.5px' }}>
            {depth === 0 ? '0 m (Surface)' : `-${depth} m`}
          </span>
        </div>
        <span style={{ fontSize: '10.5px', color: '#6694bc', fontStyle: 'italic' }}>
          {getZoneName(depth)}
        </span>
      </div>

      {/* Slider Bar */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="range"
          min={0}
          max={maxDepth}
          step={10}
          value={depth}
          onChange={handleSliderChange}
          style={{
            width: '100%',
            height: '6px',
            borderRadius: '3px',
            outline: 'none',
            background: 'linear-gradient(to right, #00d2ff, #0055ff, #0a1128)',
            cursor: 'pointer',
            accentColor: '#00f5a0',
          }}
        />
      </div>

      {/* Preset Snapping Ticks */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 2px' }}>
        {[0, 100, 500, 1000, 2000].map((lvl) => (
          <button
            key={lvl}
            onClick={() => setDepth(lvl)}
            style={{
              background: 'none',
              border: 'none',
              color: depth === lvl ? '#00f5a0' : '#5c86aa',
              fontSize: '9.5px',
              fontFamily: 'monospace',
              cursor: 'pointer',
              padding: '0 2px',
              fontWeight: depth === lvl ? 700 : 400,
            }}
          >
            {lvl === 0 ? '0m' : `${lvl}m`}
          </button>
        ))}
      </div>
    </div>
  );
};
