import React, { useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { oceanDataService } from '@/lib/api/oceanDataService';
import { latLonToVector3 } from '@/lib/coordinates';

interface BathymetryLayerProps {
  radius?: number;
  latMin?: number;
  latMax?: number;
  lonMin?: number;
  lonMax?: number;
}

export const BathymetryLayer: React.FC<BathymetryLayerProps> = ({
  radius = 1.001, // Slightly above Earth surface
  latMin = -20,
  latMax = 25,
  lonMin = 50,
  lonMax = 100
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchBathymetry = async () => {
      try {
        setLoading(true);
        // Using the existing oceanDataService which calls FastAPI
        const response = await oceanDataService.getGridData(
          "bathymetry",
          latMin,
          latMax,
          lonMin,
          lonMax
        );
        if (mounted) {
          setData(response);
          setError(null);
          
          // Debugging log to verify real values and depth sign
          if (response.values && response.values.length > 0) {
            let sampleFound = false;
            let sampleVal = 0;
            let minVal = Infinity;
            let maxVal = -Infinity;
            
            for (let r of response.values) {
              for (let v of r) {
                if (v !== null && !isNaN(v)) {
                  if (!sampleFound) {
                    sampleVal = v;
                    sampleFound = true;
                  }
                  if (v < minVal) minVal = v;
                  if (v > maxVal) maxVal = v;
                }
              }
            }
            console.log(`[Phase 4C] Bathymetry loaded. Sample value: ${sampleVal}. Range: [${minVal}, ${maxVal}]. Sign convention check: Ocean depths are typically negative in GEBCO elevation grids.`);
          }
        }
      } catch (err: any) {
        if (mounted) {
          console.error("[Phase 4C] Bathymetry load error:", err);
          setError(err.message || "Failed to load bathymetry");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchBathymetry();

    return () => {
      mounted = false;
    };
  }, [latMin, latMax, lonMin, lonMax]);

  const geometry = useMemo(() => {
    if (!data || !data.coordinates || !data.values) return null;

    const lats: number[] = data.coordinates.latitude;
    const lons: number[] = data.coordinates.longitude;
    const values: (number | null)[][] = data.values;
    
    if (lats.length === 0 || lons.length === 0) return null;
    
    const rows = lats.length;
    const cols = lons.length;
    
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    const colorScale = new THREE.Color();
    
    // Scientific continuous color scale for bathymetry
    // Shallow: light cyan/teal -> Deep: dark blue
    const getColor = (depth: number) => {
      // Assuming GEBCO sign convention: ocean depth is negative.
      // We clamp depth from 0 (surface) to -6000 (deep ocean).
      const validDepth = depth > 0 ? 0 : depth; 
      const normalized = Math.max(0, Math.min(1, Math.abs(validDepth) / 6000));
      
      colorScale.lerpColors(
        new THREE.Color('#48cae4'), // Shallow water (light cyan)
        new THREE.Color('#03045e'), // Deep water (dark navy)
        normalized
      );
      return colorScale;
    };

    let vertexIndex = 0;
    // Map to keep track of valid vertex indices by grid coordinate (row,col)
    const validIndices = new Map<string, number>();

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        let val = values[i][j];
        
        // Handle invalid values safely, skip geometry generation for them
        // Also skip positive elevations (land) if they exist
        if (val === null || val === undefined || isNaN(val) || val > 0) {
          continue;
        }

        const lat = lats[i];
        const lon = lons[j];
        
        // Use Phase 4B coordinate system
        const pos = latLonToVector3(lat, lon, radius);
        positions.push(pos.x, pos.y, pos.z);
        
        const c = getColor(val);
        colors.push(c.r, c.g, c.b);
        
        validIndices.set(`${i},${j}`, vertexIndex);
        vertexIndex++;
      }
    }

    // Generate indices for the mesh
    for (let i = 0; i < rows - 1; i++) {
      for (let j = 0; j < cols - 1; j++) {
        const i0 = validIndices.get(`${i},${j}`);
        const i1 = validIndices.get(`${i + 1},${j}`);
        const i2 = validIndices.get(`${i},${j + 1}`);
        const i3 = validIndices.get(`${i + 1},${j + 1}`);

        // Only create triangles if all 4 vertices of a grid cell are valid
        if (i0 !== undefined && i1 !== undefined && i2 !== undefined && i3 !== undefined) {
          indices.push(i0, i1, i2);
          indices.push(i2, i1, i3);
        }
      }
    }

    if (positions.length === 0) return null;

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    return geom;
  }, [data, radius]);

  if (loading) {
    // Optionally return a minimal loading state for the layer
    return null;
  }

  if (error || !geometry) {
    return null;
  }

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial 
        vertexColors={true} 
        transparent={true}
        opacity={0.85}
        side={THREE.DoubleSide}
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  );
};
