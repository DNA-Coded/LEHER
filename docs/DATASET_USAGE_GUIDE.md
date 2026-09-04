# SamudraX Dataset Usage Guide
## Working with GLOBAL_MULTIYEAR_PHY_001_030 (GLORYS12V1)

Based on the XML metadata file you provided (`GLOBAL_MULTIYEAR_PHY_001_030 (1).xml`), this document explains how to work with the Copernicus Marine Service GLOBAL_MULTIYEAR_PHY_001_030 dataset for your SamudraX project.

## 📊 Dataset Overview

From the metadata XML:
- **Title**: Global Ocean Physics Reanalysis
- **Alternate Title**: GLOBAL_MULTIYEAR_PHY_001_030
- **Identifier**: c0635fc4-07d3-4309-9d55-cfd3e6aa788b
- **Product**: GLORYS12V1 (CMEMS global ocean eddy-resolving reanalysis)
- **Time Coverage**: 1993-01-01 to present (ongoing)
- **Spatial Resolution**: 1/12° (~8 km) - 0.083 degrees
- **Vertical Resolution**: 50 standard levels from surface to bottom
- **Depth Range**: 0 to -5500 meters (surface to seafloor)
- **Format**: NetCDF (64-bit offset) and NetCDF-4
- **Variables**: Temperature, salinity, currents (U/V), sea level, mixed layer depth, ice parameters, etc.

## 🔧 How to Access This Dataset

### Option 1: Using Copernicus Marine API (Recommended for Programmatic Access)

First, install and authenticate:
```bash
pip install copernicusmarine
copernicusmarine login  # Create free account at marine.copernicus.eu
```

Then download subsets for your Indian Ocean region:

**Temperature (thetao):**
```bash
copernicusmarine get \
  --dataset-id GLOBAL_MULTIYEAR_PHY_001_030 \
  --variables thetao \
  --minimum-longitude 50 \
  --maximum-longitude 100 \
  --minimum-latitude -20 \
  --maximum-latitude 25 \
  --minimum-depth 0 \
  --maximum-depth 0 \  # Surface layer, or specify depth like 250
  --datetime 2026-09-01 \
  --output-directory "/c/Users/Deep Saha/SamundraX-data" \
  --output-name temp_GLORYS12V1_IND_Ocean_2026-09-01.zarr
```

**Salinity (so):**
```bash
copernicusmarine get \
  --dataset-id GLOBAL_MULTIYEAR_PHY_001_030 \
  --variables so \
  --minimum-longitude 50 \
  --maximum-longitude 100 \
  --minimum-latitude -20 \
  --maximum-latitude 25 \
  --minimum-depth 0 \
  --maximum-depth 0 \
  --datetime 2026-09-01 \
  --output-directory "/c/Users/Deep Saha/SamundraX-data" \
  --output-name salinity_GLORYS12V1_IND_Ocean_2026-09-01.zarr
```

**Currents (uo, vo):**
```bash
copernicusmarine get \
  --dataset-id GLOBAL_MULTIYEAR_PHY_001_030 \
  --variables uo vo \
  --minimum-longitude 50 \
  --maximum-longitude 100 \
  --minimum-latitude -20 \
  --maximum-latitude 25 \
  --minimum-depth 0 \
  --maximum-depth 0 \
  --datetime 2026-09-01 \
  --output-directory "/c/Users/Deep Saha/SamundraX-data" \
  --output-name currents_GLORYS12V1_IND_Ocean_2026-09-01.zarr
```

### Option 2: Using the Copernicus Marine Portal Web Interface

1. Go to: https://data.marine.copernicus.eu/
2. Search for: "GLOBAL_MULTIYEAR_PHY_001_030" or "GLORYS12V1"
3. Use the subsetter tool to select:
   - Variables: thetao (temperature), so (salinity), uo/vo (currents)
   - Longitude: 50 to 100 (Indian Ocean)
   - Latitude: -20 to 25 (Indian Ocean)
   - Depth: 0 (surface) or specific depth levels
   - Time: 2026-09-01 (or your desired date)
   - Format: Zarr (preferred for active access) or NetCDF
4. Download to your external data folder

### Option 3: Direct STAC/WMTS Access (Advanced)

The metadata shows STAC endpoints like:
- `http://stac.marine.copernicus.eu/metadata/GLOBAL_MULTIYEAR_PHY_001_030/cmems_mod_glo_phy_my_0.083deg_P1D-m_202311/dataset.stac.json`

These are metadata endpoints. To get actual data, you'd need to:
1. Parse the STAC JSON to find asset URLs
2. Use those URLs to access the actual NetCDF/Zarr data chunks
3. This approach is more complex but useful for cloud-native workflows

## 📝 Updating Your Dataset Catalog

To use this dataset in your SamudraX backend, update your `datasets/catalog.yaml`:

