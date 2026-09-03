/**
 * SamudraX Normalized Internal Data Contract
 * 
 * Provides strict TypeScript interfaces and registries for authoritative,
 * source-traceable atmospheric and oceanic scientific datasets.
 */

export interface SpatialBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export interface GridResolution {
  latStep: number; // In degrees
  lonStep: number; // In degrees
}

export interface DatasetMetadata {
  id: string;
  name: string;
  source: 'NCEP GFS' | 'NOAA OSCAR' | 'HYCOM' | 'Copernicus Marine' | 'INCOIS' | 'Argo Global Data Assembly' | 'MODIS Aqua';
  sourceUrl: string;
  variable: string;
  units: string;
  timestamp: string; // ISO 8601 UTC format
  spatialBounds: SpatialBounds;
  resolution: GridResolution;
  depthLevels?: number[]; // In meters (e.g. [0, 10, 50, 100, 200, 500, 1000, 2000])
}

export interface GridDimensions {
  width: number;  // Number of longitude points (nx)
  height: number; // Number of latitude points (ny)
}

export interface ScalarGridData {
  metadata: DatasetMetadata;
  dimensions: GridDimensions;
  values: Float32Array | Array<number | null>;
}

export interface VectorGridData {
  metadata: DatasetMetadata;
  dimensions: GridDimensions;
  u: Float32Array | Array<number | null>;
  v: Float32Array | Array<number | null>;
}

export interface PointObservation {
  id: string;
  source: string;
  timestamp: string;
  location: {
    lat: number;
    lon: number;
    depth: number; // In meters (0 = surface)
  };
  measurements: Record<string, { value: number; unit: string }>;
}

export interface ScientificDataRegistry {
  atmosphericWind?: VectorGridData;
  atmosphericTemperature?: ScalarGridData;
  oceanSurfaceCurrents?: VectorGridData;
  seaSurfaceTemperature?: ScalarGridData;
  seaSurfaceTemperatureAnomaly?: ScalarGridData;
  waves?: VectorGridData;
  significantWaveHeight?: ScalarGridData;
  depthResolvedTemperature?: Map<number, ScalarGridData>; // depth (m) -> grid
  depthResolvedSalinity?: Map<number, ScalarGridData>;    // depth (m) -> grid
  depthResolvedChlorophyll?: Map<number, ScalarGridData>; // depth (m) -> grid
  argoObservations?: PointObservation[];
}
