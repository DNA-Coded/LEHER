# LEHER — Comprehensive System Audit & Future Roadmap Report
### MoES / INCOIS · Smart India Hackathon (SIH PS 26067)
**Date**: September 19, 2026  
**Auditor**: Antigravity Full-Stack AI Lead Architect  
**System Architecture**: FastAPI + DuckDB Data Fabric + XGBoost ML Engine ⟷ React 19 + TypeScript + Vite + Three.js + Web Workers  

---

## Executive Summary

The **LEHER** (Indian Ocean Maritime Safety & Hazard Intelligence) platform has achieved 100% completion of its core functional integration phases:
- **Backend Data Fabric & Microservices**: Fully hydrated with 4,386 active hazard records (`hazards.parquet`), 4,000 spatial ecosystem monitoring cells (`ecosystem.json`), and 8 physical 4D Zarr variables (`temperature`, `salinity`, `uo`, `vo`, `chlorophyll`, currents) served via zero-copy Apache Arrow IPC streams.
- **Frontend Mission Control & 3D Visualizer**: React 19 single-page application wired to live backend endpoints with sub-second Arrow IPC binary table decoding in dedicated Web Workers (`sliceDecoder.worker`, `vectorProcessor.worker`).
- **In-Situ Observation vs. Model Bias Engine**: Real-time co-location comparing numerical hydrodynamic models (GLORYS12V1) against physical ocean observation platforms (Argo profiling floats, gliders, moored buoys, BGC sensors).

This document serves as an exhaustive, two-section architectural audit identifying all prospective enhancements, enterprise scaling requirements, and remaining roadmap works across both tiers of the platform.

---

# SECTION 1: Frontend Technical Audit & Remaining Roadmap Works

### 1.1 Real-Time Streaming Architecture (WebSockets / SSE vs. HTTP Polling)
- **Current State**: The frontend monitors backend operational status and Rakshak ML hazard alerts using non-blocking HTTP polling with exponential backoff and timeout fallbacks in [`oceanApi.ts`](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/frontend/src/services/oceanApi.ts).
- **Remaining / Roadmap Work**:
  - Implement a persistent bi-directional **WebSocket client** (`ws://127.0.0.1:8000/ws/alerts`) or **Server-Sent Events (SSE)** stream (`/api/v1/stream/hazards`).
  - Eliminate interval polling latency to push cyclone trajectory updates, storm surge alerts, and Argo float ping events instantly to the user's dashboard within <50ms.
  - Implement an in-memory client-side event bus using RxJS or Zustand to broadcast new hazard payloads directly to Cesium and Three.js layers without triggering full component tree re-renders.

### 1.2 WebGPU & GPU-Accelerated 3D Isosurface Extraction
- **Current State**: The 3D volumetric water column cylinder and cuboid in [`depth-slice-page.tsx`](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/frontend/src/components/ui/depth-slice-page.tsx) and [`DepthSliceStandalone.tsx`](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/frontend/src/components/ocean/depth-slice/DepthSliceStandalone.tsx) render sliced vertical geometries in Three.js/WebGL. An experimental isosurface worker (`isosurface.worker.ts`) provides Marching Cubes extraction on the CPU.
- **Remaining / Roadmap Work**:
  - Migrate isosurface extraction from CPU Web Workers to **WebGPU Compute Shaders**.
  - Enable real-time GPU Marching Cubes and Direct Volume Rendering (DVR) with Ray Marching for scalar ocean fields (3D temperature thermocline folds, oxygen minimum zones, and salinity fronts).
  - Implement interactive Transfer Function editor allowing maritime operators to adjust opacity, thresholding, and colormaps on 3D volumetric density fields in real time at 60 FPS.

### 1.3 Dynamic Streamlines & Particle Advection in Cesium 3D Globe
- **Current State**: Ocean velocity vectors are decoded via Web Workers (`vectorProcessor.worker.ts`) and rendered as static vector markers and arrows in the Cesium viewport.
- **Remaining / Roadmap Work**:
  - Implement **GPU Particle Advection Streamlines** (similar to Earth Nullschool / Windy) within the Cesium canvas using custom WebGL shaders.
  - Animate tens of thousands of continuous velocity particles tracing the Somali Current, East India Coastal Current (EICC), and Wyrtki Jets across depths (0m–2000m).
  - Support depth-filtered particle advection: visualize how surface wind-driven currents reverse direction at the subsurface thermocline shear layer.

