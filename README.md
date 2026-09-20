<p align="center">
  <a href="https://leher-3d.vercel.app/" target="_blank" rel="noopener noreferrer">
    <img src="logo.png" alt="Leher Logo" width="160" height="160" style="border-radius: 50%; max-width: 100%; box-shadow: 0 0 32px rgba(6, 182, 212, 0.25);" />
  </a>
</p>

<h1 align="center">Leher (लहर)</h1>

<p align="center">
  <strong>3D Ocean Intelligence &amp; Maritime Hazard Visualization Platform</strong><br>
  <em>An institutional 3D oceanographic visualization and spatial decision-support platform integrating numerical hydrodynamic ocean models with multi-platform in-situ observations across space, depth, and time.</em>
</p>

<p align="center">
  <a href="https://leher-3d.vercel.app/"><img src="https://img.shields.io/badge/Live_Demo-leher--3d.vercel.app-0ea5e9?style=for-the-badge&logo=vercel" alt="Live Demo" /></a>
  <a href="https://github.com/DNA-Coded/LEHER"><img src="https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github" alt="GitHub Repo" /></a>
  <img src="https://img.shields.io/badge/SIH_Problem-26067-ff6b6b?style=for-the-badge" alt="SIH Problem 26067" />
  <img src="https://img.shields.io/badge/Organization-INCOIS_%7C_MoES-10b981?style=for-the-badge" alt="INCOIS MoES" />
  <img src="https://img.shields.io/badge/React-19.2-61dafb?style=for-the-badge&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Three.js-WebGL_3D-black?style=for-the-badge&logo=threedotjs" alt="Three.js" />
  <img src="https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi" alt="FastAPI" />
</p>

---

## 📑 TABLE OF CONTENTS

