/**
 * Operational Types and Demonstration Data for Leher Platform
 * All demonstration metrics are explicitly labeled for UI/UX preview purposes.
 */

export type RiskLevel = 'SAFE' | 'CAUTION' | 'DANGER';

export interface LocationAssessmentData {
  lat: number;
  lon: number;
  regionName: string;
  sst: {
    label: string;
    value: number;
    unit: string;
  };
  currentSpeed: {
    label: string;
    value: number;
    knots: number;
    unit: string;
    directionCompass: string;
    directionDeg: number;
  };
  salinity: {
    label: string;
    value: number;
    unit: string;
  };
  riskStatus: RiskLevel;
  riskRationale: string;
  hazard: {
    hasHazard: boolean;
    type?: 'CYCLONE / STORM' | 'STORM SURGE' | 'OCEAN CONDITIONS';
    severity?: 'MODERATE' | 'SEVERE' | 'EXTREME';
    status?: 'ACTIVE ADVISORY' | 'WARNING IN EFFECT' | 'DEVELOPING';
    probability?: number;
    details?: string;
  };
}

export interface ProfilePoint {
  depth: number;
  temperature: number;
  salinity: number;
}

export interface ArgoObservation {
  id: string;
  lat: number;
  lon: number;
  basin: string;
  timestamp: string;
  depth: number;
  temperature: number;
  salinity: number;
  cycleNumber: number;
  platformType: string;
  profile: ProfilePoint[];
}

export interface GliderTrackPoint {
  lat: number;
  lon: number;
  timestamp: string;
  depth: number;
}

export interface GliderObservation {
  id: string;
  lat: number;
  lon: number;
  basin: string;
  timestamp: string;
  depth: number;
  temperature: number;
  salinity: number;
  batteryPercent: number;
  missionName: string;
  currentBearing: number;
  track: GliderTrackPoint[];
  profile: ProfilePoint[];
}

export interface ModelObservationComparison {
  location: {
    lat: number;
    lon: number;
    name: string;
  };
  depth: number;
  timestamp: string;
  isDemonstration: boolean;
  metrics: {
    temperature: {
      model: number;
      observation: number;
      unit: string;
      diff: number;
      status: 'CONCORDANT' | 'VARIANCE';
    };
    salinity: {
      model: number;
      observation: number;
      unit: string;
      diff: number;
      status: 'CONCORDANT' | 'VARIANCE';
    };
    currentSpeed: {
      model: number;
      observation: number;
      unit: string;
      diff: number;
      status: 'CONCORDANT' | 'VARIANCE';
    };
  };
}

export interface RouteSection {
  id: string;
  name: string;
  distanceRange: string;
  risk: RiskLevel;
  description: string;
}

export interface RoutePlan {
  id: string;
  start: { name: string; lat: number; lon: number };
  destination: { name: string; lat: number; lon: number };
  distanceNm: number;
  estimatedHours: number;
  speedKnots: number;
  overallRisk: RiskLevel;
  warningMessage?: string;
  sections: RouteSection[];
  waypoints: Array<{ name: string; lat: number; lon: number }>;
}

export interface SaferRouteComparison {
  originalRoute: RoutePlan;
  saferRoute: RoutePlan & {
    divergenceReason: string;
    distanceDeltaNm: number;
    timeDeltaHours: number;
  };
  isDemonstration: boolean;
}

// -------------------------------------------------------------
// Sample Operational Datasets for UI Demonstrations
// -------------------------------------------------------------

