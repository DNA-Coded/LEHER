import xarray as xr
import os

DATA_DIR = "./SamundraX-data"

datasets = {
    "Temperature (°C)": ("temperature_indian_ocean.zarr", "thetao"),
    "Salinity (PSU)": ("salinity_indian_ocean.zarr", "so"),
    "Current Eastward (m/s)": ("currents_indian_ocean.zarr", "uo"),
    "Current Northward (m/s)": ("currents_indian_ocean.zarr", "vo"),
    "Sea Level Anomaly (m)": ("sea_level_indian_ocean.zarr", "zos"),
    "Chlorophyll (mg/m³)": ("chlorophyll_indian_ocean.zarr", "chl"),
    "Bathymetry (m)": ("bathymetry_indian_ocean.zarr", "deptho"),
}

# Let's look at a specific point in the Indian Ocean, just south of India
# Latitude: 0.0 (Equator), Longitude: 75.0
sample_lat = 0.0
sample_lon = 75.0

print(f"=== Sample Data at Latitude {sample_lat}°, Longitude {sample_lon}° ===\n")

for name, (file_name, var_name) in datasets.items():
    zarr_path = os.path.join(DATA_DIR, file_name)
    if not os.path.exists(zarr_path):
        print(f"{name}: File not found")
        continue
        
    ds = xr.open_zarr(zarr_path)
    
    # We use method="nearest" to snap to the closest grid point in the dataset
    try:
        # Check if time dimension exists
        if "time" in ds.dims:
            point = ds[var_name].isel(time=0).sel(latitude=sample_lat, longitude=sample_lon, method="nearest")
        else:
            point = ds[var_name].sel(latitude=sample_lat, longitude=sample_lon, method="nearest")
            
        value = point.values.item()
        
        # Round the value for readable display
        if value is not None and not str(value) == 'nan':
            print(f"{name:25} : {value:.4f}")
        else:
            print(f"{name:25} : NaN (No data, might be land)")
            
    except Exception as e:
        print(f"{name:25} : Error reading data ({e})")

print("\n(Note: These are real values from January 1, 2023 at the ocean surface)")
