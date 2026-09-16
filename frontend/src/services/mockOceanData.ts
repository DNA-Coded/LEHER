import type { ArgoProfile, CurrentVector, OceanVariable } from '@/types/ocean';
import { getRegionById } from '@/lib/ocean/regions';

// Realistic Indian Ocean physical oceanographic profile generator
export function generateMockGrid(
  regionId: string,
  variable: OceanVariable,
  depth: number,
  _time: string,
  gridWidth = 32,
  gridHeight = 24
): { values: Float32Array; minLon: number; maxLon: number; minLat: number; maxLat: number } {
  const region = getRegionById(regionId) || {
    bbox: [60, 5, 95, 25] as [number, number, number, number],
  };

  const [minLon, minLat, maxLon, maxLat] = region.bbox;
  const count = gridWidth * gridHeight;
  const values = new Float32Array(count);

  // Depth attenuation factor: exponentially drops with depth for temperature & chlorophyll
  const depthNorm = Math.min(1.0, depth / 2000);
  const thermoclineFactor = Math.exp(-depth / 350); // Sharp drop in upper 300m

  for (let j = 0; j < gridHeight; j++) {
    const latProgress = j / (gridHeight - 1);
    const lat = minLat + latProgress * (maxLat - minLat);

    for (let i = 0; i < gridWidth; i++) {
      const lonProgress = i / (gridWidth - 1);
      // lon is unused for gradient calc but preserved for future spatial interpolation
      const _lon = minLon + lonProgress * (maxLon - minLon); void _lon;
      const idx = j * gridWidth + i;

      // Spatial gradient depending on region and variable
      let val = 0;

      if (variable === 'temperature') {
        // Warm pool in eastern Bay of Bengal & Equatorial zone, cooler upwelling in western Arabian Sea
        const baseSst = regionId === 'bay-of-bengal' ? 29.5 : regionId === 'arabian-sea' ? 28.2 : 28.8;
        const latGradient = -(lat - 10) * 0.15; // Slightly cooler towards north
        const coastalCooling = Math.sin(lonProgress * Math.PI) * 0.6; // Upwelling near coasts
        const surfaceTemp = baseSst + latGradient - coastalCooling;
        const deepTemp = 3.8; // Deep abyssal water ~3.8°C
        val = deepTemp + (surfaceTemp - deepTemp) * thermoclineFactor;
      } else if (variable === 'salinity') {
        // Arabian Sea: High evaporation -> ~36.5 PSU.
        // Bay of Bengal: Massive river runoff -> ~31-33 PSU at north, higher at depth.
        if (regionId === 'bay-of-bengal') {
          const riverFreshness = (lat / 22.0) * 3.5; // Fresher towards northern rivers
          val = 31.0 - riverFreshness + depthNorm * 3.5;
        } else if (regionId === 'arabian-sea') {
          val = 36.8 - (latProgress * 0.5) - (depthNorm * 1.5);
        } else {
          val = 34.5 + Math.sin(latProgress * 2.0) * 0.8;
        }
      } else if (variable === 'chlorophyll') {
        // High along coastal upwelling zones, negligible below photic zone (depth > 150m)
        if (depth > 200) {
          val = 0.01;
        } else {
          const coastalUpwelling = Math.pow(Math.cos(lonProgress * Math.PI * 2), 2) * 2.2;
          const photicAttenuation = Math.exp(-depth / 45);
          val = (0.2 + coastalUpwelling) * photicAttenuation;
        }
      } else {
        // Currents magnitude
        const monsoonJet = Math.sin(latProgress * Math.PI) * 0.9;
        val = Math.max(0.1, (0.8 + monsoonJet) * Math.exp(-depth / 200));
      }

      values[idx] = val;
    }
  }

  return { values, minLon, maxLon, minLat, maxLat };
}

