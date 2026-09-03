from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Dict, Any
import logging

from app.data.copernicus import get_copernicus_access

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=Dict[str, Any])
async def get_salinity(
    bbox: Optional[str] = Query(None, description="Bounding box as 'min_lon,min_lat,max_lon,max_lat'"),
    depth: Optional[float] = Query(None, description="Depth level in meters"),
    time: Optional[str] = Query(None, description="Timestamp in ISO format (e.g., '2026-09-01T12:00:00Z')")
):
    """
    Get salinity data subset based on bounding box, depth, and time.
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

        # Subset the data
        result = data_access.subset_data(
            dataset_key="salinity",
            variable="so",
            bbox=parsed_bbox,
            depth=depth,
            time=time
        )

        if result is None:
            raise HTTPException(status_code=404, detail="Salinity data not found for the given parameters")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving salinity data: {e}")
        raise HTTPException(status_code=500, detail=str(e))