import type { VectorGridData, DatasetMetadata } from '../types';

export interface OceanCurrentPointResult {
  u: number;         // m/s
  v: number;         // m/s
  speedMps: number;  // Velocity magnitude in m/s
  speedKnots: number; // Velocity magnitude in knots
  directionDeg: number; // Oceanographic direction vector points TO (0-360 deg)
}

/**
 * Parses raw NOAA/ESR OSCAR JSON dataset into normalized VectorGridData.
 * OSCAR JSON contains 2 records: [0] = U_component, [1] = V_component.
 */
export function parseOscarCurrentsJson(json: any): VectorGridData {
  if (!Array.isArray(json) || json.length < 2) {
    throw new Error("Invalid OSCAR Ocean Currents JSON structure: expected array of 2 records");
  }

  const uRecord = json[0];
  const vRecord = json[1];

  if (!uRecord?.header || !vRecord?.header || !uRecord.data || !vRecord.data) {
    throw new Error("Invalid OSCAR record headers or data components");
  }

  const header = uRecord.header;
  const metadata: DatasetMetadata = {
    id: `oscar-currents-${header.refTime}`,
    name: "NOAA ESR OSCAR Surface Ocean Currents",
    source: "NOAA OSCAR",
    sourceUrl: "https://www.esr.org/research/oscar/",
    variable: "Ocean Surface Currents (U, V)",
    units: header.parameterUnit || "m/s",
    timestamp: header.refTime || new Date().toISOString(),
    spatialBounds: {
      minLat: Math.min(header.la1, header.la2),
      maxLat: Math.max(header.la1, header.la2),
      minLon: Math.min(header.lo1, header.lo2),
      maxLon: Math.max(header.lo1, header.lo2),
    },
    resolution: {
      latStep: Math.abs(header.dy || 0.3333333333333333),
      lonStep: Math.abs(header.dx || 0.3333333333333333),
    },
    depthLevels: [15], // 15 meters depth
  };

  const uValues = new Float32Array(uRecord.data.map((v: number | null) => (v === null || v === undefined ? NaN : v)));
  const vValues = new Float32Array(vRecord.data.map((v: number | null) => (v === null || v === undefined ? NaN : v)));

  return {
    metadata,
    dimensions: {
      width: header.nx,
      height: header.ny,
    },
    u: uValues,
    v: vValues,
  };
}

/**
 * Fetches and loads OSCAR Surface Currents dataset.
 */
export async function loadOscarCurrents(
  url: string = "/earth/data/oscar/20140131-surface-currents-oscar-0.33.json"
): Promise<VectorGridData> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch OSCAR Currents from ${url}: ${response.statusText}`);
  }
  const data = await response.json();
  return parseOscarCurrentsJson(data);
}

/**
 * Performs bilinear interpolation to query ocean surface currents at any (lat, lon).
 */
export function queryCurrentsAtPoint(
  grid: VectorGridData,
  lat: number,
  lon: number
): OceanCurrentPointResult | null {
  const { dimensions, metadata, u, v } = grid;
  const { width, height } = dimensions;
  const { minLat, maxLat, minLon, maxLon } = metadata.spatialBounds;
  const { latStep, lonStep } = metadata.resolution;

  // Normalize longitude (OSCAR uses 20 to 379.67)
  let normLon = lon;
  while (normLon < minLon) normLon += 360;
  while (normLon > maxLon) normLon -= 360;

  if (lat < minLat || lat > maxLat || normLon < minLon || normLon > maxLon) {
    return null;
  }

  // Row 0 is top latitude la1 (80N), row height-1 is bottom la2 (-80S)
  const rowFloat = (maxLat - lat) / latStep;
  const colFloat = (normLon - minLon) / lonStep;

  const row0 = Math.floor(rowFloat);
  const row1 = Math.min(row0 + 1, height - 1);
  const col0 = Math.floor(colFloat);
  const col1 = (col0 + 1) % width;

  const rFrac = rowFloat - row0;
  const cFrac = colFloat - col0;

  const getVal = (arr: Float32Array | Array<number | null>, idx: number): number => {
    const val = arr[idx];
    return val === null || val === undefined ? NaN : val;
  };

  const u00 = getVal(u, row0 * width + col0);
  const u10 = getVal(u, row0 * width + col1);
  const u01 = getVal(u, row1 * width + col0);
  const u11 = getVal(u, row1 * width + col1);

  const v00 = getVal(v, row0 * width + col0);
  const v10 = getVal(v, row0 * width + col1);
  const v01 = getVal(v, row1 * width + col0);
  const v11 = getVal(v, row1 * width + col1);

  let interpU: number;
  let interpV: number;

  if (isNaN(u00) || isNaN(u10) || isNaN(u01) || isNaN(u11) || isNaN(v00) || isNaN(v10) || isNaN(v01) || isNaN(v11)) {
    const validU = [u00, u10, u01, u11].filter((val) => !isNaN(val));
    const validV = [v00, v10, v01, v11].filter((val) => !isNaN(val));
    if (validU.length === 0 || validV.length === 0) return null;
    interpU = validU.reduce((a, b) => a + b, 0) / validU.length;
    interpV = validV.reduce((a, b) => a + b, 0) / validV.length;
  } else {
    const topU = u00 * (1 - cFrac) + u10 * cFrac;
    const botU = u01 * (1 - cFrac) + u11 * cFrac;
    interpU = topU * (1 - rFrac) + botU * rFrac;

    const topV = v00 * (1 - cFrac) + v10 * cFrac;
    const botV = v01 * (1 - cFrac) + v11 * cFrac;
    interpV = topV * (1 - rFrac) + botV * rFrac;
  }

  const speedMps = Math.sqrt(interpU * interpU + interpV * interpV);
  const speedKnots = speedMps * 1.94384;
  
  // Oceanographic direction vector points TOWARDS: 0 deg = North, 90 deg = East
  let dirRad = Math.atan2(interpU, interpV); // Math.atan2(dx, dy)
  let dirDeg = (dirRad * 180) / Math.PI;
  if (dirDeg < 0) dirDeg += 360;

  return {
    u: Number(interpU.toFixed(3)),
    v: Number(interpV.toFixed(3)),
    speedMps: Number(speedMps.toFixed(3)),
    speedKnots: Number(speedKnots.toFixed(2)),
    directionDeg: Number(dirDeg.toFixed(1)),
  };
}
