#!/usr/bin/env python3
"""
Phase 3: Backend for Leher
FastAPI server that serves processed oceanographic data to the frontend
"""

import os
import json
from pathlib import Path
from typing import Optional, Dict, Any, List
import xarray as xr
import numpy as np
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Initialize FastAPI app
app = FastAPI(
    title="Leher Ocean Data API",
    description="Backend API for serving processed oceanographic data",
    version="0.1.0",
)

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get the current working directory (should be the fr directory)
CWD = Path.cwd()
print(f"Backend working directory: {CWD}")

# Define paths
PROCESSED_DATA_DIR = CWD / "data" / "processed"
METADATA_DIR = CWD / "data" / "metadata"

# Ensure directories exist
PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)
METADATA_DIR.mkdir(parents=True, exist_ok=True)

# Global cache for loaded datasets (to avoid reloading on every request)
_dataset_cache = {}

def load_dataset_cached(filepath: Path):
    """Load a dataset and cache it to avoid repeated disk I/O"""
    str_path = str(filepath)
    if str_path not in _dataset_cache:
        if filepath.suffix == '.nc':
            _dataset_cache[str_path] = xr.open_dataset(filepath)
        elif filepath.suffix == '.json':
            with open(filepath, 'r') as f:
                _dataset_cache[str_path] = json.load(f)
        elif filepath.suffix == '.csv':
            import pandas as pd
            _dataset_cache[str_path] = pd.read_csv(filepath)
        else:
            raise ValueError(f"Unsupported file type: {filepath.suffix}")
    return _dataset_cache[str_path]

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Leher Ocean Data API",
        "version": "0.1.0",
        "endpoints": [
            "/temperature",
            "/salinity",
            "/currents",
            "/bathymetry",
            "/profiles",
            "/metadata/datasets",
            "/metadata/{dataset_name}"
        ]
    }

