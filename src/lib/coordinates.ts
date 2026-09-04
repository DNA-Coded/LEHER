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
