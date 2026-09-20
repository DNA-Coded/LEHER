<p align="center">
  <a href="https://leher-3d.vercel.app/" target="_blank" rel="noopener noreferrer">
    <img src="logo.png" alt="Leher Logo" width="160" height="160" style="border-radius: 50%; max-width: 100%; box-shadow: 0 0 40px rgba(6, 182, 212, 0.35); border: 2px solid rgba(6, 182, 212, 0.4);" />
  </a>
</p>

<h1 align="center">Leher (लहर)</h1>

<p align="center">
  <strong>3D Ocean Intelligence, Subsurface Stratification &amp; Maritime Hazard Visualization Platform</strong><br>
  <em>An institutional-grade 3D oceanographic spatial decision-support platform integrating 4D numerical hydrodynamic ocean models with real-world in-situ observation networks across space, depth, and time.</em>
</p>

<p align="center">
  <a href="https://leher-3d.vercel.app/"><img src="https://img.shields.io/badge/Live_Demo-leher--3d.vercel.app-0ea5e9?style=for-the-badge&logo=vercel" alt="Live Demo" /></a>
  <a href="https://leher-ocean-3d.vercel.app/"><img src="https://img.shields.io/badge/Mirror-leher--ocean--3d.vercel.app-0284c7?style=for-the-badge&logo=vercel" alt="Mirror Demo" /></a>
  <a href="https://github.com/DNA-Coded/LEHER"><img src="https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github" alt="GitHub Repo" /></a>
  <img src="https://img.shields.io/badge/SIH_Problem-26067-ff4757?style=for-the-badge" alt="SIH Problem 26067" />
  <img src="https://img.shields.io/badge/Organization-INCOIS_%7C_MoES-10b981?style=for-the-badge" alt="INCOIS MoES" />
  <img src="https://img.shields.io/badge/React-19.2-61dafb?style=for-the-badge&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Three.js-WebGL_3D-000000?style=for-the-badge&logo=threedotjs" alt="Three.js" />
  <img src="https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Python-3.11_--_3.14-3776ab?style=for-the-badge&logo=python" alt="Python" />
</p>

---

## 📑 TABLE OF CONTENTS

