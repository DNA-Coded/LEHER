import * as THREE from 'three';

/**
 * Converts Latitude and Longitude to a Vector3 position on a sphere.
 * Assumes a standard coordinate system where:
 * +Y is North Pole (Lat = 90)
 * +Z is Prime Meridian (Lat = 0, Lon = 0)
 * +X is 90 degrees East (Lat = 0, Lon = 90)
 * 
 * @param lat Latitude in degrees
 * @param lon Longitude in degrees
 * @param radius Radius of the sphere
 * @returns THREE.Vector3
 */
export function latLonToVector3(lat: number, lon: number, radius: number = 1): THREE.Vector3 {
  // Convert degrees to radians
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 90) * (Math.PI / 180);

  // Spherical to Cartesian coordinate conversion
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

/**
 * Converts a Vector3 position on a sphere to Latitude and Longitude.
 * 
 * @param v The THREE.Vector3 position
 * @param radius Radius of the sphere (optional, calculated from vector if not provided)
 * @returns Object with lat and lon in degrees
 */
export function vector3ToLatLon(v: THREE.Vector3, radius?: number): { lat: number; lon: number } {
  const r = radius || v.length();
  
  // Calculate phi and theta
  const phi = Math.acos(v.y / r); // from y = r * cos(phi)
  
  // Using Math.atan2 to get theta from z and x
  // We had: x = -r * sin(phi) * cos(theta) => -x/(r*sin(phi)) = cos(theta)
  // We had: z = r * sin(phi) * sin(theta) => z/(r*sin(phi)) = sin(theta)
  // atan2(sin, cos) -> atan2(z, -x)
  const theta = Math.atan2(v.z, -v.x);
  
  // Convert back to lat/lon in degrees
  const lat = 90 - (phi * 180 / Math.PI);
  let lon = (theta * 180 / Math.PI) - 90;
  
  // Normalize longitude to -180 to 180
  if (lon < -180) lon += 360;
  if (lon > 180) lon -= 360;
  
  return { lat, lon };
}

export const HIGHLIGHTED_BOUNDS = {
  minLat: -20.0,
  maxLat: 25.0,
  minLon: 53.0,
  maxLon: 99.0,
  label: "20°S – 25°N, 53°E – 99°E",
  latRangeStr: "20°S to 25°N (-20° to +25°)",
  lonRangeStr: "53°E to 99°E (53° to 99°)",
};

export interface CoordinateValidationResult {
  isValid: boolean;
  latError?: string;
  lonError?: string;
  message?: string;
}

/**
 * Check if the given latitude and longitude coordinates fall within
 * the highlighted operational Indian Ocean sector.
 */
export function isCoordinateInHighlightedArea(lat: number, lon: number): boolean {
  if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
    return false;
  }
  return (
    lat >= HIGHLIGHTED_BOUNDS.minLat &&
    lat <= HIGHLIGHTED_BOUNDS.maxLat &&
    lon >= HIGHLIGHTED_BOUNDS.minLon &&
    lon <= HIGHLIGHTED_BOUNDS.maxLon
  );
}

/**
 * Validates coordinate inputs against the highlighted bounding area and returns
 * descriptive error feedback if coordinates are invalid or outside the operational sector.
 */
export function validateCoordinates(lat: number, lon: number): CoordinateValidationResult {
  if (isCoordinateInHighlightedArea(lat, lon)) {
    return { isValid: true };
  }

  let latError: string | undefined;
  let lonError: string | undefined;

  if (typeof lat !== 'number' || isNaN(lat)) {
    latError = 'Latitude value is required';
  } else if (lat < HIGHLIGHTED_BOUNDS.minLat || lat > HIGHLIGHTED_BOUNDS.maxLat) {
    const latFormatted = lat >= 0 ? `${lat.toFixed(2)}°N` : `${Math.abs(lat).toFixed(2)}°S`;
    latError = `Latitude ${latFormatted} is outside highlighted sector (${HIGHLIGHTED_BOUNDS.latRangeStr})`;
  }

  if (typeof lon !== 'number' || isNaN(lon)) {
    lonError = 'Longitude value is required';
  } else if (lon < HIGHLIGHTED_BOUNDS.minLon || lon > HIGHLIGHTED_BOUNDS.maxLon) {
    const lonFormatted = lon >= 0 ? `${lon.toFixed(2)}°E` : `${Math.abs(lon).toFixed(2)}°W`;
    lonError = `Longitude ${lonFormatted} is outside highlighted sector (${HIGHLIGHTED_BOUNDS.lonRangeStr})`;
  }

  const parts = [latError, lonError].filter(Boolean);
  const message = parts.join('. ');

  return {
    isValid: false,
    latError,
    lonError,
    message,
  };
}

