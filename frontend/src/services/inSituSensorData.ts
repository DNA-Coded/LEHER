/**
 * IN-SITU OCEAN OBSERVATION NETWORK (INCOIS / MoES SIH PS 26067)
 * Comprehensive dataset of physical ocean observation platforms:
 * 1. Argo Autonomous Profiling Floats (0–2000m)
 * 2. Underwater Gliders (0–1000m Sawtooth Dive-Climb Missions)
 * 3. INCOIS OMNI Moored Buoy Network (Surface Meteorology + Subsurface Thermistors)
 * 4. Biogeochemical (BGC) Sensors (Dissolved Oxygen & Nitrate OMZ profiling)
 */

export type InSituSensorType = 'argo' | 'glider' | 'mooring' | 'bgc';

export interface DepthProfilePoint {
  depth: number;       // meters (0 to 2000)
  temperature: number; // °C
  salinity: number;    // PSU
  pressure?: number;   // dbar
  dissolvedOxygen?: number; // μmol/kg (BGC)
  nitrate?: number;         // μmol/kg (BGC)
  chlorophyll?: number;     // mg/m³ (Glider)
}

export interface GliderDivePoint {
  timeStepHours: number; // Elapsed hours along mission transect (0 to 96)
  depth: number;         // Current dive depth (0 to 1000m)
  phase: 'dive' | 'climb';
  temperature: number;
  salinity: number;
  chlorophyll: number;
  distanceKm: number;
}

export interface MooringThermistorPoint {
  depth: number; // 5, 10, 20, 50, 100, 200, 500m
  temperature: number;
  salinity: number;
}

export interface InSituSensor {
  id: string;
  wmoId: string;
  name: string;
  type: InSituSensorType;
  institution: string;
  basin: string;
  lat: number;
  lon: number;
  lastPingTimestamp: string;
  batteryPercent: number;
  qcFlag: '1 - Good' | '2 - Probably Good';
  surfaceTemp: number;
  surfaceSalinity: number;
  maxDepth: number;
  description: string;
  operationalRole: string;
  profile: DepthProfilePoint[];
  driftHistory?: { lat: number; lon: number; daysAgo: number }[];
  gliderDives?: GliderDivePoint[];
  surfaceMeteorology?: {
    windSpeedKnots: number;
    windDirectionDeg: number;
    airTempC: number;
    barometricPressureHpa: number;
    waveHeightM: number;
    humidityPercent: number;
  };
  mooringChain?: MooringThermistorPoint[];
}

