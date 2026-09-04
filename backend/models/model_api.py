#!/usr/bin/env python3
"""
Lahar ML Model API Interface
Provides a simple interface for the Smart India Hackathon 3D visualization frontend
to get ocean state predictions from the trained ML model.
"""

import pickle
import numpy as np
import json
import os
import copy
from datetime import datetime
from typing import Dict, List, Union, Optional

class LaharModelAPI:
    """API wrapper for the Lahar ML Model"""

    def __init__(self, model_path: str = None, metadata_path: str = None):
        """
        Initialize the Lahar ML Model API

        Args:
            model_path: Path to the trained model pickle file
            metadata_path: Path to the model metadata JSON file
        """
        if model_path is None:
            model_path = os.path.join(os.path.dirname(__file__), "lahar_ocean_model_v2.pkl")
        if metadata_path is None:
            metadata_path = os.path.join(os.path.dirname(__file__), "lahar_ocean_model_v2_info.json")

        self.model_path = model_path
        self.metadata_path = metadata_path
        self.model = None
        self.metadata = None
        self.feature_names = None
        self.target_names = None

        self._load_model()
        self._load_metadata()

    def _load_model(self):
        """Load the trained model from pickle file"""
        try:
            with open(self.model_path, 'rb') as f:
                self.model = pickle.load(f)
            print(f"[OK] Model loaded from {self.model_path}")
        except Exception as e:
            raise RuntimeError(f"Failed to load model from {self.model_path}: {e}")

    def _load_metadata(self):
        """Load model metadata from JSON file"""
        try:
            with open(self.metadata_path, 'r') as f:
                self.metadata = json.load(f)
            self.feature_names = self.metadata['data_info']['feature_names']
            self.target_names = self.metadata['data_info']['target_names']
            print(f"[OK] Metadata loaded from {self.metadata_path}")
        except Exception as e:
            raise RuntimeError(f"Failed to load metadata from {self.metadata_path}: {e}")

    def _engineer_temporal_features(self, month: int, day_of_year: int) -> Dict[str, float]:
        """Engineer cyclical temporal features"""
        month_sin = np.sin(2 * np.pi * month / 12)
        month_cos = np.cos(2 * np.pi * month / 12)
        doy_sin = np.sin(2 * np.pi * day_of_year / 365.25)
        doy_cos = np.cos(2 * np.pi * day_of_year / 365.25)

        return {
            'month_sin': float(month_sin),
            'month_cos': float(month_cos),
            'doy_sin': float(doy_sin),
            'doy_cos': float(doy_cos)
        }

    def _validate_input(self, latitude: float, longitude: float, depth: float,
                       surface_temp: float, surface_salinity: float) -> List[str]:
        """Validate input parameters against expected ranges"""
        errors = []
        ranges = {
            'latitude': (-20, 25),
            'longitude': (50, 100),
            'depth': (0, 2000),
            'surface_temp': (-2, 40),
            'surface_salinity': (0, 40)
        }

        params = {
            'latitude': latitude,
            'longitude': longitude,
            'depth': depth,
            'surface_temp': surface_temp,
            'surface_salinity': surface_salinity
        }

        for param, value in params.items():
            min_val, max_val = ranges[param]
            if value < min_val or value > max_val:
                errors.append(f"{param}={value} is outside valid range [{min_val}, {max_val}]")

        return errors

    def predict(self, latitude: float, longitude: float, depth: float,
               surface_temp: float, surface_salinity: float,
               month: int = None, day_of_year: int = None) -> Dict[str, Union[float, Dict]]:
        """
        Predict ocean state variables at given location and conditions

        Args:
            latitude: Latitude in degrees north (-90 to 90)
            longitude: Longitude in degrees east (-180 to 180)
            depth: Depth in meters (positive downward, 0 to 8000)
            surface_temp: Surface temperature in degrees Celsius (-2 to 40)
            surface_salinity: Surface salinity in PSU (0 to 40)
            month: Month of year (1-12, optional - defaults to current month)
            day_of_year: Day of year (1-366, optional - defaults to current day)

        Returns:
            Dictionary containing predictions for thetao, so, uo, vo with metadata
        """
        # Use current date if temporal parameters not provided
        if month is None or day_of_year is None:
            now = datetime.now()
            if month is None:
                month = now.month
            if day_of_year is None:
                day_of_year = now.timetuple().tm_yday

        # Validate inputs
        validation_errors = self._validate_input(latitude, longitude, depth,
                                               surface_temp, surface_salinity)
        if validation_errors:
            raise ValueError(f"Input validation failed: {'; '.join(validation_errors)}")

        # Engineer temporal features
        temporal_features = self._engineer_temporal_features(month, day_of_year)

        # Prepare feature vector in correct order
        feature_vector = np.array([[
            latitude,
            longitude,
            depth,
            surface_temp,
            surface_salinity,
            temporal_features['month_sin'],
            temporal_features['month_cos'],
            temporal_features['doy_sin'],
            temporal_features['doy_cos']
        ]])

        # Make prediction
        try:
            prediction = self.model.predict(feature_vector)[0]  # Get first (and only) row

            # Format results
            results = {}
            for i, target_name in enumerate(self.target_names):
                results[target_name] = float(prediction[i])
                
            # Calculate total current speed (borrowed from Pranjal's model)
            if 'uo' in results and 'vo' in results:
                results['current_speed'] = float(np.sqrt(results['uo']**2 + results['vo']**2))

            # Add metadata
            results['metadata'] = {
                'input': {
                    'latitude': latitude,
                    'longitude': longitude,
                    'depth': depth,
                    'surface_temp': surface_temp,
                    'surface_salinity': surface_salinity,
                    'month': month,
                    'day_of_year': day_of_year
                },
                'temporal_features_used': temporal_features,
                'model_version': self.metadata['model_info']['version'],
                'prediction_timestamp': datetime.now().isoformat(),
                'units': self.metadata['units']
            }

            return results

        except Exception as e:
            raise RuntimeError(f"Prediction failed: {e}")

    def predict_batch(self, locations: List[Dict]) -> List[Dict]:
        """
        Make predictions for multiple locations

        Args:
            locations: List of dictionaries, each containing:
                - latitude, longitude, depth, surface_temp, surface_salinity
                - Optional: month, day_of_year

        Returns:
            List of prediction dictionaries
        """
        results = []
        for i, location in enumerate(locations):
            try:
                pred = self.predict(**location)
                results.append({
                    'success': True,
                    'data': pred,
                    'location_index': i
                })
            except Exception as e:
                results.append({
                    'success': False,
                    'error': str(e),
                    'location_index': i,
                    'input': location
                })
        return results

    def get_model_info(self) -> Dict:
        """Get model metadata and information"""
        return copy.deepcopy(self.metadata)

    def health_check(self) -> Dict[str, Union[bool, str]]:
        """Check if the API is healthy and ready to serve predictions"""
        try:
            # Try a simple prediction with known good values
            test_pred = self.predict(
                latitude=10.0,
                longitude=75.0,
                depth=10.0,
                surface_temp=28.0,
                surface_salinity=35.0,
                month=6,
                day_of_year=180
            )
            return {
                'healthy': True,
                'message': 'API is operational',
                'model_version': self.metadata['model_info']['version'],
                'last_check': datetime.now().isoformat()
            }
        except Exception as e:
            return {
                'healthy': False,
                'message': f'Health check failed: {e}',
                'last_check': datetime.now().isoformat()
            }

