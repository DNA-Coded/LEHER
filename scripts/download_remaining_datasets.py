import subprocess
import os

DATA_DIR = "./SamundraX-data"
os.makedirs(DATA_DIR, exist_ok=True)

# Common params
MIN_LON = "50"
MAX_LON = "100"
MIN_LAT = "-20"
MAX_LAT = "25"
START_DATE = "2023-01-01"
END_DATE = "2023-01-02"

def download_subset(dataset_id, variables, output_name, depth_args=None, date_args=None):
    cmd = [
        "copernicusmarine", "subset",
        "--dataset-id", dataset_id,
    ]
    for v in variables:
        cmd.extend(["--variable", v])
    
    cmd.extend([
        "--minimum-longitude", MIN_LON,
        "--maximum-longitude", MAX_LON,
        "--minimum-latitude", MIN_LAT,
        "--maximum-latitude", MAX_LAT,
    ])
    
    if depth_args:
        cmd.extend(depth_args)
        
    if date_args:
        cmd.extend(date_args)
        
    cmd.extend([
        "--output-directory", DATA_DIR,
        "--output-filename", output_name,
        "--file-format", "netcdf",
        "--coordinates-selection-method", "nearest",
        "--overwrite",
    ])

    print(f"[INFO] Downloading {variables} from {dataset_id} ...")
    try:
        subprocess.run(cmd, check=True)
        print(f"[OK] Saved: {output_name}\n")
    except subprocess.CalledProcessError as e:
        print(f"[FAIL] {variables}: exit code {e.returncode}\n")

# 1. Sea Level Anomaly (zos)
download_subset(
    dataset_id="cmems_mod_glo_phy_my_0.083deg_P1D-m",
    variables=["zos"],
    output_name="sea_level_indian_ocean.nc",
    date_args=["--start-datetime", START_DATE, "--end-datetime", END_DATE]
    # ZOS is a 2D variable (surface only), so it doesn't need depth args
)

# 2. Chlorophyll (chl)
# Note: Biology dataset has a different shallowest depth (0.5057m)
# Using a small range (0.5 to 0.6) so 'nearest' correctly snaps to the surface level
download_subset(
    dataset_id="cmems_mod_glo_bgc_my_0.25deg_P1D-m",
    variables=["chl"],
    output_name="chlorophyll_indian_ocean.nc",
    depth_args=["--minimum-depth", "0.5", "--maximum-depth", "0.6"],
    date_args=["--start-datetime", START_DATE, "--end-datetime", END_DATE]
)

# 3. Bathymetry (deptho)
# Note: Static dataset doesn't need time or depth args
download_subset(
    dataset_id="cmems_mod_glo_phy_my_0.083deg_static",
    variables=["deptho"],
    output_name="bathymetry_indian_ocean.nc"
)

print("[DONE] All remaining datasets downloaded!")
