// Web Worker: vectorProcessor.worker.ts
// Processes u/v ocean velocity grids, calculates speed and directional heading, and produces GPU-ready vertex data

export interface VectorProcessRequest {
  id: string;
  lons: number[];
  lats: number[];
  depth: number;
  uBuffer: ArrayBuffer; // Float32Array
  vBuffer: ArrayBuffer; // Float32Array
  gridWidth: number;
  gridHeight: number;
  minSpeedThreshold?: number; // Filter out dead water / land mask
}

export interface VectorProcessResponse {
  id: string;
  // Interleaved packed buffer: [lon, lat, depth, u, v, speed, headingDeg] per vector (7 floats per vector)
  packedData: ArrayBuffer;
  vectorCount: number;
  maxSpeed: number;
  meanSpeed: number;
}

self.onmessage = (e: MessageEvent<VectorProcessRequest>) => {
  const { id, lons, lats, depth, uBuffer, vBuffer, minSpeedThreshold = 0.02 } = e.data;
  const uArr = new Float32Array(uBuffer);
  const vArr = new Float32Array(vBuffer);
  const totalPoints = lons.length * lats.length;

  // Temporary list to hold valid ocean vectors
  const tempBuffer = new Float32Array(totalPoints * 7);
  let vectorCount = 0;
  let maxSpeed = 0;
  let speedSum = 0;

  for (let j = 0; j < lats.length; j++) {
    for (let i = 0; i < lons.length; i++) {
      const idx = j * lons.length + i;
      const u = uArr[idx];
      const v = vArr[idx];

      if (isNaN(u) || isNaN(v) || u <= -999.0 || v <= -999.0) {
        continue;
      }

      const speed = Math.sqrt(u * u + v * v);
      if (speed < minSpeedThreshold) {
        continue;
      }

      // Oceanographic heading: direction towards which the water is moving
      // East is +u (90°), North is +v (0°)
      const headingRad = Math.atan2(u, v);
      let headingDeg = (headingRad * 180) / Math.PI;
      if (headingDeg < 0) headingDeg += 360;

      const offset = vectorCount * 7;
      tempBuffer[offset + 0] = lons[i];
      tempBuffer[offset + 1] = lats[j];
      tempBuffer[offset + 2] = depth;
      tempBuffer[offset + 3] = u;
      tempBuffer[offset + 4] = v;
      tempBuffer[offset + 5] = speed;
      tempBuffer[offset + 6] = headingDeg;

      if (speed > maxSpeed) maxSpeed = speed;
      speedSum += speed;
      vectorCount++;
    }
  }

  // Slice down to exact size to save memory
  const packedData = tempBuffer.slice(0, vectorCount * 7);
  const meanSpeed = vectorCount > 0 ? speedSum / vectorCount : 0;

  const response: VectorProcessResponse = {
    id,
    packedData: packedData.buffer,
    vectorCount,
    maxSpeed,
    meanSpeed,
  };

  self.postMessage(response, { transfer: [packedData.buffer] });
};
