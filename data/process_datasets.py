#!/usr/bin/env python3
"""
Phase 2: Data Engine for SamudraX
Processes raw oceanographic data using xarray and numpy for use in the visualization platform
"""

import xarray as xr
import numpy as np
import json
import os
from pathlib import Path
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get the current working directory (should be the fr directory)
CWD = Path.cwd()
print(f"Current working directory: {CWD}")

# Define paths
RAW_DATA_DIR = CWD / "data" / "raw"
PROCESSED_DATA_DIR = CWD / "data" / "processed"
METADATA_DIR = CWD / "data" / "metadata"

# Ensure processed directory exists
PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)

def process_argo_data():
    """Process Argo float NetCDF data"""
    logger.info("Processing Argo float data...")

    argo_path = RAW_DATA_DIR / "argo_float_2902345.nc"
    if not argo_path.exists():
        logger.error(f"Argo data not found at {argo_path}")
        return None

    try:
        # Load the dataset
        ds = xr.open_dataset(argo_path)
        logger.info(f"Loaded Argo dataset: {ds}")

        # Extract the profiles we need
        # For simplicity, we'll take the first profile
        temp = ds['TEMP'].isel(N_PROF=0).values  # Temperature in Celsius
        psal = ds['PSAL'].isel(N_PROF=0).values  # Salinity in PSU
        pres = ds['PRES'].isel(N_PROF=0).values  # Pressure in decibar (approx meters depth)

        # Get coordinates
        latitude = float(ds['LATITUDE'].isel(N_PROF=0).values)
        longitude = float(ds['LONGITUDE'].isel(N_PROF=0).values)

        # Convert pressure to approximate depth (1 decibar ≈ 1 meter)
        depth = pres  # Simple approximation

        # Create a processed dataset with standardized naming
        processed_ds = xr.Dataset(
            {
                "temperature": (["depth"], temp, {"units": "degree_Celsius"}),
                "salinity": (["depth"], psal, {"units": "PSU"}),
            },
            coords={
                "depth": (["depth"], depth, {"units": "meters", "positive": "down"}),
                "latitude": latitude,
                "longitude": longitude,
            }
        )

        # Add metadata
        processed_ds.attrs.update({
            "title": "Processed Argo float data",
            "source": "ARGO GDAC",
            "platform": ds.attrs.get("platform_type", "Unknown"),
            "date": str(ds['JULD'].isel(N_PROF=0).values) if 'JULD' in ds.variables else "Unknown",
            "processing_date": "2026-09-03",
        })

        # Save processed data
        output_path = PROCESSED_DATA_DIR / "argo_profile_processed.nc"
        processed_ds.to_netcdf(output_path)
        logger.info(f"Saved processed Argo data to {output_path}")

        # Also save as CSV for easy inspection
        df = processed_ds.to_dataframe().reset_index()
        csv_path = PROCESSED_DATA_DIR / "argo_profile_processed.csv"
        df.to_csv(csv_path, index=False)
        logger.info(f"Saved Argo data as CSV to {csv_path}")

        return processed_ds

    except Exception as e:
        logger.error(f"Error processing Argo data: {e}")
        return None

def process_gebco_data():
    """Process GEBCO bathymetry NetCDF data"""
    logger.info("Processing GEBCO bathymetry data...")

    gebco_path = RAW_DATA_DIR / "gebco_sample.nc"
    if not gebco_path.exists():
        logger.error(f"GEBCO data not found at {gebco_path}")
        return None

    try:
        # Load the dataset
        ds = xr.open_dataset(gebco_path)
        logger.info(f"Loaded GEBCO dataset: {ds}")

        # Extract bathymetry data
        elevation = ds['elevation'].values  # Bathymetry in meters (positive down)

        # Get coordinates
        latitude = ds['latitude'].values
        longitude = ds['longitude'].values

        # Create processed dataset (we'll keep it similar but ensure proper attributes)
        processed_ds = xr.Dataset(
            {
                "bathymetry": (["latitude", "longitude"], -elevation, {"units": "meters"}),  # Make positive up for consistency
            },
            coords={
                "latitude": latitude,
                "longitude": longitude,
            }
        )

        # Add metadata
        processed_ds.attrs.update({
            "title": "Processed GEBCO bathymetry data",
            "source": "GEBCO (sample)",
            "processing_date": "2026-09-03",
        })

        # Save processed data
        output_path = PROCESSED_DATA_DIR / "gebco_bathymetry_processed.nc"
        processed_ds.to_netcdf(output_path)
        logger.info(f"Saved processed GEBCO data to {output_path}")

        return processed_ds

    except Exception as e:
        logger.error(f"Error processing GEBCO data: {e}")
        return None