@app.get("/temperature")
async def get_temperature(
    lat: float = Query(..., description="Latitude in degrees"),
    lon: float = Query(..., description="Longitude in degrees"),
    depth: Optional[float] = Query(None, description="Depth in meters (optional)"),
    time_point: Optional[str] = Query(None, description="Time point (optional)")
):
    """
    Get temperature data at a specific location and optionally depth
    Returns temperature in degrees Celsius
    """
    try:
        # Load Argo profile data (contains temperature vs depth)
        argo_ds = load_dataset_cached(PROCESSED_DATA_DIR / "argo_profile_processed.nc")

        # Get the temperature profile
        temp_profile = argo_ds['temperature'].values
        depth_levels = argo_ds['depth'].values

        # If depth is specified, interpolate to that depth
        if depth is not None:
            # Simple linear interpolation (in production, use xarray's interpolation)
            if depth <= depth_levels.min():
                temp_value = float(temp_profile[0])
            elif depth >= depth_levels.max():
                temp_value = float(temp_profile[-1])
            else:
                # Find surrounding depth levels and interpolate
                idx = np.searchsorted(depth_levels, depth)
                if idx == 0:
                    temp_value = float(temp_profile[0])
                elif idx == len(depth_levels):
                    temp_value = float(temp_profile[-1])
                else:
                    # Linear interpolation
                    d1, d2 = depth_levels[idx-1], depth_levels[idx]
                    t1, t2 = temp_profile[idx-1], temp_profile[idx]
                    temp_value = float(t1 + (t2 - t1) * (depth - d1) / (d2 - d1))
        else:
            # Return surface temperature (first depth level)
            temp_value = float(temp_profile[0])

        return {
            "variable": "temperature",
            "value": temp_value,
            "units": "degree_Celsius",
            "location": {"lat": lat, "lon": lon},
            "depth": depth if depth is not None else 0.0,
            "source": "ARGO GDAC (processed)",
            "processing_level": "L2"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving temperature data: {str(e)}")

@app.get("/salinity")
async def get_salinity(
    lat: float = Query(..., description="Latitude in degrees"),
    lon: float = Query(..., description="Longitude in degrees"),
    depth: Optional[float] = Query(None, description="Depth in meters (optional)"),
    time_point: Optional[str] = Query(None, description="Time point (optional)")
):
    """
    Get salinity data at a specific location and optionally depth
    Returns salinity in PSU
    """
    try:
        # Load Argo profile data (contains salinity vs depth)
        argo_ds = load_dataset_cached(PROCESSED_DATA_DIR / "argo_profile_processed.nc")

        # Get the salinity profile
        sal_profile = argo_ds['salinity'].values
        depth_levels = argo_ds['depth'].values

        # If depth is specified, interpolate to that depth
        if depth is not None:
            # Simple linear interpolation
            if depth <= depth_levels.min():
                sal_value = float(sal_profile[0])
            elif depth >= depth_levels.max():
                sal_value = float(sal_profile[-1])
            else:
                # Find surrounding depth levels and interpolate
                idx = np.searchsorted(depth_levels, depth)
                if idx == 0:
                    sal_value = float(sal_profile[0])
                elif idx == len(depth_levels):
                    sal_value = float(sal_profile[-1])
                else:
                    # Linear interpolation
                    d1, d2 = depth_levels[idx-1], depth_levels[idx]
                    s1, s2 = sal_profile[idx-1], sal_profile[idx]
                    sal_value = float(s1 + (s2 - s1) * (depth - d1) / (d2 - d1))
        else:
            # Return surface salinity (first depth level)
            sal_value = float(sal_profile[0])

        return {
            "variable": "salinity",
            "value": sal_value,
            "units": "PSU",
            "location": {"lat": lat, "lon": lon},
            "depth": depth if depth is not None else 0.0,
            "source": "ARGO GDAC (processed)",
            "processing_level": "L2"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving salinity data: {str(e)}")

@app.get("/currents")
async def get_currents(
    lat: float = Query(..., description="Latitude in degrees"),
    lon: float = Query(..., description="Longitude in degrees")
):
    """
    Get ocean surface current data at a specific location
    Returns current velocity components (u, v) in m/s
    """
    try:
        # Load OSCAR currents data
        oscar_data = load_dataset_cached(PROCESSED_DATA_DIR / "oscar_currents_processed.json")

        # Extract the raw OSCAR data (which is in GRIB-JSON format)
        raw_data = oscar_data['data']

        # Use the same logic as in the existing loaders to query at point
        # We'll reuse the query function from our existing loader
        import sys
        sys.path.append(str(CWD / "src" / "lib" / "data" / "loaders"))

        try:
            from oscarCurrents import parseOscarCurrentsJson, queryCurrentsAtPoint

            # Parse the OSCAR data
            grid = parseOscarCurrentsJson(raw_data)

            # Query at the specified point
            result = queryCurrentsAtPoint(grid, lat, lon)

            if result is None:
                # Return default/no data values
                return {
                    "variable": "ocean_currents",
                    "u": 0.0,
                    "v": 0.0,
                    "speed_mps": 0.0,
                    "speed_knots": 0.0,
                    "direction_deg": 0.0,
                    "units": "m/s",
                    "location": {"lat": lat, "lon": lon},
                    "source": "NOAA/OSCAR (processed)",
                    "note": "No data available at this location"
                }

            return {
                "variable": "ocean_currents",
                "u": result['u'],
                "v": result['v'],
                "speed_mps": result['speedMps'],
                "speed_knots": result['speedKnots'],
                "direction_deg": result['directionDeg'],
                "units": "m/s",
                "location": {"lat": lat, "lon": lon},
                "source": "NOAA/OSCAR (processed)",
                "processing_level": "L2"
            }

        except ImportError:
            # Fallback if we can't import the loader
            return {
                "variable": "ocean_currents",
                "u": 0.1,  # Sample values
                "v": 0.05,
                "speed_mps": 0.112,
                "speed_knots": 0.217,
                "direction_deg": 45.0,
                "units": "m/s",
                "location": {"lat": lat, "lon": lon},
                "source": "NOAA/OSCAR (processed - sample)",
                "note": "Using sample data - loader import failed"
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving currents data: {str(e)}")

@app.get("/bathymetry")
async def get_bathymetry(
    lat: float = Query(..., description="Latitude in degrees"),
    lon: float = Query(..., description="Longitude in degrees")
):
    """
    Get bathymetry (seafloor depth) at a specific location
    Returns depth in meters (positive value)
    """
    try:
        # Load GEBCO bathymetry data
        gebco_ds = load_dataset_cached(PROCESSED_DATA_DIR / "gebco_bathymetry_processed.nc")

        # Get bathymetry data
        bathymetry_data = gebco_ds['bathymetry'].values
        lats = gebco_ds['latitude'].values
        lons = gebco_ds['longitude'].values

        # Find nearest grid point (simple approach)
        lat_idx = np.argmin(np.abs(lats - lat))
        lon_idx = np.argmin(np.abs(lons - lon))

        depth_value = float(bathymetry_data[lat_idx, lon_idx])

        # Ensure depth is positive (our processing made it positive up)
        depth_value = abs(depth_value)

        return {
            "variable": "bathymetry",
            "value": depth_value,
            "units": "meters",
            "location": {"lat": lat, "lon": lon},
            "source": "GEBCO (processed)",
            "processing_level": "L2"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving bathymetry data: {str(e)}")

@app.get("/profiles")
async def get_profiles(
    lat: float = Query(15.4, description="Latitude in degrees"),
    lon: float = Query(71.2, description="Longitude in degrees")
):
    """
    Get full vertical profiles of temperature and salinity at a location
    Returns arrays of values at different depths
    """
    try:
        # Load Argo profile data
        argo_ds = load_dataset_cached(PROCESSED_DATA_DIR / "argo_profile_processed.nc")

        # Get the full profiles
        temp_profile = argo_ds['temperature'].values.tolist()
        sal_profile = argo_ds['salinity'].values.tolist()
        depth_levels = argo_ds['depth'].values.tolist()

        return {
            "location": {"lat": lat, "lon": lon},
            "depth_levels": depth_levels,
            "depth_units": "meters",
            "temperature": temp_profile,
            "temperature_units": "degree_Celsius",
            "salinity": sal_profile,
            "salinity_units": "PSU",
            "source": "ARGO GDAC (processed)",
            "processing_level": "L2",
            "profile_count": len(depth_levels)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving profile data: {str(e)}")

@app.get("/metadata/datasets")
async def list_datasets():
    """List all available processed datasets"""
    try:
        catalog_path = METADATA_DIR / "processed_datasets_catalog.json"
        if catalog_path.exists():
            with open(catalog_path, 'r') as f:
                catalog = json.load(f)
            return catalog
        else:
            return {"message": "No dataset catalog found", "datasets": {}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading dataset catalog: {str(e)}")

@app.get("/metadata/{dataset_name}")
async def get_dataset_metadata(dataset_name: str):
    """Get metadata for a specific dataset"""
    try:
        catalog_path = METADATA_DIR / "processed_datasets_catalog.json"
        if not catalog_path.exists():
            raise HTTPException(status_code=404, detail="Dataset catalog not found")

        with open(catalog_path, 'r') as f:
            catalog = json.load(f)

        if "datasets" not in catalog or dataset_name not in catalog["datasets"]:
            raise HTTPException(status_code=404, detail=f"Dataset '{dataset_name}' not found")

        return catalog["datasets"][dataset_name]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving dataset metadata: {str(e)}")

if __name__ == "__main__":
    # Run the server
    print("Starting Leher Ocean Data API...")
    print("API will be available at: http://localhost:8000")
    print("Documentation available at: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)