import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_ml_prediction_valid_request():
    """Test successful deep ocean prediction with valid input"""
    # Using a location in the Indian Ocean where surface data is likely valid
    payload = {
        "latitude": 15.0,
        "longitude": 70.0,
        "depth": 1000.0,
        "surface_temp": 28.5,
        "surface_salinity": 35.2
    }
    
    response = client.post("/api/ocean/predict/deep_ocean", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["success"] is True
    assert "data" in data
    
    prediction = data["data"]
    assert "thetao" in prediction
    assert "so" in prediction
    assert "uo" in prediction
    assert "vo" in prediction
    
    # Ensure numerical values are returned
    assert isinstance(prediction["thetao"], float)
    assert isinstance(prediction["so"], float)

from unittest.mock import patch

def test_ml_prediction_without_surface_data():
    """Test ML prediction relying on backend data access for surface temp/salinity"""
    payload = {
        "latitude": 10.0,
        "longitude": 65.0,
        "depth": 500.0
    }
    
    with patch('app.api.routes.ml_prediction.get_copernicus_access') as mock_get_access:
        mock_access = mock_get_access.return_value
        # Mock the get_point_data to return valid values for temperature and salinity
        mock_access.get_point_data.side_effect = lambda dataset_key, **kwargs: {
            "value": 28.5 if dataset_key == "temperature" else 35.2
        }
        
        response = client.post("/api/ocean/predict/deep_ocean", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "data" in data

def test_ml_prediction_invalid_depth():
    """Test ML prediction with invalid depth (outside model bounds)"""
    payload = {
        "latitude": 15.0,
        "longitude": 70.0,
        "depth": -100.0,  # Invalid depth
        "surface_temp": 28.5,
        "surface_salinity": 35.2
    }
    
    response = client.post("/api/ocean/predict/deep_ocean", json=payload)
    
    # The API should return 400 Bad Request for validation failure
    assert response.status_code == 400