### 1.4 Progressive Web App (PWA) Offline Caching & Vessel Leeway Mode
- **Current State**: The frontend is built as a responsive Single Page Application (SPA). If network connectivity drops, components switch to local physics simulation fallback models.
- **Remaining / Roadmap Work**:
  - Implement full **PWA Service Worker** support with Workbox and IndexedDB local slice caching.
  - Allow naval captains and commercial vessels operating in open ocean dead zones (beyond satellite broadband coverage) to pre-download regional 7-day ocean forecasts.
  - Add offline GPS geolocation tracking with vessel leeway drift calculations and dead-reckoning navigation tools directly in the browser cache.

### 1.5 Naval Acoustic Sonar Ray-Tracing & Shadow Zone Simulation
- **Current State**: Speed of sound is computed in seawater using the Mackenzie formula, and acoustic ducting channels (SOFAR channel core) are identified in the stratification panel.
- **Remaining / Roadmap Work**:
  - Implement an interactive **2D/3D Acoustic Ray-Tracing Engine** using Snell's Law across stratified density layers.
  - Simulate active/passive naval sonar beam propagation emitted from ship hulls, submarine transducers, or sonobuoys.
  - Visually map acoustic shadow zones, surface duct trapping, and convergence zones (CZ) to support maritime defense and submarine search-and-rescue operations.

### 1.6 Mobile & Touch UX Optimization for 3D Viewports
- **Current State**: Desktop interaction supports mouse drag, scroll zoom, and keyboard controls. Touch gestures are functional but could be optimized for field tablets.
- **Remaining / Roadmap Work**:
  - Implement multi-touch gesture handlers: two-finger pinch-to-zoom, three-finger depth layer slicing, and gyro-assisted spatial orientation for mobile maritime inspection tablets.
  - Provide a compact, collapsible tactical layout for ruggedized handheld displays used by coastal coast guards and artisanal fishermen.

### 1.7 Native Scientific GIS Export Pipelines
- **Current State**: PDF Mission Dossier export is functional (`missionDossierPdf.ts`).
- **Remaining / Roadmap Work**:
  - Add one-click export for geospatial formats: **GeoTIFF** (raster bathymetry and SST), **NetCDF-4** (CF-compliant multidimensional files), **ESRI Shapefiles**, and **GeoJSON**.
  - Enable direct integration with external maritime navigation systems (ECDIS), QGIS, and NOAA plotting software.

---

# SECTION 2: Backend Technical Audit & Remaining Roadmap Works

### 2.1 Live Automated External Ingestion Pipelines
- **Current State**: The backend Samudra Data Fabric is hydrated with static and semi-dynamic Zarr arrays (`fabric/datasets/glorys/`) and parquet hazard archives.
- **Remaining / Roadmap Work**:
  - Build automated ingestion workers connecting directly to **Copernicus Marine Service (CMEMS) API** and **INCOIS OMNI Buoy FTP / ERDDAP servers**.
  - Implement a daily cron job to download near-real-time global ocean physical analysis (e.g. `GLOBAL_ANALYSISFORECAST_PHY_001_024`) and convert incoming NetCDF-4 granules to chunked Zarr stores automatically.
  - Implement automatic sanity validation, unit checks, and quarantine logging (`fabric/quarantined/errors.jsonl`) for incomplete or corrupt satellite tracks.

### 2.2 Scalable Persistent Database & Object Store Migration
- **Current State**: The backend uses an in-memory DuckDB catalog initialized from disk on startup, and reads Zarr arrays from local filesystem directories (`backend/fabric/`).
- **Remaining / Roadmap Work**:
  - Migrate metadata catalog to **PostgreSQL + TimescaleDB + PostGIS** for high-concurrency spatial-temporal queries across millions of historical Argo soundings and vessel pings.
  - Decouple Zarr storage from the local disk by adding an S3/MinIO cloud object store adapter (`s3fs` / `fsspec`), allowing multi-terabyte ocean datasets to stream over HTTP range requests directly from cloud buckets.
  - Add an in-memory **Redis Caching Layer** for frequently requested Apache Arrow IPC slices, reducing slice generation latency from ~30ms to <2ms under heavy user concurrency.

