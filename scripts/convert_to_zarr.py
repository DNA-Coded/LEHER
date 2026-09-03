import os
import glob
import xarray as xr
import shutil

DATA_DIR = "./SamundraX-data"

# Find all NetCDF files in the data directory
nc_files = glob.glob(os.path.join(DATA_DIR, "*.nc"))

if not nc_files:
    print(f"No NetCDF files found in {DATA_DIR}")
    exit(0)

print(f"Found {len(nc_files)} NetCDF files. Converting to Zarr...\n")

for nc_file in nc_files:
    # Generate the Zarr output path (replace .nc with .zarr)
    base_name = os.path.basename(nc_file)
    name_without_ext = os.path.splitext(base_name)[0]
    zarr_dir = os.path.join(DATA_DIR, f"{name_without_ext}.zarr")
    
    # If the Zarr directory already exists, remove it so we can overwrite
    if os.path.exists(zarr_dir):
        shutil.rmtree(zarr_dir)
    
    print(f"Loading: {base_name}")
    # Open the NetCDF file
    ds = xr.open_dataset(nc_file)
    
    print(f"Saving to: {os.path.basename(zarr_dir)}")
    # Save as Zarr format
    ds.to_zarr(zarr_dir, consolidated=True)
    
    # Optional: Close the dataset to free memory
    ds.close()
    
    print("---")

print("[DONE] All datasets successfully converted to Zarr format!")