def process_oscar_data():
    """Process NOAA OSCAR currents JSON data"""
    logger.info("Processing OSCAR currents data...")

    oscar_path = RAW_DATA_DIR / "oscar_currents.json"
    if not oscar_path.exists():
        logger.error(f"OSCAR data not found at {oscar_path}")
        return None

    try:
        # Load the JSON data
        with open(oscar_path, 'r') as f:
            data = json.load(f)

        logger.info("Loaded OSCAR JSON data")

        # The OSCAR data follows the GRIB-JSON format similar to what we saw in the loaders
        # We'll parse it using the same logic as in the existing loaders

        # For now, we'll just save it as-is since our existing loaders can handle it
        # But we'll add some metadata
        output_path = PROCESSED_DATA_DIR / "oscar_currents_processed.json"

        # Add processing metadata
        processed_data = {
            "metadata": {
                "processing_date": "2026-09-03",
                "source": "NOAA/ESR OSCAR",
                "original_file": str(oscar_path.name),
            },
            "data": data
        }

        with open(output_path, 'w') as f:
            json.dump(processed_data, f, indent=2)

        logger.info(f"Saved processed OSCAR data to {output_path}")
        return processed_data

    except Exception as e:
        logger.error(f"Error processing OSCAR data: {e}")
        return None

def create_dataset_catalog():
    """Create a catalog of all processed datasets"""
    logger.info("Creating dataset catalog...")

    catalog = {
        "catalog_date": "2026-09-03",
        "phase": "2 - Data Engine",
        "datasets": {}
    }

    # Check for processed Argo data
    argo_nc = PROCESSED_DATA_DIR / "argo_profile_processed.nc"
    argo_csv = PROCESSED_DATA_DIR / "argo_profile_processed.csv"
    if argo_nc.exists():
        catalog["datasets"]["argo_profile"] = {
            "netcdf_file": str(argo_nc.relative_to(CWD)),
            "csv_file": str(argo_csv.relative_to(CWD)) if argo_csv.exists() else None,
            "variables": ["temperature", "salinity"],
            "coordinates": ["depth", "latitude", "longitude"],
            "description": "Processed Argo float profile data"
        }

    # Check for processed GEBCO data
    gebco_nc = PROCESSED_DATA_DIR / "gebco_bathymetry_processed.nc"
    if gebco_nc.exists():
        catalog["datasets"]["gebco_bathymetry"] = {
            "netcdf_file": str(gebco_nc.relative_to(CWD)),
            "variables": ["bathymetry"],
            "coordinates": ["latitude", "longitude"],
            "description": "Processed GEBCO bathymetry data"
        }

    # Check for processed OSCAR data
    oscar_json = PROCESSED_DATA_DIR / "oscar_currents_processed.json"
    if oscar_json.exists():
        catalog["datasets"]["oscar_currents"] = {
            "json_file": str(oscar_json.relative_to(CWD)),
            "variables": ["u", "v"],  # Original OSCAR variables
            "description": "Processed NOAA OSCAR ocean surface currents"
        }

    # Save catalog
    catalog_path = METADATA_DIR / "processed_datasets_catalog.json"
    with open(catalog_path, 'w') as f:
        json.dump(catalog, f, indent=2)

    logger.info(f"Saved dataset catalog to {catalog_path}")
    return catalog

def main():
    """Main function to process all datasets"""
    print("=" * 50)
    print("SamudraX Phase 2: Data Engine")
    print("=" * 50)

    # Process each dataset
    argo_result = process_argo_data()
    gebco_result = process_gebco_data()
    oscar_result = process_oscar_data()

    # Create catalog
    catalog = create_dataset_catalog()

    print("\n" + "=" * 50)
    print("Phase 2 Data Processing Complete!")
    print("=" * 50)

    if argo_result is not None:
        print("[SUCCESS] Argo float data processed successfully")
    else:
        print("[ERROR] Argo float data processing failed")

    if gebco_result is not None:
        print("[SUCCESS] GEBCO bathymetry data processed successfully")
    else:
        print("[ERROR] GEBCO bathymetry data processing failed")

    if oscar_result is not None:
        print("[SUCCESS] OSCAR currents data processed successfully")
    else:
        print("[ERROR] OSCAR currents data processing failed")

    print(f"\nDataset catalog saved to: data/metadata/processed_datasets_catalog.json")
    print("\nNext steps: Move to Phase 3 (Backend) to create FastAPI endpoints for these datasets")

if __name__ == "__main__":
    main()