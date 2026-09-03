import type { ScalarGridData, DatasetMetadata } from '../types';

export interface TemperaturePointResult {
  kelvin: number;
  celsius: number;
}

/**
 * Parses raw NCEP GFS GRIB-JSON format data into normalized ScalarGridData.
 */
export function parseGfsTemperatureJson(json: any): ScalarGridData {
  const record = Array.isArray(json) ? json[0] : json;
  if (!record || !record.header || !record.data) {
    throw new Error("Invalid GFS Temperature JSON structure");
  }

  const header = record.header;
  const metadata: DatasetMetadata = {
    id: `gfs-temp-${header.refTime}`,
    name: "NCEP GFS 2m Air Temperature",
    source: "NCEP GFS",
    sourceUrl: "https://nomads.ncep.noaa.gov/",
    variable: "Temperature",
    units: header.parameterUnit || "K",
    timestamp: header.refTime || new Date().toISOString(),
    spatialBounds: {
      minLat: Math.min(header.la1, header.la2),
      maxLat: Math.max(header.la1, header.la2),
      minLon: Math.min(header.lo1, header.lo2),
      maxLon: Math.max(header.lo1, header.lo2),
    },
    resolution: {
      latStep: header.dy || 1.0,
      lonStep: header.dx || 1.0,
    },
    depthLevels: [2], // 2m above ground level
  };

  const values = new Float32Array(record.data.map((v: number | null) => (v === null || v === undefined ? NaN : v)));

  return {
    metadata,
    dimensions: {
      width: header.nx,
      height: header.ny,
    },
    values,
  };
}

/**
 * Fetches and loads GFS Atmospheric Temperature dataset.
 */
export async function loadGfsTemperature(
  url: string = "/earth/data/weather/current/current-temp-surface-level-gfs-1.0.json"
): Promise<ScalarGridData> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch GFS Temperature from ${url}: ${response.statusText}`);
  }
  const data = await response.json();
  return parseGfsTemperatureJson(data);
}

/**
 * Performs bilinear interpolation to query atmospheric temperature at any (lat, lon).
 */
export function queryTemperatureAtPoint(
  grid: ScalarGridData,
  lat: number,
  lon: number
): TemperaturePointResult | null {
  const { dimensions, metadata, values } = grid;
  const { width, height } = dimensions;
  const { minLat, maxLat, minLon, maxLon } = metadata.spatialBounds;
  const { latStep, lonStep } = metadata.resolution;

  // Normalize longitude to [minLon, maxLon]
  let normLon = lon;
  while (normLon < minLon) normLon += 360;
  while (normLon > maxLon) normLon -= 360;

  if (lat < minLat || lat > maxLat || normLon < minLon || normLon > maxLon) {
    return null;
  }

  // Row index 0 corresponds to la1 (90N), row ny-1 corresponds to la2 (-90S)
  const rowFloat = (maxLat - lat) / latStep;
  const colFloat = (normLon - minLon) / lonStep;

  const row0 = Math.floor(rowFloat);
  const row1 = Math.min(row0 + 1, height - 1);
  const col0 = Math.floor(colFloat);
  const col1 = (col0 + 1) % width;

  const rFrac = rowFloat - row0;
  const cFrac = colFloat - col0;

  const getVal = (idx: number): number => {
    const val = values[idx];
    return val === null || val === undefined ? NaN : val;
  };

  const v00 = getVal(row0 * width + col0);
  const v10 = getVal(row0 * width + col1);
  const v01 = getVal(row1 * width + col0);
  const v11 = getVal(row1 * width + col1);

  if (isNaN(v00) || isNaN(v10) || isNaN(v01) || isNaN(v11)) {
    const valid = [v00, v10, v01, v11].filter((v) => !isNaN(v));
    if (valid.length === 0) return null;
    const avgK = valid.reduce((a, b) => a + b, 0) / valid.length;
    return { kelvin: avgK, celsius: avgK - 273.15 };
  }

  const top = v00 * (1 - cFrac) + v10 * cFrac;
  const bottom = v01 * (1 - cFrac) + v11 * cFrac;
  const interpK = top * (1 - rFrac) + bottom * rFrac;

  return {
    kelvin: Number(interpK.toFixed(2)),
    celsius: Number((interpK - 273.15).toFixed(2)),
  };
}