1. [Executive Summary & Problem Statement](#1-executive-summary--problem-statement)
2. [Live Deployments & Quick Access](#2-live-deployments--quick-access)
3. [SIH Problem Statement 26067 Compliance Matrix](#3-sih-problem-statement-26067-compliance-matrix)
4. [Platform Architecture & Route Map](#4-platform-architecture--route-map)
5. [Core Capabilities](#5-core-capabilities)
   - [3D Volumetric Depth Slices & WebGL Engine](#3d-volumetric-depth-slices--webgl-engine)
   - [In-Situ Observation Telemetry Network](#in-situ-observation-telemetry-network)
   - [Model vs. Observation Anomaly Engine](#model-vs-observation-anomaly-engine)
   - [Copernicus 10-Variable Maritime Hazard Dossier](#copernicus-10-variable-maritime-hazard-dossier)
   - [Tactical Operations & Vessel Routing](#tactical-operations--vessel-routing)
   - [Mission Dossier PDF Reporting](#mission-dossier-pdf-reporting)
6. [Technology Stack](#6-technology-stack)
7. [Repository Structure](#7-repository-structure)
8. [Data Architecture & Scientific Sources](#8-data-architecture--scientific-sources)
9. [Installation & Local Development](#9-installation--local-development)
10. [API Specification](#10-api-specification)
11. [Multi-Device Responsive Design](#11-multi-device-responsive-design)
12. [Performance Engineering & Web Workers](#12-performance-engineering--web-workers)
13. [Machine Learning Pipeline (Jal-Chakra & Rakshak)](#13-machine-learning-pipeline-jal-chakra--rakshak)
14. [Security, Ethics & Provenance](#14-security-ethics--provenance)
15. [Verification, Testing & Build Status](#15-verification-testing--build-status)
16. [Roadmap & Future Enhancements](#16-roadmap--future-enhancements)
17. [Acknowledgements & References](#17-acknowledgements--references)

---

## 1. EXECUTIVE SUMMARY & PROBLEM STATEMENT

### Context: SIH Problem Statement 26067
- **Title**: Develop a web-based interactive 3D visualization platform that integrates numerical ocean model outputs and in-situ observations.
- **Organization**: Indian National Centre for Ocean Information Services (INCOIS), Ministry of Earth Sciences (MoES), Government of India.

### The Scientific Challenge
Oceanographic processes are inherently four-dimensional: spanning longitude ($X$), latitude ($Y$), depth ($Z$), and time ($T$). Traditional marine data visualization suffers from critical operational bottlenecks:
1. **Flattened 2D Representations**: Standard GIS portals project ocean data as surface-only flat rasters, masking subsurface stratifications, pycnoclines, thermoclines, and deep water masses where 90% of heat and carbon are sequestered.
2. **Disconnected Observations**: Hydrodynamic model forecasts (e.g., Copernicus GLORYS12V1, INCOIS ROMS) are isolated from physical observational networks (Argo profiling floats, autonomous underwater gliders, INCOIS OMNI moored buoys).
3. **Data Volume & Web Latency**: Multi-gigabyte NetCDF/Zarr scientific datasets choke client browsers without server-side spatial-temporal subsetting and off-thread decoders.
4. **Disjointed Decision-Support**: Port authorities, naval operations, coastal managers, and artisanal fishermen lack a unified interface combining bathymetry, cyclone trajectories, storm surge risks, and potential fishing zones.

### The Leher Solution
**Leher (लहर)** bridges numerical ocean modeling and real-world ocean telemetry through:
- **Interactive 3D Subsurface Exploration**: WebGL-powered volumetric depth slicers with off-thread Web Worker decoders rendering 50 standard vertical depth levels down to 6,000 meters.
- **Unified In-Situ Telemetry**: Real-time integration of Argo profiling float CTD casts, Autonomous Underwater Glider sawtooth transects, and INCOIS OMNI moored buoy chains.
- **Statistical Anomaly Engine**: Automated spatio-temporal co-location computing Root Mean Square Error (RMSE), Mean Absolute Error (MAE), Pearson Correlation ($r$), and Bias ($\Delta = \text{Model} - \text{Observation}$).
- **Copernicus 10-Variable Maritime Hazard Dossier**: Institutional dark-slate intelligence dashboard delivering real-time environmental matrices, hazard indices, and one-click PDF mission dossiers.
- **Machine Learning Early Warning**: Dual XGBoost engines predicting cyclone track severity and storm surge inundation levels.

---

## 2. LIVE DEPLOYMENTS & QUICK ACCESS

| Resource | URL | Description |
| :--- | :--- | :--- |
| 🌐 **Production Live Demo** | [https://leher-3d.vercel.app/](https://leher-3d.vercel.app/) | Primary high-performance deployment on Vercel Edge CDN |
| 🌐 **Alternative Project Alias** | [https://leher-ocean-3d.vercel.app/](https://leher-ocean-3d.vercel.app/) | Secondary mirror domain |
| 💻 **GitHub Repository** | [https://github.com/DNA-Coded/LEHER](https://github.com/DNA-Coded/LEHER) | Master Git repository (Clean working tree on `main`) |
| 📑 **Responsive Master Plan** | [`docs/LEHER_RESPONSIVE_MASTER_PLAN.md`](docs/LEHER_RESPONSIVE_MASTER_PLAN.md) | Architectural specification for multi-device responsive tiers |
| 📑 **Backend-Frontend Contract** | [`docs/BACKEND_FRONTEND_CONTRACT.md`](docs/BACKEND_FRONTEND_CONTRACT.md) | Detailed REST & data schema API contracts |
| 📑 **Solution Offerings (PS 26067)**| [`docs/LEHER_SOLUTION_OFFERINGS_PS26067.md`](docs/LEHER_SOLUTION_OFFERINGS_PS26067.md) | Comprehensive SIH problem mapping & scientific validation |

---

## 3. SIH PROBLEM STATEMENT 26067 COMPLIANCE MATRIX

| SIH 26067 Core Requirement | Leher Platform Implementation | Verification Artifact / Code Reference | Status |
| :--- | :--- | :--- | :---: |
| **Interactive 3D Globe Visualization** | Dynamic CSS 3D Earth Globe, D3 multi-projection engine (Orthographic, Equirectangular, Stereographic, Waterman), and HTML5 particle streamlets. | `frontend/src/components/ui/globe.tsx`, `public/earth/` | ✅ **100% Implemented** |
| **Numerical Ocean Model Integration** | Copernicus GLORYS12V1 3D daily physics reanalysis (50 vertical depth levels, 4 primary hydrodynamic variables: `thetao`, `so`, `uo`, `vo`). | `backend/apps/api/leher/routers/slices.py`, `scripts/validate_glorys_test.py` | ✅ **100% Implemented** |
| **In-Situ Observation Integration** | Multi-platform telemetry network: Argo profiling floats (CTD casts), Autonomous Underwater Gliders, and INCOIS OMNI moored buoy chains. | `frontend/src/services/inSituSensorData.ts`, `frontend/src/components/ocean/InSituSensorModal.tsx` | ✅ **100% Implemented** |
| **Depth-Aware Stratification Analysis** | 3D Volumetric Ocean Slices along Longitude ($X$), Latitude ($Y$), and Depth ($Z$); thermocline/halocline gradient curves and 0–6,000m depth sliders. | `frontend/src/components/ui/depth-slice-page.tsx`, `frontend/src/components/ocean/depth-slice/` | ✅ **100% Implemented** |
| **Model vs. Observation Comparison** | Automated anomaly comparator computing real-time $\Delta$, RMSE, MAE, Pearson $r$, bias stratification curves, and QC status. | `frontend/src/lib/ocean/anomalyEngine.ts`, `frontend/src/components/ocean/ModelVsObsComparator.tsx` | ✅ **100% Implemented** |
| **Multiple Oceanographic Variables** | 10 Copernicus variables: Potential Temperature, Salinity, Current Velocity ($U, V$), Bathymetry, SLA, Mixed Layer Depth, Wave Height, Wave Direction, Winds. | `frontend/src/lib/maritimeHazardAnalytics.ts`, `frontend/src/components/ui/details-page.tsx` | ✅ **100% Implemented** |
| **Time-Dependent Exploration** | Dynamic UTC/IST time slider, temporal step playback, and multi-timezone institutional clock (UTC, IST, EST, PST, JST, SGT). | `frontend/src/components/ocean/TimeSlider.tsx`, `frontend/src/components/ui/landing-page.tsx` | ✅ **100% Implemented** |
| **Browser-Based Accessibility** | Zero desktop plugins. Runs in modern browsers with responsive breakpoints from mobile (320px) to 4K displays. | `frontend/src/App.tsx`, `docs/LEHER_RESPONSIVE_MASTER_PLAN.md` | ✅ **100% Implemented** |
| **Scalable Data Processing Architecture** | FastAPI backend with DuckDB/Polars data fabric, xarray memory caching, and Web Worker decoders for non-blocking UI rendering. | `backend/apps/api/`, `frontend/src/workers/` | ✅ **100% Implemented** |

---

## 4. PLATFORM ARCHITECTURE & ROUTE MAP

Leher provides an intuitive client-side router (`frontend/src/App.tsx`) with code-splitting, lazy route loading, and zero page reloads:

```
                                      ┌────────────────────────┐
                                      │   Leher User Browser   │
                                      │ (React 19 + Three.js)  │
                                      └───────────┬────────────┘
                                                  │
                ┌───────────────────┬─────────────┴───────┬───────────────────┐
                ▼                   ▼                     ▼                   ▼
       Route: / (Home)      Route: /details      Route: /depth-slice  Route: /operations
      ┌──────────────────┐ ┌───────────────────┐ ┌──────────────────┐ ┌──────────────────┐
      │ Interactive 3D   │ │ Copernicus 10-Var │ │ 3D Volumetric    │ │ Maritime Tactical│
      │ Ocean Globe &    │ │ Maritime Hazard   │ │ Subsurface Mesh  │ │ Vessel Routing,  │
      │ Particle Vectors │ │ Dossier & PDF     │ │ 50 Depth Slices  │ │ Safe Fishing PFZ │
      └──────────────────┘ └───────────────────┘ └──────────────────┘ └──────────────────┘
                │                   │                     │                   │
                └───────────────────┼─────────────────────┴───────────────────┘
                                    │ HTTP REST / JSON Payloads
                                    ▼
                      ┌───────────────────────────┐
                      │      FastAPI Backend      │
                      │        (Port 8000)        │
                      └─────────────┬─────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  Data Fabric     │       │  xarray Subsets  │       │  Jal-Chakra ML   │
│  (DuckDB/Polars) │       │  (GLORYS12V1)    │       │  (XGBoost Models)│
└──────────────────┘       └──────────────────┘       └──────────────────┘
```

### Route Index
- **`/` (Workbench & Globe)**: Real-time global current/wind streamlets, interactive 3D Earth, projection switcher, depth slider, and quick-inspection telemetry cards.
- **`/details` (Maritime Hazard Dossier)**: Institutional command center covering 10 Copernicus variables, live cyclone & storm surge alerts, coastal risk matrix, and instant PDF mission export.
- **`/depth-slice` (3D Volumetric Slices)**: Dedicated Three.js WebGL subsurface volume visualizer, featuring $X/Y/Z$ cross-sections, thermocline isosurfaces, and worker-decoded scalar grids.
- **`/operations` (Tactical Navigation)**: Operational routing console for maritime navigation corridors, port approach conditions, and Potential Fishing Zone (PFZ) advisories.
- **`/about` (Institutional Methodology)**: Scientific provenance, data sources (INCOIS, CMEMS, NOAA, GEBCO), CF-1.4 compliance notes, and SIH 26067 background.

---

## 5. CORE CAPABILITIES

### 3D Volumetric Depth Slices & WebGL Engine
- **Three.js & React Three Fiber Canvas**: Direct GPU-rendered 3D volumetric slice visualizer (`frontend/src/components/ui/depth-slice-page.tsx`).
- **50 Vertical Depth Levels**: Preserves full vertical resolution from the surface ($0.49\text{ m}$) down to abyssal depths ($5,727.9\text{ m}$).
- **Interactive Multi-Axis Slicing**: Dynamically slice the Indian Ocean along Longitude (Zonal transect), Latitude (Meridional transect), or Depth (Horizontal layer).
- **Thermocline & Halocline Extraction**: Automatically isolates steep density and temperature gradient layers ($20^\circ\text{C}$ isotherm).
- **Off-Thread Web Worker Decoders**: Dense 3D scalar arrays are decoded in background threads (`sliceDecoder.worker.ts` and `isosurface.worker.ts`) to maintain 60 FPS viewport rendering.

### In-Situ Observation Telemetry Network
Leher integrates physical in-situ sensors across the Northern Indian Ocean, Arabian Sea, and Bay of Bengal:
- **Argo Profiling Floats**: Ingests automated CTD profiling cycles down to 2,000 meters. Provides pressure, practical salinity ($S_o$), and potential temperature ($\theta_o$) profiles with sensor serials and WMO identifiers.
- **Autonomous Underwater Gliders**: Tracks shallow-to-deep sawtooth sampling missions measuring upper-ocean stratification, mixed layer turbulence, and acoustic speed profiles.
- **INCOIS OMNI Moored Buoy Arrays**: Ingests high-frequency surface meteorological observations (winds, gust, barometric pressure) coupled with subsurface inductive CTD cable arrays.
- **Interactive Sensor Modal**: Inspect sensor health, cycle history, battery levels, calibration dates, transmission timestamps, and vertical profile curves (`InSituSensorModal.tsx`).

### Model vs. Observation Anomaly Engine
To validate numerical hydrodynamic models against real-world observations:
- **Mathematical Error Formulation**:
  $$\text{Anomaly} (\Delta) = \text{Value}_{\text{Model}} - \text{Value}_{\text{In-Situ}}$$
  $$\text{RMSE} = \sqrt{\frac{1}{N}\sum_{i=1}^{N}(\text{Model}_i - \text{Obs}_i)^2} \qquad \text{MAE} = \frac{1}{N}\sum_{i=1}^{N}|\text{Model}_i - \text{Obs}_i|$$
- **Pearson Correlation ($r$)**: Quantifies stratification shape agreement across the vertical water column.
- **Visual Diagnostics**: Side-by-side vertical profile comparison curves with deviation ribbons, thermocline bias markers, and automated Quality Control (QC) confidence ratings.

### Copernicus 10-Variable Maritime Hazard Dossier
The newly overhauled `/details` intelligence console integrates 10 institutional marine parameters:
1. **Sea Water Potential Temperature ($\theta_o$)**: Upper ocean heat content and cyclogenesis fuel indicator.
2. **Sea Water Salinity ($S_o$)**: Haline stratification and freshwater river plume dynamics (Ganga-Brahmaputra runoff).
3. **Sea Surface Height Above Geoid ($\text{zos}$)**: Mesoscale eddies, geostrophic currents, and altimetry anomalies.
4. **Ocean Mixed Layer Thickness ($\text{mlotst}$)**: Critical boundary for air-sea gas exchange and acoustic sonar ducts.
5. **Eastward Sea Water Velocity ($u_o$)**: Zonal surface and subsurface current vectors.
6. **Northward Sea Water Velocity ($v_o$)**: Meridional transport and coastal upwelling dynamics.
7. **Significant Wave Height ($H_s$ / $\text{VHM0}$)**: Swell and wind-sea energy monitoring for ship safety.
8. **Primary Wave Direction ($\text{VMDR}$)**: Wave propagation vectors for port operations.
9. **10m Surface Wind Vectors ($u_{10}, v_{10}$)**: Atmospheric boundary forcing from GFS / ECMWF.
10. **Seafloor Bathymetry Depth**: GEBCO 2023 15-arcsecond global seafloor relief.

### Tactical Operations & Vessel Routing
- **Maritime Navigational Corridors**: International Shipping Lanes (ISL) across the Arabian Sea, Malacca Strait approach, and Sri Lanka southern route.
- **Potential Fishing Zones (PFZ)**: Ocean thermal front and chlorophyll gradient intersection zones optimized for sustainable artisanal fishing.
- **Operational Advisory Engine**: Real-time risk categorization (Normal, Caution, High Risk, Critical Threat) based on wind-wave coupling and cyclone proximity.

### Mission Dossier PDF Reporting
- **Automated Client-Side PDF Generation**: Built with `frontend/src/lib/export/missionDossierPdf.ts`.
- **Institutional Briefing Format**: Generates print-ready executive dossiers containing coordinate metadata, timestamp stamps, environmental matrix tables, hazard risk indicators, sensor telemetry status, and security clearance blocks.

---

## 6. TECHNOLOGY STACK

```
┌────────────────────────────────────────────────────────────────────────┐
│                          LEHER TECHNOLOGY MATRIX                       │
├───────────────────┬────────────────────────────────────────────────────┤
│ Frontend Core     │ React 19.2.8 • TypeScript 6.0 • Vite 6.2           │
│ Styling & Motion  │ Tailwind CSS v4 • Motion 13.2 • Lucide Icons      │
│ 3D & Visualization│ Three.js 0.185 • React Three Fiber 9.7 • D3.js v3  │
│ High-Perf Data    │ Apache Arrow 21.2 • Web Workers (Off-thread decode)│
│ Backend API       │ FastAPI 0.115+ • Uvicorn 0.34+ • Python 3.11-3.14 │
│ Scientific Core   │ xarray 2026+ • NumPy 2.5+ • NetCDF4 1.7+ • Zarr   │
│ Data Fabric & DB  │ DuckDB • Polars • PyArrow                          │
│ Machine Learning  │ XGBoost • Scikit-Learn (Cyclone & Storm Surge)     │
│ Cloud & Edge      │ Vercel Edge Network (Static Bundle + CI/CD)        │
└───────────────────┴────────────────────────────────────────────────────┘
```

---

## 7. REPOSITORY STRUCTURE

```
LEHER/
├── .gitignore                          # Production Git exclusion rules
├── package.json                        # Root npm workspace manifest
├── README.md                           # Master platform documentation
│
├── frontend/                           # React 19 + Three.js Client Application
│   ├── public/                         # Static assets, logos, and standalone iframe engine
│   │   ├── logo.png                    # Institutional Leher emblem
│   │   └── earth/                      # Standalone D3 multi-projection engine
│   │       ├── index.html              # Streamlet canvas runner
│   │       ├── data/                   # GRIB-JSON current/wind arrays
│   │       └── libs/earth/             # D3 projection extensions
│   ├── src/
│   │   ├── App.tsx                     # Multi-route controller & background ambient mesh
│   │   ├── main.tsx                    # React DOM entrypoint
│   │   ├── index.css                   # Global styles & design tokens
│   │   ├── components/
│   │   │   ├── ocean/                  # Core oceanographic components
│   │   │   │   ├── InSituSensorModal.tsx       # Argo, Glider & Buoy telemetry modal
│   │   │   │   ├── ModelVsObsComparator.tsx    # Statistical anomaly & bias comparator
│   │   │   │   ├── PointDepthPanel.tsx         # Depth stratification inspector
│   │   │   │   ├── OceanGlobe.tsx              # Interactive 3D globe wrapper
│   │   │   │   ├── TimeSlider.tsx              # Temporal control widget
│   │   │   │   ├── DepthSlider.tsx             # Vertical level selector
│   │   │   │   └── depth-slice/                # 3D Subsurface WebGL components
│   │   │   │       ├── DepthSliceStandalone.tsx
│   │   │   │       ├── DepthSliceSideTab.tsx
│   │   │   │       └── StandaloneDepthSliceViewer.tsx
│   │   │   └── ui/                     # Application pages & modern UI components
│   │   │       ├── landing-page.tsx            # Main Workbench UI (Route: /)
│   │   │       ├── details-page.tsx            # Maritime Hazard Dossier (Route: /details)
│   │   │       ├── depth-slice-page.tsx        # 3D Volumetric Slice Page (Route: /depth-slice)
│   │   │       ├── operations-page.tsx         # Tactical Nav Console (Route: /operations)
│   │   │       ├── about-page.tsx              # Institutional About Page (Route: /about)
│   │   │       ├── app-navbar.tsx              # Responsive unified navigation header
│   │   │       └── flow-field-background.tsx   # Ambient streamlet flow background
│   │   ├── lib/
│   │   │   ├── maritimeHazardAnalytics.ts      # Risk indices & threshold algorithms
│   │   │   ├── coordinates.ts                  # Geo coordinate conversions
│   │   │   ├── export/
│   │   │   │   └── missionDossierPdf.ts        # Client-side PDF dossier generator
│   │   │   └── ocean/
│   │   │       ├── anomalyEngine.ts            # RMSE, MAE & bias calculations
│   │   │       ├── colorScales.ts              # Oceanographic scientific color palettes
│   │   │       └── regions.ts                  # Indian Ocean bounding boxes
│   │   ├── services/
│   │   │   ├── inSituSensorData.ts             # Argo, Glider & Buoy data provider
│   │   │   ├── oceanApi.ts                     # REST client for FastAPI backend
│   │   │   └── mockOceanData.ts                # Deterministic fallback dataset
│   │   ├── store/
│   │   │   └── useOceanStore.ts                # Zustand global ocean state store
│   │   └── workers/                            # Dedicated Web Workers
│   │       ├── isosurface.worker.ts            # Off-thread Marching Cubes / Isosurface
│   │       ├── sliceDecoder.worker.ts          # Off-thread 3D volume slicing
│   │       └── vectorProcessor.worker.ts       # Off-thread vector field interpolation
│   ├── package.json                    # Frontend dependencies
│   ├── tsconfig.json                   # TypeScript configuration
│   └── vite.config.ts                  # Vite 6 bundler config
│
├── backend/                            # Python FastAPI Backend & Data Fabric
│   ├── apps/
│   │   └── api/leher/                  # Modular FastAPI application
│   │       ├── main.py                 # Server startup & middleware
│   │       ├── config.py               # Path configurations & settings
│   │       └── routers/
│   │           ├── catalog.py          # Dataset inventory & variable endpoints
│   │           ├── slices.py           # 3D depth slice subsetting
│   │           ├── vectors.py          # Current & wind vector endpoints
│   │           └── ml.py               # Cyclone & storm surge inference
│   ├── services/
│   │   └── jal-chakra/                 # Operational ML Pipeline
│   │       └── core/
│   │           ├── feature_engineering.py
│   │           ├── train_cyclone_model.py
│   │           ├── train_surge_model.py
│   │           ├── safe_zones.py
│   │           └── rakshak.py          # Full inference orchestrator
│   ├── requirements.txt                # Python dependencies
│   └── run_all.py                      # Master pipeline execution script
│
├── docs/                               # Architecture Specifications & Master Plans
│   ├── LEHER_RESPONSIVE_MASTER_PLAN.md # Multi-device responsive design blueprint
│   ├── BACKEND_FRONTEND_CONTRACT.md    # API schemas & data protocols
│   ├── LEHER_SOLUTION_OFFERINGS_PS26067.md # SIH problem solutions guide
│   └── datasets_list.md                # Comprehensive data inventory
│
└── scripts/                            # Operational Data Pipeline Scripts
    ├── download_glorys_test.py         # Automated Copernicus GLORYS downloader
    └── validate_glorys_test.py         # xarray NetCDF validation script
```

---

## 8. DATA ARCHITECTURE & SCIENTIFIC SOURCES

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA INGESTION PIPELINE                           │
├──────────────────────────┬──────────────────────────────────────────────────┤
│ Copernicus Marine Service│ GLORYS12V1 Daily Ocean Physics Reanalysis        │
│ (CMEMS)                  │ • 50 vertical depth levels (0–5,728m)            │
│                          │ • 1/12° (~8 km) horizontal resolution            │
│                          │ • Variables: thetao, so, uo, vo, mlotst, zos     │
├──────────────────────────┼──────────────────────────────────────────────────┤
│ Argo Global Data Assembly│ Autonomous Argo CTD Profiling Float Network      │
│ Centre (GDAC)            │ • In-situ vertical profiles (0–2,000m)           │
│                          │ • Continuous Arabian Sea & Bay of Bengal floats  │
├──────────────────────────┼──────────────────────────────────────────────────┤
│ INCOIS OMNI Buoys        │ Ocean Moored Buoy Network for Northern Indian    │
│ & Ocean Gliders          │ Ocean (MoES/INCOIS) surface met + CTD chains     │
├──────────────────────────┼──────────────────────────────────────────────────┤
│ NOAA / ESR OSCAR         │ Ocean Surface Current Analysis Real-time         │
│                          │ • 0.33° surface velocity vector components       │
├──────────────────────────┼──────────────────────────────────────────────────┤
│ NWS / NCEP GFS           │ Global Forecast System 10m Surface Wind Vectors  │
├──────────────────────────┼──────────────────────────────────────────────────┤
│ GEBCO 2023               │ General Bathymetric Chart of the Oceans          │
│                          │ • 15-arcsecond global relief and seafloor depth  │
└──────────────────────────┴──────────────────────────────────────────────────┘
```

---

## 9. INSTALLATION & LOCAL DEVELOPMENT

### Prerequisites
- **Node.js**: `v20.0.0` or higher (Recommended: Node.js 22 LTS or 24)
- **npm** (or `pnpm` / `yarn`)
- **Python**: `v3.11` to `v3.14`
- **Git**

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/DNA-Coded/LEHER.git
cd LEHER
```

---

### Step 2: Frontend Setup & Launch
```bash
# 1. Install frontend dependencies
cd frontend
npm install

# 2. Start the Vite local development server
npm run dev
```
Open **`http://localhost:5173`** in your browser to view the Leher platform.

To verify the production build:
```bash
npm run build
npm run preview
```

---

### Step 3: Backend Setup & Launch (Optional for Data Subsetting)
```bash
# 1. Navigate to the backend directory
cd ../backend

# 2. Create and activate a Python virtual environment
python -m venv venv
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On Linux / macOS:
source venv/bin/activate

# 3. Install Python requirements
pip install -r requirements.txt

# 4. Launch the FastAPI server
uvicorn apps.api.leher.main:app --reload --host 0.0.0.0 --port 8000
```
- **API Base**: `http://localhost:8000`
- **Swagger Interactive API Documentation**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`

---

## 10. API SPECIFICATION

The FastAPI backend provides clean, RESTful endpoints adhering to OpenAPI specifications:

### Core Endpoints

#### 1. System Health & Catalog
- **`GET /`**: System status, uptime, and available API routes.
- **`GET /catalog`**: Dataset inventory, available vertical depth levels, bounding box coordinates, and temporal ranges.

#### 2. 3D Depth Slices
- **`GET /slices/depth`**: Subsets horizontal scalar fields ($X, Y$) at a requested depth level ($Z$).
  - *Parameters*: `depth` (float, meters), `variable` (`temperature`, `salinity`), `bbox` (minLon, minLat, maxLon, maxLat).
- **`GET /slices/transect`**: Subsets vertical cross-sections across specified coordinate pairs.

#### 3. Vector Fields
- **`GET /vectors/currents`**: Ingests and returns eastward ($u$) and northward ($v$) current velocity vectors.
- **`GET /vectors/winds`**: Ingests and returns 10m surface atmospheric wind vectors.

#### 4. Machine Learning & Hazards
- **`GET /ml/cyclone/inference`**: XGBoost cyclone intensity and track risk classification.
- **`GET /ml/surge/predict`**: Storm surge height predictions (meters above normal astronomical tide).
- **`GET /ml/fishing-zones`**: GeoJSON feature collection of identified Potential Fishing Zones.

---

## 11. MULTI-DEVICE RESPONSIVE DESIGN

The platform incorporates the **Leher Responsive Master Plan** (`docs/LEHER_RESPONSIVE_MASTER_PLAN.md`), guaranteeing smooth usability across every viewport size without horizontal scrolling or UI overlap:

```
┌─────────────────┬────────────────────────────────────────────────────────┐
│ Viewport Tier   │ Responsive Optimization Strategy                       │
├─────────────────┼────────────────────────────────────────────────────────┤
│ Mobile Portrait │ • Single-column stacked layout                         │
│ (< 480px)       │ • Off-screen slide-over drawers for 3D slice controls  │
│                 │ • Touch targets ≥ 44×44px (WCAG 2.1 AA)                │
│                 │ • Particle counts dynamically scaled down (lag-free)   │
├─────────────────┼────────────────────────────────────────────────────────┤
│ Tablet          │ • 2-column adaptive grid                               │
│ (481px–1024px)  │ • Side-by-side comparative widgets                     │
│                 │ • Collapsible secondary telemetry sidebars             │
├─────────────────┼────────────────────────────────────────────────────────┤
│ Desktop / 4K    │ • Full institutional multi-column command matrix       │
│ (> 1025px)      │ • Three.js 3D viewport with persistent tactical well   │
└─────────────────┴────────────────────────────────────────────────────────┘
```

---

## 12. PERFORMANCE ENGINEERING & WEB WORKERS

Rendering massive 4D oceanographic arrays in consumer web browsers without freezing the main thread requires strict performance engineering:

1. **Dedicated Web Workers (`frontend/src/workers/`)**:
   - `sliceDecoder.worker.ts`: Decodes binary/array buffers into 2D scalar matrices off-thread.
   - `isosurface.worker.ts`: Computes Marching Cubes isosurfaces for 3D thermoclines without dropping frame rates.
   - `vectorProcessor.worker.ts`: Interpolates velocity vectors onto irregular geographical projections asynchronously.
2. **GPU Texture Sharing**: Uses WebGL floating-point textures to stream scalar temperature and salinity fields directly into Three.js fragment shaders.
3. **Adaptive Particle Pools**: Dynamic streamlet particle count throttling based on client GPU capabilities (1,000 particles on mobile $\rightarrow$ 3,500 particles on high-end desktop).
4. **Fast Production Bundling**: Verified Vite 6 build compiling TypeScript into optimized production chunks in under 4 seconds.

---

## 13. MACHINE LEARNING PIPELINE (JAL-CHAKRA & RAKSHAK)

The Leher backend features the **Jal-Chakra** operational ML pipeline (`backend/services/jal-chakra/`):

1. **Feature Engineering**: Extracts surface wind shear, sea surface temperature anomalies, sea level pressure gradients, and thermocline depth from Copernicus reanalysis.
2. **IBTrACS Ground Truth**: Integrates NOAA International Best Track Archive for Climate Stewardship (IBTrACS) historical cyclone tracks in the North Indian Ocean.
3. **Cyclone Track & Severity Classifier**: An XGBoost gradient boosted model predicting cyclone categorization (Depression to Super Cyclonic Storm).
4. **Storm Surge Regressor**: Predicts coastal storm surge heights along vulnerable coastlines (Gujarat, Odisha, West Bengal, Andhra Pradesh).
5. **Rakshak Inference Engine**: Unifies hazard predictions into actionable GeoJSON polygons for coastal evacuation planning and search-and-rescue (SAR) operations.

---

## 14. SECURITY, ETHICS & PROVENANCE

- **Zero Hardcoded Secrets**: All API keys, Copernicus credentials, and internal endpoints are managed via environment variables and `.gitignore` policies.
- **Strict Data Provenance**: Every metric in the platform includes traceable source metadata (Provider, Dataset ID, Resolution, Processing Level, and Last Updated Timestamp).
- **CF-1.4 & Open Standards**: All ingested NetCDF datasets conform to Climate and Forecast (CF-1.4) metadata conventions and standard SI units (Kelvin/Celsius, PSU, m/s, meters).
- **Privacy & Telemetry**: Zero tracking scripts, cookies, or third-party behavioral analytics.

---

## 15. VERIFICATION, TESTING & BUILD STATUS

- **Frontend Compilation**: `npm run build` succeeds with zero errors across all TypeScript modules and styles:
  ```
  ✓ built in 3.99s
  dist/index.html                            0.78 kB
  dist/assets/index-*.css                   32.40 kB
  dist/assets/index-*.js                   812.15 kB
  ```
- **Live Visual Verification**: End-to-end browser subagent automated audit on `http://localhost:5173/details` confirming zero layout shifts, proper institutional color contrast, and seamless navigation.
- **Clean Repository Status**: Clean working directory on branch `main` with all changes synchronized to GitHub (`origin/main`).

---

## 16. ROADMAP & FUTURE ENHANCEMENTS

- [x] **Phase 1: Architecture & Data Ingestion**: Copernicus GLORYS12V1 3D NetCDF regional acquisition and validation.
- [x] **Phase 2: FastAPI Subsetting Engine**: REST API endpoints for spatial, temporal, and depth queries.
- [x] **Phase 3: In-Situ Sensor Networks**: Argo floats, underwater gliders, and INCOIS OMNI moored buoys integration.
- [x] **Phase 4: Model vs. Observation Anomaly Engine**: Statistical bias calculation (RMSE, MAE, Pearson $r$).
- [x] **Phase 5: 3D Volumetric Subsurface Slicing**: Three.js WebGL volume visualizer with off-thread Web Workers.
- [x] **Phase 6: Institutional Maritime Hazard Dossier**: 10-variable Copernicus matrix, hazard alerts, and automated PDF export.
- [x] **Phase 7: Multi-Device Responsive System**: Comprehensive mobile, tablet, and desktop adaptive layouts.
- [ ] **Phase 8: Real-Time INCOIS OGC Service Ingestion**: Automated live WMS/WCS harvester for operational INCOIS ROMS model feeds.
- [ ] **Phase 9: Multi-Year 4D Time Series Animation**: Cloud-native Zarr chunk streaming for decade-scale climate trend playback.

---

## 17. ACKNOWLEDGEMENTS & REFERENCES

### Sponsoring & Supporting Organizations
- **Indian National Centre for Ocean Information Services (INCOIS)**, Hyderabad, India.
- **Ministry of Earth Sciences (MoES)**, Government of India.
- **Smart India Hackathon (SIH)**, Ministry of Education's Innovation Cell.

### Scientific Data Providers
- **Copernicus Marine Service (CMEMS)**: Global Ocean Physics Reanalysis (GLORYS12V1, DOI: [10.48670/moi-00021](https://doi.org/10.48670/moi-00021)).
- **Argo GDAC / IFREMER**: International Argo Profiling Float Program ([https://argo.ucsd.edu](https://argo.ucsd.edu)).
- **NOAA / Earth & Space Research (ESR)**: OSCAR Ocean Surface Current Analysis Real-time.
- **GEBCO**: General Bathymetric Chart of the Oceans ([https://www.gebco.net](https://www.gebco.net)).

---

<p align="center">
  <img src="logo.png" width="60" height="60" alt="Leher Logo" style="border-radius: 50%; box-shadow: 0 0 20px rgba(6, 182, 212, 0.3);" /><br>
  <strong>Leher (लहर) — 3D Ocean Intelligence &amp; Maritime Hazard Visualization Platform</strong><br>
  <em>Developed for Smart India Hackathon (SIH) Problem Statement 26067</em><br>
  <strong>INCOIS • Ministry of Earth Sciences • Government of India</strong>
</p>
