import xarray as xr
import numpy as np
import os
import yaml
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List
import logging

logger = logging.getLogger(__name__)

class CopernicusDataAccess:
    """Handle access to Copernicus Marine datasets stored locally as Zarr/NetCDF"""

    def __init__(self, data_root: str):
        self.data_root = Path(data_root)
        self.datasets = {}  # Cache for opened datasets
        self.catalog = self._load_catalog()

    def _load_catalog(self) -> Dict[str, Any]:
        """Load dataset catalog from YAML"""
        catalog_path = self.data_root.parent / "datasets" / "catalog.yaml"
        try:
            with open(catalog_path, 'r') as f:
                catalog_data = yaml.safe_load(f)
                return catalog_data.get('datasets', {})
        except Exception as e:
            logger.error(f"Failed to load catalog: {e}")
            return {}

    def _get_dataset_path(self, dataset_key: str) -> Optional[Path]:
        """Get the local file path for a dataset"""
        if dataset_key not in self.catalog:
            logger.error(f"Dataset {dataset_key} not found in catalog")
            return None

        dataset_info = self.catalog[dataset_key]
        # For now, we'll use a naming convention - in practice, this could be more sophisticated
        format_ext = "zarr" if dataset_info.get("format") == "zarr" else "nc"
        filename = f"{dataset_key}_{dataset_info.get('dataset_id', 'unknown')}.{format_ext}"
        return self.data_root / filename

    def open_dataset(self, dataset_key: str) -> Optional[xr.Dataset]:
        """Open and cache a dataset"""
        if dataset_key in self.datasets:
            return self.datasets[dataset_key]

        dataset_path = self._get_dataset_path(dataset_key)
        if not dataset_path or not dataset_path.exists():
            logger.error(f"Dataset file not found: {dataset_path}")
            return None

        try:
            if self.catalog[dataset_key].get("format") == "zarr":
                ds = xr.open_zarr(dataset_path)
            else:
                ds = xr.open_dataset(dataset_path)

            self.datasets[dataset_key] = ds
            logger.info(f"Opened dataset: {dataset_key}")
            return ds
        except Exception as e:
            logger.error(f"Failed to open dataset {dataset_key}: {e}")
            return None

    def subset_data(
        self,
        dataset_key: str,
        variable: str,
        bbox: Optional[Tuple[float, float, float, float]] = None,
        depth: Optional[float] = None,
        time: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Subset data based on spatial, temporal, and depth parameters

        Args:
            dataset_key: Key from catalog (e.g., 'temperature')
            variable: Variable name to extract (e.g., 'thetao')
            bbox: (min_lon, min_lat, max_lon, max_lat)
            depth: Depth level in meters
            time: ISO format timestamp (e.g., '2026-09-01T12:00:00Z')

        Returns:
            Dictionary with data, coordinates, and metadata or None if failed
        """
        ds = self.open_dataset(dataset_key)
        if ds is None:
            return None

        try:
            # Start with the full dataset
            subset = ds[variable]

            # Apply temporal subset if specified
            if time and 'time' in subset.dims:
                subset = subset.sel(time=time)

            # Apply depth subset if specified
            if depth and 'depth' in subset.dims:
                subset = subset.sel(depth=depth, method='nearest')

            # Apply spatial subset if specified
            if bbox and 'latitude' in subset.dims and 'longitude' in subset.dims:
                min_lon, min_lat, max_lon, max_lat = bbox
                subset = subset.sel(
                    longitude=slice(min_lon, max_lon),
                    latitude=slice(min_lat, max_lat)
                )

            # Convert to numpy arrays for JSON serialization
            data_values = subset.values

            # Handle masked arrays (convert NaN to None for JSON)
            if hasattr(data_values, 'filled'):
                data_values = data_values.filled(np.nan)

            # Replace NaN with None for JSON compatibility
            data_values = np.where(np.isnan(data_values), None, data_values)

            result = {
                "variable": variable,
                "values": data_values.tolist() if data_values.ndim > 0 else data_values.item(),
                "coords": {},
                "attrs": dict(subset.attrs),
                "dims": list(subset.dims),
                "shape": list(subset.shape)
            }

            # Add coordinate information
            for coord_name in subset.coords:
                coord_values = subset.coords[coord_name].values
                # Handle datetime objects
                if hasattr(coord_values, 'isoformat'):
                    coord_values = [str(v) for v in coord_values]
                elif hasattr(coord_values, 'tolist'):
                    coord_values = coord_values.tolist()

                result["coords"][coord_name] = {
                    "values": coord_values,
                    "units": str(subset.coords[coord_name].units) if hasattr(subset.coords[coord_name], 'units') else "",
                    "dims": list(subset.coords[coord_name].dims)
                }

            return result

        except Exception as e:
            logger.error(f"Failed to subset data for {dataset_key}.{variable}: {e}")
            return None

# Singleton instance for easy access
_copernicus_access = None

def get_copernicus_access(data_root: str = None) -> CopernicusDataAccess:
    """Get or create the Copernicus data access instance"""
    global _copernicus_access
    if _copernicus_access is None:
        if data_root is None:
            data_root = os.getenv("SAMUDRAX_DATA_ROOT", "./samudrax-data")
        _copernicus_access = CopernicusDataAccess(data_root)
    return _copernicus_access