# Global singleton instance for convenience functions to avoid reloading pickle on every call
_GLOBAL_API_INSTANCE = None

def get_api_instance() -> LaharModelAPI:
    global _GLOBAL_API_INSTANCE
    if _GLOBAL_API_INSTANCE is None:
        _GLOBAL_API_INSTANCE = LaharModelAPI()
    return _GLOBAL_API_INSTANCE

# Convenience functions for easy usage
def predict_ocean_state(latitude: float, longitude: float, depth: float,
                       surface_temp: float, surface_salinity: float,
                       month: int = None, day_of_year: int = None) -> Dict:
    """
    Convenience function for single prediction (uses cached singleton API)
    """
    api = get_api_instance()
    return api.predict(latitude, longitude, depth, surface_temp, surface_salinity, month, day_of_year)

def predict_ocean_state_batch(locations: List[Dict]) -> List[Dict]:
    """
    Convenience function for batch prediction (uses cached singleton API)
    """
    api = get_api_instance()
    return api.predict_batch(locations)

# Example usage and testing
if __name__ == "__main__":
    print("=" * 60)
    print("LAHAR ML MODEL API - DEMONSTRATION")
    print("=" * 60)

    # Initialize API
    print("Initializing Lahar Model API...")
    api = LaharModelAPI()

    # Health check
    print("\nPerforming health check...")
    health = api.health_check()
    print(f"Health Status: {'[PASS] HEALTHY' if health['healthy'] else '[FAIL] UNHEALTHY'}")
    print(f"Message: {health['message']}")

    # Model info
    print("\nModel Information:")
    info = api.get_model_info()
    print(f"  Version: {info['model_info']['version']}")
    print(f"  Training Date: {info['model_info']['training_date']}")
    print(f"  Features: {info['data_info']['features_count']}")
    print(f"  Targets: {info['data_info']['targets_count']}")

    # Single prediction example
    print("\n" + "-" * 40)
    print("SINGLE PREDICTION EXAMPLE")
    print("-" * 40)

    # Example: Indian Ocean location, mid-depth, January conditions
    try:
        result = api.predict(
            latitude=19.0,      # 19°N
            longitude=95.0,     # 95°E
            depth=1200.0,       # 1200m depth
            surface_temp=28.5,  # 28.5°C surface temperature
            surface_salinity=35.2, # 35.2 PSU surface salinity
            month=1,            # January
            day_of_year=15      # Day 15 of year
        )

        print(f"Location: {result['metadata']['input']['latitude']}°N, "
              f"{result['metadata']['input']['longitude']}°E")
        print(f"Depth: {result['metadata']['input']['depth']}m")
        print(f"Surface Conditions: {result['metadata']['input']['surface_temp']}°C, "
              f"{result['metadata']['input']['surface_salinity']} PSU")
        print(f"Date: Month {result['metadata']['input']['month']}, "
              f"Day {result['metadata']['input']['day_of_year']}")
        print()
        print("PREDICTIONS:")
        print(f"  Temperature (thetao): {result['thetao']:.2f}°C")
        print(f"  Salinity (so):        {result['so']:.2f} PSU")
        print(f"  Eastward Current (uo): {result['uo']:.3f} m/s")
        print(f"  Northward Current (vo): {result['vo']:.3f} m/s")
        if 'current_speed' in result:
            print(f"  Total Current Speed:   {result['current_speed']:.3f} m/s")

    except Exception as e:
        print(f"[ERROR] Prediction failed: {e}")

    # Batch prediction example
    print("\n" + "-" * 40)
    print("BATCH PREDICTION EXAMPLE")
    print("-" * 40)

    test_locations = [
        {
            'latitude': 5.0, 'longitude': 80.0, 'depth': 0.0,
            'surface_temp': 29.0, 'surface_salinity': 34.8,
            'month': 1, 'day_of_year': 15
        },
        {
            'latitude': 15.0, 'longitude': 70.0, 'depth': 1000.0,
            'surface_temp': 27.0, 'surface_salinity': 35.0,
            'month': 1, 'day_of_year': 15
        },
        {
            'latitude': -5.0, 'longitude': 90.0, 'depth': 2000.0,
            'surface_temp': 24.0, 'surface_salinity': 34.5,
            'month': 1, 'day_of_year': 15
        }
    ]

    try:
        batch_results = api.predict_batch(test_locations)

        for i, result in enumerate(batch_results):
            print(f"\nLocation {i+1}:")
            if result['success']:
                pred = result['data']
                inp = pred['metadata']['input']
                print(f"  {inp['latitude']}°N, {inp['longitude']}°E, {inp['depth']}m depth")
                print(f"  Temp: {pred['thetao']:.2f}°C, Sal: {pred['so']:.2f} PSU")
                speed_str = f" (Speed: {pred['current_speed']:.3f} m/s)" if 'current_speed' in pred else ""
                print(f"  Currents: [{pred['uo']:.3f}, {pred['vo']:.3f}] m/s{speed_str}")
            else:
                print(f"  ❌ Failed: {result['error']}")

    except Exception as e:
        print(f"❌ Batch prediction failed: {e}")

    print("\n" + "=" * 60)
    print("API DEMONSTRATION COMPLETE")
    print("=" * 60)
    print("\nThe Lahar ML Model API is ready for integration with the")
    print("Smart India Hackathon 3D Ocean Data Visualization System!")
    print("\nUsage:")
    print("  from model_api import LaharModelAPI, predict_ocean_state")
    print("  api = LaharModelAPI()")
    print("  prediction = api.predict(lat, lon, depth, surf_temp, surf_sal)")