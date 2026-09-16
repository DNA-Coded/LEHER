import type { OceanVariable, VariableMetadata } from '@/types/ocean';

export const OCEAN_VARIABLES: Record<OceanVariable, VariableMetadata> = {
  temperature: {
    id: 'temperature',
    name: 'Potential Temperature',
    unit: '°C',
    min: 4.0,   // Deep sea minimum
    max: 32.0,  // Bay of Bengal / Arabian Sea warm pool maximum
    step: 0.1,
    defaultColormap: 'thermal',
    description: 'Sea water potential temperature (°C). Key indicator of ocean heat content, stratification, and monsoon heat budget.',
  },
  salinity: {
    id: 'salinity',
    name: 'Practical Salinity',
    unit: 'PSU',
    min: 28.0,  // Freshwater river influx in northern Bay of Bengal
    max: 37.5,  // Evaporation-dominated northern Arabian Sea
    step: 0.1,
    defaultColormap: 'haline',
    description: 'Practical Salinity Units (PSU). Arabian Sea exhibits high salinity due to high evaporation, whereas Bay of Bengal has low salinity from river discharge.',
  },
  chlorophyll: {
    id: 'chlorophyll',
    name: 'Chlorophyll-a',
    unit: 'mg/m³',
    min: 0.02,
    max: 8.0,
    step: 0.05,
    defaultColormap: 'chlorophyll',
    description: 'Photosynthetic phytoplankton concentration (mg/m³). Traces coastal upwelling along Kerala/Somali coasts and fishery productivity.',
  },
  currents: {
    id: 'currents',
    name: 'Ocean Surface & Subsurface Currents',
    unit: 'm/s',
    min: 0.0,
    max: 1.8,
    step: 0.05,
    defaultColormap: 'turbo',
    description: 'Geostrophic and wind-driven water velocity vectors. Exhibits unique seasonal reversals governed by the Indian Ocean Dipole and Asian Monsoons.',
  },
};
