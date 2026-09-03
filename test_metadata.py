#!/usr/bin/env python3
"""Test script to verify metadata updates"""

import json
from pathlib import Path

def test_metadata_file(filepath, expected_dataset_id):
    """Test that a metadata file has been updated correctly"""
    try:
        with open(filepath, 'r') as f:
            metadata = json.load(f)

        dataset_id = metadata.get('dataset_id')
        description = metadata.get('description', '')
        doi = metadata.get('doi', '')

        print(f"{filepath.name}:")
        print(f"  Dataset ID: {dataset_id}")
        print(f"  Has DOI: {'Yes' if doi else 'No'}")
        print(f"  Description mentions GLORYS12V1: {'GLORYS12V1' in description}")

        success = True
        if dataset_id != expected_dataset_id:
            print(f"  ERROR: Expected dataset ID {expected_dataset_id}, got {dataset_id}")
            success = False
        if 'GLORYS12V1' not in description:
            print(f"  WARNING: Description doesn't mention GLORYS12V1")
        if not doi:
            print(f"  WARNING: Missing DOI")

        return success
    except Exception as e:
        print(f"ERROR reading {filepath}: {e}")
        return False

def test_metadata():
    """Test that all metadata files have been updated correctly"""
    metadata_dir = Path("datasets/metadata")
    expected_id = "GLOBAL_MULTIYEAR_PHY_001_030"

    files_to_test = [
        ("temperature.json", "temperature"),
        ("salinity.json", "salinity"),
        ("currents.json", "currents")
    ]

    all_success = True
    for filename, name in files_to_test:
        filepath = metadata_dir / filename
        success = test_metadata_file(filepath, expected_id)
        if not success:
            all_success = False
        print()

    return all_success

if __name__ == "__main__":
    if test_metadata():
        print("[PASS] Metadata test passed!")
    else:
        print("[FAIL] Metadata test failed!")
        exit(1)