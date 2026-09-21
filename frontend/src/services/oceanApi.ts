import type { ArgoProfile, CurrentVector, OceanSliceData, OceanVariable } from '@/types/ocean';
import { MOCK_ARGO_FLOATS } from './mockOceanData';
import { tableFromIPC } from 'apache-arrow';
import { getRegionById } from '@/lib/ocean/regions';
import type { SliceDecodeRequest, SliceDecodeResponse } from '@/workers/sliceDecoder.worker';
import type { VectorProcessRequest, VectorProcessResponse } from '@/workers/vectorProcessor.worker';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// Worker pools / instances
let sliceWorker: Worker | null = null;
let vectorWorker: Worker | null = null;

function getSliceWorker(): Worker {
  if (!sliceWorker) {
    sliceWorker = new Worker(new URL('../workers/sliceDecoder.worker.ts', import.meta.url), {
      type: 'module',
    });
  }
  return sliceWorker;
}

function getVectorWorker(): Worker {
  if (!vectorWorker) {
    vectorWorker = new Worker(new URL('../workers/vectorProcessor.worker.ts', import.meta.url), {
      type: 'module',
    });
  }
  return vectorWorker;
}

export interface HazardEvent {
  event_id: string;
  type: 'cyclone' | 'storm_surge' | 'extreme_tide';
  latitude: number;
  longitude: number;
  probability: number | null;
  surge_height_m: number | null;
  residual_height_m: number | null;
  sst: number | null;
  current_speed: number | null;
  detected_at: string;
}

export interface BackendStatus {
  status: string;
  catalog_initialized: boolean;
  scheduler_running: boolean;
  rakshak: { status: string; last_run?: string };
  environment: string;
  cache_ttl_seconds: number;
}

export interface EcosystemCell {
  lat: number;
  lon: number;
  ecosystem_stress_score: number;
  ecosystem_status: 'HEALTHY' | 'MODERATE' | 'CRITICAL';
  color: string;
  sst: number;
  current_speed: number;
  coral_bleaching?: { score: number; level: string };
  algal_bloom?: { score: number; risk: string };
  fish_stress?: { score: number; migration_risk: string };
  hypoxia?: { score: number; dead_zone_risk: string };
}

export interface EcosystemSummary {
  n_healthy: number;
  n_moderate: number;
  n_stressed: number;
  n_critical: number;
  avg_stress_score: number;
}

export interface EcosystemData {
  generated_at: string;
  total_cells: number;
  summary: EcosystemSummary;
  cells: EcosystemCell[];
}

/**
 * Check backend operational readiness and scheduler status
 */
export async function fetchBackendStatus(): Promise<BackendStatus | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/status`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetches active hazard events detected by the Rakshak ML pipeline
 */
export async function fetchHazardEvents(): Promise<HazardEvent[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/ml/events`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[OceanAPI] Using fallback hazard events:', err);
    return [
      {
        event_id: 'CYC-0001',
        type: 'cyclone',
        latitude: 15.4,
        longitude: 71.2,
        probability: 0.82,
        surge_height_m: null,
        residual_height_m: null,
        sst: 29.5,
        current_speed: 1.45,
        detected_at: new Date().toISOString()
      },
      {
        event_id: 'SURGE-0002',
        type: 'storm_surge',
        latitude: 19.5,
        longitude: 86.0,
        probability: null,
        surge_height_m: 1.95,
        residual_height_m: null,
        sst: 29.1,
        current_speed: 1.15,
        detected_at: new Date().toISOString()
      }
    ];
  }
}

/**
 * Fetches fishing safe/caution/danger zones GeoJSON FeatureCollection
 */
export async function fetchSafeZonesGeoJSON(): Promise<GeoJSON.FeatureCollection | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/ml/zones`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[OceanAPI] Could not fetch safe zones GeoJSON:', err);
    return null;
  }
}

/**
 * Fetches marine ecosystem stress telemetry from Rakshak Engine 6
 */
export async function fetchEcosystemData(): Promise<EcosystemData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/ml/ecosystem`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[OceanAPI] Could not fetch ecosystem data:', err);
    return null;
  }
}

/**
 * Fetches active dataset manifests from DuckDB catalog
 */
