# ML Integration Guide for Backend Developer

This guide provides step-by-step instructions for integrating the **Lahar ML Model (V2)** into the `Leher` FastAPI backend. 

All the necessary model files have already been copied into `backend/models/`, and the required dependencies (`scikit-learn`, `xgboost`, `pandas`) have been added to `requirements.txt`.

## Step 1: Install Dependencies
Ensure you run the following command to update your local virtual environment:
```bash
pip install -r requirements.txt
```

## Step 2: Global Model Initialization
You need to load the model into memory exactly **once** when the FastAPI server starts, so that inference is instant (0ms disk read overhead).

In your `app/main.py`, import the API wrapper and instantiate it globally or via FastAPI's `lifespan` manager.

```python
import os
import sys

# Add the models directory to the path so we can import model_api
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'models'))
from model_api import LaharModelAPI

# Initialize globally (or use FastAPI lifespan)
ml_api = LaharModelAPI(
    model_path=os.path.join(os.path.dirname(__file__), '..', 'models', 'lahar_ocean_model_v2.pkl'),
    metadata_path=os.path.join(os.path.dirname(__file__), '..', 'models', 'lahar_ocean_model_v2_info.json')
)
```

## Step 3: Create the Prediction Endpoint
You need to create a new route that the 3D frontend can call when the user clicks the globe and drags the depth slider.

Create a new file `app/api/routes/ml_prediction.py` (or add to an existing route):

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import sys
import os

# Import the globally initialized model from main
# (Alternatively, pass it in via Dependency Injection)
from app.main import ml_api 

router = APIRouter()

class OceanPredictionRequest(BaseModel):
    latitude: float
    longitude: float
    depth: float
    surface_temp: float
    surface_salinity: float
    month: int = None
    day_of_year: int = None

@router.post("/deep_ocean")
async def get_deep_ocean_prediction(req: OceanPredictionRequest):
    try:
        # Call the ML Model API
        result = ml_api.predict(
            latitude=req.latitude,
            longitude=req.longitude,
            depth=req.depth,
            surface_temp=req.surface_temp,
            surface_salinity=req.surface_salinity,
            month=req.month,
            day_of_year=req.day_of_year
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

## Step 4: Register the Route
Finally, register this new route in your `app/api/dependencies.py`:

```python
from app.api.routes import ml_prediction

# Add to your existing includes
api_router.include_router(ml_prediction.router, prefix="/predict", tags=["ml_prediction"])
```

## Testing the Integration
Once the server is running (`uvicorn app.main:app --reload`), you can test the endpoint using curl or the `/docs` Swagger UI:

```bash
curl -X 'POST' \
  'http://localhost:8000/api/ocean/predict/deep_ocean' \
  -H 'Content-Type: application/json' \
  -d '{
  "latitude": 19.0,
  "longitude": 95.0,
  "depth": 1200.0,
  "surface_temp": 28.5,
  "surface_salinity": 35.2
}'
```

You should receive a JSON response containing `thetao`, `so`, `uo`, `vo`, and `current_speed`.
