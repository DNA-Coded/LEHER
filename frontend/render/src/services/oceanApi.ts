import type { ArgoProfile, CurrentVector, OceanSliceData, OceanVariable } from '../types/ocean';
import { generateMockGrid, generateMockVectors, MOCK_ARGO_FLOATS } from './mockOceanData';
import type { SliceDecodeRequest, SliceDecodeResponse } from '../workers/sliceDecoder.worker';
import type { VectorProcessRequest, VectorProcessResponse } from '../workers/vectorProcessor.worker';

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
  const gridWidth = 36;
  const gridHeight = 28;

  // In production, this can be fetched from INCOIS / Copernicus Marine API / THREDDS server
  const raw = generateMockGrid(regionId, variable, depth, time, gridWidth, gridHeight);

  const worker = getSliceWorker();
  const requestId = `${regionId}-${variable}-${depth}-${time}-${Date.now()}`;

  return new Promise((resolve) => {
    const handleMessage = (e: MessageEvent<SliceDecodeResponse>) => {
      if (e.data.id === requestId) {
        worker.removeEventListener('message', handleMessage);

        const values = new Float32Array(e.data.values);
        const normalized = new Float32Array(e.data.normalized);

        resolve({
          regionId,
          variable,
          depth,
          time,
          gridWidth,
          gridHeight,
          minLon: raw.minLon,
          maxLon: raw.maxLon,
          minLat: raw.minLat,
          maxLat: raw.maxLat,
          values,
          normalized,
          minVal: e.data.minVal,
          maxVal: e.data.maxVal,
        });
      }
    };

    worker.addEventListener('message', handleMessage);

    // Make copy of buffer to transfer to worker
    const bufferCopy = raw.values.buffer.slice(0) as ArrayBuffer;
    const req: SliceDecodeRequest = {
      id: requestId,
      gridWidth,
      gridHeight,
      rawBuffer: bufferCopy,
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

  // Generate u & v grids
  const rawVectors = generateMockVectors(regionId, depth, time);

  // Extract unique lons & lats
  const lons = Array.from(new Set(rawVectors.map((v) => v.lon))).sort((a, b) => a - b);
  const lats = Array.from(new Set(rawVectors.map((v) => v.lat))).sort((a, b) => a - b);

  const uArr = new Float32Array(rawVectors.map((v) => v.u));
  const vArr = new Float32Array(rawVectors.map((v) => v.v));

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
