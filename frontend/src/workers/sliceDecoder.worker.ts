// Web Worker: sliceDecoder.worker.ts
// Decodes raw Float32 ocean grid data, computes min/max statistics, normalizes [0, 1], and returns transferable buffers

export interface SliceDecodeRequest {
  id: string;
  gridWidth: number;
  gridHeight: number;
  rawBuffer: ArrayBuffer; // Float32Array buffer
  minVal?: number;
  maxVal?: number;
}

export interface SliceDecodeResponse {
  id: string;
  values: ArrayBuffer;
  normalized: ArrayBuffer;
  minVal: number;
  maxVal: number;
  meanVal: number;
}

self.onmessage = (e: MessageEvent<SliceDecodeRequest>) => {
  const { id, rawBuffer, minVal: manualMin, maxVal: manualMax } = e.data;
  const values = new Float32Array(rawBuffer);
  const count = values.length;

  let min = manualMin !== undefined ? manualMin : Infinity;
  let max = manualMax !== undefined ? manualMax : -Infinity;
  let sum = 0;
  let validCount = 0;

  if (manualMin === undefined || manualMax === undefined) {
    for (let i = 0; i < count; i++) {
      const v = values[i];
      if (!isNaN(v) && v > -999.0) {
        if (v < min) min = v;
        if (v > max) max = v;
        sum += v;
        validCount++;
      }
    }
    if (validCount === 0) {
      min = 0;
      max = 1;
    }
  }

  const range = max - min || 1.0;
  const normalized = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const v = values[i];
    if (isNaN(v) || v <= -999.0) {
      normalized[i] = -1.0; // Mask/nodata flag
    } else {
      normalized[i] = Math.max(0.0, Math.min(1.0, (v - min) / range));
    }
  }

  const meanVal = validCount > 0 ? sum / validCount : (min + max) / 2;

  // Transfer both buffers back to main thread zero-copy
  const response: SliceDecodeResponse = {
    id,
    values: values.buffer,
    normalized: normalized.buffer,
    minVal: min,
    maxVal: max,
    meanVal,
  };

  self.postMessage(response, { transfer: [values.buffer, normalized.buffer] });
};
