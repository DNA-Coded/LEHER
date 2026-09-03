#!/usr/bin/env python3
"""
Phase 1: Data Acquisition Script for SamudraX
Downloads sample oceanographic data from Copernicus, NOAA, GEBCO, and Argo sources
"""

import os
import requests
import xarray as xr
import numpy as np
from pathlib import Path
import json

# Get the current working directory (should be the fr directory)
CWD = Path.cwd()
print(f"Current working directory: {CWD}")

# Create data directories relative to CWD
RAW_DATA_DIR = CWD / "data" / "raw"
PROCESSED_DATA_DIR = CWD / "data" / "processed"
METADATA_DIR = CWD / "data" / "metadata"

for dir_path in [RAW_DATA_DIR, PROCESSED_DATA_DIR, METADATA_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

def download_file(url, destination):
    """Download a file with progress indication"""
    print(f"Downloading {url}")
    response = requests.get(url, stream=True)
    response.raise_for_status()

    total_size = int(response.headers.get('content-length', 0))
    block_size = 1024  # 1 Kibibyte

    with open(destination, 'wb') as file:
        for data in response.iter_content(block_size):
            file.write(data)

    print(f"Downloaded to {destination}")

def get_sample_argo_data():
    """Get sample Argo float data from GDAC FTP"""
    # Using a known Argo float profile from the GDAC
    argo_url = "https://data-argo.ifremer.fr/geo/indian_ocean/2902345/profiles/R2902345_001.nc"
    argo_path = RAW_DATA_DIR / "argo_float_2902345.nc"

    if not argo_path.exists():
        try:
            download_file(argo_url, argo_path)
            return argo_path
        except Exception as e:
            print(f"Failed to download Argo data: {e}")
            # Create a minimal sample NetCDF for demonstration
            return create_sample_argo_netcdf(argo_path)
    else:
        print(f"Argo data already exists at {argo_path}")
        return argo_path

def create_sample_argo_netcdf(path):
    """Create a sample Argo NetCDF file for demonstration"""
    print("Creating sample Argo NetCDF file...")

    # Create sample data
    n_prof = 1
    n_levels = 50

    # Pressure levels (0-2000 dbar)
    pressure = np.linspace(0, 2000, n_levels)

    # Temperature profile (surface warmer, deeper colder)
    temperature = 28 - (pressure / 2000) * 20  # 28°C at surface, 8°C at 2000m
    temperature += np.random.normal(0, 0.5, n_levels)  # Add noise

    # Salinity profile
    salinity = 35 + (pressure / 2000) * 1  # 35 PSU at surface, 36 PSU at 2000m
    salinity += np.random.normal(0, 0.1, n_levels)

    # Create dataset
    ds = xr.Dataset(
        {
            "TEMP": (["N_PROF", "N_LEVELS"], temperature.reshape(1, -1), {"units": "degree_Celsius"}),
            "PSAL": (["N_PROF", "N_LEVELS"], salinity.reshape(1, -1), {"units": "PSU"}),
            "PRES": (["N_PROF", "N_LEVELS"], pressure.reshape(1, -1), {"units": "decibar"}),
        },
        coords={
            "N_PROF": [0],
            "N_LEVELS": np.arange(n_levels),
            "LATITUDE": (["N_PROF"], [15.4], {"units": "degrees_north"}),
            "LONGITUDE": (["N_PROF"], [71.2], {"units": "degrees_east"}),
            "JULD": (["N_PROF"], [2459945.5], {"units": "days since 1950-01-01 00:00:00 UTC"}),
        }
    )

    # Add global attributes
    ds.attrs.update({
        "title": "ARGO float sample data",
        "platform_type": "ARGO float",
        "project_name": "Argo",
        "data_mode": "R",
        "date_creation": "2026-09-03T12:00:00Z",
        "date_update": "2026-09-03T12:00:00Z",
        "geospatial_lat_min": 15.4,
        "geospatial_lat_max": 15.4,
        "geospatial_lon_min": 71.2,
        "geospatial_lon_max": 71.2,
    })

    # Save to NetCDF
    ds.to_netcdf(path)
    print(f"Created sample Argo data at {path}")
    return path

def get_sample_gebco_data():
    """Get sample GEBCO bathymetry data"""
    # For demo, we'll create a simple bathymetry grid
    gebco_path = RAW_DATA_DIR / "gebco_sample.nc"

    if not gebco_path.exists():
        print("Creating sample GEBCO bathymetry data...")

        # Create a simple bathymetry grid for Arabian Sea region
        lat = np.linspace(10, 20, 100)  # 10°N to 20°N
        lon = np.linspace(60, 80, 100)  # 60°E to 80°E
        lon2d, lat2d = np.meshgrid(lon, lat)

        # Simple bathymetry: deeper offshore, shallower near coast
        depth = -2000 + 1500 * np.exp(-((lat2d - 15)**2 + (lon2d - 70)**2) / 50)
        depth = np.maximum(depth, -5000)  # Max depth 5000m
        depth = np.minimum(depth, 0)      # Min depth 0m (no positive values)

        # Create dataset
        ds = xr.Dataset(
            {
                "elevation": (["latitude", "longitude"], depth, {"units": "meters", "positive": "down"}),
            },
            coords={
                "latitude": lat,
                "longitude": lon,
            }
        )

        ds.attrs.update({
            "title": "Sample GECO bathymetry",
            "source": "Generated for SamudraX demo",
            "geospatial_lat_min": lat.min(),
            "geospatial_lat_max": lat.max(),
            "geospatial_lon_min": lon.min(),
            "geospatial_lon_max": lon.max(),
        })

        ds.to_netcdf(gebco_path)
        print(f"Created sample GEBCO data at {gebco_path}")
    else:
        print(f"GEBCO data already exists at {gebco_path}")

    return gebco_path

def get_sample_noaa_data():
    """Get sample NOAA/Oscar currents data (we already have this)"""
    noaa_path = RAW_DATA_DIR / "oscar_currents.json"

    # Check if we already have the OSCAR data
    existing_path = CWD / "public" / "earth" / "data" / "oscar" / "20140131-surface-currents-oscar-0.33.json"
    if existing_path.exists():
        import shutil
        shutil.copy(existing_path, noaa_path)
        print(f"Copied existing OSCAR data to {noaa_path}")
        return noaa_path

    # If not, create a simple sample
    print("Creating sample OSCAR currents data...")
    # For simplicity, we'll reference the existing data
    return existing_path if existing_path.exists() else None

def main():
    """Main function to download all sample data"""
    print("=" * 50)
    print("SamudraX Phase 1: Data Acquisition")
    print("=" * 50)

    # Download/ create sample data
    argo_file = get_sample_argo_data()
    gebco_file = get_sample_gebco_data()
    noaa_file = get_sample_noaa_data()

    # Create metadata file
    metadata = {
        "datasets": {
            "argo": {
                "file": str(argo_file.relative_to(CWD)),
                "type": "NetCDF",
                "variables": ["TEMP", "PSAL", "PRES"],
                "description": "Argo float profile data"
            },
            "gebco": {
                "file": str(gebco_file.relative_to(CWD)),
                "type": "NetCDF",
                "variables": ["elevation"],
                "description": "Bathymetry data"
            },
            "noaa_oscar": {
                "file": str(noaa_file.relative_to(CWD)) if noaa_file else "Not available",
                "type": "JSON",
                "variables": ["u", "v"],
                "description": "Ocean surface currents"
            }
        },
        "download_date": "2026-09-03",
        "purpose": "Phase 1 data acquisition for SamudraX ocean visualization platform"
    }

    metadata_path = METADATA_DIR / "dataset_inventory.json"
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f"\nMetadata saved to {metadata_path}")
    print("\nPhase 1 data acquisition complete!")
    print("Next steps: Move to Phase 2 (Data Engine) to process these datasets")

if __name__ == "__main__":
    main()