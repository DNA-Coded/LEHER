import time
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_performance_test():
    print("=== Phase 2C Performance Test ===")
    
    # Test 1: Small Grid
    print("\n1. Testing Small Grid (lat: -10 to 10, lon: 60 to 80, depth: 100m)")
    start_time = time.time()
    res = client.get("/api/ocean/temperature", params={
        "lat_min": -10.0, "lat_max": 10.0,
        "lon_min": 60.0, "lon_max": 80.0,
        "depth": 100.0,
        "time": "2023-01-01T00:00:00Z"
    })
    elapsed = time.time() - start_time
    print(f"Status Code: {res.status_code}")
    
    if res.status_code == 200:
        data = res.json()
        payload_size = len(res.content)
        shape = data.get("shape", [])
        num_points = shape[0] * shape[1] if len(shape) >= 2 else 0
        print(f"Time Elapsed: {elapsed:.4f} seconds")
        print(f"Response Size: {payload_size / 1024:.2f} KB")
        print(f"Grid Shape: {shape} ({num_points} points)")
        print(f"Selected Depth: {data.get('depth')}")
        print(f"Selected Time: {data.get('time')}")
    else:
        print(f"Error: {res.text}")

    # Test 2: Slightly Larger Grid
    print("\n2. Testing Larger Grid (lat: -20 to 20, lon: 50 to 90)")
    start_time = time.time()
    res = client.get("/api/ocean/temperature", params={
        "lat_min": -20.0, "lat_max": 20.0,
        "lon_min": 50.0, "lon_max": 90.0
    })
    elapsed = time.time() - start_time
    print(f"Status Code: {res.status_code}")
    
    if res.status_code == 200:
        data = res.json()
        payload_size = len(res.content)
        shape = data.get("shape", [])
        num_points = shape[0] * shape[1] if len(shape) >= 2 else 0
        print(f"Time Elapsed: {elapsed:.4f} seconds")
        print(f"Response Size: {payload_size / 1024:.2f} KB")
        print(f"Grid Shape: {shape} ({num_points} points)")
    else:
        print(f"Error: {res.text}")

if __name__ == "__main__":
    run_performance_test()
