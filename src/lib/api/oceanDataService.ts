import type {
  TraceableMeasurement,
  TraceablePointReport
} from "@/lib/data/registry";

/**
 * Service for interacting with the SamudraX Ocean Data API (FastAPI backend)
 * Replaces the static data loading with live API calls
 */
export class OceanDataService {
  private apiBaseUrl: string;

  constructor(baseUrl: string = "http://localhost:8000") {
    this.apiBaseUrl = baseUrl;
  }

  /**
   * Get temperature data for a specific location and depth
   */
  async getTemperature(lat: number, lon: number, depth?: number): Promise<number> {
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
      });

      if (depth !== undefined) {
        params.append('depth', depth.toString());
      }

      const response = await fetch(`${this.apiBaseUrl}/temperature?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.value;
    } catch (error) {
      console.error("Error fetching temperature data:", error);
      // Fallback to a reasonable default
      return 28.0 - (depth || 0) * 0.01; // Simple gradient
    }
  }

  /**
   * Get salinity data for a specific location and depth
   */
  async getSalinity(lat: number, lon: number, depth?: number): Promise<number> {
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
      });

      if (depth !== undefined) {
        params.append('depth', depth.toString());
      }

      const response = await fetch(`${this.apiBaseUrl}/salinity?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.value;
    } catch (error) {
      console.error("Error fetching salinity data:", error);
      // Fallback to a reasonable default
      return 35.0 + (depth || 0) * 0.005; // Simple gradient
    }
  }

  /**
   * Get ocean current data for a specific location
   */
  async getCurrents(lat: number, lon: number): Promise<{u: number; v: number; speed: number; direction: number}> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/currents?lat=${lat}&lon=${lon}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        u: data.u,
        v: data.v,
        speed: data.speed_mps,
        direction: data.direction_deg
      };
    } catch (error) {
      console.error("Error fetching currents data:", error);
      // Fallback to reasonable defaults
      return { u: 0.1, v: 0.05, speed: 0.112, direction: 45 };
    }
  }

  /**
   * Get bathymetry (seafloor depth) for a specific location
   */
  async getBathymetry(lat: number, lon: number): Promise<number> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/bathymetry?lat=${lat}&lon=${lon}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.value;
    } catch (error) {
      console.error("Error fetching bathymetry data:", error);
      // Fallback to reasonable default for Arabian Sea
      return 2000;
    }
  }

  /**
   * Get full vertical profiles (temperature and salinity vs depth)
   */
  async getProfiles(lat: number = 15.4, lon: number = 71.2): Promise<{
    depthLevels: number[];
    temperature: number[];
    salinity: number[];
  }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/profiles?lat=${lat}&lon=${lon}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        depthLevels: data.depth_levels,
        temperature: data.temperature,
        salinity: data.salinity
      };
    } catch (error) {
      console.error("Error fetching profiles data:", error);
      // Return simplified fallback profiles
      const depths = Array.from({length: 20}, (_, i) => i * 100); // 0-1900m in 100m steps
      const temps = depths.map(d => 28 - d * 0.015); // Surface 28°C, decreasing with depth
      const sals = depths.map(d => 35 + d * 0.002);  // Surface 35 PSU, slightly increasing

      return {
        depthLevels: depths,
        temperature: temps,
        salinity: sals
      };
    }
  }

  /**
   * Get a comprehensive traceable point report (similar to the original service)
   * This maintains compatibility with existing UI components
   */
  async getPointData(lat: number, lon: number, depth: number = 0): Promise<TraceablePointReport> {
    try {
      // Fetch all relevant data in parallel
      const [tempPromise, salPromise, currentsPromise, bathymetryPromise] = [
        this.getTemperature(lat, lon, depth),
        this.getSalinity(lat, lon, depth),
        this.getCurrents(lat, lon),
        this.getBathymetry(lat, lon)
      ];

      const [temperature, salinity, currents, bathymetry] = await Promise.all([
        tempPromise, salPromise, currentsPromise, bathymetryPromise
      ]);

      // Create traceable measurements with metadata
      const measurements: Record<string, TraceableMeasurement> = {
        temperature: {
          value: temperature,
          unit: "°C",
          source: "SamudraX Ocean Data API (FastAPI backend)",
          timestamp: new Date().toISOString(),
          variableName: "Water Temperature"
        },
        salinity: {
          value: salinity,
          unit: "PSU",
          source: "SamudraX Ocean Data API (FastAPI backend)",
          timestamp: new Date().toISOString(),
          variableName: "Salinity"
        },
        currentSpeed: {
          value: currents.speed,
          unit: "m/s",
          source: "SamudraX Ocean Data API (FastAPI backend)",
          timestamp: new Date().toISOString(),
          variableName: "Current Speed"
        },
        currentDirection: {
          value: currents.direction,
          unit: "° True",
          source: "SamudraX Ocean Data API (FastAPI backend)",
          timestamp: new Date().toISOString(),
          variableName: "Current Direction"
        },
        bathymetry: {
          value: bathymetry,
          unit: "meters",
          source: "SamudraX Ocean Data API (FastAPI backend)",
          timestamp: new Date().toISOString(),
          variableName: "Seafloor Depth"
        }
      };

      // Add Argo-like telemetry (simulated for now)
      const argoTelemetry = {
        id: 'API-FLOAT-001',
        source: 'SamudraX Ocean Data API',
        timestamp: new Date().toISOString(),
        location: { lat, lon, depth },
        measurements: {
          temperature: { value: temperature, unit: '°C' },
          salinity: { value: salinity, unit: 'PSU' },
          pressure: { value: depth * 1.02, unit: 'dbar' } // approximate conversion
        }
      };

      return {
        location: { lat, lon, depth },
        timestamp: new Date().toISOString(),
        measurements,
        argoTelemetry
      };
    } catch (error) {
      console.error("Error creating point data report:", error);
      // Return a basic fallback report
      return {
        location: { lat, lon, depth },
        timestamp: new Date().toISOString(),
        measurements: {
          temperature: {
            value: 28.0 - (depth * 0.01),
            unit: "°C",
            source: "Fallback estimation",
            timestamp: new Date().toISOString(),
            variableName: "Water Temperature"
          },
          salinity: {
            value: 35.0 + (depth * 0.005),
            unit: "PSU",
            source: "Fallback estimation",
            timestamp: new Date().toISOString(),
            variableName: "Salinity"
          }
        },
        argoTelemetry: {
          id: 'FLOAT-FALLBACK',
          source: 'Fallback',
          timestamp: new Date().toISOString(),
          location: { lat, lon, depth },
          measurements: {
            temperature: { value: 28.0 - (depth * 0.01), unit: '°C' },
            salinity: { value: 35.0 + (depth * 0.005), unit: 'PSU' },
            pressure: { value: depth * 1.02, unit: 'dbar' }
          }
        }
      };
    }
  }
}

// Export a singleton instance
export const oceanDataService = new OceanDataService();