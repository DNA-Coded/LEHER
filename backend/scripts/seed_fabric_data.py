"""
seed_fabric_data.py — Hydrate Samudra Data Fabric & ML Artifacts
Initializes:
1. fabric/ml/hazards.parquet from advisories.json & models
2. fabric/ml/ecosystem.json from safe_zones.geojson & ocean parameters
3. fabric/datasets/glorys/v20240101/ with manifest.json and physical Zarr datasets
   (temperature, salinity, uo, vo, chlorophyll) covering 0-2000m depths in the Indian Ocean.
"""
import json
import numpy as np
import polars as pl
import xarray as xr
from pathlib import Path
from datetime import datetime, timezone

REPO_ROOT = Path(__file__).resolve().parent.parent
FABRIC_DIR = REPO_ROOT / "fabric"
FABRIC_ML = FABRIC_DIR / "ml"
FABRIC_DATASETS = FABRIC_DIR / "datasets" / "glorys" / "v20240101"

def seed_hazards_and_ecosystem():
    print("=== 1. Seeding Hazards and Ecosystem Artifacts ===")
    FABRIC_ML.mkdir(parents=True, exist_ok=True)
    
    advisories_file = FABRIC_ML / "advisories.json"
    hazards_file = FABRIC_ML / "hazards.parquet"
    
    hazards = []
    if advisories_file.exists():
        with open(advisories_file, "r", encoding="utf-8") as f:
            adv_data = json.load(f)
        for item in adv_data.get("advisories", []):
            hid = item.get("hazard_id", "")
            coords = item.get("coordinates", {})
            lat = float(coords.get("lat", 0.0))
            lon = float(coords.get("lon", 0.0))
            
            htype = "cyclone" if "CYC" in hid else ("storm_surge" if "SURGE" in hid else "extreme_tide")
            prob = 0.82 if htype == "cyclone" else None
            surge_h = 1.65 if htype == "storm_surge" else None
            res_h = 0.35 if htype == "extreme_tide" else None
            
            # Physics-informed local estimation
            sst = round(28.5 + 1.2 * np.cos(np.radians(lat)), 2)
            cur_speed = round(0.45 + 0.3 * np.sin(np.radians(lon)), 2)
            
            hazards.append({
                "event_id": hid,
                "type": htype,
                "latitude": lat,
                "longitude": lon,
                "probability": prob,
                "surge_height_m": surge_h,
                "residual_height_m": res_h,
                "sst": sst,
                "current_speed": cur_speed,
                "detected_at": item.get("issued_at", datetime.now(timezone.utc).isoformat())
            })
            
    if not hazards:
        # Fallback if advisories was empty
        hazards = [
            {
                "event_id": "CYC-0001",
                "type": "cyclone",
                "latitude": 15.4,
                "longitude": 71.2,
                "probability": 0.85,
                "surge_height_m": None,
                "residual_height_m": None,
                "sst": 29.8,
                "current_speed": 1.45,
                "detected_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "event_id": "SURGE-0002",
                "type": "storm_surge",
                "latitude": 19.5,
                "longitude": 86.0,
                "probability": None,
                "surge_height_m": 2.1,
                "residual_height_m": None,
                "sst": 29.1,
                "current_speed": 1.15,
                "detected_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        
    schema = {
        "event_id": pl.String,
        "type": pl.String,
        "latitude": pl.Float64,
        "longitude": pl.Float64,
        "probability": pl.Float64,
        "surge_height_m": pl.Float64,
        "residual_height_m": pl.Float64,
        "sst": pl.Float64,
        "current_speed": pl.Float64,
        "detected_at": pl.String,
    }
    df_hazards = pl.DataFrame(hazards, schema=schema)
    df_hazards.write_parquet(hazards_file)
    print(f"Generated {len(hazards)} hazards -> {hazards_file}")
    
    # Generate ecosystem.json
    ecosystem_file = FABRIC_ML / "ecosystem.json"
    safe_zones_file = FABRIC_ML / "safe_zones.geojson"
    
    cells = []
    if safe_zones_file.exists():
        with open(safe_zones_file, "r", encoding="utf-8") as f:
            sz_data = json.load(f)
        features = sz_data.get("features", [])
        # Take a representative sample or all points
        for feat in features[:4000]: # Top 4000 representative points for responsive JSON payload
            coords = feat["geometry"]["coordinates"]
            props = feat.get("properties", {})
            sst = props.get("sst", 28.5)
            spd = props.get("current_speed", 0.3)
            risk = props.get("risk_category", "safe")
            
            score = int(props.get("risk_score", 0.3) * 100)
            status = "HEALTHY" if score < 35 else ("MODERATE" if score < 65 else "CRITICAL")
            color = "#00C853" if status == "HEALTHY" else ("#FFD600" if status == "MODERATE" else "#D50000")
            
            cells.append({
                "lat": coords[1],
                "lon": coords[0],
                "ecosystem_stress_score": score,
                "ecosystem_status": status,
                "color": color,
                "sst": sst,
                "current_speed": spd,
                "coral_bleaching": {"score": min(100, max(0, int((sst - 28.5) * 40))), "level": "ALERT" if sst > 30 else "NO_STRESS"},
                "algal_bloom": {"score": min(100, int(score * 0.8)), "risk": "HIGH" if score > 70 else "LOW"},
                "fish_stress": {"score": score, "migration_risk": "ELEVATED" if score > 50 else "NORMAL"},
                "hypoxia": {"score": min(100, int(spd * 20)), "dead_zone_risk": "VERY_LOW"}
            })

    if not cells:
        cells = [{
            "lat": 15.0,
            "lon": 71.0,
            "ecosystem_stress_score": 24,
            "ecosystem_status": "HEALTHY",
            "color": "#00C853",
            "sst": 28.5,
            "current_speed": 0.4,
            "coral_bleaching": {"score": 0, "level": "NO_STRESS"},
            "algal_bloom": {"score": 15, "risk": "LOW"},
            "fish_stress": {"score": 20, "migration_risk": "NORMAL"},
            "hypoxia": {"score": 5, "dead_zone_risk": "VERY_LOW"}
        }]
        
    n_healthy = sum(1 for c in cells if c["ecosystem_status"] == "HEALTHY")
    n_moderate = sum(1 for c in cells if c["ecosystem_status"] == "MODERATE")
    n_critical = sum(1 for c in cells if c["ecosystem_status"] == "CRITICAL")
    avg_score = round(sum(c["ecosystem_stress_score"] for c in cells) / max(1, len(cells)), 1)
    
    eco_payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_cells": len(cells),
        "summary": {
            "n_healthy": n_healthy,
            "n_moderate": n_moderate,
            "n_stressed": n_moderate,
            "n_critical": n_critical,
            "avg_stress_score": avg_score
        },
        "cells": cells
    }
    with open(ecosystem_file, "w", encoding="utf-8") as f:
        json.dump(eco_payload, f, indent=2)
    print(f"Generated ecosystem data ({len(cells)} cells) -> {ecosystem_file}")

def seed_glorys_zarr_dataset():
    print("\n=== 2. Seeding GLORYS Zarr Active Dataset ===")
    FABRIC_DATASETS.mkdir(parents=True, exist_ok=True)
    
    native_depths = [0.49, 5.0, 15.0, 30.0, 50.0, 75.0, 100.0, 150.0, 200.0, 300.0, 500.0, 750.0, 1000.0, 1500.0, 2000.0]
    lats = np.linspace(-10.0, 25.0, 36) # -10 to 25 N (step 1.0 deg)
    lons = np.linspace(50.0, 100.0, 51) # 50 to 100 E (step 1.0 deg)
    times = np.array(['2024-01-01T00:00:00', '2024-01-02T00:00:00', '2024-01-03T00:00:00'], dtype='datetime64[ns]')
    
    manifest = {
        "dataset_id": "glorys_v20240101",
        "source_id": "GLOBAL_MULTIYEAR_PHY_001_030",
        "revision_label": "v20240101",
        "is_active": True,
        "published_at": "2024-01-01T00:00:00Z",
        "time_min": "2024-01-01T00:00:00Z",
        "time_max": "2024-01-03T00:00:00Z",
        "depth_min_m": 0.49,
        "depth_max_m": 2000.0,
        "native_depths": native_depths,
        "variables": [
            {"canonical_name": "temperature", "standard_name": "sea_water_potential_temperature", "units": "degrees_C", "zarr_path": "temperature.zarr"},
            {"canonical_name": "salinity", "standard_name": "sea_water_salinity", "units": "1e-3", "zarr_path": "salinity.zarr"},
            {"canonical_name": "uo", "standard_name": "eastward_sea_water_velocity", "units": "m s-1", "zarr_path": "uo.zarr"},
            {"canonical_name": "vo", "standard_name": "northward_sea_water_velocity", "units": "m s-1", "zarr_path": "vo.zarr"},
            {"canonical_name": "u_velocity", "standard_name": "eastward_sea_water_velocity", "units": "m s-1", "zarr_path": "u_velocity.zarr"},
            {"canonical_name": "v_velocity", "standard_name": "northward_sea_water_velocity", "units": "m s-1", "zarr_path": "v_velocity.zarr"},
            {"canonical_name": "current_speed", "standard_name": "sea_water_speed", "units": "m s-1", "zarr_path": "current_speed.zarr"},
            {"canonical_name": "chlorophyll", "standard_name": "mass_concentration_of_chlorophyll_a_in_sea_water", "units": "mg m-3", "zarr_path": "chlorophyll.zarr"}
        ]
    }
    
    manifest_path = FABRIC_DATASETS / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"Wrote manifest -> {manifest_path}")
    
    # 4D coordinate mesh
    T, D, Y, X = len(times), len(native_depths), len(lats), len(lons)
    depths_arr = np.array(native_depths).reshape(1, D, 1, 1)
    lats_arr = lats.reshape(1, 1, Y, 1)
    lons_arr = lons.reshape(1, 1, 1, X)
    
    # 1. Temperature: Surface 28.5 C with thermocline decay to 2.2 C at 2000m
    lat_factor = np.cos(np.radians(lats_arr * 2))
    temp_surf = 27.5 + 2.0 * lat_factor
    temp_profile = 2.0 + (temp_surf - 2.0) * np.exp(-depths_arr / 320.0)
    temp_data = np.broadcast_to(temp_profile, (T, D, Y, X)).astype(np.float32)
    
    da_temp = xr.DataArray(
        temp_data,
        dims=["time", "depth", "latitude", "longitude"],
        coords={"time": times, "depth": native_depths, "latitude": lats, "longitude": lons},
        name="temperature"
    )
    da_temp.to_dataset().to_zarr(FABRIC_DATASETS / "temperature.zarr", mode="w", consolidated=True)
    print("Wrote temperature.zarr")
    
    # 2. Salinity: Arabian Sea higher (~36.2 PSU), Bay of Bengal lower (~33.2 PSU due to runoff)
    sal_surf = 35.5 - 1.5 * ((lons_arr - 65.0) / 35.0) + 0.5 * (lats_arr / 20.0)
    sal_profile = 34.8 + (sal_surf - 34.8) * np.exp(-depths_arr / 250.0)
    sal_data = np.broadcast_to(sal_profile, (T, D, Y, X)).astype(np.float32)
    
    da_sal = xr.DataArray(
        sal_data,
        dims=["time", "depth", "latitude", "longitude"],
        coords={"time": times, "depth": native_depths, "latitude": lats, "longitude": lons},
        name="salinity"
    )
    da_sal.to_dataset().to_zarr(FABRIC_DATASETS / "salinity.zarr", mode="w", consolidated=True)
    print("Wrote salinity.zarr")
    
    # 3. uo & u_velocity (eastward velocity)
    uo_surf = 0.25 * np.sin(np.radians(lats_arr * 4)) + 0.15 * np.cos(np.radians(lons_arr * 2))
    uo_profile = uo_surf * np.exp(-depths_arr / 180.0)
    uo_data = np.broadcast_to(uo_profile, (T, D, Y, X)).astype(np.float32)
    
    da_uo = xr.DataArray(
        uo_data,
        dims=["time", "depth", "latitude", "longitude"],
        coords={"time": times, "depth": native_depths, "latitude": lats, "longitude": lons},
        name="uo"
    )
    da_uo.to_dataset().to_zarr(FABRIC_DATASETS / "uo.zarr", mode="w", consolidated=True)
    da_uvel = xr.DataArray(
        uo_data,
        dims=["time", "depth", "latitude", "longitude"],
        coords={"time": times, "depth": native_depths, "latitude": lats, "longitude": lons},
        name="u_velocity"
    )
    da_uvel.to_dataset().to_zarr(FABRIC_DATASETS / "u_velocity.zarr", mode="w", consolidated=True)
    print("Wrote uo.zarr and u_velocity.zarr")
    
    # 4. vo & v_velocity (northward velocity)
    vo_surf = -0.18 * np.cos(np.radians(lats_arr * 3)) + 0.12 * np.sin(np.radians(lons_arr * 3))
    vo_profile = vo_surf * np.exp(-depths_arr / 180.0)
    vo_data = np.broadcast_to(vo_profile, (T, D, Y, X)).astype(np.float32)
    
    da_vo = xr.DataArray(
        vo_data,
        dims=["time", "depth", "latitude", "longitude"],
        coords={"time": times, "depth": native_depths, "latitude": lats, "longitude": lons},
        name="vo"
    )
    da_vo.to_dataset().to_zarr(FABRIC_DATASETS / "vo.zarr", mode="w", consolidated=True)
    da_vvel = xr.DataArray(
        vo_data,
        dims=["time", "depth", "latitude", "longitude"],
        coords={"time": times, "depth": native_depths, "latitude": lats, "longitude": lons},
        name="v_velocity"
    )
    da_vvel.to_dataset().to_zarr(FABRIC_DATASETS / "v_velocity.zarr", mode="w", consolidated=True)
    print("Wrote vo.zarr and v_velocity.zarr")

    # 4.5 current_speed
    speed_data = np.sqrt(uo_data ** 2 + vo_data ** 2).astype(np.float32)
    da_spd = xr.DataArray(
        speed_data,
        dims=["time", "depth", "latitude", "longitude"],
        coords={"time": times, "depth": native_depths, "latitude": lats, "longitude": lons},
        name="current_speed"
    )
    da_spd.to_dataset().to_zarr(FABRIC_DATASETS / "current_speed.zarr", mode="w", consolidated=True)
    print("Wrote current_speed.zarr")
    
    # 5. Chlorophyll: peak in photic zone (20-60m depth)
    chl_surf = 0.35 + 0.3 * np.sin(np.radians(lons_arr))
    chl_profile = chl_surf * np.exp(-((depths_arr - 40.0) ** 2) / (2 * 35.0 ** 2)) + 0.02
    chl_data = np.broadcast_to(chl_profile, (T, D, Y, X)).astype(np.float32)
    
    da_chl = xr.DataArray(
        chl_data,
        dims=["time", "depth", "latitude", "longitude"],
        coords={"time": times, "depth": native_depths, "latitude": lats, "longitude": lons},
        name="chlorophyll"
    )
    da_chl.to_dataset().to_zarr(FABRIC_DATASETS / "chlorophyll.zarr", mode="w", consolidated=True)
    print("Wrote chlorophyll.zarr")
    
    print("\nGLORYS active dataset successfully initialized!")

if __name__ == "__main__":
    seed_hazards_and_ecosystem()
    seed_glorys_zarr_dataset()
