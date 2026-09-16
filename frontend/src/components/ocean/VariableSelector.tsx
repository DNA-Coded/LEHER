import React from 'react';
import { useOceanStore } from '@/store/useOceanStore';
import { OCEAN_VARIABLES } from '@/lib/ocean/variables';
import type { OceanVariable } from '@/types/ocean';
import { Thermometer, Waves, Wind, Sprout } from 'lucide-react';

export const VariableSelector: React.FC = () => {
  const { variable, setVariable } = useOceanStore();

  const varList: { id: OceanVariable; icon: React.ReactNode }[] = [
    { id: 'temperature', icon: <Thermometer size={15} /> },
    { id: 'salinity', icon: <Waves size={15} /> },
    { id: 'currents', icon: <Wind size={15} /> },
    { id: 'chlorophyll', icon: <Sprout size={15} /> },
  ];

  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      {varList.map(({ id, icon }) => {
        const meta = OCEAN_VARIABLES[id];
        const isActive = variable === id;
        return (
          <button
            key={id}
            onClick={() => setVariable(id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '8px',
              border: isActive
                ? '1px solid #00f2fe'
                : '1px solid rgba(255, 255, 255, 0.1)',
              background: isActive
                ? 'linear-gradient(135deg, rgba(0, 198, 255, 0.3), rgba(0, 114, 255, 0.3))'
                : 'rgba(255, 255, 255, 0.04)',
              color: isActive ? '#ffffff' : '#a0c4e2',
              fontSize: '12px',
              fontWeight: isActive ? 600 : 500,
              cursor: 'pointer',
              boxShadow: isActive ? '0 0 14px rgba(0, 200, 255, 0.35)' : 'none',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <span style={{ color: isActive ? '#00f2fe' : '#7ba8cf' }}>{icon}</span>
            <span>{meta.name.split(' ')[0]}</span>
          </button>
        );
      })}
    </div>
  );
};