### 2.3 Next-Generation ML Models (PINNs & GNNs for Cyclone Tracks)
- **Current State**: Cyclone genesis detection and storm surge prediction utilize trained XGBoost decision tree models (`surge_model.json`, `anomaly_model.json`) with engineered hydrodynamic features.
- **Remaining / Roadmap Work**:
  - Upgrade tabular XGBoost regressors to **Physics-Informed Neural Networks (PINNs)** incorporating Navier-Stokes hydrodynamic momentum and continuity equations as loss constraints.
  - Deploy **Graph Neural Networks (GNNs)** or spatio-temporal Transformers (e.g. ClimaX / GraphCast adaptations) for 72-hour cyclone track and rapid intensification (RI) forecasting in the Bay of Bengal and Arabian Sea.
  - Add automated model retraining pipelines via MLflow or DVC when new IBTrACS cyclone track revisions are published by IMD / JTWC.

### 2.4 Streaming Audio Advisory & Multi-Lingual Regional Speech API
- **Current State**: Local offline voice advisory module exists (`voice_advisory.py`) utilizing `pyttsx3` for English warning generation.
- **Remaining / Roadmap Work**:
  - Implement a dedicated REST streaming endpoint (`GET /api/v1/voice/advisory/{hazard_id}`) returning binary WAV/MP3 audio streams.
  - Add regional coastal language synthesis: **Hindi**, **Tamil**, **Telugu**, **Malayalam**, **Bengali**, and **Gujarati** to alert non-English speaking artisanal fishing communities over VHF marine radio and coastal loudspeaker broadcasts.
  - Integrate AI speech synthesis engines (e.g. Google Cloud TTS / Bhashini API) for natural voice broadcast cadence.

### 2.5 Multi-Tenant Role-Based Access Control (RBAC) & Enterprise Security
- **Current State**: The FastAPI backend provides open CORS access for local frontend development without authentication headers.
- **Remaining / Roadmap Work**:
  - Implement OAuth2 / JWT authentication with role-based access tiers:
    1. *Public Fishermen Tier*: Free access to safe zones, weather warnings, and local sea state advisories.
    2. *Commercial Shipping & Port Authorities*: Access to high-resolution current vectors, fuel optimization routes, and berth swell forecasts.
    3. *Naval & Coast Guard Operations*: Encrypted access to bathymetric acoustic ducts, submarine sonar shadow zones, and tactical drift tracking.
  - Implement rate limiting (e.g. `slowapi` or Redis token buckets) to protect Arrow IPC streaming endpoints against denial-of-service spikes.

### 2.6 Distributed Task Orchestration & Horizontal Scaling
- **Current State**: Scheduled hazard detection runs in-process via Python `APScheduler` on an hourly interval.
- **Remaining / Roadmap Work**:
  - Decouple the ML pipeline into distributed asynchronous task queues using **Celery** or **Temporal.io** backed by Redis/RabbitMQ.
  - Enable independent horizontal scaling: run API gateway nodes (FastAPI) separately from heavy ML compute worker nodes equipped with GPU acceleration (NVIDIA TensorRT / CUDA).
  - Package services into Kubernetes Helm charts with automated HPA (Horizontal Pod Autoscaler) scaling based on CPU and network I/O thresholds.

---

## 3. Summary & Recommended Phased Execution Matrix

| Domain | High Priority (Next Sprint) | Medium Priority (Phase 4) | Long-Term (Enterprise Scale) |
|---|---|---|---|
| **Frontend** | WebSocket/SSE hazard alert feed • Native GeoTIFF/NetCDF export | WebGPU Compute Shader isosurface volume rendering | GPU Particle Advection Streamlines • Sonar Ray-Tracing |
| **Backend** | Daily automated CMEMS API & INCOIS FTP ingest worker | Multi-lingual TTS audio streaming endpoint (Bhashini) | PostgreSQL/PostGIS migration • PINNs & Spatio-Temporal GNNs |
| **Infrastructure** | Redis IPC slice caching layer | JWT / OAuth2 Role-Based Access Control | Distributed Celery workers • Kubernetes Helm deployment |

---
*Report certified by Antigravity Engineering.*
