from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Dict, Any
import logging

from app.data.copernicus import get_copernicus_access

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=Dict[str, Any])
async def get_currents(
    bbox: Optional[str] = Query(None, description="Bounding box as 'min_lon,min_lat,max_lon,max_lat'"),
    depth: Optional[float] = Query(None, description="Depth level in meters"),
    time: Optional[str] = Query(None, description="Timestamp in ISO format (e.g., '2026-09-01T12:00:00Z')")
):
    """
    Get ocean currents (U and V components) data subset based on bounding box, depth, and time.
    """
    try:
        # Parse bbox if provided
        parsed_bbox = None
        if bbox:
            try:
                parts = [float(x.strip()) for x in bbox.split(',')]
                if len(parts) != 4:
                    raise ValueError("Bounding box must have 4 values: min_lon,min_lat,max_lon,max_lat")
                parsed_bbox = tuple(parts)
            except Exception as e:
                logger.error(f"Invalid bbox format: {e}")
                raise HTTPException(status_code=400, detail=f"Invalid bbox format: {e}")

        # Get data access instance
        data_access = get_copernicus_access()

        # Get U and V components
        u_result = data_access.subset_data(
            dataset_key="currents",
            variable="uo",
            bbox=parsed_bbox,
            depth=depth,
            time=time
        )

        v_result = data_access.subset_data(
            dataset_key="currents",
            variable="vo",
            bbox=parsed_bbox,
            depth=depth,
            time=time
        )

        if u_result is None or v_result is None:
            raise HTTPException(status_code=404, detail="Current data not found for the given parameters")

        # Combine U and V components into a single response
        result = {
            "variable": "currents",
            "components": {
                "u": u_result,
                "v": v_result
            },
            "coords": u_result.get("coords", {}),  # Coordinates should be the same for both
            "attrs": {
                "description": "Ocean currents (U and V components)",
                "unit": "m/s"
            },
            "dims": u_result.get("dims", []),
            "shape": u_result.get("shape", [])
        }

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving currents data: {e}")
        raise HTTPException(status_code=500, detail=str(e))