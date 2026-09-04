from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Dict, Any
import logging

from app.data.copernicus import get_copernicus_access

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=Dict[str, Any])
async def get_currents(
    lat: Optional[float] = Query(None, description="Latitude for point extraction"),
    lon: Optional[float] = Query(None, description="Longitude for point extraction"),
    lat_min: Optional[float] = Query(None, description="Minimum latitude for grid extraction"),
    lat_max: Optional[float] = Query(None, description="Maximum latitude for grid extraction"),
    lon_min: Optional[float] = Query(None, description="Minimum longitude for grid extraction"),
    lon_max: Optional[float] = Query(None, description="Maximum longitude for grid extraction"),
    depth: Optional[float] = Query(None, description="Depth level in meters"),
    time: Optional[str] = Query(None, description="Timestamp in ISO format (e.g., '2026-09-01T12:00:00Z')")
):
    """
    Get ocean currents (U and V components) data subset based on bounding box, depth, and time.
    """
    try:
        # Get data access instance
        data_access = get_copernicus_access()

        if lat is not None and lon is not None:
            u_result = data_access.get_point_data(
                dataset_key="currents", variable="uo", lat=lat, lon=lon, depth=depth, time=time
            )
            v_result = data_access.get_point_data(
                dataset_key="currents", variable="vo", lat=lat, lon=lon, depth=depth, time=time
            )
            
            if u_result is None or v_result is None:
                raise HTTPException(status_code=404, detail="Current data not found for the given parameters")
                
            return {
                "variable": "currents",
                "components": {
                    "u": u_result,
                    "v": v_result
                },
                "location": {"lat": lat, "lon": lon}
            }
        elif all(v is not None for v in [lat_min, lat_max, lon_min, lon_max]):
            # Get U and V components
            try:
                u_result = data_access.get_grid_data(
                    dataset_key="currents", variable="uo", lat_min=lat_min, lat_max=lat_max, lon_min=lon_min, lon_max=lon_max, depth=depth, time=time
                )
                v_result = data_access.get_grid_data(
                    dataset_key="currents", variable="vo", lat_min=lat_min, lat_max=lat_max, lon_min=lon_min, lon_max=lon_max, depth=depth, time=time
                )
            except ValueError as ve:
                raise HTTPException(status_code=413, detail=str(ve))

            if u_result is None or v_result is None:
                raise HTTPException(status_code=404, detail="Current data not found for the given parameters")

            # Combine U and V components into a single response
            result = {
                "variable": "currents",
                "components": {
                    "u": u_result,
                    "v": v_result
                },
                "coordinates": u_result.get("coordinates", {}),
                "shape": u_result.get("shape", [])
            }
            if "time" in u_result:
                result["time"] = u_result["time"]
            if "depth" in u_result:
                result["depth"] = u_result["depth"]

            return result
        else:
            raise HTTPException(status_code=400, detail="Must provide either point coordinates (lat, lon) or grid boundaries (lat_min, lat_max, lon_min, lon_max)")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving currents data: {e}")
        raise HTTPException(status_code=500, detail=str(e))