// Generate realistic Indian Ocean current vectors (West India Coastal Current, East India Coastal Current, Somali jet)
export function generateMockVectors(regionId: string, depth: number, _time: string): CurrentVector[] {
  const region = getRegionById(regionId);
  const bbox = region ? region.bbox : ([65, 8, 92, 22] as [number, number, number, number]);
  const [minLon, minLat, maxLon, maxLat] = bbox;

  const vectors: CurrentVector[] = [];
  const stepLon = (maxLon - minLon) / 14;
  const stepLat = (maxLat - minLat) / 11;

  // Depth attenuation for currents
  const speedScale = Math.exp(-depth / 400);

  for (let lat = minLat + stepLat * 0.5; lat <= maxLat; lat += stepLat) {
    for (let lon = minLon + stepLon * 0.5; lon <= maxLon; lon += stepLon) {
      let u = 0;
      let v = 0;

      if (regionId === 'arabian-sea') {
        // Southwest monsoon: clockwise gyre, strong northward Somali current & eastward equatorial flow
        u = (0.45 + Math.sin(lat * 0.3) * 0.3) * speedScale;
        v = (0.35 + Math.cos(lon * 0.2) * 0.25) * speedScale;
      } else if (regionId === 'bay-of-bengal') {
        // Cyclonic/anticyclonic eddies and East India Coastal Current (EICC)
        u = (-0.25 + Math.sin(lat * 0.4) * 0.35) * speedScale;
        v = (0.3 - Math.cos(lon * 0.3) * 0.4) * speedScale;
      } else {
        u = (0.3 * Math.cos(lat * 0.25)) * speedScale;
        v = (0.25 * Math.sin(lon * 0.25)) * speedScale;
      }

      const speed = Math.sqrt(u * u + v * v);
      const headingRad = Math.atan2(u, v);
      let headingDeg = (headingRad * 180) / Math.PI;
      if (headingDeg < 0) headingDeg += 360;

      vectors.push({
        lon,
        lat,
        depth,
        u,
        v,
        magnitude: speed,
        directionRad: headingRad,
        directionDeg: headingDeg,
      });
    }
  }

  return vectors;
}