export const IN_SITU_SENSORS: InSituSensor[] = [
  // =========================================================================
  // 1. ARGO PROFILING FLOATS (0–2000m)
  // =========================================================================
  {
    id: 'argo-2902345',
    wmoId: 'WMO 2902345',
    name: 'Central Arabian Sea Core Float',
    type: 'argo',
    institution: 'INCOIS / Argo India (IFREMER GDAC)',
    basin: 'Arabian Sea',
    lat: 15.40,
    lon: 71.20,
    lastPingTimestamp: '2026-09-18T14:32:00Z',
    batteryPercent: 88,
    qcFlag: '1 - Good',
    surfaceTemp: 28.45,
    surfaceSalinity: 36.32,
    maxDepth: 2000,
    description: 'Autonomous profiling CTD float cycling between surface and 2,000m depth every 10 days. Deployed off the Konkan coast.',
    operationalRole: 'Validates numerical ocean model thermocline stratification and high-salinity Arabian Sea water mass formation.',
    driftHistory: [
      { lat: 15.40, lon: 71.20, daysAgo: 0 },
      { lat: 15.28, lon: 71.05, daysAgo: 10 },
      { lat: 15.12, lon: 70.82, daysAgo: 20 },
      { lat: 14.95, lon: 70.50, daysAgo: 30 },
    ],
    profile: [
      { depth: 0, temperature: 28.45, salinity: 36.32, pressure: 0 },
      { depth: 20, temperature: 28.40, salinity: 36.35, pressure: 20.4 },
      { depth: 50, temperature: 27.90, salinity: 36.42, pressure: 51.0 },
      { depth: 75, temperature: 24.80, salinity: 36.15, pressure: 76.5 },
      { depth: 100, temperature: 21.20, salinity: 35.80, pressure: 102.1 },
      { depth: 150, temperature: 17.50, salinity: 35.45, pressure: 153.2 },
      { depth: 200, temperature: 14.60, salinity: 35.25, pressure: 204.3 },
      { depth: 300, temperature: 11.80, salinity: 35.10, pressure: 306.5 },
      { depth: 500, temperature: 9.40, salinity: 35.02, pressure: 511.0 },
      { depth: 750, temperature: 7.20, salinity: 34.95, pressure: 766.8 },
      { depth: 1000, temperature: 5.60, salinity: 34.88, pressure: 1022.5 },
      { depth: 1500, temperature: 3.40, salinity: 34.80, pressure: 1534.0 },
      { depth: 2000, temperature: 2.15, salinity: 34.76, pressure: 2045.8 },
    ],
  },
  {
    id: 'argo-2902346',
    wmoId: 'WMO 2902346',
    name: 'North-Eastern Arabian Sea Float',
    type: 'argo',
    institution: 'INCOIS / MoES',
    basin: 'Arabian Sea',
    lat: 18.75,
    lon: 69.80,
    lastPingTimestamp: '2026-09-17T08:15:00Z',
    batteryPercent: 92,
    qcFlag: '1 - Good',
    surfaceTemp: 27.90,
    surfaceSalinity: 36.65,
    maxDepth: 2000,
    description: 'Profiles the evaporation-dominated northern Arabian Sea warm pool and winter convective cooling regime.',
    operationalRole: 'Monitors high-salinity water subduction and coastal circulation along the Saurashtra coast.',
    driftHistory: [
      { lat: 18.75, lon: 69.80, daysAgo: 0 },
      { lat: 18.60, lon: 69.65, daysAgo: 10 },
      { lat: 18.42, lon: 69.40, daysAgo: 20 },
    ],
    profile: [
      { depth: 0, temperature: 27.90, salinity: 36.65 },
      { depth: 30, temperature: 27.85, salinity: 36.68 },
      { depth: 60, temperature: 26.50, salinity: 36.55 },
      { depth: 100, temperature: 22.10, salinity: 36.10 },
      { depth: 200, temperature: 15.20, salinity: 35.40 },
      { depth: 500, temperature: 9.80, salinity: 35.08 },
      { depth: 1000, temperature: 5.90, salinity: 34.90 },
      { depth: 2000, temperature: 2.30, salinity: 34.78 },
    ],
  },
  {
    id: 'argo-2902347',
    wmoId: 'WMO 2902347',
    name: 'Lakshadweep Basin Profiler',
    type: 'argo',
    institution: 'INCOIS / Argo India',
    basin: 'Lakshadweep Sea',
    lat: 10.50,
    lon: 72.60,
    lastPingTimestamp: '2026-09-18T22:10:00Z',
    batteryPercent: 81,
    qcFlag: '1 - Good',
    surfaceTemp: 29.10,
    surfaceSalinity: 35.85,
    maxDepth: 2000,
    description: 'Monitors Lakshadweep High and Lakshadweep Low mesoscale anticyclonic eddy structures.',
    operationalRole: 'Essential for estimating monsoonal sea surface height anomalies and acoustic propagation ducts.',
    driftHistory: [
      { lat: 10.50, lon: 72.60, daysAgo: 0 },
      { lat: 10.65, lon: 72.40, daysAgo: 10 },
      { lat: 10.80, lon: 72.15, daysAgo: 20 },
    ],
    profile: [
      { depth: 0, temperature: 29.10, salinity: 35.85 },
      { depth: 40, temperature: 29.05, salinity: 35.88 },
      { depth: 80, temperature: 26.20, salinity: 35.70 },
      { depth: 120, temperature: 21.00, salinity: 35.40 },
      { depth: 250, temperature: 14.10, salinity: 35.15 },
      { depth: 600, temperature: 8.80, salinity: 34.98 },
      { depth: 1200, temperature: 4.80, salinity: 34.85 },
      { depth: 2000, temperature: 2.10, salinity: 34.75 },
    ],
  },
  {
    id: 'argo-2902348',
    wmoId: 'WMO 2902348',
    name: 'Northern Bay of Bengal Runoff Float',
    type: 'argo',
    institution: 'INCOIS / MoES (GDAC)',
    basin: 'Bay of Bengal',
    lat: 18.20,
    lon: 88.50,
    lastPingTimestamp: '2026-09-18T11:45:00Z',
    batteryPercent: 86,
    qcFlag: '1 - Good',
    surfaceTemp: 29.60,
    surfaceSalinity: 32.80,
    maxDepth: 2000,
    description: 'Profiles intense low-salinity freshwater lens created by Ganga-Brahmaputra river discharge.',
    operationalRole: 'Quantifies barrier layer thickness, thermal inversion, and tropical cyclone rapid intensification risks.',
    driftHistory: [
      { lat: 18.20, lon: 88.50, daysAgo: 0 },
      { lat: 18.05, lon: 88.75, daysAgo: 10 },
      { lat: 17.85, lon: 89.05, daysAgo: 20 },
    ],
    profile: [
      { depth: 0, temperature: 29.60, salinity: 32.80 },
      { depth: 15, temperature: 29.55, salinity: 32.95 },
      { depth: 30, temperature: 29.80, salinity: 34.20 }, // Thermal inversion under fresh barrier layer!
      { depth: 60, temperature: 27.10, salinity: 34.85 },
      { depth: 100, temperature: 22.40, salinity: 35.05 },
      { depth: 200, temperature: 15.60, salinity: 35.12 },
      { depth: 500, temperature: 9.90, salinity: 35.04 },
      { depth: 1000, temperature: 6.10, salinity: 34.92 },
      { depth: 2000, temperature: 2.25, salinity: 34.77 },
    ],
  },
  {
    id: 'argo-2902349',
    wmoId: 'WMO 2902349',
    name: 'Central Bay of Bengal Cyclone Array Float',
    type: 'argo',
    institution: 'INCOIS / MoES',
    basin: 'Bay of Bengal',
    lat: 14.00,
    lon: 86.50,
    lastPingTimestamp: '2026-09-19T01:20:00Z',
    batteryPercent: 94,
    qcFlag: '1 - Good',
    surfaceTemp: 29.20,
    surfaceSalinity: 34.10,
    maxDepth: 2000,
    description: 'Positioned in the prime post-monsoon cyclone generation corridor of the central Bay of Bengal.',
    operationalRole: 'Provides continuous monitoring of the Tropical Cyclone Heat Potential (TCHP) and 26°C isotherm depth.',
    driftHistory: [
      { lat: 14.00, lon: 86.50, daysAgo: 0 },
      { lat: 13.88, lon: 86.35, daysAgo: 10 },
      { lat: 13.72, lon: 86.10, daysAgo: 20 },
    ],
    profile: [
      { depth: 0, temperature: 29.20, salinity: 34.10 },
      { depth: 25, temperature: 29.15, salinity: 34.25 },
      { depth: 50, temperature: 28.50, salinity: 34.60 },
      { depth: 80, temperature: 25.40, salinity: 34.90 },
      { depth: 120, temperature: 20.80, salinity: 35.05 },
      { depth: 250, temperature: 13.90, salinity: 35.10 },
      { depth: 600, temperature: 8.60, salinity: 34.98 },
      { depth: 1200, temperature: 4.70, salinity: 34.86 },
      { depth: 2000, temperature: 2.15, salinity: 34.76 },
    ],
  },
  {
    id: 'argo-2902350',
    wmoId: 'WMO 2902350',
    name: 'South Sri Lanka Shipping Lane Float',
    type: 'argo',
    institution: 'INCOIS / MoES',
    basin: 'South Sri Lanka Basin',
    lat: 5.50,
    lon: 80.50,
    lastPingTimestamp: '2026-09-18T18:05:00Z',
    batteryPercent: 79,
    qcFlag: '1 - Good',
    surfaceTemp: 28.95,
    surfaceSalinity: 35.40,
    maxDepth: 2000,
    description: 'Monitors the major east-west global container shipping traffic corridor south of Dondra Head.',
    operationalRole: 'Directly informs vessel leeway drift, Plimsoll buoyancy marks, and seasonal Southwest Monsoon Current transit.',
    profile: [
      { depth: 0, temperature: 28.95, salinity: 35.40 },
      { depth: 30, temperature: 28.85, salinity: 35.45 },
      { depth: 70, temperature: 26.80, salinity: 35.50 },
      { depth: 110, temperature: 22.50, salinity: 35.35 },
      { depth: 200, temperature: 15.20, salinity: 35.18 },
      { depth: 500, temperature: 9.30, salinity: 35.00 },
      { depth: 1000, temperature: 5.40, salinity: 34.88 },
      { depth: 2000, temperature: 2.10, salinity: 34.76 },
    ],
  },
  {
    id: 'argo-2902351',
    wmoId: 'WMO 2902351',
    name: 'Andaman Sea Back-Arc Float',
    type: 'argo',
    institution: 'INCOIS / MoES',
    basin: 'Andaman Sea',
    lat: 11.70,
    lon: 93.00,
    lastPingTimestamp: '2026-09-17T16:40:00Z',
    batteryPercent: 84,
    qcFlag: '1 - Good',
    surfaceTemp: 29.40,
    surfaceSalinity: 33.50,
    maxDepth: 2000,
    description: 'Profiles the semi-enclosed Andaman Sea basin west of the Tenasserim coast.',
    operationalRole: 'Captures internal solitary waves, Malacca Strait exchange, and warm water accumulation.',
    profile: [
      { depth: 0, temperature: 29.40, salinity: 33.50 },
      { depth: 30, temperature: 29.30, salinity: 33.70 },
      { depth: 60, temperature: 27.50, salinity: 34.40 },
      { depth: 100, temperature: 22.00, salinity: 34.85 },
      { depth: 200, temperature: 14.80, salinity: 35.05 },
      { depth: 500, temperature: 9.10, salinity: 34.98 },
      { depth: 1000, temperature: 5.20, salinity: 34.86 },
      { depth: 2000, temperature: 2.18, salinity: 34.76 },
    ],
  },
  {
    id: 'argo-2902352',
    wmoId: 'WMO 2902352',
    name: 'Gulf of Mannar Coral Reef Profiler',
    type: 'argo',
    institution: 'INCOIS / MoES',
    basin: 'Gulf of Mannar',
    lat: 8.80,
    lon: 79.00,
    lastPingTimestamp: '2026-09-18T06:12:00Z',
    batteryPercent: 91,
    qcFlag: '1 - Good',
    surfaceTemp: 29.15,
    surfaceSalinity: 35.60,
    maxDepth: 1500,
    description: 'Monitors the shallow biodiversity-rich strait between southern India and Sri Lanka.',
    operationalRole: 'Tracks coral bleaching thermal stress indices and local fishery upwelling cycles.',
    profile: [
      { depth: 0, temperature: 29.15, salinity: 35.60 },
      { depth: 20, temperature: 29.10, salinity: 35.62 },
      { depth: 50, temperature: 27.80, salinity: 35.58 },
      { depth: 100, temperature: 23.10, salinity: 35.40 },
      { depth: 200, temperature: 16.00, salinity: 35.20 },
      { depth: 500, temperature: 9.80, salinity: 35.02 },
      { depth: 1000, temperature: 5.70, salinity: 34.89 },
      { depth: 1500, temperature: 3.50, salinity: 34.80 },
    ],
  },

  // =========================================================================
  // 2. UNDERWATER GLIDERS (0–1000m Sawtooth Dive-Climb Missions)
  // =========================================================================
  {
    id: 'glider-bob-01',
    wmoId: 'GLIDER INCOIS-BOB-01',
    name: 'Bay of Bengal Deep Transect Glider',
    type: 'glider',
    institution: 'INCOIS Ocean Technology (IFREMER Glider V2)',
    basin: 'Bay of Bengal',
    lat: 16.50,
    lon: 86.80,
    lastPingTimestamp: '2026-09-19T04:10:00Z',
    batteryPercent: 74,
    qcFlag: '1 - Good',
    surfaceTemp: 29.35,
    surfaceSalinity: 33.40,
    maxDepth: 1000,
    description: 'Autonomous buoyancy-driven underwater glider executing continuous sawtooth dive-climb cycles between surface and 1,000m across the Bay of Bengal.',
    operationalRole: 'High-resolution vertical cross-sections of the pycnocline barrier layer and chlorophyll subsurface maximum.',
    profile: [
      { depth: 0, temperature: 29.35, salinity: 33.40, chlorophyll: 0.58 },
      { depth: 25, temperature: 29.30, salinity: 33.65, chlorophyll: 0.84 }, // Subsurface chlorophyll maximum!
      { depth: 50, temperature: 28.10, salinity: 34.50, chlorophyll: 0.95 },
      { depth: 80, temperature: 24.50, salinity: 34.90, chlorophyll: 0.32 },
      { depth: 120, temperature: 19.80, salinity: 35.08, chlorophyll: 0.08 },
      { depth: 250, temperature: 13.50, salinity: 35.12, chlorophyll: 0.01 },
      { depth: 500, temperature: 8.90, salinity: 35.01, chlorophyll: 0.00 },
      { depth: 1000, temperature: 5.40, salinity: 34.88, chlorophyll: 0.00 },
    ],
    gliderDives: [
      { timeStepHours: 0, depth: 0, phase: 'dive', temperature: 29.35, salinity: 33.40, chlorophyll: 0.58, distanceKm: 0 },
      { timeStepHours: 3, depth: 350, phase: 'dive', temperature: 11.80, salinity: 35.10, chlorophyll: 0.01, distanceKm: 4 },
      { timeStepHours: 6, depth: 750, phase: 'dive', temperature: 7.20, salinity: 34.95, chlorophyll: 0.00, distanceKm: 8 },
      { timeStepHours: 8, depth: 1000, phase: 'dive', temperature: 5.40, salinity: 34.88, chlorophyll: 0.00, distanceKm: 12 },
      { timeStepHours: 11, depth: 650, phase: 'climb', temperature: 8.10, salinity: 34.99, chlorophyll: 0.00, distanceKm: 16 },
      { timeStepHours: 14, depth: 250, phase: 'climb', temperature: 14.20, salinity: 35.15, chlorophyll: 0.02, distanceKm: 20 },
      { timeStepHours: 16, depth: 0, phase: 'climb', temperature: 29.40, salinity: 33.45, chlorophyll: 0.62, distanceKm: 24 },
      { timeStepHours: 19, depth: 400, phase: 'dive', temperature: 10.90, salinity: 35.08, chlorophyll: 0.01, distanceKm: 28 },
      { timeStepHours: 24, depth: 1000, phase: 'dive', temperature: 5.38, salinity: 34.87, chlorophyll: 0.00, distanceKm: 36 },
      { timeStepHours: 32, depth: 0, phase: 'climb', temperature: 29.30, salinity: 33.52, chlorophyll: 0.55, distanceKm: 48 },
    ],
  },
  {
    id: 'glider-as-02',
    wmoId: 'GLIDER INCOIS-AS-02',
    name: 'Somali Upwelling Coastal Glider',
    type: 'glider',
    institution: 'INCOIS / MoES',
    basin: 'Arabian Sea',
    lat: 13.80,
    lon: 72.80,
    lastPingTimestamp: '2026-09-19T02:40:00Z',
    batteryPercent: 68,
    qcFlag: '1 - Good',
    surfaceTemp: 27.60,
    surfaceSalinity: 36.45,
    maxDepth: 1000,
    description: 'Deployed along the west coast shelf break to resolve coastal upwelling fronts and the West India Coastal Current.',
    operationalRole: 'High-frequency hydrographic tracking of the oxycline shoaling and pelagic fish school habitats.',
    profile: [
      { depth: 0, temperature: 27.60, salinity: 36.45, chlorophyll: 1.45 },
      { depth: 20, temperature: 26.80, salinity: 36.48, chlorophyll: 2.10 },
      { depth: 50, temperature: 23.50, salinity: 36.25, chlorophyll: 1.20 },
      { depth: 100, temperature: 18.20, salinity: 35.70, chlorophyll: 0.15 },
      { depth: 250, temperature: 13.00, salinity: 35.22, chlorophyll: 0.02 },
      { depth: 500, temperature: 8.80, salinity: 35.05, chlorophyll: 0.00 },
      { depth: 1000, temperature: 5.50, salinity: 34.89, chlorophyll: 0.00 },
    ],
    gliderDives: [
      { timeStepHours: 0, depth: 0, phase: 'dive', temperature: 27.60, salinity: 36.45, chlorophyll: 1.45, distanceKm: 0 },
      { timeStepHours: 4, depth: 500, phase: 'dive', temperature: 8.80, salinity: 35.05, chlorophyll: 0.00, distanceKm: 6 },
      { timeStepHours: 8, depth: 1000, phase: 'dive', temperature: 5.50, salinity: 34.89, chlorophyll: 0.00, distanceKm: 12 },
      { timeStepHours: 12, depth: 450, phase: 'climb', temperature: 9.60, salinity: 35.10, chlorophyll: 0.00, distanceKm: 18 },
      { timeStepHours: 16, depth: 0, phase: 'climb', temperature: 27.75, salinity: 36.40, chlorophyll: 1.60, distanceKm: 24 },
    ],
  },

  // =========================================================================
  // 3. INCOIS OMNI MOORED BUOY NETWORK (Surface Met + Subsurface Thermistors)
  // =========================================================================
  {
    id: 'omni-ad01',
    wmoId: 'OMNI AD01 (WMO 23001)',
    name: 'Arabian Sea Central Deep Moored Buoy',
    type: 'mooring',
    institution: 'INCOIS National Moored Buoy Programme (NIOT/MoES)',
    basin: 'Arabian Sea',
    lat: 15.00,
    lon: 69.00,
    lastPingTimestamp: '2026-09-19T03:00:00Z',
    batteryPercent: 98,
    qcFlag: '1 - Good',
    surfaceTemp: 28.60,
    surfaceSalinity: 36.40,
    maxDepth: 500,
    description: 'Deep-ocean taut-wire moored buoy measuring real-time surface meteorology and subsurface temperature/salinity down to 500m depth.',
    operationalRole: 'Vital benchmark anchor for INCOIS weather advisories, maritime search-and-rescue, and naval sea keeping.',
    surfaceMeteorology: {
      windSpeedKnots: 16.4,
      windDirectionDeg: 245,
      airTempC: 28.2,
      barometricPressureHpa: 1011.4,
      waveHeightM: 2.1,
      humidityPercent: 79,
    },
    mooringChain: [
      { depth: 5, temperature: 28.60, salinity: 36.40 },
      { depth: 10, temperature: 28.58, salinity: 36.41 },
      { depth: 20, temperature: 28.55, salinity: 36.42 },
      { depth: 50, temperature: 28.10, salinity: 36.45 },
      { depth: 75, temperature: 25.20, salinity: 36.20 },
      { depth: 100, temperature: 21.80, salinity: 35.85 },
      { depth: 200, temperature: 15.10, salinity: 35.30 },
      { depth: 500, temperature: 9.60, salinity: 35.05 },
    ],
    profile: [
      { depth: 0, temperature: 28.60, salinity: 36.40 },
      { depth: 10, temperature: 28.58, salinity: 36.41 },
      { depth: 20, temperature: 28.55, salinity: 36.42 },
      { depth: 50, temperature: 28.10, salinity: 36.45 },
      { depth: 100, temperature: 21.80, salinity: 35.85 },
      { depth: 200, temperature: 15.10, salinity: 35.30 },
      { depth: 500, temperature: 9.60, salinity: 35.05 },
    ],
  },
  {
    id: 'omni-bd08',
    wmoId: 'OMNI BD08 (WMO 23008)',
    name: 'Bay of Bengal Deep Moored Buoy',
    type: 'mooring',
    institution: 'INCOIS National Moored Buoy Programme (NIOT/MoES)',
    basin: 'Bay of Bengal',
    lat: 18.00,
    lon: 89.50,
    lastPingTimestamp: '2026-09-19T03:00:00Z',
    batteryPercent: 96,
    qcFlag: '1 - Good',
    surfaceTemp: 29.80,
    surfaceSalinity: 32.60,
    maxDepth: 500,
    description: 'Permanently moored in northern Bay of Bengal cyclone path. Monitors intense river dilution and monsoonal pressure drops.',
    operationalRole: 'Primary early warning sentinel for tropical cyclone genesis, barometric pressure falls, and storm surge predictions.',
    surfaceMeteorology: {
      windSpeedKnots: 13.8,
      windDirectionDeg: 195,
      airTempC: 29.5,
      barometricPressureHpa: 1008.2,
      waveHeightM: 1.8,
      humidityPercent: 86,
    },
    mooringChain: [
      { depth: 5, temperature: 29.80, salinity: 32.60 },
      { depth: 10, temperature: 29.75, salinity: 32.75 },
      { depth: 20, temperature: 29.60, salinity: 33.40 },
      { depth: 50, temperature: 28.20, salinity: 34.60 },
      { depth: 100, temperature: 23.00, salinity: 35.00 },
      { depth: 200, temperature: 16.20, salinity: 35.12 },
      { depth: 500, temperature: 10.10, salinity: 35.03 },
    ],
    profile: [
      { depth: 0, temperature: 29.80, salinity: 32.60 },
      { depth: 10, temperature: 29.75, salinity: 32.75 },
      { depth: 20, temperature: 29.60, salinity: 33.40 },
      { depth: 50, temperature: 28.20, salinity: 34.60 },
      { depth: 100, temperature: 23.00, salinity: 35.00 },
      { depth: 200, temperature: 16.20, salinity: 35.12 },
      { depth: 500, temperature: 10.10, salinity: 35.03 },
    ],
  },
  {
    id: 'omni-ad02',
    wmoId: 'OMNI AD02 (WMO 23002)',
    name: 'Arabian Sea Northern Moored Buoy',
    type: 'mooring',
    institution: 'INCOIS National Moored Buoy Programme',
    basin: 'Arabian Sea',
    lat: 20.80,
    lon: 67.50,
    lastPingTimestamp: '2026-09-19T02:00:00Z',
    batteryPercent: 93,
    qcFlag: '1 - Good',
    surfaceTemp: 27.80,
    surfaceSalinity: 36.70,
    maxDepth: 500,
    description: 'Northernmost Arabian Sea moored platform. Detects Shamal dust storms, dry winter winds, and high evaporation rates.',
    operationalRole: 'Monitors Gujarat coast maritime conditions, petroleum offshore platform weather, and maritime navigation safety.',
    surfaceMeteorology: {
      windSpeedKnots: 18.2,
      windDirectionDeg: 310,
      airTempC: 27.4,
      barometricPressureHpa: 1013.1,
      waveHeightM: 2.4,
      humidityPercent: 71,
    },
    profile: [
      { depth: 0, temperature: 27.80, salinity: 36.70 },
      { depth: 20, temperature: 27.75, salinity: 36.72 },
      { depth: 50, temperature: 27.20, salinity: 36.65 },
      { depth: 100, temperature: 22.80, salinity: 36.20 },
      { depth: 200, temperature: 15.90, salinity: 35.45 },
      { depth: 500, temperature: 10.20, salinity: 35.10 },
    ],
  },
  {
    id: 'omni-bd11',
    wmoId: 'OMNI BD11 (WMO 23011)',
    name: 'Andaman Basin Moored Buoy',
    type: 'mooring',
    institution: 'INCOIS National Moored Buoy Programme',
    basin: 'Andaman Sea',
    lat: 13.50,
    lon: 93.00,
    lastPingTimestamp: '2026-09-19T02:30:00Z',
    batteryPercent: 95,
    qcFlag: '1 - Good',
    surfaceTemp: 29.30,
    surfaceSalinity: 33.60,
    maxDepth: 500,
    description: 'Taut-wire moored sentinel guarding the entrance to the Malacca Strait in the central Andaman Basin.',
    operationalRole: 'Tsunami early warning surface detection and internal wave ocean acoustic transmission testing.',
    surfaceMeteorology: {
      windSpeedKnots: 11.2,
      windDirectionDeg: 160,
      airTempC: 29.1,
      barometricPressureHpa: 1009.8,
      waveHeightM: 1.4,
      humidityPercent: 82,
    },
    profile: [
      { depth: 0, temperature: 29.30, salinity: 33.60 },
      { depth: 20, temperature: 29.25, salinity: 33.65 },
      { depth: 50, temperature: 28.10, salinity: 34.30 },
      { depth: 100, temperature: 22.20, salinity: 34.90 },
      { depth: 200, temperature: 15.40, salinity: 35.08 },
      { depth: 500, temperature: 9.40, salinity: 35.00 },
    ],
  },

  // =========================================================================
  // 4. BIOGEOCHEMICAL (BGC) MULTI-SENSOR PROFILING FLOATS
  // =========================================================================
  {
    id: 'bgc-2902380',
    wmoId: 'BGC WMO 2902380',
    name: 'Arabian Sea Oxygen Minimum Zone (OMZ) Profiler',
    type: 'bgc',
    institution: 'INCOIS / BGC-Argo Global Network',
    basin: 'Arabian Sea',
    lat: 17.20,
    lon: 68.40,
    lastPingTimestamp: '2026-09-18T20:15:00Z',
    batteryPercent: 87,
    qcFlag: '1 - Good',
    surfaceTemp: 28.30,
    surfaceSalinity: 36.50,
    maxDepth: 2000,
    description: 'Equipped with optode dissolved oxygen (DO) and optical nitrate (NO₃) sensors to document the world-famous Arabian Sea Oxygen Minimum Zone.',
    operationalRole: 'Tracks sub-oxic dead zones (DO < 5 μmol/kg) between 150m–1000m depth, warning pelagic fisheries and marine conservation bodies.',
    profile: [
      { depth: 0, temperature: 28.30, salinity: 36.50, dissolvedOxygen: 215.0, nitrate: 0.2 },
      { depth: 30, temperature: 28.20, salinity: 36.52, dissolvedOxygen: 210.0, nitrate: 0.8 },
      { depth: 60, temperature: 26.10, salinity: 36.40, dissolvedOxygen: 145.0, nitrate: 4.5 },
      { depth: 100, temperature: 21.50, salinity: 35.95, dissolvedOxygen: 48.0, nitrate: 16.2 },
      { depth: 150, temperature: 17.20, salinity: 35.50, dissolvedOxygen: 4.2, nitrate: 29.5 }, // SEVERE SUBOXIA!
      { depth: 250, temperature: 13.80, salinity: 35.30, dissolvedOxygen: 2.8, nitrate: 34.1 }, // OMZ CORE
      { depth: 500, temperature: 9.60, salinity: 35.10, dissolvedOxygen: 3.5, nitrate: 38.0 },
      { depth: 1000, temperature: 5.80, salinity: 34.92, dissolvedOxygen: 22.0, nitrate: 32.5 },
      { depth: 2000, temperature: 2.20, salinity: 34.78, dissolvedOxygen: 85.0, nitrate: 26.0 },
    ],
  },
  {
    id: 'bgc-2902381',
    wmoId: 'BGC WMO 2902381',
    name: 'Bay of Bengal Phytoplankton & Oxygen Sentinel',
    type: 'bgc',
    institution: 'INCOIS / BGC-Argo Global Network',
    basin: 'Bay of Bengal',
    lat: 12.80,
    lon: 87.20,
    lastPingTimestamp: '2026-09-19T00:50:00Z',
    batteryPercent: 89,
    qcFlag: '1 - Good',
    surfaceTemp: 29.10,
    surfaceSalinity: 34.20,
    maxDepth: 2000,
    description: 'BGC float monitoring persistent sub-surface hypoxia, nitrate upwelling, and biological carbon export in the southern central Bay.',
    operationalRole: 'Resolves intermediate water mass denitrification and marine biological productivity cycles.',
    profile: [
      { depth: 0, temperature: 29.10, salinity: 34.20, dissolvedOxygen: 208.0, nitrate: 0.1 },
      { depth: 30, temperature: 29.05, salinity: 34.35, dissolvedOxygen: 205.0, nitrate: 0.5 },
      { depth: 60, temperature: 27.20, salinity: 34.80, dissolvedOxygen: 130.0, nitrate: 5.2 },
      { depth: 100, temperature: 22.00, salinity: 35.05, dissolvedOxygen: 35.0, nitrate: 18.0 },
      { depth: 200, temperature: 15.00, salinity: 35.12, dissolvedOxygen: 6.5, nitrate: 31.0 },
      { depth: 500, temperature: 9.10, salinity: 35.00, dissolvedOxygen: 14.0, nitrate: 36.2 },
      { depth: 1000, temperature: 5.50, salinity: 34.88, dissolvedOxygen: 38.0, nitrate: 31.5 },
      { depth: 2000, temperature: 2.15, salinity: 34.76, dissolvedOxygen: 92.0, nitrate: 24.8 },
    ],
  },
];

/**
 * Filter sensors by category
 */
export function getSensorsByType(type: InSituSensorType | 'all'): InSituSensor[] {
  if (type === 'all') return IN_SITU_SENSORS;
  return IN_SITU_SENSORS.filter((s) => s.type === type);
}

/**
 * Find sensor by ID or WMO ID
 */
export function getSensorById(id: string): InSituSensor | undefined {
  return IN_SITU_SENSORS.find((s) => s.id === id || s.wmoId.toLowerCase().includes(id.toLowerCase()));
}
