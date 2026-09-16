import React, { useEffect } from 'react';
import { useOceanStore } from '@/store/useOceanStore';
import { Play, Pause, Calendar } from 'lucide-react';

export const TIME_STEPS = [
  { time: '2026-03-15T00:00:00Z', label: '15 Mar', phase: 'Pre-Monsoon Warming' },
  { time: '2026-05-15T00:00:00Z', label: '15 May', phase: 'Onset & Somali Jet Setup' },
  { time: '2026-06-15T00:00:00Z', label: '15 Jun', phase: 'Peak SW Monsoon' },
  { time: '2026-08-15T00:00:00Z', label: '15 Aug', phase: 'Mid-Monsoon Upwelling' },
  { time: '2026-10-15T00:00:00Z', label: '15 Oct', phase: 'Post-Monsoon Transition' },
  { time: '2026-12-15T00:00:00Z', label: '15 Dec', phase: 'Winter NE Monsoon' },
];

export const TimeSlider: React.FC = () => {
  const { time, setTime, isPlayingTime, setIsPlayingTime } = useOceanStore();

  const currentIndex = TIME_STEPS.findIndex((s) => s.time === time);
  const activeStep = TIME_STEPS[currentIndex !== -1 ? currentIndex : 2];

  // Playback timer effect
  useEffect(() => {
    if (!isPlayingTime) return;

    const interval = setInterval(() => {
      const nextIdx = (currentIndex + 1) % TIME_STEPS.length;
      setTime(TIME_STEPS[nextIdx].time);
    }, 2400);

    return () => clearInterval(interval);
  }, [currentIndex, isPlayingTime, setTime]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '260px' }}>
      {/* Play/Pause button */}
      <button
        onClick={() => setIsPlayingTime(!isPlayingTime)}
        title={isPlayingTime ? 'Pause Time Animation' : 'Play Monsoon Seasonal Cycle'}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isPlayingTime ? 'rgba(0, 245, 160, 0.25)' : 'rgba(255, 255, 255, 0.08)',
          border: isPlayingTime ? '1px solid #00f5a0' : '1px solid rgba(255, 255, 255, 0.15)',
          color: isPlayingTime ? '#00f5a0' : '#ffffff',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {isPlayingTime ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: '2px' }} />}
      </button>

      {/* Scrub bar & Labels */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#7bb0dc' }}>
            <Calendar size={12} />
            <span style={{ color: '#ffffff', fontWeight: 600 }}>{activeStep.label} 2026</span>
          </div>
          <span style={{ fontSize: '10px', color: '#00e5ff', background: 'rgba(0, 100, 200, 0.25)', padding: '1px 6px', borderRadius: '4px' }}>
            {activeStep.phase}
          </span>
        </div>

        {/* Steps timeline dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {TIME_STEPS.map((step, idx) => {
            const isSelected = step.time === time;
            return (
              <button
                key={step.time}
                onClick={() => setTime(step.time)}
                title={`${step.label}: ${step.phase}`}
                style={{
                  flex: 1,
                  height: '6px',
                  borderRadius: '3px',
                  border: 'none',
                  background: isSelected
                    ? '#00f5a0'
                    : idx <= currentIndex
                    ? 'rgba(0, 200, 255, 0.5)'
                    : 'rgba(255, 255, 255, 0.15)',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  boxShadow: isSelected ? '0 0 8px #00f5a0' : 'none',
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
