import subprocess
import os

# Data directory on G: drive
DATA_DIR = r"G:\SamundraX-data"
os.makedirs(DATA_DIR, exist_ok=True)

# Correct dataset ID from Copernicus catalog (GLORYS12V1 daily)
DATASET_ID = "cmems_mod_glo_phy_my_0.083deg_P1D-m"

# Indian Ocean bounding box
MIN_LON = "50"
MAX_LON = "100"
MIN_LAT = "-20"
MAX_LAT = "25"

# Single day for initial development
START_DATE = "2023-01-01"
END_DATE = "2023-01-02"

# Near-surface (use nearest selection to snap to shallowest available level)
MIN_DEPTH = "0.5"
MAX_DEPTH = "0.5"

print(f"[INFO] Data will be saved to: {DATA_DIR}")
print(f"[INFO] Dataset: {DATASET_ID}")
print(f"[INFO] Region: lon [{MIN_LON}, {MAX_LON}], lat [{MIN_LAT}, {MAX_LAT}]")
print(f"[INFO] Date: {START_DATE} to {END_DATE}, Depth: surface\n")


def download_subset(variables, output_name):
    """Download a subset from Copernicus Marine. variables is a list of variable names."""
    cmd = [
        "copernicusmarine", "subset",
        "--dataset-id", DATASET_ID,
    ]
    for v in variables:
        cmd.extend(["--variable", v])
    cmd.extend([
        "--minimum-longitude", MIN_LON,
        "--maximum-longitude", MAX_LON,
        "--minimum-latitude", MIN_LAT,
        "--maximum-latitude", MAX_LAT,
        "--minimum-depth", MIN_DEPTH,
        "--maximum-depth", MAX_DEPTH,
        "--start-datetime", START_DATE,
        "--end-datetime", END_DATE,
        "--output-directory", DATA_DIR,
        "--output-filename", output_name,
        "--file-format", "netcdf",
        "--coordinates-selection-method", "nearest",
        "--overwrite",
    ])

    print(f"[INFO] Downloading {variables} ...")
    try:
        subprocess.run(cmd, check=True)
        print(f"[OK] Saved: {output_name}\n")
    except subprocess.CalledProcessError as e:
        print(f"[FAIL] {variables}: exit code {e.returncode}\n")
    except FileNotFoundError:
        print("[FAIL] 'copernicusmarine' not found. Run: pip install copernicusmarine")
        raise SystemExit(1)


# 1. Temperature
download_subset(["thetao"], "temperature_indian_ocean.nc")

# 2. Salinity
download_subset(["so"], "salinity_indian_ocean.nc")

# 3. Currents (U + V together)
download_subset(["uo", "vo"], "currents_indian_ocean.nc")

print("[DONE] All Copernicus downloads finished!")
print(f"[INFO] Check your files in: {DATA_DIR}")
