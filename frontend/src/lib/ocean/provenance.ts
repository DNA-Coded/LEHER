/**
 * Data Provenance & Telemetry Lineage Tracker
 * Provides full transparency on whether ocean measurements and ML predictions
 * are sourced from Live Copernicus Reanalysis (DuckDB), Rakshak ML Models (XGBoost),
 * or client-side Edge Physics Simulation (fallback).
 */

export type OceanDataSource = 'LIVE_COPERNICUS' | 'EDGE_SIMULATION';
export type MLInferenceSource = 'LIVE_RAKSHAK_XGBOOST' | 'HYDRODYNAMIC_PROXY';

export interface DataProvenanceInfo {
  oceanDataSource: OceanDataSource;
  mlSource: MLInferenceSource;
  isBackendConnected: boolean;
  gridResolutionKm: number;
  gridOffsetKm: number;
  isSparseOrOffset: boolean;
  badgeLabel: string;
  badgeTone: 'live' | 'simulation' | 'warning';
  title: string;
  description: string;
  details: {
    dataset: string;
    engine: string;
    nearestGridPoint: string;
    snappingDistance: string;
    statusNote?: string;
  };
}

/**
 * Calculates approximate great-circle distance in kilometers
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Native GLORYS12V1 grid is roughly 1/12 degree (0.0833 deg), ~9.25 km at equator.
 * Finds the nearest theoretical grid node and computes the snapping distance.
 */
export function getNearestGridNodeOffset(lat: number, lon: number): {
  nearestLat: number;
  nearestLon: number;
  offsetKm: number;
} {
  const GRID_RES = 0.083333; // 1/12 degree
  const nearestLat = Math.round(lat / GRID_RES) * GRID_RES;
  const nearestLon = Math.round(lon / GRID_RES) * GRID_RES;
  const offsetKm = calculateDistanceKm(lat, lon, nearestLat, nearestLon);

  return {
    nearestLat: parseFloat(nearestLat.toFixed(4)),
    nearestLon: parseFloat(nearestLon.toFixed(4)),
    offsetKm: parseFloat(offsetKm.toFixed(2)),
  };
}

/**
 * Evaluates the full data provenance for a given coordinate and backend state
 */
export function evaluateDataProvenance(
  lat: number,
  lon: number,
  options: {
    isBackendConnected?: boolean;
    isRealDataFetched?: boolean;
    isMlNearby?: boolean;
    backendError?: string | null;
  } = {}
): DataProvenanceInfo {
  const {
    isBackendConnected = true,
    isRealDataFetched = true,
    isMlNearby = false,
    backendError = null,
  } = options;

  const { nearestLat, nearestLon, offsetKm } = getNearestGridNodeOffset(lat, lon);
  const isSparseOrOffset = offsetKm > 15.0; // Distance exceeds normal grid radius

  const isLive = isBackendConnected && isRealDataFetched && !backendError;
  const isMlLive = isBackendConnected && isMlNearby;

  if (isLive) {
    if (isSparseOrOffset) {
      return {
        oceanDataSource: 'LIVE_COPERNICUS',
        mlSource: isMlLive ? 'LIVE_RAKSHAK_XGBOOST' : 'HYDRODYNAMIC_PROXY',
        isBackendConnected: true,
        gridResolutionKm: 9.25,
        gridOffsetKm: offsetKm,
        isSparseOrOffset: true,
        badgeLabel: 'GRID OFFSET WARNING',
        badgeTone: 'warning',
        title: 'Sparse Grid Snapping (>15 km)',
        description: `Measurement snapped ${offsetKm} km to nearest ocean grid point. Sub-grid variance may exist.`,
        details: {
          dataset: 'Copernicus GLORYS12V1 Reanalysis (DuckDB Native)',
          engine: isMlLive ? 'Rakshak XGBoost ML Pipeline' : 'Thermal Hydrodynamic Proxy',
          nearestGridPoint: `${nearestLat}°N, ${nearestLon}°E`,
          snappingDistance: `${offsetKm} km (Warning: High Offset)`,
          statusNote: 'Native data point is distant from pin. Treat values with wider confidence intervals.',
        },
      };
    }

    return {
      oceanDataSource: 'LIVE_COPERNICUS',
      mlSource: isMlLive ? 'LIVE_RAKSHAK_XGBOOST' : 'HYDRODYNAMIC_PROXY',
      isBackendConnected: true,
      gridResolutionKm: 9.25,
      gridOffsetKm: offsetKm,
      isSparseOrOffset: false,
      badgeLabel: 'LIVE REANALYSIS',
      badgeTone: 'live',
      title: 'Copernicus Marine Reanalysis (Verified)',
      description: `Assimilated satellite altimetry & ARGO profiling floats. Grid offset: ${offsetKm} km (High precision).`,
      details: {
        dataset: 'Copernicus GLORYS12V1 Reanalysis (DuckDB Native)',
        engine: isMlLive ? 'Rakshak XGBoost ML Inference' : 'Regional Hydrodynamic Proxy',
        nearestGridPoint: `${nearestLat}°N, ${nearestLon}°E`,
        snappingDistance: `${offsetKm} km (Within Native ~9km Grid)`,
        statusNote: 'Full fidelity reanalysis. Physics equations validated against Indian Ocean climatology.',
      },
    };
  }

  // Fallback Simulation Mode
  return {
    oceanDataSource: 'EDGE_SIMULATION',
    mlSource: 'HYDRODYNAMIC_PROXY',
    isBackendConnected: isBackendConnected,
    gridResolutionKm: 9.25,
    gridOffsetKm: offsetKm,
    isSparseOrOffset: false,
    badgeLabel: 'EDGE SIMULATION',
    badgeTone: 'simulation',
    title: 'Client-Side Physical Simulation (Fallback)',
    description: backendError
      ? `Live backend query unavailable (${backendError}). Sourced from calibrated ocean thermodynamic equations.`
      : 'Calculated using calibrated oceanographic thermodynamic equations of state (TEOS-10 / Indian Ocean).',
    details: {
      dataset: 'Standalone Ocean Physics Engine (predictOceanState)',
      engine: 'Thermocline & Halocline Thermodynamic Decay Models',
      nearestGridPoint: `${nearestLat}°N, ${nearestLon}°E`,
      snappingDistance: 'Continuous Mathematical Model (0 km offset)',
      statusNote: backendError
        ? `Fallback engaged due to: ${backendError}`
        : 'Running in standalone edge simulation mode.',
    },
  };
}