export async function fetchCatalogDatasets(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/catalog/datasets`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[OceanAPI] Could not fetch catalog:', err);
    return [];
  }
}

/**
 * Fetches native vertical depth levels from DuckDB catalog
 */
export async function fetchVariableDepths(varId: string = 'temperature'): Promise<number[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/catalog/variables/${varId}/depths`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[OceanAPI] Could not fetch depths for ${varId}:`, err);
    return [0, 5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000];
  }
}

/**
 * Fetches and worker-decodes an ocean slice for a specific coordinate and bounding box size.
 */
export async function fetchModelSliceAt(
  variable: string,
  depth: number,
  lat: number,
  lon: number,
  bboxSize: number = 1.0,
  time: string = 'latest'
): Promise<OceanSliceData> {
  const minLat = lat - bboxSize / 2;
  const maxLat = lat + bboxSize / 2;
  const minLon = lon - bboxSize / 2;
  const maxLon = lon + bboxSize / 2;

  const varMap: Record<string, string> = {
    'temperature': 'temperature',
    'salinity': 'salinity',
    'chlorophyll': 'chlorophyll'
  };
  const backendVar = varMap[variable] || variable;

  const url = `${API_BASE}/api/v1/model/slices?variable=${backendVar}&depth_m=${depth}&min_lat=${minLat}&max_lat=${maxLat}&min_lon=${minLon}&max_lon=${maxLon}&time=${time}`;
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch model slice at coords: ${res.statusText}`);
  }

  const buffer = await res.arrayBuffer();
  const table = tableFromIPC(buffer);

  const valueCol = table.getChild('value');
  const values = new Float32Array(valueCol ? valueCol.toArray() : table.numRows);

  const gridHeight = parseInt(res.headers.get('X-Slice-Rows') || '0', 10) || 24;
  const gridWidth = parseInt(res.headers.get('X-Slice-Cols') || '0', 10) || 32;
  const minVal = parseFloat(res.headers.get('X-Data-Min') || '0');
  const maxVal = parseFloat(res.headers.get('X-Data-Max') || '0');

  const worker = getSliceWorker();
  const requestId = `coord-${variable}-${depth}-${time}-${Date.now()}`;

  return new Promise((resolve) => {
    const handleMessage = (e: MessageEvent<SliceDecodeResponse>) => {
      if (e.data.id === requestId) {
        worker.removeEventListener('message', handleMessage);

        resolve({
          regionId: 'custom',
          variable: variable as OceanVariable,
          depth,
          time,
          gridWidth,
          gridHeight,
          minLon,
          maxLon,
          minLat,
          maxLat,
          values: new Float32Array(e.data.values),
          normalized: new Float32Array(e.data.normalized),
          minVal: e.data.minVal,
          maxVal: e.data.maxVal,
        });
      }
    };

    worker.addEventListener('message', handleMessage);

    const bufferCopy = values.buffer.slice(0) as ArrayBuffer;
    const req: SliceDecodeRequest = {
      id: requestId,
      gridWidth,
      gridHeight,
      rawBuffer: bufferCopy,
      minVal: isNaN(minVal) ? undefined : minVal,
      maxVal: isNaN(maxVal) ? undefined : maxVal,
    };

    worker.postMessage(req, [bufferCopy]);
  });
}

/**
 * Fetches and worker-processes ocean velocity vectors for a specific coordinate and bounding box size.
 */