export const DEMO_ARGO_FLOATS: ArgoObservation[] = [
  {
    id: 'ARGO-2903341',
    lat: 14.8,
    lon: 70.4,
    basin: 'Central Arabian Sea',
    timestamp: '2026-09-14 04:30 UTC',
    depth: 1850,
    temperature: 28.6,
    salinity: 36.4,
    cycleNumber: 142,
    platformType: 'Apex Profiling Float',
    profile: [
      { depth: 0, temperature: 28.6, salinity: 36.4 },
      { depth: 50, temperature: 27.8, salinity: 36.3 },
      { depth: 100, temperature: 23.4, salinity: 35.9 },
      { depth: 200, temperature: 18.2, salinity: 35.5 },
      { depth: 500, temperature: 11.5, salinity: 35.1 },
      { depth: 1000, temperature: 7.2, salinity: 34.9 },
      { depth: 1500, temperature: 4.1, salinity: 34.8 },
      { depth: 1850, temperature: 2.8, salinity: 34.7 }
    ]
  },
  {
    id: 'ARGO-2902890',
    lat: 13.2,
    lon: 87.6,
    basin: 'Bay of Bengal Deep Basin',
    timestamp: '2026-09-14 02:15 UTC',
    depth: 2000,
    temperature: 29.2,
    salinity: 33.1,
    cycleNumber: 88,
    platformType: 'PROVOR Ocean Profiler',
    profile: [
      { depth: 0, temperature: 29.2, salinity: 33.1 },
      { depth: 30, temperature: 28.9, salinity: 33.4 },
      { depth: 80, temperature: 25.1, salinity: 34.2 },
      { depth: 150, temperature: 19.8, salinity: 34.8 },
      { depth: 500, temperature: 10.9, salinity: 35.0 },
      { depth: 1000, temperature: 6.8, salinity: 34.9 },
      { depth: 2000, temperature: 2.3, salinity: 34.7 }
    ]
  },
  {
    id: 'ARGO-2903112',
    lat: 1.5,
    lon: 80.2,
    basin: 'Equatorial Indian Ocean',
    timestamp: '2026-09-13 18:45 UTC',
    depth: 1750,
    temperature: 29.8,
    salinity: 34.9,
    cycleNumber: 204,
    platformType: 'Navis Autonomous Float',
    profile: [
      { depth: 0, temperature: 29.8, salinity: 34.9 },
      { depth: 40, temperature: 29.4, salinity: 35.0 },
      { depth: 120, temperature: 22.0, salinity: 35.2 },
      { depth: 300, temperature: 14.5, salinity: 35.1 },
      { depth: 800, temperature: 8.0, salinity: 34.8 },
      { depth: 1750, temperature: 3.1, salinity: 34.7 }
    ]
  }
];

export const DEMO_GLIDERS: GliderObservation[] = [
  {
    id: 'GLIDER-INCOIS-SG04',
    lat: 15.9,
    lon: 72.8,
    basin: 'Eastern Arabian Sea Transect',
    timestamp: '2026-09-14 06:10 UTC',
    depth: 980,
    temperature: 28.4,
    salinity: 36.1,
    batteryPercent: 84,
    missionName: 'West Coast Upwelling Survey',
    currentBearing: 195,
    track: [
      { lat: 16.5, lon: 72.4, timestamp: '09-12 12:00', depth: 0 },
      { lat: 16.3, lon: 72.5, timestamp: '09-13 00:00', depth: 450 },
      { lat: 16.1, lon: 72.6, timestamp: '09-13 18:00', depth: 950 },
      { lat: 15.9, lon: 72.8, timestamp: '09-14 06:10', depth: 980 }
    ],
    profile: [
      { depth: 0, temperature: 28.4, salinity: 36.1 },
      { depth: 25, temperature: 28.2, salinity: 36.1 },
      { depth: 75, temperature: 24.5, salinity: 35.8 },
      { depth: 150, temperature: 19.1, salinity: 35.4 },
      { depth: 400, temperature: 12.8, salinity: 35.1 },
      { depth: 980, temperature: 7.4, salinity: 34.9 }
    ]
  },
  {
    id: 'GLIDER-NIO-SL02',
    lat: 14.6,
    lon: 84.8,
    basin: 'Bay of Bengal Central Eddy Line',
    timestamp: '2026-09-14 05:40 UTC',
    depth: 750,
    temperature: 29.0,
    salinity: 33.6,
    batteryPercent: 71,
    missionName: 'Freshwater Inflow Dynamic Track',
    currentBearing: 140,
    track: [
      { lat: 15.2, lon: 84.1, timestamp: '09-13 02:00', depth: 0 },
      { lat: 14.9, lon: 84.4, timestamp: '09-13 16:00', depth: 520 },
      { lat: 14.6, lon: 84.8, timestamp: '09-14 05:40', depth: 750 }
    ],
    profile: [
      { depth: 0, temperature: 29.0, salinity: 33.6 },
      { depth: 30, temperature: 28.8, salinity: 33.9 },
      { depth: 90, temperature: 24.0, salinity: 34.5 },
      { depth: 250, temperature: 16.2, salinity: 34.9 },
      { depth: 750, temperature: 8.6, salinity: 34.9 }
    ]
  }
];

