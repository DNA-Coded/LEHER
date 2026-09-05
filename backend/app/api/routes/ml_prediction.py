from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging
import sys
from pathlib import Path

# Add backend directory to sys.path to allow importing from models
backend_dir = Path(__file__).resolve().parents[3]
if str(backend_dir) not in sys.path:
    sys.path.append(str(backend_dir))

from models.model_api import get_api_instance, LaharModelAPI
from app.data.copernicus import get_copernicus_access

logger = logging.getLogger(__name__)

router = APIRouter()

class PredictionRequest(BaseModel):
    latitude: float
    longitude: float
    depth: float
    surface_temp: Optional[float] = None
    surface_salinity: Optional[float] = None
    month: Optional[int] = None
    day_of_year: Optional[int] = None

def get_ml_api() -> LaharModelAPI:
    """Dependency to get the singleton ML API instance"""
    try:
        return get_api_instance()
    except Exception as e:
        logger.error(f"Failed to initialize ML Model API: {e}")
        raise HTTPException(status_code=500, detail="ML Model service unavailable")

@router.post("/predict/deep_ocean", response_model=Dict[str, Any])
async def predict_deep_ocean(
    request: PredictionRequest,
    ml_api: LaharModelAPI = Depends(get_ml_api)
):
    """
    Predict deep ocean properties (thetao, so, uo, vo, current_speed) using Lahar ML model.
    """
    try:
        surface_temp = request.surface_temp
        surface_salinity = request.surface_salinity

        # Look up surface temperature if not provided
        if surface_temp is None:
            data_access = get_copernicus_access()
            temp_result = data_access.get_point_data(
                dataset_key="temperature",
                variable="thetao",
                lat=request.latitude,
                lon=request.longitude,
                depth=0.0
            )
            if temp_result and "value" in temp_result:
                surface_temp = temp_result["value"]
            else:
                raise HTTPException(status_code=400, detail="Could not retrieve surface temperature for given coordinates")

        # Look up surface salinity if not provided
        if surface_salinity is None:
            data_access = get_copernicus_access()
            sal_result = data_access.get_point_data(
                dataset_key="salinity",
                variable="so",
                lat=request.latitude,
                lon=request.longitude,
                depth=0.0
            )
            if sal_result and "value" in sal_result:
                surface_salinity = sal_result["value"]
            else:
                raise HTTPException(status_code=400, detail="Could not retrieve surface salinity for given coordinates")

        # Make prediction using the model
        prediction = ml_api.predict(
            latitude=request.latitude,
            longitude=request.longitude,
            depth=request.depth,
            surface_temp=surface_temp,
            surface_salinity=surface_salinity,
            month=request.month,
            day_of_year=request.day_of_year
        )

        return {
            "success": True,
            "data": prediction
        }

    except HTTPException:
        raise
    except ValueError as ve:
        # Validation error from the model (e.g., out of bounds)
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error during ML prediction: {e}")
        raise HTTPException(status_code=500, detail=str(e))
