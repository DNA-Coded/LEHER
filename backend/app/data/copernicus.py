import xarray as xr
import numpy as np
import os
import yaml
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List
import logging
import pandas as pd

logger = logging.getLogger(__name__)

class CopernicusDataAccess:
    """Handle access to Copernicus Marine datasets stored locally as Zarr/NetCDF"""

    def __init__(self, data_root: str):
        self.data_root = Path(data_root)
        self.datasets = {}  # Cache for opened datasets
        self.catalog = self._load_catalog()

    def _load_catalog(self) -> Dict[str, Any]:
        """Catalog is no longer strictly used, rely on filename_map."""
        return {}

    def _get_dataset_path(self, dataset_key: str) -> Optional[Path]:
        """Get the local file path for a dataset"""
        filename_map = {
            "temperature": "temperature_indian_ocean.zarr",
            "salinity": "salinity_indian_ocean.zarr",
            "currents": "currents_indian_ocean.zarr",
            "sea_level": "sea_level_indian_ocean.zarr",
            "chlorophyll": "chlorophyll_indian_ocean.zarr",
            "bathymetry": "bathymetry_indian_ocean.zarr"
        }
        
        if dataset_key not in filename_map:
            logger.error(f"Dataset {dataset_key} not recognized")
            return None

        return self.data_root / filename_map[dataset_key]

    def open_dataset(self, dataset_key: str) -> Optional[xr.Dataset]:
        """Open and cache a dataset"""
        if dataset_key in self.datasets:
            return self.datasets[dataset_key]

        dataset_path = self._get_dataset_path(dataset_key)
        if not dataset_path or not dataset_path.exists():
            logger.error(f"Dataset file not found: {dataset_path}")
            return None

        try:
            ds = xr.open_zarr(dataset_path)
            self.datasets[dataset_key] = ds
            logger.info(f"Opened dataset: {dataset_key}")
            return ds
        except Exception as e:
            logger.error(f"Failed to open dataset {dataset_key}: {e}")
            return None

    def get_grid_data(
        self,
        dataset_key: str,
        variable: str,
        lat_min: float,
        lat_max: float,
        lon_min: float,
        lon_max: float,
        depth: Optional[float] = None,
        time: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Extract a spatial grid subset with optional time/depth, returning exact selected coordinates."""
        ds = self.open_dataset(dataset_key)
        if ds is None:
            return None

        try:
            subset = ds[variable]
            
            # 1. Apply time if requested and dimension exists
            selected_time = None
            if time and 'time' in subset.dims:
                time_val = pd.to_datetime(time).tz_localize(None)
                subset = subset.sel(time=time_val, method='nearest')
                selected_time = str(subset.coords['time'].values)
            elif 'time' in subset.dims:
                subset = subset.isel(time=0)
                selected_time = str(subset.coords['time'].values)

            # 2. Apply depth if requested and dimension exists
            selected_depth = None
            if depth is not None and 'depth' in subset.dims:
                subset = subset.sel(depth=depth, method='nearest')
                selected_depth = float(subset.coords['depth'].values)
            elif 'depth' in subset.dims:
                # If depth is omitted but dimension exists, preserve it as requested.
                pass

            # 3. Spatial Subsetting
            lat_min, lat_max = min(lat_min, lat_max), max(lat_min, lat_max)
            lon_min, lon_max = min(lon_min, lon_max), max(lon_min, lon_max)
            
            lat_coords = ds.coords['latitude'].values
            lon_coords = ds.coords['longitude'].values
            
            lat_slice = slice(lat_min, lat_max)
            if len(lat_coords) > 1 and lat_coords[0] > lat_coords[-1]:
                lat_slice = slice(lat_max, lat_min)
                
            lon_slice = slice(lon_min, lon_max)
            if len(lon_coords) > 1 and lon_coords[0] > lon_coords[-1]:
                lon_slice = slice(lon_max, lon_min)
                
            if 'latitude' in subset.dims and 'longitude' in subset.dims:
                subset = subset.sel(latitude=lat_slice, longitude=lon_slice)
                
            # 4. Limit enforcement
            num_points = np.prod(subset.shape)
            MAX_POINTS = 300000
            if num_points > MAX_POINTS:
                raise ValueError(f"Request exceeds maximum allowed grid points ({MAX_POINTS}). Requested {num_points} points.")
            
            # 5. Load values and format for JSON
            data_values = subset.values
            if hasattr(data_values, 'filled'):
                data_values = data_values.filled(np.nan)
            
            # Convert nan to None safely for JSON, and ensure float types
            data_values_flat = data_values.flatten()
            data_values_flat_none = [None if pd.isna(x) else (float(x) if isinstance(x, (np.floating, float, int)) else x) for x in data_values_flat]
            
            # Reshape back to nested list
            def reshape_list(flat_list, shape):
                if len(shape) == 1:
                    return flat_list
                size = np.prod(shape[1:])
                return [reshape_list(flat_list[i*size:(i+1)*size], shape[1:]) for i in range(shape[0])]
                
            if subset.ndim > 0:
                data_list = reshape_list(data_values_flat_none, subset.shape)
            else:
                val = data_values.item()
                data_list = None if np.isnan(val) else val

            coords_out = {}
            for coord_name in subset.coords:
                c_vals = subset.coords[coord_name].values
                if hasattr(c_vals, 'tolist'):
                    c_vals = c_vals.tolist()
                if isinstance(c_vals, np.ndarray) and c_vals.ndim == 0:
                    c_vals = c_vals.item()
                if isinstance(c_vals, list):
                    if len(c_vals) > 0 and hasattr(c_vals[0], 'isoformat'):
                        c_vals = [str(v) for v in c_vals]
                    else:
                        # Ensure Python standard types
                        c_vals = [float(v) if isinstance(v, (np.floating, float)) else v for v in c_vals]
                elif hasattr(c_vals, 'isoformat'):
                    c_vals = str(c_vals)
                elif isinstance(c_vals, (np.floating, float)):
                    c_vals = float(c_vals)
                    
                coords_out[coord_name] = c_vals

            response = {
                "dataset": dataset_key,
                "variable": variable,
                "coordinates": coords_out,
                "shape": list(subset.shape),
                "values": data_list
            }
            if selected_time is not None:
                response["time"] = selected_time
            if selected_depth is not None:
                response["depth"] = selected_depth

            return response
            
        except ValueError as ve:
            logger.error(str(ve))
            raise
        except Exception as e:
            logger.error(f"Failed to extract grid data for {dataset_key}.{variable}: {e}")
            return None

    def get_point_data(
        self,
        dataset_key: str,
        variable: str,
        lat: float,
        lon: float,
        depth: Optional[float] = None,
        time: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Extract data at a specific latitude/longitude point"""
        ds = self.open_dataset(dataset_key)
        if ds is None:
            return None
            
        try:
            subset = ds[variable]
            
            # Apply time if requested and dimension exists
            if time and 'time' in subset.dims:
                subset = subset.sel(time=time, method='nearest')
            elif 'time' in subset.dims:
                subset = subset.isel(time=0)
                
            # Apply depth if requested and dimension exists
            if depth is not None and 'depth' in subset.dims:
                subset = subset.sel(depth=depth, method='nearest')
            elif 'depth' in subset.dims:
                subset = subset.isel(depth=0)
                
            # Select the nearest spatial point
            point = subset.sel(latitude=lat, longitude=lon, method='nearest')
            value = point.values.item()
            
            # Convert nan to None
            if value is None or str(value) == 'nan' or np.isnan(value):
                value = None
                
            return {
                "variable": variable,
                "value": value,
                "location": {"lat": lat, "lon": lon},
                "dataset": dataset_key
            }
        except Exception as e:
            logger.error(f"Failed to extract point data for {dataset_key}.{variable}: {e}")
            return None

# Singleton instance for easy access
_copernicus_access = None

def get_copernicus_access(data_root: str = None) -> CopernicusDataAccess:
    """Get or create the Copernicus data access instance"""
    global _copernicus_access
    if _copernicus_access is None:
        if data_root is None:
            # Fallback to local default if env var is missing
            data_root = os.getenv("SAMUDRAX_DATA_ROOT", "../SamundraX-data")
        _copernicus_access = CopernicusDataAccess(data_root)
    return _copernicus_access