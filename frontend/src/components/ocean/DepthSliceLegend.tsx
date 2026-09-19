import React from 'react';
import { useOceanStore } from '@/store/useOceanStore';
import { OCEAN_VARIABLES } from '@/lib/ocean/variables';
import { getCssGradient, COLOR_SCALES } from '@/lib/ocean/colorScales';
import type { ColorScaleName } from '@/types/ocean';
import { Palette } from 'lucide-react';

export const DepthSliceLegend: React.FC = () => {
  const { variable, colorScale, setColorScale, depth } = useOceanStore();
  const meta = OCEAN_VARIABLES[variable];

  if (!meta) return null;

  const gradient = getCssGradient(colorScale);
  const colorScalesList: ColorScaleName[] = ['thermal', 'haline', 'turbo', 'viridis', 'chlorophyll', 'coolwarm'];

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '100px',
        right: '28px',
        width: '320px',
        background: 'rgba(5, 15, 30, 0.84)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(0, 220, 255, 0.22)',
        borderRadius: '14px',
        padding: '16px 20px',
        color: '#e2f1ff',
        zIndex: 15,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
      }}
    >
      {/* Title & Unit */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>{meta.name}</span>
          <span style={{ fontSize: '12px', color: '#00e5ff', marginLeft: '6px' }}>({meta.unit})</span>
        </div>
        <span style={{ fontSize: '11px', color: '#90b4d4', background: 'rgba(0, 50, 100, 0.4)', padding: '2px 6px', borderRadius: '4px' }}>
          Depth: -{depth}m
        </span>
      </div>

      {/* Color Gradient Ramp */}
      <div
        style={{
          width: '100%',
          height: '14px',
          borderRadius: '7px',
          background: gradient,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4), inset 0 0 4px rgba(255, 255, 255, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          marginBottom: '6px',
        }}
      />

      {/* Tick Marks */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#b0cbe5', fontFamily: 'monospace' }}>
        <span>{meta.min} {meta.unit}</span>
        <span>{((meta.min + meta.max) / 2).toFixed(1)}</span>
        <span>{meta.max} {meta.unit}</span>
      </div>

      {/* Palette Selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#7ab2e2' }}>
          <Palette size={12} />
          <span>Shader Ramp:</span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {colorScalesList.map((scale) => (
            <button
              key={scale}
              onClick={() => setColorScale(scale)}
              title={`Use ${scale} shader colormap`}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '4px',
                background: COLOR_SCALES[scale][COLOR_SCALES[scale].length - 2].color,
                border: colorScale === scale ? '2px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.2)',
                cursor: 'pointer',
                transform: colorScale === scale ? 'scale(1.15)' : 'scale(1)',
                transition: 'transform 0.15s',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
