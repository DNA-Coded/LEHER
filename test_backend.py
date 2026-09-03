#!/usr/bin/env python3
"""Test script to verify backend can load catalog"""

import os
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent / "backend"))

def test_backend_catalog():
    """Test that backend can load the updated catalog"""
    try:
        from app.data.copernicus import CopernicusDataAccess

        # Create instance with our data directory
        data_access = CopernicusDataAccess("./samundrax-data")

        # Check that catalog was loaded
        catalog = data_access.catalog
        print(f"Loaded {len(catalog)} datasets from catalog")

        # Check specific datasets
        expected_datasets = ['temperature', 'salinity', 'currents']
        for ds_name in expected_datasets:
            if ds_name in catalog:
                ds_info = catalog[ds_name]
                print(f"  {ds_name}: dataset_id={ds_info.get('dataset_id')}")
                if ds_info.get('dataset_id') == "GLOBAL_MULTIYEAR_PHY_001_030":
                    print(f"    [OK] Correctly updated to GLORYS12V1")
                else:
                    print(f"    [ERROR] Still using old ID: {ds_info.get('dataset_id')}")
                    return False
            else:
                print(f"  {ds_name}: NOT FOUND in catalog")
                return False

        return True

    except Exception as e:
        print(f"Error testing backend: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    if test_backend_catalog():
        print("\n[PASS] Backend catalog test passed!")
    else:
        print("\n[FAIL] Backend catalog test failed!")
        exit(1)