from pydantic import BaseModel, Field
from typing import Optional

class OceanDataRequest(BaseModel):
    """Base model for ocean data requests"""
    bbox: Optional[str] = Field(None, description="Bounding box as 'min_lon,min_lat,max_lon,max_lat'")
    depth: Optional[float] = Field(None, description="Depth level in meters")
    time: Optional[str] = Field(None, description="Timestamp in ISO format (e.g., '2026-09-01T12:00:00Z')")

class TemperatureRequest(OceanDataRequest):
    """Request model for temperature data"""
    pass

class SalinityRequest(OceanDataRequest):
    """Request model for salinity data"""
    pass

class CurrentsRequest(OceanDataRequest):
    """Request model for ocean currents data"""
    pass

class BathymetryRequest(BaseModel):
    """Request model for bathymetry data"""
    bbox: Optional[str] = Field(None, description="Bounding box as 'min_lon,min_lat,max_lon,max_lat'")