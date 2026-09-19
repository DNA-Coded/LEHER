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

### 🌊 Phase 1: Backend Environment & Pipeline Activation
**Goal:** Ensure the backend is 100% operational, hydrated with required data fabric & ML artifacts, and serving all REST and Arrow IPC endpoints.

1. **Python Dependencies**:
   - Install missing packages: `apscheduler`, `duckdb`, `polars`, `xgboost`, `scikit-learn` in the active environment (`Python 3.12`).
   - Verify `pyarrow`, `fastapi`, `uvicorn`, `xarray`, `zarr` are healthy.
2. **Data Fabric Hydration**:
   - In `backend/fabric/ml/`, ensure `hazards.parquet` and `ecosystem.json` are present with schemas matching `BACKEND_HANDOVER.md`.
   - In `backend/fabric/datasets/glorys/v20240101/`, initialize the active GLORYS Zarr dataset (variables: `temperature`, `salinity`, `uo`, `vo`) and `manifest.json` for depths 0–2000m across the Indian Ocean basin.
3. **Backend Service Verification**:
   - Boot FastAPI server on `http://127.0.0.1:8000`.
   - Validate endpoints: `/health`, `/api/v1/status`, `/api/v1/catalog/datasets`, `/api/v1/model/slices`, `/api/v1/vectors/slices`, `/api/v1/ml/events`, `/api/v1/ml/zones`, `/api/v1/ml/ecosystem`.

---

### 🌐 Phase 2: Frontend-to-Backend Wiring & Dummy Data Removal
**Goal:** Connect all frontend visualizations and workers directly to backend endpoints, replacing all static mock arrays.

1. **API Client Configuration (`frontend/src/services/oceanApi.ts`)**:
   - Connect API base URL (`VITE_API_URL || 'http://127.0.0.1:8000'`).
   - Wire Arrow IPC decoders (`sliceDecoder.worker.ts`, `vectorProcessor.worker.ts`) to live slice endpoints.
   - Add service functions for ML hazards, safe fishing zones GeoJSON, and ecosystem stress telemetry.
2. **3D Depth Slice & Telemetry Integration (`depth-slice-page.tsx`, `DepthSliceStandalone.tsx`)**:
   - Query live water column data across standard depths (0m to 2000m) from backend slices.
   - Replace hardcoded ML predictions with live values from `/api/v1/ml/events` and XGBoost hazard outputs.
   - Dynamically bind the Colorbar Editor ranges to real min/max values (`X-Data-Min`, `X-Data-Max`).
3. **Interactive Ocean Globe (`OceanGlobe.tsx`)**:
   - Render live hazard event markers (`/api/v1/ml/events`) instead of static points.
   - Overlay real fishing safe/caution/danger zones GeoJSON (`/api/v1/ml/zones`).
4. **Mission Control Landing Page (`landing-page.tsx`)**:
   - Display real backend status badge ("System Operational / Rakshak Active").
   - Display live hazard counts and active dataset revision.

---

### 🔬 Phase 3: In-Situ Comparison, Polish & End-to-End Delivery
**Goal:** Deliver scientific validation features, offline resilience, and single-command startup.

1. **Model vs. Observation Comparator (`ModelVsObsComparator.tsx`)**:
   - Query DuckDB catalog for real Argo float CTD profiles.
   - Compute real model vs. observation $\Delta$ bias charts for temperature and salinity across depths.
2. **Graceful Offline & Error Handling**:
   - Implement resilient status handling: if the backend is starting up or temporarily offline, show clear status notices with automatic reconnection.
3. **Unified Startup & Build Validation**:
   - Run complete frontend production build (`npm run build`).
   - Run backend test suite (`pytest`).
   - Create single-click startup script (`start_all.bat`) that launches both FastAPI and Vite dev servers concurrently.