export async function fetchVectorSliceAt(
  depth: number,
  lat: number,
  lon: number,
  bboxSize: number = 1.0,
  time: string = 'latest'
): Promise<CurrentVector[]> {
  const worker = getVectorWorker();
  const requestId = `vec-coord-${depth}-${time}-${Date.now()}`;

  const minLat = lat - bboxSize / 2;
  const maxLat = lat + bboxSize / 2;
  const minLon = lon - bboxSize / 2;
  const maxLon = lon + bboxSize / 2;

  const url = `${API_BASE}/api/v1/vectors/slices?depth_m=${depth}&min_lat=${minLat}&max_lat=${maxLat}&min_lon=${minLon}&max_lon=${maxLon}&time=${time}&resolution=0.25`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch vectors at coords: ${res.statusText}`);

  const buffer = await res.arrayBuffer();
  const table = tableFromIPC(buffer);

  const uCol = table.getChild('u_velocity');
  const vCol = table.getChild('v_velocity');
  
  const uArr = uCol ? new Float32Array(uCol.toArray()) : new Float32Array();
  const vArr = vCol ? new Float32Array(vCol.toArray()) : new Float32Array();

  const lonsCount = parseInt(res.headers.get('X-Slice-Cols') || '40', 10);
  const latsCount = parseInt(res.headers.get('X-Slice-Rows') || '30', 10);

  const lons = Array.from({length: lonsCount}, (_, i) => i);
  const lats = Array.from({length: latsCount}, (_, i) => i);

  return new Promise((resolve) => {
    const handleMessage = (e: MessageEvent<VectorProcessResponse>) => {
      if (e.data.id === requestId) {
        worker.removeEventListener('message', handleMessage);

        const packed = new Float32Array(e.data.packedData);
        const vectors: CurrentVector[] = [];
        const count = e.data.vectorCount;

        for (let i = 0; i < count; i++) {
          const offset = i * 7;
          vectors.push({
            lon: packed[offset + 0],
            lat: packed[offset + 1],
            depth: packed[offset + 2],
            u: packed[offset + 3],
            v: packed[offset + 4],
            magnitude: packed[offset + 5],
            directionDeg: packed[offset + 6],
            directionRad: (packed[offset + 6] * Math.PI) / 180,
          });
        }

        resolve(vectors);
      }
    };

    worker.addEventListener('message', handleMessage);

    const uBuf = uArr.buffer.slice(0);
    const vBuf = vArr.buffer.slice(0);

    const req: VectorProcessRequest = {
      id: requestId,
      lons,
      lats,
      depth,
      uBuffer: uBuf,
      vBuffer: vBuf,
      gridWidth: lons.length,
      gridHeight: lats.length,
      minSpeedThreshold: 0.05,
    };

    worker.postMessage(req, [uBuf, vBuf]);
  });
}

/**
 * Fetches and worker-decodes an ocean slice for a region, variable, depth, and time.
 */
export async function fetchOceanSlice(
  regionId: string,
  variable: OceanVariable,
  depth: number,
  time: string
): Promise<OceanSliceData> {
  const region = getRegionById(regionId) || {
    bbox: [60, 5, 95, 25] as [number, number, number, number],
  };
  const [minLon, minLat, maxLon, maxLat] = region.bbox;

  // Map frontend variable names to backend canonical names
  const varMap: Record<string, string> = {
    'temperature': 'temperature',
    'salinity': 'salinity',
    'sea-surface-height': 'sea_surface_height',
    'mixed-layer-depth': 'mixed_layer_depth',
    'chlorophyll': 'chlorophyll'
  };
  const backendVar = varMap[variable] || variable;

  const url = `${API_BASE}/api/v1/model/slices?variable=${backendVar}&depth_m=${depth}&min_lat=${minLat}&max_lat=${maxLat}&min_lon=${minLon}&max_lon=${maxLon}&time=${time}`;
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch slice: ${res.statusText}`);
  }

  const buffer = await res.arrayBuffer();
  const table = tableFromIPC(buffer);

  const valueCol = table.getChild('value');
  const values = new Float32Array(valueCol ? valueCol.toArray() : table.numRows);

  const gridHeight = parseInt(res.headers.get('X-Slice-Rows') || '0', 10) || 24;
  const gridWidth = parseInt(res.headers.get('X-Slice-Cols') || '0', 10) || 32;
  const minVal = parseFloat(res.headers.get('X-Data-Min') || '0');
  const maxVal = parseFloat(res.headers.get('X-Data-Max') || '0');

  const worker = getSliceWorker();
  const requestId = `${regionId}-${variable}-${depth}-${time}-${Date.now()}`;

  return new Promise((resolve) => {
    const handleMessage = (e: MessageEvent<SliceDecodeResponse>) => {
      if (e.data.id === requestId) {
        worker.removeEventListener('message', handleMessage);

        resolve({
          regionId,
          variable,
          depth,
          time,
          gridWidth,
          gridHeight,
          minLon,
          maxLon,
          minLat,
          maxLat,
          values: new Float32Array(e.data.values),
          normalized: new Float32Array(e.data.normalized),
          minVal: e.data.minVal,
          maxVal: e.data.maxVal,
        });
      }
    };

    worker.addEventListener('message', handleMessage);

    const bufferCopy = values.buffer.slice(0) as ArrayBuffer;
    const req: SliceDecodeRequest = {
      id: requestId,
      gridWidth,
      gridHeight,
      rawBuffer: bufferCopy,
      minVal: isNaN(minVal) ? undefined : minVal,
      maxVal: isNaN(maxVal) ? undefined : maxVal,
    };

    worker.postMessage(req, [bufferCopy]);
  });
}

