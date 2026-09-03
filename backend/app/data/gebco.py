import xarray as xr
import numpy as np
import os
import yaml
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class GEBCODataAccess:
    """Handle access to GEBCO bathymetry datasets stored locally as NetCDF"""

    def __init__(self, data_root: str):
        self.data_root = Path(data_root)
        self.dataset = None  # Cache for opened dataset
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

    def _get_dataset_path(self) -> Optional[Path]:
        """Get the local file path for the bathymetry dataset"""
        dataset_key = "bathymetry"
        if dataset_key not in self.catalog:
            logger.error(f"Dataset {dataset_key} not found in catalog")
            return None

        dataset_info = self.catalog[dataset_key]
        format_ext = "nc" if dataset_info.get("format") == "netcdf" else "zarr"
        filename = f"{dataset_key}_{dataset_info.get('dataset', 'unknown')}.{format_ext}"
        return self.data_root / filename

    def open_dataset(self) -> Optional[xr.Dataset]:
        """Open and cache the bathymetry dataset"""
        if self.dataset is not None:
            return self.dataset

        dataset_path = self._get_dataset_path()
        if not dataset_path or not dataset_path.exists():
            logger.error(f"Dataset file not found: {dataset_path}")
            return None

        try:
            # GEBCO is NetCDF
            ds = xr.open_dataset(dataset_path)
            self.dataset = ds
            logger.info("Opened GEBCO bathymetry dataset")
            return self.dataset
        except Exception as e:
            logger.error(f"Failed to open GEBCO dataset: {e}")
            return None

    def subset_data(
        self,
        variable: str = "elevation",
        bbox: Optional[Tuple[float, float, float, float]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Subset bathymetry data based on spatial parameters

        Args:
            variable: Variable name to extract (default: 'elevation')
            bbox: (min_lon, min_lat, max_lon, max_lat)

        Returns:
            Dictionary with data, coordinates, and metadata or None if failed
        """
        ds = self.open_dataset()
        if ds is None:
            return None

        try:
            # Start with the full dataset
            subset = ds[variable]

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
                # Handle datetime objects (not expected for bathymetry, but just in case)
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
            logger.error(f"Failed to subset data for {variable}: {e}")
            return None

# Singleton instance for easy access
_gebco_access = None

def get_gebco_access(data_root: str = None) -> GEBCODataAccess:
    """Get or create the GEBCO data access instance"""
    global _gebco_access
    if _gebco_access is None:
        if data_root is None:
            data_root = os.getenv("SAMUDRAX_DATA_ROOT", "./samudrax-data")
        _gebco_access = GEBCODataAccess(data_root)
    return _gebco_access