```yaml
# Alternative dataset configuration using GLORYS12V1 reanalysis
temperature:
  provider: copernicus
  dataset_id: "GLOBAL_MULTIYEAR_PHY_001_030"  # Changed from global-analysis-forecast-phy-001-024
  format: zarr
  variable: thetao
  dimensions:
    - time
    - depth
    - latitude
    - longitude
  unit: degC
  description: "Sea water temperature from GLORYS12V1 reanalysis (Copernicus Marine)"

salinity:
  provider: copernicus
  dataset_id: "GLOBAL_MULTIYEAR_PHY_001_030"
  format: zarr
  variable: so
  dimensions:
    - time
    - depth
    - latitude
    - longitude
  unit: PSU
  description: "Sea water salinity from GLORYS12V1 reanalysis (Copernicus Marine)"

currents:
  provider: copernicus
  dataset_id: "GLOBAL_MULTIYEAR_PHY_001_030"
  format: zarr
  variables:
    - uo  # eastward sea water velocity
    - vo  # northward sea water velocity
  dimensions:
    - time
    - depth
    - latitude
    - longitude
  unit: m/s
  description: "Ocean currents from GLORYS12V1 reanalysis (Copernicus Marine)"
```

## 📋 Metadata Enhancement

You can enhance your `datasets/metadata/temperature.json` (and similar files) with information from the XML:

```json
{
    "name": "Sea Water Temperature",
    "variable": "thetao",
    "provider": "Copernicus Marine Service",
    "dataset_id": "GLOBAL_MULTIYEAR_PHY_001_030",
    "format": "Zarr",
    "unit": "degC",
    "dimensions": [
        "time",
        "depth",
        "latitude",
        "longitude"
    ],
    "source": "https://data.marine.copernicus.eu/product/GLOBAL_MULTIYEAR_PHY_001_030/description",
    "description": "Global Ocean Physics Reanalysis (GLORYS12V1) - CMEMS global ocean eddy-resolving (1/12° horizontal resolution, 50 vertical levels) reanalysis covering the altimetry (1993 onward). Based on NEMO platform driven by ECMWF ERA-Interim then ERA5 reanalyses, with data assimilation of along-track altimeter data, satellite SST, sea ice concentration, and in situ T/S profiles.",
    "spatial_resolution": "1/12° (~8 km)",
    "temporal_resolution": "Daily and monthly mean files available",
    "time_range": "1993-present",
    "depth_range": "0-5500m (50 vertical levels)",
    "access_method": "API subsetting via xarray or copernicusmarine tool",
    "license": "Copernicus Marine Service License",
    "attribution": "Contains modified Copernicus Marine Service information 2026",
    "doi": "https://doi.org/10.48670/moi-00021"
}
```

## ⚙️ Backend Configuration

Your existing backend code (`backend/app/data/copernicus.py`) should work with this dataset without changes, as it:
1. Uses xarray to open Zarr/NetCDF files
2. Subsets based on bounding box, depth, and time
3. Returns JSON-compatible responses

Just ensure your `.env` points to the correct data directory:
```
SAMUDRAX_DATA_ROOT=/c/Users/Deep Saha/SamundraX-data
```

## 🧪 Testing Your Setup

After downloading data:
```bash
# Test that your backend can serve data from this dataset
uvicorn backend.app.main:app --reload

# In another terminal:
curl "http://localhost:8000/api/ocean/temperature/?bbox=50,-20,100,25&depth=0&time=2026-09-01T12:00:00Z"
```

## 📚 Key Differences from Analysis/Forecast Dataset

| Feature | GLOBAL_ANALYSIS_FORECAST_PHY_001_024 | GLOBAL_MULTIYEAR_PHY_001_030 (GLORYS12V1) |
|---------|--------------------------------------|--------------------------------------------|
| Type | Near real-time forecast + analysis | Historical reanalysis |
| Time Coverage | Recent + forecast (typically ~10 days forecast) | 1993-present (historical) |
| Resolution | 1/12° | 1/12° |
| Vertical Levels | 50 | 50 |
| Variables | Similar (temp, salinity, currents, etc.) | Similar + additional ice parameters |
| Use Case | Current conditions, short-term forecasting | Climate research, historical analysis, model validation |

## 💡 Recommendations for SamudraX

1. **Development**: Start with GLORYS12V1 for historical analysis capabilities
2. **Production**: Consider using both - historical (GLORYS12V1) + forecast (GLOBAL_ANALYSIS_FORECAST_PHY_001_024) for nowcasting
3. **Storage**: Keep both datasets in your external `SamundraX-data/` folder with clear naming
4. **Catalog**: Maintain entries for both in your YAML catalog, perhaps with different keys or version indicators

## 🔗 Useful Links

- Product Page: https://data.marine.copernicus.eu/product/GLOBAL_MULTIYEAR_PHY_001_030/description
- DOI: https://doi.org/10.48670/moi-00021
- Copernicus Marine Helpdesk: servicedesk.cmems@mercator-ocean.eu
- API Documentation: https://marine.copernicus.eu/services-portfolio/access-to-data/

---

**Remember**: Following your architecture principles:
- ✅ Store scientific data properly (NetCDF/Zarr in external storage)
- ✅ Never put entire ocean dataset in GitHub
- ✅ Use JSON for metadata and API responses
- ✅ Process only what you need via subsetting
- ✅ Start small (Indian Ocean subset) before scaling globally