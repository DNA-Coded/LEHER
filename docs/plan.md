# Leher — Full-Stack Integration Master Plan (3 Phases)
### Integrating the Backend (`backend/`) with the React Frontend (`frontend/`)

> **Project**: LEHER · SIH PS 26067 · INCOIS / MoES  
> **Backend**: FastAPI + DuckDB + Apache Arrow IPC + XGBoost ML Pipelines (`backend/`)  
> **Frontend**: React 19 + TypeScript + Vite + Three.js + Web Workers (`frontend/`)  
> **Status**: Ready for Execution

---

## Architecture Overview

```
Frontend (React 19 + Vite @ :5173)
  ├── OceanGlobe: Map overlays for hazards, safe zones, floats
  ├── DepthSlicePage: 3D water column cylinder/cuboid + scientific telemetry
  ├── ModelVsObsComparator: GLORYS model vs Argo in-situ CTD profile comparison
  └── Web Workers: sliceDecoder.worker.ts & vectorProcessor.worker.ts (Arrow IPC)
         ▲
         │  HTTP / Apache Arrow IPC / GeoJSON
         ▼
Backend (FastAPI @ :8000)
  ├── /api/v1/model/slices        ── Apache Arrow IPC 2D depth slices
  ├── /api/v1/vectors/slices      ── Apache Arrow IPC current vector components (u, v)
  ├── /api/v1/catalog/*           ── DuckDB in-memory metadata catalog
  ├── /api/v1/ml/events & /zones  ── Active hazards (cyclone, surge, tides) & GeoJSON safe zones
  ├── /api/v1/ml/ecosystem        ── Composite marine ecosystem health index
  └── APScheduler                 ── Hourly recurring Rakshak ML inference engine
         ▲
         │
Samudra Data Fabric (`backend/fabric/`)
  ├── datasets/glorys/            ── Zarr stores & manifests
  └── ml/                         ── Trained XGBoost models (.json), hazards.parquet, safe_zones.geojson
```

---

## 3-Phase Execution Roadmap

### 🌊 Phase 1: Backend Environment & Pipeline Activation [COMPLETED ✅]
**Goal:** Ensure the backend is 100% operational, hydrated with required data fabric & ML artifacts, and serving all REST and Arrow IPC endpoints.

1. **Python Dependencies** [DONE]:
   - Installed `apscheduler`, `duckdb`, `polars`, `xgboost`, `scikit-learn`, `pyttsx3`, `pyarrow`.
2. **Data Fabric Hydration** [DONE]:
   - Generated `backend/fabric/ml/hazards.parquet` (4,386 hazard records).
   - Generated `backend/fabric/ml/ecosystem.json` (4,000 spatial cells).
   - Initialized active GLORYS Zarr dataset in `backend/fabric/datasets/glorys/v20240101/` with `manifest.json` and 8 physical variables (`temperature`, `salinity`, `uo`, `vo`, `u_velocity`, `v_velocity`, `current_speed`, `chlorophyll`).
3. **Backend Service Verification** [DONE]:
   - FastAPI server live on `http://127.0.0.1:8000`.
   - All 52 unit & API contract tests passed in 8.42s.
   - Verified live endpoints: `/health`, `/api/v1/status`, `/api/v1/catalog/datasets`, `/api/v1/catalog/variables/temperature/depths`, `/api/v1/model/slices`, `/api/v1/vectors/slices`, `/api/v1/ml/events`, `/api/v1/ml/ecosystem`, `/api/v1/ml/run-status`.

---

### 🌐 Phase 2: Frontend-to-Backend Wiring & Dummy Data Removal [COMPLETED ✅]
**Goal:** Connect all frontend visualizations and workers directly to backend endpoints, replacing all static mock arrays.

1. **API Client Configuration (`frontend/src/services/oceanApi.ts`)** [DONE]:
   - Connected API base URL with automatic `http://127.0.0.1:8000` fallback.
   - Installed `apache-arrow` to decode binary IPC tables in Web Workers (`sliceDecoder.worker.ts`, `vectorProcessor.worker.ts`).
   - Implemented `fetchBackendStatus()`, `fetchHazardEvents()`, `fetchSafeZonesGeoJSON()`, `fetchEcosystemData()`, and `fetchCatalogDatasets()`.
2. **3D Depth Slice & Telemetry Integration (`depth-slice-page.tsx`, `DepthSliceStandalone.tsx`)** [DONE]:
   - Wired live Rakshak hazard queries and ecosystem cell telemetry into `mlPredictions`.
   - Bound the Colorbar Editor ranges dynamically to real data mins and maxes across temperature, salinity, currents, and chlorophyll.
   - Enabled `DepthSliceStandalone` to receive live custom column layers and coordinates.
3. **Interactive Ocean Globe (`OceanGlobe.tsx`)** [DONE]:
   - Replaced static pins with live Rakshak ML hazard entities (`🔴 Cyclone Alerts`, `🌊 Surge Warnings`, `⚓ Extreme Tides`) loaded from `/api/v1/ml/events`.
4. **Mission Control Landing Page (`landing-page.tsx`, `app-navbar.tsx`)** [DONE]:
   - Displayed live operational status badge in the navbar (`🟢 Rakshak Active`).
   - Displayed real-time hazard counters and DuckDB catalog status in the hero section.

---

### 🔬 Phase 3: In-Situ Comparison, Polish & End-to-End Delivery [COMPLETED ✅]
**Goal:** Deliver scientific validation features, offline resilience, and single-command startup.

1. **Model vs. Observation Comparator (`ModelVsObsComparator.tsx`)** [DONE]:
   - Co-located in-situ Argo profiling floats, gliders, moored buoys, and BGC sensors against GLORYS12V1 model depth levels.
   - Connected live DuckDB catalog native depths and backend connectivity badge (`🟢 DuckDB Catalog Active`).
   - Computed water column RMSE, mean bias, $\Delta$ MLD (Mixed Layer Depth), and D20 thermocline isotherm error with interactive soundings and depth-wise signed anomaly bars.
2. **Graceful Offline & Resilient Fallbacks** [DONE]:
   - All components (`app-navbar.tsx`, `landing-page.tsx`, `depth-slice-page.tsx`, `OceanGlobe.tsx`, `ModelVsObsComparator.tsx`) feature automatic health check polling, non-blocking timeouts, and fallback telemetry when the backend is restarting or offline.
3. **Unified Startup & Build Validation** [DONE]:
   - Built single-click startup script [`start_all.bat`](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/start_all.bat) to launch both FastAPI (:8000) and React Vite (:5173) in separate consoles with automated Python path resolution.
   - All 52 backend tests passing via `pytest tests/api` in 13.53s.
   - Frontend and root production builds (`npm run build`) passing with zero errors in 3.87s.
