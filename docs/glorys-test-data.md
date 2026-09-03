# SamudraX GLORYS12V1 Test Dataset Documentation

## Overview
This document describes the GLORYS12V1 test subset acquired for the SamudraX ocean-data visualization and analysis platform (Step 2: Data Acquisition & Validation).

## Dataset Metadata
- **Dataset Name:** Global Ocean Physics Reanalysis (GLORYS12V1)
- **Copernicus Dataset ID:** `cmems_mod_glo_phy_my_0.083deg_P1D-m`
- **Provider / Source:** Copernicus Marine Service (CMEMS) / Mercator Ocean International
- **DOI:** https://doi.org/10.48670/moi-00021

## Parameters & Subsetting Constraints
- **Variables Included:**
  - `thetao`: Sea water potential temperature (°C)
  - `so`: Sea water salinity (PSU / 1e-3)
  - `uo`: Eastward sea water velocity (m/s)
  - `vo`: Northward sea water velocity (m/s)
- **Geographic Extent:**
  - Longitude: 20°E to 120°E (Indian Ocean and adjacent regions)
  - Latitude: 40°S to 30°N
  - Horizontal Grid: 841 × 1201 (1/12° resolution, ~8 km)
- **Time Extent:**
  - Date: `2020-01-01` (1 day snapshot)
  - Time Steps: 1 daily mean
- **Vertical Depth Coverage:**
  - Levels: 50 standard depth levels preserved
  - Range: 0.494 m (surface) to 5727.92 m (abyssal seafloor)
  - *Note:* Depth dimension is fully preserved to support the SamudraX 3D Depth Slider feature.

## File Format & Storage Location
- **Output Format:** NetCDF (CF-1.4 compliant)
- **File Location:** `data/test/glorys/glorys_test.nc`
- **File Size:** ~385.34 MB

## Directory Structure
```
data/
└── test/
    └── glorys/
        └── glorys_test.nc
```

## Reproduction & Workflow Commands

### Download Test Subset
```bash
python scripts/download_glorys_test.py
```

### Validate Test Subset
```bash
python scripts/validate_glorys_test.py
```

## Authentication Requirements
- Requires valid Copernicus Marine credentials.
- Can be provided via system environment variables or `.env` file (`COPERNICUS_USERNAME` / `COPERNICUS_PASSWORD` or `COPERNICUSMARINE_SERVICE_USERNAME` / `COPERNICUSMARINE_SERVICE_PASSWORD`).
- Alternatively utilizes pre-configured credentials stored in `~/.copernicusmarine/.copernicusmarine-credentials` via `copernicusmarine login`.
- Credentials must never be committed to source control.

## Git Safety
- The 385 MB NetCDF dataset is excluded from Git tracking via `.gitignore` pattern `data/test/`.
- Only source scripts, metadata, and documentation are tracked in Git.

## Known Limitations
- Single temporal step (1 day snapshot). Designed specifically as a 3D structural test subset for depth slicing and WebGL volumetric integration proof, not for long-term time-series trends.
- Land cells contain standard NaN encodings (45% NaN cells due to continental landmasses in the bounding box).
