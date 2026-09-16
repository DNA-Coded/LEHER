export type OceanVariable = 'temperature' | 'salinity' | 'currents' | 'chlorophyll';

export type AnimationState = 'idle' | 'opening' | 'expanded' | 'closing';

export type ColorScaleName = 'turbo' | 'thermal' | 'haline' | 'viridis' | 'chlorophyll';

export interface RegionStats {
  surfaceAreaKm2: number;
  averageDepthMeters: number;
  maxDepthMeters: number;
  meanTemperatureC: number;
  meanSalinityPsu: number;
  monsoonInfluence: string;
}

export interface OceanRegion {
  id: string;
  name: string;
  hindiName: string;
  description: string;
  bbox: [number, number, number, number]; // [westLon, southLat, eastLon, northLat]
  center: { lon: number; lat: number; zoomDistance: number };
  polygon: [number, number][]; // [lon, lat] coordinates in counter-clockwise order
  minDepth: number;
  maxSupportedDepth: number;
  nativeDepthLevels: number[];
  stats: RegionStats;
  themeColor: string;
}

export interface VariableMetadata {
  id: OceanVariable;
  name: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultColormap: ColorScaleName;
  description: string;
}

export interface OceanSliceData {
  regionId: string;
  variable: OceanVariable;
  depth: number;
  time: string;
  gridWidth: number;
  gridHeight: number;
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
  values: Float32Array; // Transferable scientific scalar values
  normalized: Float32Array; // [0.0 - 1.0] for GPU shaders
  minVal: number;
  maxVal: number;
}

export interface CurrentVector {
  lon: number;
  lat: number;
  depth: number;
  u: number; // Eastward velocity (m/s)
  v: number; // Northward velocity (m/s)
  magnitude: number; // speed (m/s)
  directionRad: number; // direction in radians
  directionDeg: number; // direction in degrees
}

export interface ArgoMeasurement {
  depth: number; // meters (positive)
  pressure: number; // dbar
  temperature: number; // °C
  salinity: number; // PSU
  dissolvedOxygen?: number; // µmol/kg
}

export interface ArgoProfile {
  floatId: string;
  wmoNumber: string;
  platformType: string;
  country: string;
  regionId: string;
  lon: number;
  lat: number;
  cycleNumber: number;
  date: string;
  maxDepth: number;
  measurements: ArgoMeasurement[];
}

export interface VisualizationState {
  selectedRegion: string | null;
  selectedRegionBounds: [number, number, number, number] | null;
  selectedRegionName: string | null;
  variable: OceanVariable;
  depth: number;
  time: string;
  sliceVisible: boolean;
  animationState: AnimationState;
  globeOffset: number; // 0 (centered) to 1 (shifted right/left)
  colorScale: ColorScaleName;
  opacity: number;
  depthScaleFactor: number;
  verticalExaggeration: number;
  isPlayingTime: boolean;
  activeArgoFloatId: string | null;
  hoveredRegionId: string | null;
  isLoadingSlice: boolean;
  showCurrentVectors: boolean;
  showArgoMarkers: boolean;
  showDepthIsoPlanes: boolean;
}