1. [Executive Summary & Problem Statement](#1-executive-summary--problem-statement)
2. [Live Deployments & Key Links](#2-live-deployments--key-links)
3. [SIH Problem Statement 26067 Compliance Matrix](#3-sih-problem-statement-26067-compliance-matrix)
4. [Platform Architecture & System Flow](#4-platform-architecture--system-flow)
5. [Core Technological Offerings](#5-core-technological-offerings)
   - [5.1 3D Volumetric Subsurface Engine & WebGL Slices](#51-3d-volumetric-subsurface-engine--webgl-slices)
   - [5.2 In-Situ Observation Telemetry Network](#52-in-situ-observation-telemetry-network)
   - [5.3 Model vs. Observation Hydrodynamic Bias Engine](#53-model-vs-observation-hydrodynamic-bias-engine)
   - [5.4 Copernicus 10-Variable Maritime Hazard Dossier](#54-copernicus-10-variable-maritime-hazard-dossier)
   - [5.5 Machine Learning Pipeline (Jal-Chakra & Rakshak)](#55-machine-learning-pipeline-jal-chakra--rakshak)
   - [5.6 Automated Mission Dossier PDF Exporter](#56-automated-mission-dossier-pdf-exporter)
   - [5.7 Tactical Maritime Operations & Vessel Routing](#57-tactical-maritime-operations--vessel-routing)
6. [Mathematical & Physical Formulations](#6-mathematical--physical-formulations)
7. [Technology Stack](#7-technology-stack)
8. [Comprehensive Codebase Directory Map](#8-comprehensive-codebase-directory-map)
9. [Data Sources & Scientific Ingestion](#9-data-sources--scientific-ingestion)
10. [Installation & Local Development](#10-installation--local-development)
11. [API Specification & REST Endpoints](#11-api-specification--rest-endpoints)
12. [Multi-Device Responsive Architecture](#12-multi-device-responsive-architecture)
13. [Performance Engineering & Web Workers](#13-performance-engineering--web-workers)
14. [Security, Governance & CF-1.8 Compliance](#14-security-governance--cf-18-compliance)
15. [Verification, Testing & Build Benchmarks](#15-verification-testing--build-benchmarks)
16. [Operational Use Cases](#16-operational-use-cases)
17. [Project Roadmap](#17-project-roadmap)
18. [Acknowledgements & Scientific References](#18-acknowledgements--scientific-references)

---

## 1. EXECUTIVE SUMMARY & PROBLEM STATEMENT

### Context: Smart India Hackathon (SIH) Problem Statement 26067
- **Ministry**: Ministry of Earth Sciences (MoES), Government of India
- **Department**: Indian National Centre for Ocean Information Services (INCOIS), Ocean Valley, Hyderabad
- **Problem Statement ID**: 26067
- **Title**: *Develop a web-based interactive 3D visualization platform that integrates numerical ocean model outputs and in-situ observations*
- **Theme**: Disaster Management / Ocean Sciences
- **Category**: Software

### The Oceanographic Challenge
India oversees an Exclusive Economic Zone (EEZ) exceeding **2.37 million square kilometers** and a strategic coastline of **7,516 kilometers**. Operational oceanographers, naval operators, coastal disaster management authorities, and commercial fishing fleets require continuous, depth-resolved, high-precision monitoring of ocean state variables.

Historically, marine data workflows suffered from severe systemic limitations:
1. **Flattened 2D Projections**: Traditional GIS portals render the ocean as a flat surface layer, obscuring the vertical water column (0–6,000m) where **90% of oceanic heat, acoustic ducting channels, pycnoclines, and thermocline dynamics** reside.
2. **Disconnected Data Islands**: Multi-gigabyte numerical hydrodynamic model forecasts (Copernicus GLORYS12V1, INCOIS ROMS/MOM) were analyzed in isolation from physical *in-situ* observational networks (Argo profiling floats, autonomous underwater gliders, INCOIS OMNI moored buoys, CTD casts).
3. **Desktop Tool Dependency**: Exploring 4D ocean data required heavy, workstation-bound desktop software (e.g., Ocean Data View, ParaView, Ferret, MATLAB) with steep learning curves and zero real-time web collaboration.
4. **Actionability Gap**: Marine operators, coast guards, and disaster managers received raw NetCDF matrices rather than contextualized operational guidance (acoustic sonar ducting, plimsoll buoyancy shifts, thermocline heat potential, and storm surge inundation risks).

### The Leher (लहर) Solution
**Leher** delivers a browser-native, zero-install, 3D ocean intelligence platform that unites numerical modeling and real-world observation. Built with **React 19**, **Three.js WebGL**, **Apache Arrow IPC**, **Tailwind CSS v4**, and a high-performance **Python FastAPI / Polars / DuckDB** data fabric, Leher features:
- **3D Volumetric Depth Slicing**: Render water columns across 50 vertical depth levels with off-thread Web Worker decoders.
- **Instrument Telemetry Network**: Ingests 16+ active oceanographic platforms (Argo floats, gliders, OMNI buoys, BGC sensors) with depth profile curves and drift trajectories.
- **Model vs. Observation Hydrodynamic Bias Engine**: Computes spatial-temporal co-location, water column RMSE, mean bias, D20 thermocline error, and Pearson correlation ($r$).
- **Copernicus 10-Variable Maritime Hazard Dossier**: An institutional dark-slate command center with structured operational briefings, protocol directives, and one-click PDF mission dossiers.
- **Jal-Chakra & Rakshak ML Pipeline**: Dual XGBoost engines predicting cyclone track severity and storm surge inundation heights.

---

## 2. LIVE DEPLOYMENTS & KEY LINKS

| Environment / Asset | Target URL | Technical Details |
| :--- | :--- | :--- |
| 🌐 **Production Live Platform** | [https://leher-3d.vercel.app/](https://leher-3d.vercel.app/) | Vercel Edge Network deployment (React 19 + Three.js WebGL) |
| 🌐 **Production Alternative Alias** | [https://leher-ocean-3d.vercel.app/](https://leher-ocean-3d.vercel.app/) | Secondary high-availability mirror domain |
| 💻 **GitHub Master Repository** | [https://github.com/DNA-Coded/LEHER](https://github.com/DNA-Coded/LEHER) | Clean production branch (`main`) with active CI/CD |
| 📑 **Solution Offerings (PS 26067)** | [`docs/LEHER_SOLUTION_OFFERINGS_PS26067.md`](docs/LEHER_SOLUTION_OFFERINGS_PS26067.md) | Exhaustive 10-requirement mapping and scientific audit |
| 📑 **Responsive Master Plan** | [`docs/LEHER_RESPONSIVE_MASTER_PLAN.md`](docs/LEHER_RESPONSIVE_MASTER_PLAN.md) | Multi-device responsive design and WCAG 2.1 AA blueprint |
| 📑 **Backend-Frontend Contract** | [`docs/BACKEND_FRONTEND_CONTRACT.md`](docs/BACKEND_FRONTEND_CONTRACT.md) | Detailed REST API, Arrow IPC, and JSON schema contracts |
| 📑 **System Architecture Guide** | [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md) | In-depth engineering knowledge base and component map |
| 📑 **Machine Learning Guide** | [`docs/MLguide.md`](docs/MLguide.md) | Jal-Chakra & Rakshak ML pipeline and model architecture |

---

## 3. SIH PROBLEM STATEMENT 26067 COMPLIANCE MATRIX

Every capability specified in the official MoES / INCOIS Smart India Hackathon problem statement has been delivered and verified:

| # | SIH PS 26067 Requirement | Leher Platform Implementation | Status | Key Code References |
| :-: | :--- | :--- | :-: | :--- |
| **1** | **3D Volumetric Rendering**<br>Interactive visualization of ocean model fields (temp, salinity, currents) across 0–2000m+, depth-slice views, isosurface extraction, time-step animation via WebGL. | • Dual 3D geometries: **Cylinder** (core soundings) and **Cuboid** (volumetric block) in Three.js.<br>• Full water column slicing across 50 vertical levels.<br>• 4-Season Monsoon climate playback loop simulating upwelling.<br>• Off-thread Marching Cubes isosurface Web Worker (`isosurface.worker.ts`). | ✅ **100% Implemented** | [`depth-slice-page.tsx`](frontend/src/components/ui/depth-slice-page.tsx)<br>[`DepthSliceStandalone.tsx`](frontend/src/components/ocean/depth-slice/DepthSliceStandalone.tsx)<br>[`sliceDecoder.worker.ts`](frontend/src/workers/sliceDecoder.worker.ts) |
| **2** | **Instrument Data Overlay**<br>Co-display of Argo float, Glider profile, CTD, and BGC data using geospatially accurate markers; clickable inspect modal with depth-vs-variable profile charts. | • Ingests **16 physical platforms** (8 Argo floats, 2 Gliders, 4 OMNI buoys, 2 BGC profilers).<br>• Interactive inspection modal displaying multi-day drift tracks (0–30 days), QC flags, battery health, and pings.<br>• High-resolution SVG depth-vs-variable profile curves. | ✅ **100% Implemented** | [`inSituSensorData.ts`](frontend/src/services/inSituSensorData.ts)<br>[`InSituSensorModal.tsx`](frontend/src/components/ocean/InSituSensorModal.tsx)<br>[`OceanGlobe.tsx`](frontend/src/components/ocean/OceanGlobe.tsx) |
| **2b** | **Model vs. Observation Co-Visualization & Bias Analysis**<br>Simultaneously render model fields and in-situ instrument observations in a single interactive environment to rapidly correlate model predictions with observational evidence. | • **Hydrodynamic Bias Engine (`ModelVsObsComparator`)**.<br>• Direct spatial-temporal co-location comparing GLORYS12V1 vs in-situ measurements.<br>• Automated physical KPIs: Water Column RMSE, Mean Bias ($\Delta T, \Delta S$), Mixed Layer Depth anomaly ($\Delta\text{MLD}$ via $0.2^\circ\text{C}$ criterion), D20 thermocline isotherm error, and Pearson correlation ($r$).<br>• Dual-sided signed anomaly bar chart. | ✅ **100% Implemented** | [`ModelVsObsComparator.tsx`](frontend/src/components/ocean/ModelVsObsComparator.tsx)<br>[`anomalyEngine.ts`](frontend/src/lib/ocean/anomalyEngine.ts) |
| **3** | **Multi-Format Data Ingestion**<br>Automated parsers for NetCDF (via PyNIO/xarray backend) and delimited text formats; modular architecture allowing new variables or data sources to be added with minimal code change. | • `Jal-Chakra` automated ingestion pipeline powered by Python `xarray`, `zarr`, and `copernicusmarine`.<br>• In-memory DuckDB catalog indexing Zarr multi-dimensional chunks.<br>• Zero-copy Apache Arrow IPC binary stream serialization (`/api/v1/model/slices`, `/api/v1/vectors/slices`). | ✅ **100% Implemented** | [`backend/services/jal-chakra/`](backend/services/jal-chakra/)<br>[`arrow_encoder.py`](backend/apps/api/leher/core/arrow_encoder.py)<br>[`oceanApi.ts`](frontend/src/services/oceanApi.ts) |
| **4** | **Customizable Colorbar & Variable Controls**<br>Dynamic colorbar editor (palette, min/max range, log/linear scale), variable selector, layer opacity controls, and vertical exaggeration slider for intuitive depth perception. | • **8 Scientific Colormaps**: Viridis, Turbo, Plasma, Thermal, Coolwarm, Haline, Salinity, Chlorophyll.<br>• Dynamic min/max auto-rescaling bound directly to real-time data headers.<br>• Continuous Layer Opacity slider (0% to 100%).<br>• Vertical exaggeration slider (50x to 300x) for intuitive bathymetric depth perception. | ✅ **100% Implemented** | [`depth-slice-page.tsx`](frontend/src/components/ui/depth-slice-page.tsx)<br>[`DepthSliceLegend.tsx`](frontend/src/components/ocean/DepthSliceLegend.tsx)<br>[`colorScales.ts`](frontend/src/lib/ocean/colorScales.ts) |
| **5** | **Web-Based, Scalable Architecture**<br>Frontend built on modern JavaScript frameworks with lightweight REST backend, enabling deployment on INCOIS infrastructure without client-side dependencies. | • Frontend: React 19 + TypeScript + Vite 6 + Three.js + Cesium.js.<br>• Zero client-side plugins; runs in 100% standard web browsers.<br>• Asynchronous Python FastAPI microservice architecture with Polars/DuckDB data fabric.<br>• Zero-copy Apache Arrow streaming. | ✅ **100% Implemented** | [`backend/apps/api/leher/main.py`](backend/apps/api/leher/main.py)<br>[`frontend/vite.config.ts`](frontend/vite.config.ts)<br>[`App.tsx`](frontend/src/App.tsx) |
| **6** | **Extensible Design for Future Sensors**<br>Plugin-style module for future integration of additional sensors (CTDs, moorings, HF-radar, ADCP), new model variables, and machine-learning derived products. | • Modular plugin architecture in `backend/services/jal-chakra/plugins/` (active `copernicus/` and `argo/` plugins).<br>• Standardized in-situ sensor data contracts (`inSituSensorData.ts`) ready for HF-radar surface currents and acoustic Doppler current profiler (ADCP) bins. | ✅ **100% Implemented** | [`backend/services/jal-chakra/plugins/`](backend/services/jal-chakra/plugins/)<br>[`pipeline.py`](backend/services/jal-chakra/core/pipeline.py)<br>[`rakshak.py`](backend/services/jal-chakra/core/rakshak.py) |
| **7** | **Open Standards & Interoperability**<br>Follow open standards (OGC WMS/WCS, CF Conventions for NetCDF) for national and international ocean data portal interoperability. | • NetCDF Climate and Forecast (CF-1.8) convention compliant coordinate naming (`time`, `depth`, `latitude`, `longitude`) across Zarr stores.<br>• OGC GeoJSON standard compliance for hazard polygons, safe corridors, and ecosystem grids.<br>• OpenAPI 3.0 / Swagger interactive schema documentation at `/api/docs`. | ✅ **100% Implemented** | [`backend/fabric/datasets/glorys/`](backend/fabric/datasets/glorys/)<br>[`safe_zones.geojson`](backend/fabric/ml/safe_zones.geojson)<br>Swagger UI at `/api/docs` |
| **8** | **Operational Mandates (Disaster Management)**<br>Timely hazard assessment, search-and-rescue support, fishery advisories, climate monitoring for operational decision-making. | • **Cyclone Genesis Detection & Surge Prediction**: Trained XGBoost models predicting storm surge heights and cyclone probabilities.<br>• **Fishermen Safe Zone Corridors**: Dynamic GeoJSON polygons mapping safe, caution, and danger fishing grounds based on wave energy and currents.<br>• **Marine Ecosystem Health Engine**: 4,000 spatial cells tracking Coral Bleaching, HABs, and Hypoxia.<br>• **Naval Acoustic & Sonar Tactical Telemetry**: Mackenzie speed of sound in seawater, SOFAR acoustic ducting channel axis, and Brunt-Väisälä buoyancy frequency ($N^2$). | ✅ **100% Implemented** | [`rakshak.py`](backend/services/jal-chakra/core/rakshak.py)<br>[`safe_zones.py`](backend/services/jal-chakra/core/safe_zones.py)<br>[`ecosystem.py`](backend/services/jal-chakra/core/ecosystem.py)<br>[`details-page.tsx`](frontend/src/components/ui/details-page.tsx) |
| **9** | **Public Outreach & Science Communication**<br>Transform complex numerical ocean model outputs into visually intuitive interactive 3D experiences for students, public awareness, exhibitions, and policymakers. | • Dedicated **About & Educational Outreach Page** (`AboutLeherPage.tsx`) explaining thermocline dynamics, barrier layers, acoustic channels, and upwelling.<br>• Client-Side **Mission Dossier PDF Generator** (`missionDossierPdf.ts`) creating formal executive dossiers with MoES/INCOIS branding for policymakers and public outreach. | ✅ **100% Implemented** | [`about-page.tsx`](frontend/src/components/ui/about-page.tsx)<br>[`missionDossierPdf.ts`](frontend/src/lib/export/missionDossierPdf.ts) |
| **10** | **Mandatory Dataset Integration**<br>Ingestion of INCOIS LAS, Copernicus CMEMS (GLOBAL_MULTIYEAR_PHY_001_030), Argo Global Data FTP, Glider Data FTP, and in-situ observations. | • Integrated CMEMS GLORYS12V1 Multiyear reanalysis (`GLOBAL_MULTIYEAR_PHY_001_030`) with 3D parameters (`thetao`, `so`, `uo`, `vo`, `zos`, `mlotst`).<br>• Ingested global Argo GDAC vertical profiles.<br>• Ingested underwater glider dive transects.<br>• Ingested INCOIS OMNI moored buoy surface and subsurface thermistor records.<br>• Ingested GEBCO bathymetry, IMD Best Track, and NOAA IBTrACS cyclone records. | ✅ **100% Implemented** | [`datasets_list.md`](docs/datasets_list.md)<br>[`backend/fabric/datasets/glorys/`](backend/fabric/datasets/glorys/)<br>[`ibtracs_indian_ocean.csv`](backend/fabric/ml/ibtracs_indian_ocean.csv) |

---

## 4. PLATFORM ARCHITECTURE & SYSTEM FLOW

```
                                  ┌────────────────────────────────────────────────────────┐
                                  │               Client Web Browser Runtime               │
                                  │      (React 19 + Three.js WebGL + Apache Arrow IPC)    │
                                  └───────────────────────────┬────────────────────────────┘
                                                              │
                    ┌─────────────────────────┬───────────────┴───────────────┬─────────────────────────┐
                    ▼                         ▼                               ▼                         ▼
         Route: / (Workbench)        Route: /details                Route: /depth-slice        Route: /operations
        ┌────────────────────────┐  ┌─────────────────────────────┐  ┌───────────────────────┐  ┌────────────────────────┐
        │ • 3D Interactive Globe │  │ • Copernicus 10-Var Matrix  │  │ • Three.js Volumetric │  │ • Tactical Nav Console │
        │ • D3 Vector Streamlets │  │ • Operational Briefing Well │  │   Cylinder & Cuboid   │  │ • Safe Fishing Zones   │
        │ • 0–2000m Depth Slider │  │ • Cyclone & Surge Telemetry │  │ • 50 Depth Slices     │  │ • Port Entry Corridors │
        │ • Timezone HUD Clock   │  │ • Mission Dossier PDF Export│  │ • Isosurface Extraction│  │ • Wave/Wind Leeway HUD │
        └────────────────────────┘  └─────────────────────────────┘  └───────────────────────┘  └────────────────────────┘
                    │                         │                               │                         │
                    └─────────────────────────┼───────────────────────────────┴─────────────────────────┘
                                              │
                                              ▼
                             ┌─────────────────────────────────┐
                             │    Asynchronous Worker Pool     │
                             ├─────────────────────────────────┤
                             │ • sliceDecoder.worker.ts        │
                             │ • isosurface.worker.ts          │
                             │ • vectorProcessor.worker.ts     │
                             └────────────────┬────────────────┘
                                              │ HTTP REST / Arrow IPC Binary Streams
                                              ▼
                             ┌─────────────────────────────────┐
                             │         FastAPI Backend         │
                             │      (Uvicorn • Port 8000)      │
                             └────────────────┬────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    ▼                         ▼                         ▼
         ┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
         │  Scientific Engine  │   │     Data Fabric     │   │   Jal-Chakra & ML   │
         │  (xarray + NumPy)   │   │  (DuckDB + Polars)  │   │  (Rakshak XGBoost)  │
         ├─────────────────────┤   ├─────────────────────┤   ├─────────────────────┤
         │ • Spatial BBox Trim │   │ • Zarr Chunk Index  │   │ • Cyclone Classifier│
         │ • Depth Slice Interp│   │ • NetCDF CF-1.8 Scan│   │ • Storm Surge Regr. │
         │ • Argo GDAC Profiles│   │ • Arrow IPC Encoder │   │ • PFZ GeoJSON Engine│
         └─────────────────────┘   └─────────────────────┘   └─────────────────────┘
```

---

## 5. CORE TECHNOLOGICAL OFFERINGS

### 5.1 3D Volumetric Subsurface Engine & WebGL Slices
- **Dual 3D Geometric Projections**:
  - **Volumetric Cylinder**: Simulates a high-precision vertical oceanographic drill-down core sounding with concentric temperature/salinity contours.
  - **Volumetric Cuboid**: Displays an ocean block with surface velocity vectors, internal stratification planes, and customizable opacity.
- **50 Vertical Depth Levels**: Spans from $0.49\text{ m}$ (surface mixed layer) down through the thermocline ($100\text{ m}$), Antarctic Intermediate Water ($500\text{ m}$), and into the abyssal plain ($5,728\text{ m}$).
- **Interactive Slicing Modes**: Slice along Longitude ($X$ Zonal Transect), Latitude ($Y$ Meridional Transect), or Depth ($Z$ Horizontal Layer).
- **Isosurface Extraction**: Real-time Marching Cubes algorithm identifying the $20^\circ\text{C}$ isotherm (thermocline boundary) and $35.0\text{ PSU}$ isohaline surfaces off-thread via `isosurface.worker.ts`.
- **Monsoon 4-Season Climate Engine**: Interactive playback simulating seasonal reversals of the East India Coastal Current (EICC) and coastal upwelling along the Western Ghats and Somali coast.

### 5.2 In-Situ Observation Telemetry Network
Leher ingests and contextualizes physical observation platforms across the Arabian Sea, Bay of Bengal, and Equatorial Indian Ocean:
- **Argo Profiling Floats**: Ingests automated CTD profiling cycles down to 2,000 meters. Provides pressure, practical salinity ($S_o$), and potential temperature ($\theta_o$) profiles with sensor serials and WMO identifiers.
- **Autonomous Underwater Gliders**: Tracks shallow-to-deep sawtooth sampling missions measuring upper-ocean stratification, mixed layer turbulence, and acoustic speed profiles.
- **INCOIS OMNI Moored Buoy Arrays**: Ingests high-frequency surface meteorological observations (winds, gust, barometric pressure) coupled with subsurface inductive CTD cable arrays.
- **Biogeochemical (BGC) Sensors**: Monitors dissolved oxygen, chlorophyll-a fluorescence, pH, and nitrate for marine ecosystem monitoring.
- **Interactive Platform Inspection Modal**: Allows users to inspect platform operational status, transmission timestamps, battery voltage, QC flags (QC-1 Good, QC-2 Suspect), and historical 30-day drift trajectories.

### 5.3 Model vs. Observation Hydrodynamic Bias Engine
Directly solves the challenge of reconciling model forecasts with real-world observations:
- **Spatial-Temporal Co-Location**: Automatically interpolates Copernicus GLORYS12V1 3D model grids onto the exact coordinates and timestamps of active in-situ platforms.
- **Dual Sounding Profile Curves**: Renders model forecast profiles (solid cyan curve) alongside observed in-situ measurements (dashed emerald curve) with interactive hover crosshairs.
- **Dual-Sided Signed Anomaly Bar Chart**: Displays depth-resolved bias (cyan left-pointing bars for cold/fresh bias, rose right-pointing bars for warm/saline bias).
- **Physical Oceanography KPIs**: Computes column RMSE, Mean Bias, Mixed Layer Depth anomaly ($\Delta\text{MLD}$), D20 thermocline isotherm error, and Pearson correlation coefficient ($r$).
- **Tactical Sonar Acoustic Assessment**: Translates physical bias into operational acoustic impacts for naval sonar propagation and submarine stealth.

### 5.4 Copernicus 10-Variable Maritime Hazard Dossier
The redesigned `/details` intelligence dashboard provides institutional situational awareness across 10 essential oceanographic parameters:
1. **Sea Water Potential Temperature ($\theta_o$)**: Tracks upper ocean thermal energy and cyclogenesis potential.
2. **Sea Water Salinity ($S_o$)**: Identifies freshwater river runoff plumes (Ganga-Brahmaputra) and high-salinity Arabian Sea water.
3. **Sea Surface Height Above Geoid ($\text{zos}$)**: Maps mesoscale eddy circulation, geostrophic currents, and altimetric anomalies.
4. **Ocean Mixed Layer Thickness ($\text{mlotst}$)**: Critical for air-sea thermal momentum transfer and acoustic sonar ducting.
5. **Eastward Velocity ($u_o$)**: Zonal surface and subsurface water transport.
6. **Northward Velocity ($v_o$)**: Meridional coastal upwelling and longshore current dynamics.
7. **Significant Wave Height ($H_s$ / $\text{VHM0}$)**: Total sea energy combining swell and local wind-sea.
8. **Primary Wave Mean Direction ($\text{VMDR}$)**: Wave propagation vectors essential for vessel stability and harbor entry.
9. **10m Surface Wind Vectors ($u_{10}, v_{10}$)**: Atmospheric boundary layer forcing from GFS / ECMWF.
10. **Seafloor Bathymetry Depth**: GEBCO 2023 15-arcsecond global relief informing shallow-water wave shoaling.

Each card features a **Structured Operational Briefing Well** (`ANALYSIS` takeaway and `PROTOCOL` bridge directive) in an institutional dark slate design system (`#07090E` / `#0C0F18`).

### 5.5 Machine Learning Pipeline (Jal-Chakra & Rakshak)
The backend ML suite combines meteorological reanalysis with historical observations:
- **Cyclone Genesis & Track Classifier**: An XGBoost model trained on NOAA IBTrACS historical tracks predicting cyclone severity stages (Depression to Super Cyclonic Storm).
- **Storm Surge Inundation Regressor**: An XGBoost regressor predicting coastal surge height (meters above normal astronomical tide) along vulnerable Indian coastal sectors.
- **Potential Fishing Zones (PFZ)**: Computes high-probability pelagic aggregation zones based on thermal fronts and chlorophyll gradients, formatted as standard OGC GeoJSON polygons.
- **Marine Ecosystem Health Engine**: Evaluates 4,000 spatial cells for coral bleaching risk using NOAA Coral Reef Watch Degree Heating Week (DHW) criteria.

### 5.6 Automated Mission Dossier PDF Exporter
- Built using [`frontend/src/lib/export/missionDossierPdf.ts`](frontend/src/lib/export/missionDossierPdf.ts).
- Generates publication-ready, multi-page executive maritime intelligence dossiers client-side in under 1 second.
- Includes timestamp watermarks, geographic bounding boxes, 10-variable environmental matrices, hazard classifications, in-situ telemetry summaries, and formal MoES / INCOIS sign-off blocks.

### 5.7 Tactical Maritime Operations & Vessel Routing
- Route: `/operations`
- **International Shipping Lanes (ISL)**: Monitors maritime traffic corridors across the Arabian Sea, Malacca Strait approach, and southern Sri Lanka route.
- **Safe Vessel Transit Advisories**: Evaluates wind-wave coupling, current drift vectors, and plimsoll line buoyancy variations to issue real-time transit recommendations.

---

## 6. MATHEMATICAL & PHYSICAL FORMULATIONS

Leher executes precise oceanographic physics formulas within its analytical engines:

### 1. Model vs. Observation Error & Bias Formulation
$$\text{Anomaly}_i = \text{Model}_i - \text{Observation}_i$$

$$\text{RMSE} = \sqrt{\frac{1}{N}\sum_{i=1}^{N}\left(\text{Model}_i - \text{Observation}_i\right)^2} \qquad \text{MAE} = \frac{1}{N}\sum_{i=1}^{N}\left|\text{Model}_i - \text{Observation}_i\right|$$

$$\text{Pearson Correlation } (r) = \frac{\sum_{i=1}^{N}(\text{Model}_i - \overline{\text{Model}})(\text{Obs}_i - \overline{\text{Obs}})}{\sqrt{\sum_{i=1}^{N}(\text{Model}_i - \overline{\text{Model}})^2} \sqrt{\sum_{i=1}^{N}(\text{Obs}_i - \overline{\text{Obs}})^2}}$$

### 2. Mixed Layer Depth ($\text{MLD}$) Threshold Criterion
Following de Boyer Montégut et al. (2004), the mixed layer base depth $z_{\text{MLD}}$ is identified where temperature deviates from the reference depth ($10\text{ m}$) by $0.2^\circ\text{C}$:
$$|T(z_{\text{MLD}}) - T(10\text{m})| = 0.2^\circ\text{C}$$

### 3. Mackenzie Speed of Sound in Seawater
Calculates acoustic velocity across the water column:
$$c(T, S, z) = 1448.96 + 4.591 T - 5.304 \times 10^{-2} T^2 + 2.374 \times 10^{-4} T^3 + 1.340 (S - 35) + 1.630 \times 10^{-2} z + \dots$$
Where $T$ is temperature in $^\circ\text{C}$, $S$ is salinity in PSU, and $z$ is depth in meters.

### 4. Brunt-Väisälä Buoyancy Frequency ($N^2$)
Estimates internal pycnocline stability:
$$N^2 = -\frac{g}{\rho_0} \frac{\partial \rho}{\partial z}$$
Where $g = 9.81\text{ m/s}^2$, $\rho_0$ is reference seawater density ($1025\text{ kg/m}^3$), and $\frac{\partial \rho}{\partial z}$ is vertical density gradient.

### 5. Tropical Cyclone Heat Potential (TCHP)
Integrated heat content from the ocean surface down to the $26^\circ\text{C}$ isotherm ($D_{26}$):
$$\text{TCHP} = c_p \int_{0}^{D_{26}} \rho(z) \left[T(z) - 26\right] dz$$
Where $c_p \approx 3993\text{ J}/(\text{kg}\cdot^\circ\text{C})$.

---

## 7. TECHNOLOGY STACK

```
┌────────────────────────────────────────────────────────────────────────┐
│                          LEHER TECHNOLOGY MATRIX                       │
├───────────────────┬────────────────────────────────────────────────────┤
│ Frontend Core     │ React 19.2.8 • TypeScript 6.0.2 • Vite 6.2.0       │
│ Styling & Motion  │ Tailwind CSS v4.3.3 • Motion 13.2 • Lucide React   │
│ 3D & Visualization│ Three.js 0.185 • React Three Fiber 9.7 • D3.js v3  │
│ High-Perf Data    │ Apache Arrow 21.2 • Dedicated Web Workers          │
│ State Management  │ Zustand 5.0 (Global spatial/depth/temporal store)  │
│ Backend API       │ FastAPI 0.115+ • Uvicorn 0.34+ • Python 3.11-3.14 │
│ Scientific Core   │ xarray 2026+ • NumPy 2.5+ • NetCDF4 1.7+ • Zarr   │
│ Data Fabric & DB  │ DuckDB • Polars • PyArrow                          │
│ Machine Learning  │ XGBoost • Scikit-Learn (Jal-Chakra & Rakshak)      │
│ Standards & Formats│ NetCDF4 • Zarr • OGC GeoJSON • CF-1.8 Conventions  │
│ Build & Quality   │ Oxlint 1.79 • Vite Production Bundler • Pytest     │
└───────────────────┴────────────────────────────────────────────────────┘
```

---

## 8. COMPREHENSIVE CODEBASE DIRECTORY MAP

```
LEHER/
├── .gitignore                          # Production Git exclusion rules (*.nc, .env, dist, node_modules)
├── package.json                        # Monorepo root workspace manifest
├── README.md                           # Master platform documentation
│
├── frontend/                           # React 19 + Three.js WebGL Client Application
│   ├── index.html                      # Vite HTML5 SPA entrypoint
│   ├── vite.config.ts                  # Vite 6 bundler config with Tailwind v4 & Earth plugin
│   ├── tsconfig.json                   # TypeScript root configuration
│   ├── package.json                    # Frontend dependencies & scripts
│   │
│   ├── public/                         # Public static assets & legacy projection engine
│   │   ├── logo.png                    # Official brand emblem
│   │   ├── depth-slice.html            # Standalone single-file 3D slice viewer
│   │   └── earth/                      # D3.js + HTML5 Canvas streamlet engine
│   │       ├── index.html              # Embedded iframe entrypoint
│   │       ├── data/                   # GRIB-JSON current/wind arrays
│   │       └── libs/earth/             # D3 projection extensions & render loops
│   │
│   └── src/                            # Application Source Code
│       ├── App.tsx                     # Multi-route controller, ambient mesh & flow-field
│       ├── main.tsx                    # React DOM entrypoint
│       ├── index.css                   # Global styles, tokens, and dark-mode foundation
│       │
│       ├── components/
│       │   ├── ocean/                  # Core Oceanographic & Telemetry Components
│       │   │   ├── InSituSensorModal.tsx       # 16-platform Argo/Glider/Buoy inspection modal
│       │   │   ├── ModelVsObsComparator.tsx    # Hydrodynamic bias & anomaly comparator
│       │   │   ├── PointDepthPanel.tsx         # Depth stratification inspector
│       │   │   ├── OceanGlobe.tsx              # Interactive 3D Cesium/Canvas globe wrapper
│       │   │   ├── DepthSlider.tsx             # Vertical depth level selector
│       │   │   ├── TimeSlider.tsx              # Temporal playback & step slider
│       │   │   ├── DepthSliceLegend.tsx        # Scientific colorbar legend
│       │   │   ├── LocationInspector.tsx       # Lat/Lon/Depth coordinate HUD card
│       │   │   └── depth-slice/                # 3D Subsurface WebGL Modules
│       │   │       ├── DepthSliceStandalone.tsx # Three.js cylinder/cuboid 3D renderer
│       │   │       ├── DepthSliceSideTab.tsx    # Side control panel for slice parameters
│       │   │       └── StandaloneDepthSliceViewer.tsx # Fullscreen slice visualizer
│       │   │
│       │   └── ui/                     # Primary Application Pages & UI Primitives
│       │       ├── landing-page.tsx            # / route — Master Workbench & Globe preview
│       │       ├── details-page.tsx            # /details route — Maritime Hazard Dossier
│       │       ├── depth-slice-page.tsx        # /depth-slice route — Full Three.js 3D volume
│       │       ├── operations-page.tsx         # /operations route — Tactical Nav Console
│       │       ├── about-page.tsx              # /about route — Institutional Methodology
│       │       ├── app-navbar.tsx              # Universal top navigation header
│       │       ├── flow-field-background.tsx   # Ambient streamlet flow background
│       │       ├── maritime-pattern.tsx        # Navigational grid & bathymetric contour pattern
│       │       ├── globe.tsx                   # CSS 3D Earth Globe component
│       │       └── button.tsx                  # Base button primitive
│       │
│       ├── lib/                        # Core Utilities & Domain Algorithms
│       │   ├── maritimeHazardAnalytics.ts      # Risk thresholds & 10-parameter metrics
│       │   ├── coordinates.ts                  # Coordinate system conversions
│       │   ├── export/
│       │   │   └── missionDossierPdf.ts        # Client-side PDF mission dossier generator
│       │   └── ocean/
│       │       ├── anomalyEngine.ts            # Mathematical error & bias formulas
│       │       ├── colorScales.ts              # 8 scientific oceanographic colormaps
│       │       ├── regions.ts                  # Indian Ocean bounding boxes & polygons
│       │       └── variables.ts                # Physical variable limits & unit definitions
│       │
│       ├── services/                   # Data Access Services
│       │   ├── inSituSensorData.ts             # 16 curated in-situ platforms & profile curves
│       │   ├── oceanApi.ts                     # REST client for FastAPI backend
│       │   └── mockOceanData.ts                # Deterministic offline fallback datasets
│       │
│       ├── store/
│       │   └── useOceanStore.ts                # Zustand global state store
│       │
│       └── workers/                    # High-Performance Web Workers
│           ├── isosurface.worker.ts            # Off-thread Marching Cubes isosurface extraction
│           ├── sliceDecoder.worker.ts          # Off-thread 3D volume slice binary decoder
│           └── vectorProcessor.worker.ts       # Off-thread vector field interpolation
│
├── backend/                            # Python FastAPI Backend & Data Fabric
│   ├── main.py                         # Root server entrypoint
│   ├── requirements.txt                # Python package manifest
│   ├── run_all.py                      # Master pipeline execution script
│   │
│   ├── apps/api/leher/                 # Modular FastAPI Application
│   │   ├── main.py                     # API router aggregation & CORS middleware
│   │   ├── config.py                   # Environment & dataset path configs
│   │   ├── core/
│   │   │   └── arrow_encoder.py        # Apache Arrow zero-copy binary encoder
│   │   └── routers/
│   │       ├── catalog.py              # Variable inventory & dataset metadata
│   │       ├── slices.py               # 3D depth slice subsetting endpoints
│   │       ├── vectors.py              # Current & wind velocity vector endpoints
│   │       └── ml.py                   # Cyclone, surge, and safe zone inference
│   │
│   ├── fabric/                         # Data Fabric & Storage Layer
│   │   ├── datasets/glorys/            # Copernicus GLORYS12V1 NetCDF4/Zarr stores
│   │   └── ml/                         # Historical cyclone tracks & GeoJSON safe zones
│   │
│   └── services/jal-chakra/            # Operational Machine Learning Pipeline
│       ├── core/
│       │   ├── feature_engineering.py  # Surface wind shear, SST anomalies, SLP extraction
│       │   ├── train_cyclone_model.py  # XGBoost cyclone classification training
│       │   ├── train_surge_model.py    # XGBoost storm surge regressor training
│       │   ├── safe_zones.py           # Potential Fishing Zone GeoJSON generator
│       │   ├── ecosystem.py            # Coral bleaching & HAB ecosystem health engine
│       │   ├── voice_advisory.py       # Automated text-to-speech advisory generator
│       │   └── rakshak.py              # Full inference orchestrator
│       └── plugins/                    # Extensible sensor plugins
│           ├── copernicus/
│           └── argo/
│
├── docs/                               # Comprehensive Platform Documentation
│   ├── LEHER_SOLUTION_OFFERINGS_PS26067.md # Master 10-requirement SIH compliance audit
│   ├── LEHER_RESPONSIVE_MASTER_PLAN.md # Multi-device responsive design blueprint
│   ├── BACKEND_FRONTEND_CONTRACT.md    # API schemas & data protocols
│   ├── PROJECT_OVERVIEW.md             # In-depth architectural knowledge base
│   ├── MLguide.md                      # Machine learning architecture guide
│   └── datasets_list.md                # Oceanographic dataset inventory
│
└── scripts/                            # Operational Scripts
    ├── download_glorys_test.py         # Copernicus GLORYS12V1 3D subset downloader
    └── validate_glorys_test.py         # xarray NetCDF verification script
```

---

## 9. DATA SOURCES & SCIENTIFIC INGESTION

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SCIENTIFIC DATA INVENTORY                         │
├──────────────────────────┬──────────────────────────────────────────────────┤
│ Copernicus Marine Service│ GLORYS12V1 Global Ocean Physics Reanalysis       │
│ (CMEMS)                  │ • Product: GLOBAL_MULTIYEAR_PHY_001_030          │
│                          │ • 50 vertical depth levels (0.49m to 5,728m)     │
│                          │ • 1/12° (~8 km) horizontal resolution            │
│                          │ • Parameters: thetao, so, uo, vo, mlotst, zos    │
├──────────────────────────┼──────────────────────────────────────────────────┤
│ Argo Global Data Assembly│ International Argo Autonomous Profiling Program  │
│ Centre (GDAC)            │ • In-situ CTD vertical profiles down to 2,000m   │
│                          │ • Real-time pings from Arabian Sea & Bay of Bengal│
├──────────────────────────┼──────────────────────────────────────────────────┤
│ INCOIS OMNI Moored Buoys │ Ocean Moored Buoy Network for Northern Indian    │
│ & Underwater Gliders     │ Ocean (MoES/INCOIS) surface met + CTD chains     │
├──────────────────────────┼──────────────────────────────────────────────────┤
│ NOAA / ESR OSCAR         │ Ocean Surface Current Analysis Real-time         │
│                          │ • 0.33° surface velocity vector components       │
├──────────────────────────┼──────────────────────────────────────────────────┤
│ NWS / NCEP GFS           │ Global Forecast System 10m Surface Wind Vectors  │
├──────────────────────────┼──────────────────────────────────────────────────┤
│ GEBCO 2023               │ General Bathymetric Chart of the Oceans          │
│                          │ • 15-arcsecond global relief and bathymetry grid │
├──────────────────────────┼──────────────────────────────────────────────────┤
│ NOAA IBTrACS & IMD       │ International Best Track Archive for Climate     │
│ Best Track               │ Stewardship historical North Indian Ocean cyclones│
└──────────────────────────┴──────────────────────────────────────────────────┘
```

---

## 10. INSTALLATION & LOCAL DEVELOPMENT

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

### Step 2: Frontend Setup & Execution
The web application is located inside the `frontend/` directory:
```bash
# Navigate to frontend
cd frontend

# Install Node dependencies
npm install

# Start the Vite local development server
npm run dev
```

Open **`http://localhost:5173`** in your browser.

To verify the production build:
```bash
# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

### Step 3: Backend Setup & Execution (Optional for Full Data Fabric)
To run the local scientific data engine and ML inference server:
```bash
# Navigate to backend from root
cd ../backend

# Create a virtual environment
python -m venv venv

# Activate virtual environment
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On Linux / macOS:
source venv/bin/activate

# Install required Python scientific packages
pip install -r requirements.txt

# Launch FastAPI server with auto-reload
uvicorn apps.api.leher.main:app --reload --host 0.0.0.0 --port 8000
```
- **Backend Base URL**: `http://localhost:8000`
- **Interactive Swagger Documentation**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`

---

## 11. API SPECIFICATION & REST ENDPOINTS

The FastAPI backend exposes clean, OpenAPI-compliant endpoints:

### 1. Catalog & Inventory
- **`GET /api/v1/catalog`**: Returns all available datasets, vertical depth levels, bounding box coordinates, and temporal ranges.
- **`GET /api/v1/health`**: System health status, memory utilization, and active Zarr store connections.

### 2. 3D Volumetric Depth Slices
- **`GET /api/v1/model/slices/depth`**: Subsets horizontal scalar fields ($X, Y$) at a requested depth level ($Z$).
  - *Query Parameters*: `depth` (float, meters), `variable` (`temperature`, `salinity`), `bbox` (`minLon,minLat,maxLon,maxLat`).
  - *Response*: Apache Arrow IPC binary stream or JSON array.
- **`GET /api/v1/model/slices/transect`**: Subsets vertical cross-sections across arbitrary coordinate pairs.

### 3. Vector Fields
- **`GET /api/v1/vectors/currents`**: Subsets eastward ($u$) and northward ($v$) current velocity vectors.
- **`GET /api/v1/vectors/winds`**: Subsets 10m surface atmospheric wind velocity vectors.

### 4. Machine Learning & Hazards
- **`GET /api/v1/ml/cyclone/inference`**: XGBoost cyclone categorization, center pressure, and track coordinates.
- **`GET /api/v1/ml/surge/predict`**: Storm surge inundation height prediction in meters above astronomical tide.
- **`GET /api/v1/ml/fishing-zones`**: OGC GeoJSON FeatureCollection of safe/caution/hazard fishing corridors.

---

## 12. MULTI-DEVICE RESPONSIVE ARCHITECTURE

Leher implements the **Leher Responsive Master Plan** ([`docs/LEHER_RESPONSIVE_MASTER_PLAN.md`](docs/LEHER_RESPONSIVE_MASTER_PLAN.md)) to guarantee flawless execution across every device tier:

```
┌─────────────────┬────────────────────────────────────────────────────────┐
│ Viewport Tier   │ Responsive Optimization Strategy                       │
├─────────────────┼────────────────────────────────────────────────────────┤
│ Mobile Portrait │ • Single-column stacked layout                         │
│ (< 480px)       │ • Off-screen slide-over drawers for 3D slice controls  │
│                 │ • Touch targets ≥ 44×44px (WCAG 2.1 AA)                │
│                 │ • Particle counts dynamically scaled down (zero lag)   │
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

## 13. PERFORMANCE ENGINEERING & WEB WORKERS

To render dense 4D oceanographic arrays in consumer web browsers without UI stutter:

1. **Dedicated Web Workers (`frontend/src/workers/`)**:
   - `sliceDecoder.worker.ts`: Decodes binary Apache Arrow and NetCDF array buffers into 2D scalar matrices off the main thread.
   - `isosurface.worker.ts`: Computes Marching Cubes isosurfaces for 3D thermoclines without dropping frame rates.
   - `vectorProcessor.worker.ts`: Interpolates vector velocity fields onto irregular geographical projections asynchronously.
2. **GPU Texture Streaming**: Uses WebGL floating-point textures to stream scalar temperature and salinity fields directly into Three.js fragment shaders.
3. **Adaptive Particle Pools**: Dynamic streamlet particle count throttling based on client GPU capabilities (1,000 particles on mobile $\rightarrow$ 3,500 particles on high-end desktop).
4. **Fast Production Bundling**: Verified Vite 6 build compiling TypeScript into optimized production chunks in under 4 seconds.

---

## 14. SECURITY, GOVERNANCE & CF-1.8 COMPLIANCE

- **Zero Hardcoded Secrets**: All API keys, Copernicus credentials, and internal endpoints are managed via environment variables and `.gitignore` policies.
- **Strict Data Provenance**: Every metric in the platform includes traceable source metadata (Provider, Dataset ID, Resolution, Processing Level, and Last Updated Timestamp).
- **CF-1.8 & Open Standards**: All ingested NetCDF datasets conform to Climate and Forecast (CF-1.8) metadata conventions and standard SI units (Kelvin/Celsius, PSU, m/s, meters).
- **Privacy & Telemetry**: Zero tracking scripts, cookies, or third-party behavioral analytics.

---

## 15. VERIFICATION, TESTING & BUILD BENCHMARKS

- **Production Build Benchmark**:
  ```bash
  npm --prefix frontend run build
  ```
  ```
  vite v6.4.3 building for production...
  ✓ 2425 modules transformed.
  rendering chunks...
  dist/assets/sliceDecoder.worker-CfjYmGQe.js       0.60 kB
  dist/assets/vectorProcessor.worker-BIaJx-f7.js    0.71 kB
  dist/index.html                                   1.77 kB │ gzip:   0.72 kB
  dist/assets/about-page-fFsirY-V.css               9.26 kB │ gzip:   2.03 kB
  dist/assets/index-D9C3IY2Q.css                  102.85 kB │ gzip:  16.33 kB
  dist/assets/operations-page-0UxnDwCJ.js          23.89 kB │ gzip:   6.21 kB
  dist/assets/missionDossierPdf-DlXBGr5i.js        26.35 kB │ gzip:   8.99 kB
  dist/assets/about-page-DXvgpp7k.js               32.12 kB │ gzip:   7.83 kB
  dist/assets/details-page-DqEn6uJL.js             33.99 kB │ gzip:   7.61 kB
  dist/assets/ModelVsObsComparator-C0OaqAuK.js     41.62 kB │ gzip:  11.52 kB
  dist/assets/depth-slice-page-Ic2sVjfz.js        112.50 kB │ gzip:  28.01 kB
  dist/assets/index-9IBXxQaE.js                   458.87 kB │ gzip: 142.36 kB
  dist/assets/three-vendor-6fqcgEMP.js            524.43 kB │ gzip: 131.85 kB
  ✓ built in 3.84s
  ```
- **Code Quality & Linting**: Verified clean with Oxlint (`npm --prefix frontend run lint`).
- **Git Status**: Clean working directory on branch `main` synchronized with `origin/main`.

---

## 16. OPERATIONAL USE CASES

- **Disaster Management (INCOIS / NDMA)**: Early warning for cyclogenesis, coastal storm surge heights, and evacuation corridor planning.
- **Naval Defense & Maritime Security**: Tactical submarine stealth assessment using the SOFAR acoustic channel axis and sonar speed of sound profile.
- **Commercial Maritime Routing**: Weather routing, fuel consumption optimization, and drift leeway estimation along International Shipping Lanes.
- **Sustainable Fisheries**: Identification of ocean thermal fronts and Potential Fishing Zones (PFZ) for artisanal and commercial fishermen.
- **Academic & Scientific Research**: Analysis of climate change impacts, marine heatwaves, and seasonal monsoon upwelling dynamics.

---

## 17. PROJECT ROADMAP

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

## 18. ACKNOWLEDGEMENTS & SCIENTIFIC REFERENCES

### Sponsoring & Supporting Organizations
- **Indian National Centre for Ocean Information Services (INCOIS)**, Hyderabad, India.
- **Ministry of Earth Sciences (MoES)**, Government of India.
- **Smart India Hackathon (SIH)**, Ministry of Education's Innovation Cell.

### Scientific Data Providers
- **Copernicus Marine Service (CMEMS)**: Global Ocean Physics Reanalysis (GLORYS12V1, DOI: [10.48670/moi-00021](https://doi.org/10.48670/moi-00021)).
- **Argo GDAC / IFREMER**: International Argo Profiling Float Program ([https://argo.ucsd.edu](https://argo.ucsd.edu)).
- **NOAA / Earth & Space Research (ESR)**: OSCAR Ocean Surface Current Analysis Real-time.
- **GEBCO**: General Bathymetric Chart of the Oceans ([https://www.gebco.net](https://www.gebco.net)).
- **NOAA NCEI**: International Best Track Archive for Climate Stewardship (IBTrACS).

---

<p align="center">
  <img src="logo.png" width="60" height="60" alt="Leher Logo" style="border-radius: 50%; box-shadow: 0 0 24px rgba(6, 182, 212, 0.4);" /><br>
  <strong>Leher (लहर) — 3D Ocean Intelligence &amp; Maritime Hazard Visualization Platform</strong><br>
  <em>Developed for Smart India Hackathon (SIH) Problem Statement 26067</em><br>
  <strong>INCOIS • Ministry of Earth Sciences • Government of India</strong>
</p>
