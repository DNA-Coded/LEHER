#!/usr/bin/env python3
"""Test script to verify catalog updates"""

import yaml
from pathlib import Path

def test_catalog():
    """Test that catalog has been updated correctly"""
    catalog_path = Path("datasets/catalog.yaml")

    with open(catalog_path, 'r') as f:
        catalog_data = yaml.safe_load(f)

    datasets = catalog_data.get('datasets', {})

    # Check temperature dataset
    temp_ds = datasets.get('temperature', {})
    print(f"Temperature dataset ID: {temp_ds.get('dataset_id')}")
    print(f"Temperature description: {temp_ds.get('description')}")

    # Check salinity dataset
    sal_ds = datasets.get('salinity', {})
    print(f"Salinity dataset ID: {sal_ds.get('dataset_id')}")
    print(f"Salinity description: {sal_ds.get('description')}")

    # Check currents dataset
    curr_ds = datasets.get('currents', {})
    print(f"Currents dataset ID: {curr_ds.get('dataset_id')}")
    print(f"Currents description: {curr_ds.get('description')}")

    # Verify all use GLOBAL_MULTIYEAR_PHY_001_030
    expected_id = "GLOBAL_MULTIYEAR_PHY_001_030"
    success = True

    for name, ds in [('temperature', temp_ds), ('salinity', sal_ds), ('currents', curr_ds)]:
        if ds.get('dataset_id') != expected_id:
            print(f"ERROR: {name} dataset ID is {ds.get('dataset_id')}, expected {expected_id}")
            success = False
        else:
            print(f"[OK] {name} dataset ID correctly set to {expected_id}")

    return success

if __name__ == "__main__":
    if test_catalog():
        print("\n[PASS] Catalog test passed!")
    else:
        print("\n[FAIL] Catalog test failed!")
        exit(1)