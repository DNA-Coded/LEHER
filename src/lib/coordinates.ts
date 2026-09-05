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
