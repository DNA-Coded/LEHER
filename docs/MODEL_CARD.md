# Lahar ML Model - Model Card

## Model Details
- **Model Type**: XGBoost MultiOutputRegressor
- **Version**: 2.0
- **Training Date**: 2026-09-04
- **Framework**: XGBoost 3.4.1, scikit-learn 1.9.0, pandas 2.2.0, numpy 1.26.0

## Intended Use
The Lahar ML Model is designed to predict deep-ocean state variables (temperature, salinity, and current components) from surface measurements and spatial-temporal coordinates. It serves as a lightweight alternative to querying massive 40GB+ NetCDF databases for operational oceanography applications.

Specifically developed for integration with the Smart India Hackathon 3D Ocean Data Visualization System, where it provides real-time predictions of ocean state variables for volumetric rendering and analysis.

## Training Data
- **Source**: Copernicus Marine Service Global Analysis and Forecast (GLOBAL_ANALYSISFORECAST_PHY_001_024)
- **Region**: Indian Ocean (50°E to 100°E longitude, -20°N to 25°N latitude)
- **Temporal Coverage**: Last 10 days of forecast data
- **Depth Range**: Surface (0m) to 2000m
- **Variables**: Temperature (thetao), Salinity (so), Eastward Current (uo), Northward Current (vo)
- **Samples**: 5,821,302 records after temporal feature engineering
- **Format**: Parquet (processed from NetCDF via xarray/dask)

## Features
Input variables used for prediction:
1. `latitude` (degrees_north)
2. `longitude` (degrees_east)
3. `depth` (meters, positive downward)
4. `surface_temp` (temperature at depth=0, degrees_Celsius)
5. `surface_salinity` (salinity at depth=0, PSU)
6. `month_sin` (cyclical encoding of month)
7. `month_cos` (cyclical encoding of month)
8. `doy_sin` (cyclical encoding of day-of-year)
9. `doy_cos` (cyclical encoding of day-of-year)

## Targets
Output variables predicted by the model:
1. `thetao` - Temperature at depth (degrees_Celsius)
2. `so` - Salinity at depth (PSU)
3. `uo` - Eastward ocean current component (m/s)
4. `vo` - Northward ocean current component (m/s)

## Performance Metrics
Evaluation on hold-out test set (20% of data):

| Variable | RMSE | MAE | R² |
|----------|------|-----|-----|
| thetao   | 0.431°C | 0.235°C | 0.998 |
| so       | 0.128 PSU | 0.043 PSU | 0.987 |
| uo       | 0.101 m/s | 0.070 m/s | 0.763 |
| vo       | 0.102 m/s | 0.070 m/s | 0.656 |

**Note**: Current components (uo, vo) show lower predictability due to their inherent complexity and smaller magnitude signals compared to temperature and salinity gradients.

## Data Preprocessing
1. **Temporal Feature Engineering**: Month and day-of-year converted to cyclical features (sin/cos) to capture seasonal patterns
2. **Missing Data Handling**: Automatic removal of NaN values (primarily land regions) during parquet creation
3. **Feature Scaling**: None required - XGBoost handles feature scaling internally
4. **Train/Test Split**: 80/20 random split with fixed random state for reproducibility

## Model Architecture
- **Base Estimator**: XGBRegressor
  - n_estimators: 150
  - max_depth: 8
  - learning_rate: 0.05
  - subsample: 0.9
  - colsample_bytree: 0.9
  - reg_alpha: 0.1 (L1 regularization)
  - reg_lambda: 0.1 (L2 regularization)
  - random_state: 42
  - n_jobs: -1 (use all available cores)
- **Multi-target Strategy**: Scikit-learn's MultiOutputRegressor wrapper

## Limitations
1. **Geographic Scope**: Trained specifically on Indian Ocean data; performance may vary in other regions
2. **Temporal Scope**: Trained on 10-day forecast period; seasonal patterns captured via feature engineering
3. **Process Representation**: Assumes statistical relationship between surface and subsurface properties remains stationary
4. **Current Prediction**: Ocean currents are inherently more unpredictable than temperature/salinity fields
5. **Extrapolation**: Model should not be used outside validated input ranges without retraining

## Input Validation
Expected input ranges:
- Latitude: [-90, 90] degrees
- Longitude: [-180, 180] degrees
- Depth: [0, 8000] meters
- Surface Temperature: [-2, 40] °C
- Surface Salinity: [0, 40] PSU
- month_sin/cos: [-1, 1]
- doy_sin/cos: [-1, 1]

Note: During training, surface_salinity showed minor values beyond 40 PSU (max 40.80), suggesting occasional extreme salinity events in the training data.

## Software Dependencies
- Python >= 3.8
- pandas >= 2.0.0
- numpy >= 1.20.0
- scikit-learn >= 1.0.0
- xgboost >= 1.6.0

## Usage Example
```python
import pickle
import numpy as np

# Load model
with open('lahar_ocean_model_v2.pkl', 'rb') as f:
    model = pickle.load(f)

# Prepare input: [lat, lon, depth, surface_temp, surface_salinity, month_sin, month_cos, doy_sin, doy_cos]
# Example: 10°N, 75°E, 500m depth, January 15th conditions
sample_input = np.array([[
    10.0,      # latitude
    75.0,      # longitude
    500.0,     # depth (meters)
    28.5,      # surface_temp (°C)
    35.2,      # surface_salinity (PSU)
    0.0,       # month_sin (January)
    1.0,       # month_cos (January)
    -0.75,     # doy_sin (day 15)
    0.66       # doy_cos (day 15)
]])

# Make prediction
prediction = model.predict(sample_input)
# Returns: [thetao, so, uo, vo] for the input conditions

print(f"Predicted temperature at 500m: {prediction[0][0]:.2f}°C")
print(f"Predicted salinity at 500m: {prediction[0][1]:.2f} PSU")
print(f"Predicted eastward current: {prediction[0][2]:.3f} m/s")
print(f"Predicted northward current: {prediction[0][3]:.3f} m/s")
```

## Ethical Considerations
- **Operational Use**: Predictions should be used as guidance alongside traditional methods and expert judgment
- **Uncertainty Awareness**: Users should be aware of prediction uncertainty, particularly for current components
- **Bias Mitigation**: Training data represents specific geographic and temporal conditions; users should assess applicability to their use case
- **Transparency**: Model architecture, training data, and performance metrics are fully documented

## Maintenance
- **Versioning**: Follow semantic versioning (MAJOR.MINOR.PATCH)
- **Retraining**: Recommend periodic retraining with newer data to capture evolving ocean conditions
- **Monitoring**: Track prediction accuracy against in-situ observations when available

## References
1. Copernicus Marine Service Product Manual: GLOBAL_ANALYSISFORECAST_PHY_001_024
2. XGBoost Documentation: https://xgboost.readthedocs.io/
3. Scikit-learn MultiOutputRegressor: https://scikit-learn.org/stable/modules/generated/sklearn.multioutput.MultiOutputRegressor.html

---
*Model developed for Smart India Hackathon 2026 - Lahar ML Model Team*