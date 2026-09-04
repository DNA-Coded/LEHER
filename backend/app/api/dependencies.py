from fastapi import APIRouter
from app.api.routes import temperature, salinity, currents, bathymetry, sea_level, chlorophyll

# Create main API router
api_router = APIRouter(prefix="/api/ocean")

# Include all route modules
api_router.include_router(temperature.router, prefix="/temperature", tags=["temperature"])
api_router.include_router(salinity.router, prefix="/salinity", tags=["salinity"])
api_router.include_router(currents.router, prefix="/currents", tags=["currents"])
api_router.include_router(bathymetry.router, prefix="/bathymetry", tags=["bathymetry"])
api_router.include_router(sea_level.router, prefix="/sea-level", tags=["sea-level"])
api_router.include_router(chlorophyll.router, prefix="/chlorophyll", tags=["chlorophyll"])