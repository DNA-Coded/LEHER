/**
 * TypeScript definitions corresponding directly to the FastAPI responses
 */

export interface GridCoordinates {
  latitude: number[];
  longitude: number[];
  depth?: number;
  time?: string;
}

export interface GridResponse<T = any> {
  dataset: string;
  variable: string;
  coordinates: GridCoordinates;
  shape: number[];
  values: T[];
  depth?: number;
  time?: string;
}

export interface CurrentsGridResponse {
  variable: string; // "currents"
  components: {
    u: GridResponse<number>;
    v: GridResponse<number>;
  };
  coordinates: GridCoordinates;
  shape: number[];
  depth?: number;
  time?: string;
}

export interface PointLocation {
  lat: number;
  lon: number;
}

export interface PointResponse {
  dataset: string;
  variable: string;
  value: number | null;
  location: PointLocation;
}

export interface CurrentsPointResponse {
  variable: string; // "currents"
  components: {
    u: PointResponse;
    v: PointResponse;
  };
  location: PointLocation;
}

export interface ApiError {
  detail: string;
}

export interface DeepOceanPrediction {
  thetao: number;
  so: number;
  uo: number;
  vo: number;
  current_speed?: number;
  metadata?: any;
}

export interface DeepOceanPredictionResponse {
  success: boolean;
  data: DeepOceanPrediction;
}
