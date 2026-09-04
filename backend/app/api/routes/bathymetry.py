from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Dict, Any
import logging

from app.data.gebco import get_gebco_access

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=Dict[str, Any])
async def get_bathymetry(
    lat: Optional[float] = Query(None, description="Latitude for point extraction"),
    lon: Optional[float] = Query(None, description="Longitude for point extraction"),
    lat_min: Optional[float] = Query(None, description="Minimum latitude for grid extraction"),
    lat_max: Optional[float] = Query(None, description="Maximum latitude for grid extraction"),
    lon_min: Optional[float] = Query(None, description="Minimum longitude for grid extraction"),
    lon_max: Optional[float] = Query(None, description="Maximum longitude for grid extraction")
):
    """
    Get bathymetry data subset based on bounding box using GEBCO dataset.
    """
    try:
        # Get data access instance
        data_access = get_gebco_access()

        if lat is not None and lon is not None:
            # We don't have a direct get_point_data in gebco.py, but we can subset a tiny box
            eps = 0.01
            raw_result = data_access.subset_data(
                variable="elevation",
                bbox=(lon - eps, lat - eps, lon + eps, lat + eps)
            )
            if raw_result and raw_result["values"]:
                # Just take the first value
                val = raw_result["values"][0][0] if isinstance(raw_result["values"][0], list) else raw_result["values"]
                return {
                    "dataset": "bathymetry",
                    "variable": "elevation",
                    "value": val,
                    "location": {"lat": lat, "lon": lon}
                }
            return None

        elif all(v is not None for v in [lat_min, lat_max, lon_min, lon_max]):
            # Subset the data
            try:
                raw_result = data_access.subset_data(
                    variable="elevation",
                    bbox=(lon_min, lat_min, lon_max, lat_max)
                )
                
                if raw_result is None:
                    raise HTTPException(status_code=404, detail="Bathymetry data not found for the given parameters")
                
                # Format to match GridResponse
                result = {
                    "dataset": "bathymetry",
                    "variable": "elevation",
                    "coordinates": {
                        "latitude": raw_result["coords"].get("latitude", {}).get("values", []),
                        "longitude": raw_result["coords"].get("longitude", {}).get("values", [])
                    },
                    "shape": raw_result["shape"],
                    "values": raw_result["values"]
                }
                return result
            except ValueError as ve:
                raise HTTPException(status_code=413, detail=str(ve))
        else:
            raise HTTPException(status_code=400, detail="Must provide either point coordinates (lat, lon) or grid boundaries (lat_min, lat_max, lon_min, lon_max)")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving bathymetry data: {e}")
        raise HTTPException(status_code=500, detail=str(e))