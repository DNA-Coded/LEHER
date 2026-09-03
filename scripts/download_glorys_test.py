#!/usr/bin/env python3
"""
SamudraX STEP 2: GLORYS12V1 Test Subset Downloader
Downloads a small regional 3D subset of GLORYS12V1 ocean physics reanalysis data
from Copernicus Marine Service for pipeline validation.
"""

import sys
import os
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("download_glorys_test")

# Try importing python-dotenv
try:
    from dotenv import load_dotenv
    # Load backend/.env or root .env
    root_dir = Path(__file__).resolve().parent.parent
    backend_env = root_dir / "backend" / ".env"
    root_env = root_dir / ".env"
    if backend_env.exists():
        load_dotenv(backend_env)
        logger.info(f"Loaded environment from {backend_env}")
    if root_env.exists():
        load_dotenv(root_env)
        logger.info(f"Loaded environment from {root_env}")
except ImportError:
    logger.warning("python-dotenv not installed, proceeding with system environment variables.")

# Try importing copernicusmarine
try:
    import copernicusmarine as cm
except ImportError:
    logger.error("copernicusmarine package is not installed. Please run 'pip install copernicusmarine'")
    sys.exit(1)

# Parameters for Step 2 Test Subset
DATASET_ID = "cmems_mod_glo_phy_my_0.083deg_P1D-m"
VARIABLES = ["thetao", "so", "uo", "vo"]
MIN_LON = 20.0
MAX_LON = 120.0
MIN_LAT = -40.0
MAX_LAT = 30.0
DATE_STR = "2020-01-01"  # 1 day only

# Output paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = PROJECT_ROOT / "data" / "test" / "glorys"
OUTPUT_FILENAME = "glorys_test.nc"
TARGET_FILE = OUTPUT_DIR / OUTPUT_FILENAME


def main():
    logger.info("==================================================")
    logger.info("SamudraX Step 2: Download GLORYS12V1 Test Subset")
    logger.info("==================================================")
    logger.info(f"Dataset ID:        {DATASET_ID}")
    logger.info(f"Variables:         {', '.join(VARIABLES)}")
    logger.info(f"Geographic BBox:   Lon [{MIN_LON}°E, {MAX_LON}°E], Lat [{MIN_LAT}°S, {MAX_LAT}°N]")
    logger.info(f"Time Range:        {DATE_STR} (1 day only)")
    logger.info(f"Depth Selection:   ALL AVAILABLE VERTICAL LEVELS")
    logger.info(f"Target File:       {TARGET_FILE}")
    logger.info("--------------------------------------------------")

    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Credentials check from environment (optional explicit pass, or use copernicusmarine credentials store)
    username = os.getenv("COPERNICUS_USERNAME") or os.getenv("COPERNICUSMARINE_SERVICE_USERNAME")
    password = os.getenv("COPERNICUS_PASSWORD") or os.getenv("COPERNICUSMARINE_SERVICE_PASSWORD")

    if username and password:
        logger.info(f"Using Copernicus credentials from environment (user: {username[:3]}***)")
    else:
        logger.info("No explicit environment credentials set. Utilizing Copernicus Marine configuration store (~/.copernicusmarine).")

    logger.info("Initiating Copernicus Marine Toolbox download...")

    try:
        kwargs = {
            "dataset_id": DATASET_ID,
            "variables": VARIABLES,
            "minimum_longitude": MIN_LON,
            "maximum_longitude": MAX_LON,
            "minimum_latitude": MIN_LAT,
            "maximum_latitude": MAX_LAT,
            "start_datetime": f"{DATE_STR}T00:00:00",
            "end_datetime": f"{DATE_STR}T23:59:59",
            "output_directory": str(OUTPUT_DIR),
            "output_filename": OUTPUT_FILENAME,
            "file_format": "netcdf",
            "overwrite": True,
            "disable_progress_bar": False,
        }

        if username and password:
            kwargs["username"] = username
            kwargs["password"] = password

        # Perform the actual download subset request
        response = cm.subset(**kwargs)

        if TARGET_FILE.exists():
            file_size_mb = TARGET_FILE.stat().st_size / (1024 * 1024)
            logger.info("--------------------------------------------------")
            logger.info("SUCCESS: Test subset successfully downloaded!")
            logger.info(f"Output Path: {TARGET_FILE}")
            logger.info(f"File Size:   {file_size_mb:.2f} MB")
            logger.info("--------------------------------------------------")
            return 0
        else:
            logger.error("Download appeared to succeed but output file was not found at expected destination.")
            return 1

    except Exception as e:
        logger.error(f"DOWNLOAD FAILED: {e}")
        logger.error("Please verify authentication credentials, network connection, or parameters.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
