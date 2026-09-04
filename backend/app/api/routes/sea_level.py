from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Dict, Any
import logging

from app.data.copernicus import get_copernicus_access

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=Dict[str, Any])
async def get_sea_level(
    lat: Optional[float] = Query(None, description="Latitude for point extraction"),
    lon: Optional[float] = Query(None, description="Longitude for point extraction"),
    lat_min: Optional[float] = Query(None, description="Minimum latitude for grid extraction"),
    lat_max: Optional[float] = Query(None, description="Maximum latitude for grid extraction"),
    lon_min: Optional[float] = Query(None, description="Minimum longitude for grid extraction"),
    lon_max: Optional[float] = Query(None, description="Maximum longitude for grid extraction"),
    time: Optional[str] = Query(None, description="Timestamp in ISO format (e.g., '2026-09-01T12:00:00Z')")
):
    """
    Get sea level anomaly data subset.
    """
    try:
        # Get data access instance
        data_access = get_copernicus_access()

        if lat is not None and lon is not None:
            # Point extraction
            result = data_access.get_point_data(
                dataset_key="sea_level",
                variable="zos",
                lat=lat,
                lon=lon,
                time=time
            )
        elif all(v is not None for v in [lat_min, lat_max, lon_min, lon_max]):
            # Grid extraction
            try:
                result = data_access.get_grid_data(
                    dataset_key="sea_level",
                    variable="zos",
                    lat_min=lat_min,
                    lat_max=lat_max,
                    lon_min=lon_min,
                    lon_max=lon_max,
                    time=time
                )
            except ValueError as ve:
                raise HTTPException(status_code=413, detail=str(ve))
        else:
            raise HTTPException(status_code=400, detail="Must provide either point coordinates (lat, lon) or grid boundaries (lat_min, lat_max, lon_min, lon_max)")

        if result is None:
            raise HTTPException(status_code=404, detail="Sea level data not found for the given parameters")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving sea level data: {e}")
        raise HTTPException(status_code=500, detail=str(e))
