from pydantic import BaseModel
from typing import Dict, Any, Optional, List

class CoordinateInfo(BaseModel):
    """Information about a coordinate dimension"""
    values: List[Any]
    units: str = ""
    dims: List[str] = []

class BaseOceanDataResponse(BaseModel):
    """Base response model for ocean data"""
    variable: str
    values: Any  # Can be scalar, list, or nested list depending on dimensions
    coords: Dict[str, CoordinateInfo] = {}
    attrs: Dict[str, Any] = {}
    dims: List[str] = []
    shape: List[int] = []

class TemperatureResponse(BaseOceanDataResponse):
    """Response model for temperature data"""
    pass

class SalinityResponse(BaseOceanDataResponse):
    """Response model for salinity data"""
    pass

class CurrentsResponse(BaseOceanDataResponse):
    """Response model for ocean currents data"""
    components: Dict[str, BaseOceanDataResponse] = {}

class BathymetryResponse(BaseOceanDataResponse):
    """Response model for bathymetry data"""
    pass

class MetadataResponse(BaseModel):
    """Response model for dataset metadata"""
    name: str
    variable: str
    provider: str
    dataset_id: str
    format: str
    unit: str
    dimensions: List[str]
    source: str
    description: str
    spatial_resolution: Optional[str] = None
    temporal_resolution: Optional[str] = None
    time_range: Optional[str] = None
    depth_range: Optional[str] = None
    access_method: str
    license: str
    attribution: str