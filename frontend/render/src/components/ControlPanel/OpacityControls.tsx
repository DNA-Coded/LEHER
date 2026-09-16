import React from 'react';
import { useOceanStore } from '../../store/useOceanStore';
import { Eye, Sliders, Wind, Radio, Disc } from 'lucide-react';

export const OpacityControls: React.FC = () => {
  const {
    opacity,
    setOpacity,
    verticalExaggeration,
    setVerticalExaggeration,
    showCurrentVectors,
    toggleCurrentVectors,
    showArgoMarkers,
    toggleArgoMarkers,
    showDepthIsoPlanes,
    toggleDepthIsoPlanes,
  } = useOceanStore();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#c0dbee', fontSize: '11px' }}>
      {/* Opacity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Eye size={13} style={{ color: '#00d2ff' }} />
        <span>Alpha:</span>
        <input
          type="range"
          min={0.2}
          max={1.0}
          step={0.05}
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          style={{
            width: '60px',
            height: '4px',
            accentColor: '#00d2ff',
            cursor: 'pointer',
          }}
        />
        <span style={{ fontFamily: 'monospace', width: '28px' }}>{Math.round(opacity * 100)}%</span>
      </div>

      {/* Vertical Exaggeration */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Sliders size={13} style={{ color: '#00f5a0' }} />
        <span>Depth Exagg:</span>
        <input
          type="range"
          min={40}
          max={240}
          step={10}
          value={verticalExaggeration}
          onChange={(e) => setVerticalExaggeration(Number(e.target.value))}
          style={{
            width: '60px',
            height: '4px',
            accentColor: '#00f5a0',
            cursor: 'pointer',
          }}
        />
        <span style={{ fontFamily: 'monospace', width: '32px' }}>{verticalExaggeration}x</span>
      </div>

      {/* Toggles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={toggleCurrentVectors}
          title="Toggle ocean current vectors"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: '6px',
            border: showCurrentVectors ? '1px solid #00f2fe' : '1px solid rgba(255,255,255,0.1)',
            background: showCurrentVectors ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255,255,255,0.05)',
            color: showCurrentVectors ? '#ffffff' : '#739bbd',
            cursor: 'pointer',
            fontSize: '10.5px',
          }}
        >
          <Wind size={11} />
          <span>Vectors</span>
        </button>

        <button
          onClick={toggleArgoMarkers}
          title="Toggle Argo float markers"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: '6px',
            border: showArgoMarkers ? '1px solid #ffd700' : '1px solid rgba(255,255,255,0.1)',
            background: showArgoMarkers ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255,255,255,0.05)',
            color: showArgoMarkers ? '#ffd700' : '#739bbd',
            cursor: 'pointer',
            fontSize: '10.5px',
          }}
        >
          <Radio size={11} />
          <span>Argo Floats</span>
        </button>

        <button
          onClick={toggleDepthIsoPlanes}
          title="Toggle subsurface iso-planes"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: '6px',
            border: showDepthIsoPlanes ? '1px solid #b000ff' : '1px solid rgba(255,255,255,0.1)',
            background: showDepthIsoPlanes ? 'rgba(176, 0, 255, 0.2)' : 'rgba(255,255,255,0.05)',
            color: showDepthIsoPlanes ? '#e59eff' : '#739bbd',
            cursor: 'pointer',
            fontSize: '10.5px',
          }}
        >
          <Disc size={11} />
          <span>Iso-Planes</span>
        </button>
      </div>
    </div>
  );
};