export const DEMO_MODEL_COMPARISON: ModelObservationComparison = {
  location: {
    lat: 15.4,
    lon: 71.2,
    name: 'Arabian Sea Shelf Slope'
  },
  depth: 0,
  timestamp: '2026-09-14 06:00 UTC',
  isDemonstration: true,
  metrics: {
    temperature: {
      model: 28.5,
      observation: 28.2,
      unit: '°C',
      diff: -0.3,
      status: 'CONCORDANT'
    },
    salinity: {
      model: 36.2,
      observation: 36.4,
      unit: 'PSU',
      diff: +0.2,
      status: 'CONCORDANT'
    },
    currentSpeed: {
      model: 0.32,
      observation: 0.37,
      unit: 'm/s',
      diff: +0.05,
      status: 'CONCORDANT'
    }
  }
};

export const DEMO_ROUTE_COMPARISON: SaferRouteComparison = {
  isDemonstration: true,
  originalRoute: {
    id: 'ROUTE-MUM-KOC-ORIGINAL',
    start: { name: 'Mumbai Port', lat: 18.94, lon: 72.85 },
    destination: { name: 'Kochi Harbour', lat: 9.96, lon: 76.24 },
    distanceNm: 540,
    estimatedHours: 36.0,
    speedKnots: 15.0,
    overallRisk: 'DANGER',
    warningMessage: 'Active convective storm line and severe head-currents intersect corridor between Goa and Mangalore.',
    waypoints: [
      { name: 'Departure: Mumbai', lat: 18.94, lon: 72.85 },
      { name: 'WP1: Off Ratnagiri', lat: 16.98, lon: 73.20 },
      { name: 'WP2: Off Panaji', lat: 15.49, lon: 73.70 },
      { name: 'WP3: Off Mangalore', lat: 12.87, lon: 74.75 },
      { name: 'Arrival: Kochi', lat: 9.96, lon: 76.24 }
    ],
    sections: [
      {
        id: 'sec-1',
        name: 'Sector 1: Mumbai to Ratnagiri',
        distanceRange: '0 - 150 NM',
        risk: 'SAFE',
        description: 'Nominal sea surface temperatures (28.4°C), calm swell (0.9m), light following winds.'
      },
      {
        id: 'sec-2',
        name: 'Sector 2: Ratnagiri to Panaji',
        distanceRange: '150 - 275 NM',
        risk: 'CAUTION',
        description: 'Rising sea state, localized squalls developing with wave height increasing to 2.2m.'
      },
      {
        id: 'sec-3',
        name: 'Sector 3: Panaji to Mangalore',
        distanceRange: '275 - 410 NM',
        risk: 'DANGER',
        description: 'Severe convective storm band with 3.8m breaking waves and opposing currents of 1.4 m/s.'
      },
      {
        id: 'sec-4',
        name: 'Sector 4: Mangalore to Kochi',
        distanceRange: '410 - 540 NM',
        risk: 'SAFE',
        description: 'Conditions returning to normal coastal maritime corridor.'
      }
    ]
  },
  saferRoute: {
    id: 'ROUTE-MUM-KOC-SAFER',
    start: { name: 'Mumbai Port', lat: 18.94, lon: 72.85 },
    destination: { name: 'Kochi Harbour', lat: 9.96, lon: 76.24 },
    distanceNm: 568,
    estimatedHours: 37.8,
    speedKnots: 15.0,
    overallRisk: 'SAFE',
    divergenceReason: 'Steers 28 NM westward into calmer deep waters, avoiding the active coastal storm surge zone.',
    distanceDeltaNm: 28,
    timeDeltaHours: 1.8,
    waypoints: [
      { name: 'Departure: Mumbai', lat: 18.94, lon: 72.85 },
      { name: 'WP1: Deep Shelf West', lat: 16.70, lon: 72.40 },
      { name: 'WP2: Offshore Bypass', lat: 14.80, lon: 72.90 },
      { name: 'WP3: Southwest Approach', lat: 11.50, lon: 74.30 },
      { name: 'Arrival: Kochi', lat: 9.96, lon: 76.24 }
    ],
    sections: [
      {
        id: 'sec-safe-1',
        name: 'Sector 1: Mumbai to Offshore West',
        distanceRange: '0 - 180 NM',
        risk: 'SAFE',
        description: 'Steady open-ocean passage with 1.1m wave height and favorable 0.4 m/s drift.'
      },
      {
        id: 'sec-safe-2',
        name: 'Sector 2: Offshore Hazard Bypass',
        distanceRange: '180 - 420 NM',
        risk: 'SAFE',
        description: 'Skirts 45 NM clear of coastal storm cells; sea state remains moderate (< 1.6m).'
      },
      {
        id: 'sec-safe-3',
        name: 'Sector 3: Inward Approach to Kochi',
        distanceRange: '420 - 568 NM',
        risk: 'SAFE',
        description: 'Calm harbour entry approach corridor.'
      }
    ]
  }
};
