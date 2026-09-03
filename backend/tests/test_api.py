# pyrefly: ignore [missing-import]
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.data.copernicus import get_copernicus_access

client = TestClient(app)

def test_1_temperature_point_query():
    response = client.get("/api/ocean/temperature", params={"lat": 0.0, "lon": 75.0})
    assert response.status_code == 200
    data = response.json()
    assert data["dataset"] == "temperature"
    assert data["variable"] == "thetao"
    assert "value" in data
    assert data["location"]["lat"] == 0.0
    assert data["location"]["lon"] == 75.0

def test_2_temperature_grid_query():
    response = client.get("/api/ocean/temperature", params={
        "lat_min": -2.0, "lat_max": 2.0,
        "lon_min": 70.0, "lon_max": 74.0
    })
    assert response.status_code == 200
    data = response.json()
    assert "coordinates" in data
    assert "latitude" in data["coordinates"]
    assert "longitude" in data["coordinates"]
    assert len(data["shape"]) >= 2
    assert isinstance(data["values"], list)

def test_3_temperature_depth_query():
    response = client.get("/api/ocean/temperature", params={
        "lat_min": -2.0, "lat_max": 2.0,
        "lon_min": 70.0, "lon_max": 74.0,
        "depth": 10.0
    })
    assert response.status_code == 200
    data = response.json()
    assert "depth" in data
    assert isinstance(data["depth"], float)

def test_4_temperature_time_query():
    response = client.get("/api/ocean/temperature", params={
        "lat_min": -2.0, "lat_max": 2.0,
        "lon_min": 70.0, "lon_max": 74.0,
        "time": "2023-01-01T00:00:00Z"
    })
    assert response.status_code == 200
    data = response.json()
    assert "time" in data
    assert isinstance(data["time"], str)

def test_5_salinity_grid_query():
    response = client.get("/api/ocean/salinity", params={
        "lat_min": 0.0, "lat_max": 1.0, "lon_min": 75.0, "lon_max": 76.0
    })
    assert response.status_code == 200
    assert response.json()["dataset"] == "salinity"

def test_6_currents_grid_query():
    response = client.get("/api/ocean/currents", params={
        "lat_min": 0.0, "lat_max": 1.0, "lon_min": 75.0, "lon_max": 76.0
    })
    assert response.status_code == 200
    data = response.json()
    assert data["variable"] == "currents"
    assert "u" in data["components"]
    assert "v" in data["components"]

def test_7_bathymetry_grid_query():
    response = client.get("/api/ocean/bathymetry", params={
        "lat_min": 0.0, "lat_max": 1.0, "lon_min": 75.0, "lon_max": 76.0
    })
    assert response.status_code == 200
    assert response.json()["dataset"] == "bathymetry"

def test_8_sea_level_grid_query():
    response = client.get("/api/ocean/sea-level", params={
        "lat_min": 0.0, "lat_max": 1.0, "lon_min": 75.0, "lon_max": 76.0
    })
    assert response.status_code == 200
    assert response.json()["dataset"] == "sea_level"

def test_9_chlorophyll_grid_query():
    response = client.get("/api/ocean/chlorophyll", params={
        "lat_min": 0.0, "lat_max": 1.0, "lon_min": 75.0, "lon_max": 76.0
    })
    assert response.status_code == 200
    assert response.json()["dataset"] == "chlorophyll"

def test_10_invalid_coordinates():
    # Only providing some bounds, should return 400
    response = client.get("/api/ocean/temperature", params={
        "lat_min": 0.0, "lat_max": 1.0
    })
    assert response.status_code == 400

def test_11_invalid_dataset():
    data_access = get_copernicus_access()
    res = data_access.get_grid_data("invalid_ds", "thetao", 0, 1, 75, 76)
    assert res is None

def test_12_invalid_variable():
    data_access = get_copernicus_access()
    res = data_access.get_grid_data("temperature", "invalid_var", 0, 1, 75, 76)
    assert res is None

def test_13_excessively_large_request():
    # Full globe request or very large bounds should trigger 413
    response = client.get("/api/ocean/temperature", params={
        "lat_min": -90.0, "lat_max": 90.0,
        "lon_min": -180.0, "lon_max": 180.0
    })
    assert response.status_code == 413

def test_14_missing_data_nan_handling():
    # Bathymetry over land (e.g. Himalayas lat 28, lon 84, but our dataset is only up to 25 N)
    # Let's query an area that definitely has land in the Indian Ocean dataset, e.g., India interior: lat 20, lon 78
    response = client.get("/api/ocean/temperature", params={"lat": 20.0, "lon": 78.0})
    assert response.status_code == 200
    data = response.json()
    assert data["value"] is None
