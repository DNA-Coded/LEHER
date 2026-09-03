#!/usr/bin/env python3
"""
Test script to verify the SamudraX backend setup
"""

import os
import sys
from pathlib import Path

def test_imports():
    """Test that all modules can be imported"""
    print("Testing imports...")

    try:
        # Test backend imports
        sys.path.append(str(Path(__file__).parent / "app"))

        from data.copernicus import CopernicusDataAccess, get_copernicus_access
        from data.gebco import GEBCODataAccess, get_gebco_access
        print("✓ Data access modules imported successfully")

        from api.routes.temperature import router as temp_router
        from api.routes.salinity import router as sal_router
        from api.routes.currents import router as curr_router
        from api.routes.bathymetry import router as bathy_router
        print("✓ API route modules imported successfully")

        from api.dependencies import api_router
        print("✓ API dependencies imported successfully")

        from schemas.requests import OceanDataRequest, TemperatureRequest
        from schemas.responses import TemperatureResponse, MetadataResponse
        print("✓ Schema modules imported successfully")

        return True

    except Exception as e:
        print(f"✗ Import failed: {e}")
        return False

def test_catalog_loading():
    """Test that the dataset catalog can be loaded"""
    print("\nTesting catalog loading...")

    try:
        import yaml
        catalog_path = Path(__file__).parent.parent / "datasets" / "catalog.yaml"

        if not catalog_path.exists():
            print(f"✗ Catalog file not found: {catalog_path}")
            return False

        with open(catalog_path, 'r') as f:
            catalog = yaml.safe_load(f)

        datasets = catalog.get('datasets', {})
        expected_datasets = ['temperature', 'salinity', 'currents', 'bathymetry', 'chlorophyll', 'sea_level', 'argo_observations']

        for ds in expected_datasets:
            if ds not in datasets:
                print(f"✗ Dataset '{ds}' not found in catalog")
                return False

        print(f"✓ Catalog loaded successfully with {len(datasets)} datasets")
        return True

    except Exception as e:
        print(f"✗ Catalog loading failed: {e}")
        return False

def test_metadata_loading():
    """Test that metadata files can be loaded"""
    print("\nTesting metadata loading...")

    try:
        import json
        metadata_dir = Path(__file__).parent.parent / "datasets" / "metadata"

        if not metadata_dir.exists():
            print(f"✗ Metadata directory not found: {metadata_dir}")
            return False

        metadata_files = list(metadata_dir.glob("*.json"))
        if len(metadata_files) == 0:
            print("✗ No metadata files found")
            return False

        for metadata_file in metadata_files[:3]:  # Test first 3 files
            with open(metadata_file, 'r') as f:
                metadata = json.load(f)

            required_fields = ['name', 'variable', 'provider', 'dataset_id', 'format', 'unit']
            for field in required_fields:
                if field not in metadata:
                    print(f"✗ Missing field '{field}' in {metadata_file.name}")
                    return False

        print(f"✓ Metadata files loaded successfully ({len(metadata_files)} files)")
        return True

    except Exception as e:
        print(f"✗ Metadata loading failed: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 50)
    print("SamudraX Backend Setup Test")
    print("=" * 50)

    tests = [
        test_imports,
        test_catalog_loading,
        test_metadata_loading
    ]

    passed = 0
    total = len(tests)

    for test in tests:
        if test():
            passed += 1

    print("\n" + "=" * 50)
    print(f"Test Results: {passed}/{total} passed")

    if passed == total:
        print("🎉 All tests passed! Backend setup is ready.")
        return 0
    else:
        print("❌ Some tests failed. Please check the errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())