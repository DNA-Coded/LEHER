import type { ArgoProfile, CurrentVector, OceanSliceData, OceanVariable } from '@/types/ocean';
import { MOCK_ARGO_FLOATS } from './mockOceanData';
import { tableFromIPC } from 'apache-arrow';
import { getRegionById } from '@/lib/ocean/regions';
import type { SliceDecodeRequest, SliceDecodeResponse } from '@/workers/sliceDecoder.worker';
import type { VectorProcessRequest, VectorProcessResponse } from '@/workers/vectorProcessor.worker';

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

/**
 * Fetches and worker-decodes an ocean slice for a region, variable, depth, and time.
 * When integrating with a real backend, replace generateMockGrid with fetch(/api/v1/ocean/slice?...)
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

  const url = `http://127.0.0.1:8000/api/v1/model/slices?variable=${backendVar}&depth_m=${depth}&min_lat=${minLat}&max_lat=${maxLat}&min_lon=${minLon}&max_lon=${maxLon}&time=${time}`;
  
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

  const url = `http://127.0.0.1:8000/api/v1/vectors/slices?depth_m=${depth}&min_lat=${minLat}&max_lat=${maxLat}&min_lon=${minLon}&max_lon=${maxLon}&time=${time}&resolution=0.25`;
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
  // Simulate network delay of 120ms
  await new Promise((r) => setTimeout(r, 120));
  if (regionId) {
    return MOCK_ARGO_FLOATS.filter((f) => f.regionId === regionId);
  }
  return MOCK_ARGO_FLOATS;
}

/**
 * Fetches full high-resolution CTD sounding profile for an Argo float
 */
export async function fetchArgoProfile(floatId: string): Promise<ArgoProfile | null> {
  await new Promise((r) => setTimeout(r, 80));
  const float = MOCK_ARGO_FLOATS.find((f) => f.floatId === floatId);
  return float || null;
}