// Realistic Argo profiling floats stationed in Indian waters
export const MOCK_ARGO_FLOATS: ArgoProfile[] = [
  {
    floatId: 'argo-incois-2902145',
    wmoNumber: '2902145',
    platformType: 'PROVOR-CTS4 Bio-Argo',
    country: 'India (INCOIS)',
    regionId: 'arabian-sea',
    lon: 67.4,
    lat: 16.8,
    cycleNumber: 184,
    date: '2026-06-12T08:30:00Z',
    maxDepth: 2000,
    measurements: [
      { depth: 5, pressure: 5.1, temperature: 28.6, salinity: 36.4, dissolvedOxygen: 198 },
      { depth: 25, pressure: 25.3, temperature: 28.4, salinity: 36.5, dissolvedOxygen: 192 },
      { depth: 50, pressure: 50.7, temperature: 26.8, salinity: 36.6, dissolvedOxygen: 145 },
      { depth: 75, pressure: 76.1, temperature: 23.5, salinity: 36.2, dissolvedOxygen: 72 },
      { depth: 100, pressure: 101.5, temperature: 20.1, salinity: 35.8, dissolvedOxygen: 22 }, // Subsurface OMZ
      { depth: 150, pressure: 152.4, temperature: 16.2, salinity: 35.4, dissolvedOxygen: 12 },
      { depth: 200, pressure: 203.2, temperature: 14.1, salinity: 35.2, dissolvedOxygen: 8 },
      { depth: 300, pressure: 305.1, temperature: 12.0, salinity: 35.1, dissolvedOxygen: 14 },
      { depth: 500, pressure: 509.0, temperature: 10.3, salinity: 35.0, dissolvedOxygen: 35 },
      { depth: 750, pressure: 764.5, temperature: 8.2, salinity: 34.9, dissolvedOxygen: 65 },
      { depth: 1000, pressure: 1020.2, temperature: 6.8, salinity: 34.8, dissolvedOxygen: 92 },
      { depth: 1500, pressure: 1532.0, temperature: 4.6, salinity: 34.78, dissolvedOxygen: 120 },
      { depth: 2000, pressure: 2045.0, temperature: 3.4, salinity: 34.75, dissolvedOxygen: 142 },
    ],
  },
  {
    floatId: 'argo-incois-2902231',
    wmoNumber: '2902231',
    platformType: 'APEX Profiler',
    country: 'India (INCOIS)',
    regionId: 'bay-of-bengal',
    lon: 87.2,
    lat: 15.1,
    cycleNumber: 142,
    date: '2026-06-14T04:15:00Z',
    maxDepth: 2000,
    measurements: [
      { depth: 5, pressure: 5.1, temperature: 29.8, salinity: 31.8, dissolvedOxygen: 205 }, // Warm pool & fresh layer
      { depth: 25, pressure: 25.3, temperature: 29.5, salinity: 32.2, dissolvedOxygen: 201 },
      { depth: 50, pressure: 50.8, temperature: 28.1, salinity: 33.6, dissolvedOxygen: 178 }, // Barrier layer
      { depth: 75, pressure: 76.2, temperature: 24.8, salinity: 34.5, dissolvedOxygen: 110 },
      { depth: 100, pressure: 101.7, temperature: 21.4, salinity: 34.9, dissolvedOxygen: 48 },
      { depth: 150, pressure: 152.6, temperature: 16.9, salinity: 35.0, dissolvedOxygen: 28 },
      { depth: 200, pressure: 203.5, temperature: 14.5, salinity: 35.1, dissolvedOxygen: 22 },
      { depth: 300, pressure: 305.4, temperature: 12.3, salinity: 35.05, dissolvedOxygen: 32 },
      { depth: 500, pressure: 509.3, temperature: 9.8, salinity: 34.98, dissolvedOxygen: 58 },
      { depth: 750, pressure: 764.8, temperature: 7.9, salinity: 34.92, dissolvedOxygen: 88 },
      { depth: 1000, pressure: 1020.6, temperature: 6.4, salinity: 34.86, dissolvedOxygen: 115 },
      { depth: 1500, pressure: 1532.5, temperature: 4.4, salinity: 34.80, dissolvedOxygen: 138 },
      { depth: 2000, pressure: 2045.5, temperature: 3.2, salinity: 34.76, dissolvedOxygen: 155 },
    ],
  },
  {
    floatId: 'argo-incois-6903204',
    wmoNumber: '6903204',
    platformType: 'ARVOR Deep',
    country: 'India / NIOT',
    regionId: 'andaman-sea',
    lon: 95.8,
    lat: 10.5,
    cycleNumber: 97,
    date: '2026-06-10T12:45:00Z',
    maxDepth: 2000,
    measurements: [
      { depth: 5, pressure: 5.1, temperature: 29.6, salinity: 32.7, dissolvedOxygen: 200 },
      { depth: 30, pressure: 30.4, temperature: 29.3, salinity: 33.1, dissolvedOxygen: 194 },
      { depth: 60, pressure: 60.9, temperature: 27.2, salinity: 34.2, dissolvedOxygen: 130 },
      { depth: 100, pressure: 101.6, temperature: 22.0, salinity: 34.8, dissolvedOxygen: 65 },
      { depth: 150, pressure: 152.5, temperature: 17.5, salinity: 35.1, dissolvedOxygen: 42 },
      { depth: 300, pressure: 305.2, temperature: 12.8, salinity: 35.0, dissolvedOxygen: 55 },
      { depth: 600, pressure: 611.0, temperature: 8.9, salinity: 34.9, dissolvedOxygen: 82 },
      { depth: 1000, pressure: 1020.4, temperature: 6.5, salinity: 34.84, dissolvedOxygen: 108 },
      { depth: 2000, pressure: 2045.2, temperature: 3.5, salinity: 34.78, dissolvedOxygen: 148 },
    ],
  },
  {
    floatId: 'argo-incois-2903340',
    wmoNumber: '2903340',
    platformType: 'PROVOR Coastal',
    country: 'India (CMLRE / INCOIS)',
    regionId: 'indian-eez',
    lon: 74.2,
    lat: 12.4, // Near Mangalore / Malabar shelf
    cycleNumber: 62,
    date: '2026-06-15T02:00:00Z',
    maxDepth: 1500,
    measurements: [
      { depth: 5, pressure: 5.1, temperature: 28.2, salinity: 35.2, dissolvedOxygen: 215 },
      { depth: 20, pressure: 20.2, temperature: 27.5, salinity: 35.4, dissolvedOxygen: 185 },
      { depth: 50, pressure: 50.7, temperature: 23.8, salinity: 35.8, dissolvedOxygen: 88 },
      { depth: 100, pressure: 101.5, temperature: 19.5, salinity: 35.6, dissolvedOxygen: 35 },
      { depth: 200, pressure: 203.2, temperature: 15.0, salinity: 35.3, dissolvedOxygen: 18 },
      { depth: 500, pressure: 509.0, temperature: 10.8, salinity: 35.05, dissolvedOxygen: 48 },
      { depth: 1000, pressure: 1020.2, temperature: 7.1, salinity: 34.88, dissolvedOxygen: 95 },
      { depth: 1500, pressure: 1532.0, temperature: 4.8, salinity: 34.80, dissolvedOxygen: 125 },
    ],
  },
];