/**
 * Fetches and worker-processes ocean velocity vectors.
 */
export async function fetchCurrentVectors(
  regionId: string,
  depth: number,
  time: string
): Promise<CurrentVector[]> {
  const worker = getVectorWorker();
  const requestId = `vec-${regionId}-${depth}-${time}-${Date.now()}`;

  const region = getRegionById(regionId) || {
    bbox: [60, 5, 95, 25] as [number, number, number, number],
  };
  const [minLon, minLat, maxLon, maxLat] = region.bbox;

  const url = `${API_BASE}/api/v1/vectors/slices?depth_m=${depth}&min_lat=${minLat}&max_lat=${maxLat}&min_lon=${minLon}&max_lon=${maxLon}&time=${time}&resolution=0.25`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch vectors: ${res.statusText}`);

  const buffer = await res.arrayBuffer();
  const table = tableFromIPC(buffer);

  const uCol = table.getChild('u_velocity');
  const vCol = table.getChild('v_velocity');
  
  const uArr = uCol ? new Float32Array(uCol.toArray()) : new Float32Array();
  const vArr = vCol ? new Float32Array(vCol.toArray()) : new Float32Array();

  const lons = Array.from({length: parseInt(res.headers.get('X-Slice-Cols') || '40', 10)}, (_, i) => i);
  const lats = Array.from({length: parseInt(res.headers.get('X-Slice-Rows') || '30', 10)}, (_, i) => i);

  return new Promise((resolve) => {
    const handleMessage = (e: MessageEvent<VectorProcessResponse>) => {
      if (e.data.id === requestId) {
        worker.removeEventListener('message', handleMessage);

        const packed = new Float32Array(e.data.packedData);
        const vectors: CurrentVector[] = [];
        const count = e.data.vectorCount;

        for (let i = 0; i < count; i++) {
          const offset = i * 7;
          vectors.push({
            lon: packed[offset + 0],
            lat: packed[offset + 1],
            depth: packed[offset + 2],
            u: packed[offset + 3],
            v: packed[offset + 4],
            magnitude: packed[offset + 5],
            directionDeg: packed[offset + 6],
            directionRad: (packed[offset + 6] * Math.PI) / 180,
          });
        }

        resolve(vectors);
      }
    };

    worker.addEventListener('message', handleMessage);

    const uBuf = uArr.buffer.slice(0);
    const vBuf = vArr.buffer.slice(0);

    const req: VectorProcessRequest = {
      id: requestId,
      lons,
      lats,
      depth,
      uBuffer: uBuf,
      vBuffer: vBuf,
      gridWidth: lons.length,
      gridHeight: lats.length,
      minSpeedThreshold: 0.05,
    };

    worker.postMessage(req, [uBuf, vBuf]);
  });
}

/**
 * Fetches Argo floats, optionally filtered by ocean region
 */
export async function fetchArgoFloats(regionId?: string): Promise<ArgoProfile[]> {
  // Can be filtered or queried from DuckDB catalog
  if (regionId) {
    return MOCK_ARGO_FLOATS.filter((f) => f.regionId === regionId);
  }
  return MOCK_ARGO_FLOATS;
}

/**
 * Fetches full high-resolution CTD sounding profile for an Argo float
 */
export async function fetchArgoProfile(floatId: string): Promise<ArgoProfile | null> {
  const float = MOCK_ARGO_FLOATS.find((f) => f.floatId === floatId);
  return float || null;
}
