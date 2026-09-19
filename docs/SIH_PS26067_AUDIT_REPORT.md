# SIH Problem Statement 26067 — Comprehensive Audit Report & Phase-Wise Roadmap

> **Problem Statement ID**: 26067  
> **Title**: *Develop a web-based interactive 3D visualization platform that integrates numerical ocean model outputs and in-situ observations.*  
> **Organization**: Indian National Centre for Ocean Information Services (**INCOIS**), Ministry of Earth Sciences (**MoES**), Ocean Valley  
> **Category / Theme**: Software • Disaster Management  
> **Audit Date**: September 2026  
> **Audited Repository**: [Leher (DNA-Coded/LEHER)](https://github.com/DNA-Coded/LEHER)  
> **Production URLs**: [https://leher-3d.vercel.app/](https://leher-3d.vercel.app/) • [https://leher-sih.vercel.app/](https://leher-sih.vercel.app/)

---

## Executive Summary

This audit evaluates the **Leher** platform directly against the official requirements, specifications, and dataset mandates defined in the **INCOIS SIH PS 26067** document.

The project currently demonstrates **exceptional frontend presentation, high-tech UI/UX aesthetics, and strong prototype readiness**. It successfully fulfills the vision of a browser-native 3D ocean intelligence platform. However, to secure a top-tier winning score before INCOIS and MoES evaluators, specific scientific, architectural, and data integration gaps must be addressed—primarily transitioning from isolated visual components to a unified 3D geospatial environment co-displaying numerical grids with multi-sensor in-situ networks (Argo, Gliders, CTDs, and Moorings).

---

## 1. Compliance Scorecard against PS 26067 Mandates

| Requirement Domain | Official PS 26067 Specification | Current Project Status | Score |
| :--- | :--- | :--- | :---: |
| **1. 3D Volumetric Rendering** | Interactive 3D visualization across full water column; depth-slice views, isosurface extraction, time-step animation via WebGL/Three.js/Cesium. | 🟡 **Partially Implemented** (Three.js depth slice active on separate route; isosurface worker unlinked; surface currents on D3 iframe). | **65%** |
| **2. In-Situ Instrument Overlay** | Co-display of Argo float, Glider profile, CTD, and BGC data with accurate geospatial markers; clickable depth-vs-variable profile charts with timestamps. | 🟡 **Partially Implemented** (Argo Float #2902345 active; Glider, CTD transects, and BGC sensors missing from live map). | **50%** |
| **3. Multi-Format Data Ingestion** | Automated parsers for NetCDF (PyNIO / xarray) and delimited text formats; modular design for adding variables with minimal code changes. | 🟡 **Partially Implemented** (xarray + NetCDF4 backend implemented in git history; live Vercel frontend relies on client physics simulation). | **60%** |
| **4. Customizable Colorbars & Controls** | Dynamic colorbar editor (color palette, min/max range, log/linear scale), variable selector, layer opacity, vertical exaggeration slider. | 🟡 **Partially Implemented** (Variable selector, opacity, fixed color scales, and 120x exaggeration exist; interactive colorbar editor & log scale missing). | **55%** |
| **5. Web-Based Scalable Architecture** | Modern JS frontend with lightweight REST / OPeNDAP API backend; deployable on INCOIS infrastructure without client dependencies. | 🟢 **Accurate / Strong** (React 19 + TypeScript + Vite single-page app; FastAPI backend defined; OPeNDAP proxy needed). | **80%** |
| **6. Extensible Sensor & ML Design** | Plugin architecture for future sensors (CTD, moorings, HF-Radar, ADCP), new ocean variables, and machine learning-derived products. | 🟢 **Accurate / Ahead** (Lahar V2 XGBoost ML inference engine active; sensor plugin interfaces need formalization). | **75%** |
| **7. Scientific Standards & Provenance** | Compliance with CF Conventions for NetCDF and OGC WMS/WCS standards; traceable units and provenance metadata. | 🟢 **Accurate** (`registry.ts` tracks CF standard names, units, and sources; NetCDF validation script passes). | **75%** |
| **8. Science Communication & Outreach** | Accessible to non-specialists, students, and policymakers; transforming complex ocean data into intuitive 3D experiences. | 🟢 **Exceeds Expectations** (Stunning cybernetic UX, 4-step mission workflow, maritime risk index SAFE/ADVISORY/HAZARD, tactical ship guidance). | **95%** |
| **Overall SIH Readiness Score** | **Aggregated Technical & Scientific Compliance** | 🟡 **Strong Prototype with Strategic Action Items** | **69.3%** |

---

## 2. Clause-by-Clause Gap Analysis

### Clause 1: 3D Volumetric Rendering
> *"Interactive visualization of ocean model fields (temperature, salinity, current vectors) across the full water column, with support for depth-slice views, isosurface extraction, and time-step animation using WebGL / Three.js or Cesium.js."*

* **What is ACCURATE**:
  - The [depth-slice-page.tsx](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/frontend/src/components/ui/depth-slice-page.tsx) uses Three.js WebGL to render an interactive vertical water column across 13 standard depth levels (0m to 2,000m).
  - Smooth OrbitControls, camera zooming, and animated slice pull-out extraction with dynamic holographic HUD and tether lines.
  - Surface wave displacement swells and directional particle currents inside the water column.
* **What is PARTIAL**:
  - **Iframe Separation**: The surface vector particle engine runs inside an isolated iframe (`public/earth/`) using 2D Canvas + D3 v3, while the 3D depth slice lives on `/depth-slice`. They are not yet rendered in a single unified WebGL context.
  - **Time-Step Animation**: The UI includes a `TimeSlider` component and multi-timezone clock, but the underlying data remains a static 1-day snapshot (`2020-01-01`). There is no multi-day temporal looping of 3D volumetric fields.
* **What is MISSING**:
  - **Isosurface Extraction**: Although [isosurface.worker.ts](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/frontend/src/workers/isosurface.worker.ts) exists, there is no interactive 3D isosurface mesh (e.g., extracting the 20°C thermocline surface or 35 PSU isohaline barrier layer in 3D over the globe).
  - **Direct Volumetric Raymarching**: Rendering 3D scalar density clouds directly on top of the spherical globe mesh.

---

### Clause 2: In-Situ Instrument Data Overlay
> *"Co-display of Argo float, Glider profile, CTD and BGC data using geospatially accurate markers; users can click a float/glider to inspect a depth-vs-variable profile chart with timestamps."*

* **What is ACCURATE**:
  - Argo float `#2902345` (Lat 15.4°N, Lon 71.2°E in the Arabian Sea) is integrated into the metadata catalog and backend data loaders.
  - Clickable inspection charts render depth-vs-variable profiles (`ArgoProfileChart.tsx`, `ArgoFloatModal.tsx`, `LocationInspector.tsx`).
* **What is PARTIAL**:
  - Only a single float or simulated point is visible on the operations workbench map at a time, rather than a dense fleet of real-time Indian Ocean floats.
* **What is MISSING**:
  - **Underwater Glider Profiles**: Dataset link `ftp://ftp.ifremer.fr/ifremer/glider/v2/` requires sawtooth-pattern glider trajectories and dive-profile displays.
  - **CTD Ship Transects**: Co-display of ship-based CTD station lines across the Indian Ocean (e.g., Sagar Kanya / Sagar Nidhi cruise tracks).
  - **Biogeochemical (BGC) Sensors**: Dissolved Oxygen ($O_2$), pH, Nitrate ($NO_3$), and fluorescence chlorophyll sensor channels.

---

### Clause 3: Multi-Format Data Ingestion
> *"Automated parsers for NetCDF (via PyNIO / xarray backend) and delimited text formats, with a modular architecture that allows new variables or data sources to be added with minimal code change."*

* **What is ACCURATE**:
  - Automated Python script [scripts/download_glorys_test.py](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/scripts/download_glorys_test.py) and validation script [scripts/validate_glorys_test.py](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/scripts/validate_glorys_test.py) parse multi-variable NetCDF4 files with 50 vertical depth levels using `xarray` and `netCDF4`.
  - Frontend GRIB-JSON loaders (`gfsTemperature.ts`, `oscarCurrents.ts`) parse flattened binary grid dumps.
* **What is PARTIAL**:
  - The live Vercel deployment operates serverless without the Python backend running in production. It relies on deterministic client-side equations in `oceanPredictionService.ts`. While this ensures zero latency and 100% uptime, evaluators may expect live server-side subsetting.
* **What is MISSING**:
  - **Delimited Text / CSV Ingestion**: Parsers for ASCII/CSV data streams (e.g., INCOIS OMNI / RAMA mooring buoy time series).
  - PyNIO is officially deprecated by NCAR; `xarray` with `netCDF4` or `h5netcdf` engine is the modern replacement and should be highlighted.

---

### Clause 4: Customizable Colorbar & Variable Controls
> *"Dynamic colorbar editor (color palette, min/max range, log/linear scale), variable selector, layer opacity controls, and vertical exaggeration slider for intuitive depth perception."*

* **What is ACCURATE**:
  - Variable selector allows toggling between Potential Temperature, Practical Salinity, Velocity, and Chlorophyll.
  - Layer opacity controls exist in `useOceanStore.ts` and `OpacityControls.tsx`.
  - Vertical exaggeration slider (120x) exists in the store and in the 3D elevation layer.
  - Scientifically calibrated multi-stop color ramps (Thermal, Haline, Turbo, Chlorophyll).
* **What is PARTIAL**:
  - The colorbars are visually static gradients with pre-set ranges (e.g., Temperature: 1.5°C to 35°C; Salinity: 33 to 36.8 PSU).
* **What is MISSING**:
  - **Interactive User Colorbar Editor**: Sliders to adjust min/max clamp values dynamically on the fly.
  - **Logarithmic Scale Toggle**: Essential for Chlorophyll-a concentration, which spans exponential biological ranges ($0.01\text{ to }10\text{ mg/m}^3$). A linear scale washes out oligotrophic open-ocean waters.

---

### Clause 5: Scalable Architecture & OPeNDAP Integration
> *"Frontend built on modern JavaScript frameworks with a lightweight REST/OPeNDAP API backend, enabling deployment on INCOIS infrastructure without any client-side dependencies."*

* **What is ACCURATE**:
  - Modern React 19 + TypeScript + Vite 6 frontend with zero desktop plugins or client-side requirements. Runs smoothly across Chrome, Edge, Firefox, and mobile browsers.
  - FastAPI backend architecture designed with clean Pydantic request/response schemas.
* **What is MISSING**:
  - **OPeNDAP Client/Proxy Integration**: INCOIS hosts its primary model and observation archives via THREDDS / Live Access Server (`https://las.incois.gov.in/`). Integrating an OPeNDAP remote stream reader in the backend allows querying remote slices without downloading full NetCDF files locally.

---

### Clause 6: Extensible Design & ML Products
> *"Plugin-style module for future integration of additional sensors (e.g., CTDs, moorings, HF-radar, ADCP, etc.), new ocean model variables, and machine-learning derived products."*

* **What is ACCURATE**:
  - **Lahar ML Model (V2)**: 10.7 MB Multi-Output XGBoost Regressor trained on Indian Ocean reanalysis data, predicting 3D deep-ocean parameters in <15ms.
  - Standardized registry singleton (`registry.ts`) maps variables, units, and provenance.
* **What is PARTIAL / MISSING**:
  - Need a formalized **Sensor Plugin Registry Interface** where adding an HF-Radar surface current grid or an ADCP mooring acoustic profile is as simple as dropping a JSON schema or connector plugin.

---

## 3. Dataset Audit: Required vs. Current Status

The official PS 26067 document specifies four core dataset links:

| PS Dataset Source | URL / Protocol | What Leher Currently Has | Action Required |
| :--- | :--- | :--- | :--- |
| **a. Numerical Ocean Model Outputs** | `https://las.incois.gov.in/` & `https://data.marine.copernicus.eu/product/GLOBAL_MULTIYEAR_PHY_001_030` | ✅ Copernicus GLORYS12V1 regional 3D subset (385 MB NetCDF, 50 depth levels) downloaded & validated. | Add a live proxy connector or sample NetCDF from INCOIS LAS (ROMS model output). |
| **b. Argo Global Data** | `ftp://ftp.ifremer.fr/ifremer/argo` (GDAC) | 🟡 Single float NetCDF cast (`#2902345`, Arabian Sea) ingested. | Ingest a multi-float index file (`ar_index_global_prof.txt`) to show 20+ active floats across the Indian Ocean basin. |
| **c. Glider Data** | `ftp://ftp.ifremer.fr/ifremer/glider/v2/` | 🔴 Missing (no glider trajectory files currently parsed). | Download and parse 1–2 real glider NetCDF missions (e.g., Bay of Bengal glider transects) with depth-time sawtooth curves. |
| **d. In-situ Collections (Moorings/CTD)** | INCOIS In-situ Data Portals (OMNI, RAMA, coastal tide gauges) | 🟡 Generic fallback telemetry cards. | Add real or structured ASCII/CSV ingest for 2 INCOIS OMNI moored buoys (e.g., BD08, AD01) with surface meteorology and subsurface thermistor chains. |

---

## 4. Architectural Trade-Offs & Current Vulnerabilities

Before presenting to technical judges, the team must be fully transparent about current architectural trade-offs:

1. **Client-Side Simulation vs. Live Serverless Backend**:
   - *Current Reality*: The live Vercel app utilizes `oceanPredictionService.ts` to compute ocean variables client-side via continuous thermodynamic approximations.
   - *Advantage*: Zero server hosting costs, instant 0ms latency, zero downtime during judging.
   - *Risk*: Evaluators who ask "Is this running live xarray subsetting on an active NetCDF file on the server right now?" will discover that the production Vercel app does not host the 385 MB NetCDF or the Python VM.
   - *Remedy*: Maintain dual-mode operation (`oceanDataService.ts`). Keep the client-side simulation as a zero-latency fallback, but host the FastAPI backend on a free/affordable cloud instance (e.g., Render, Railway, AWS EC2, or local localhost during demo) with `VITE_API_BASE_URL` pointing to it.

2. **Iframe vs. Native WebGL Context**:
   - *Current Reality*: The landing page and operations workbench embed `/earth/index.html` inside an `<iframe>`.
   - *Advantage*: High-performance vector particle rendering across 9 D3 projections with zero React re-render overhead.
   - *Risk*: Evaluators may perceive it as an embedded third-party tool rather than a unified WebGL application.
   - *Remedy*: Emphasize the bidirectional `postMessage` protocol in the demo, or bring the Three.js 3D depth slice viewer into a prominent split/picture-in-picture mode within the main operations console.

3. **Temporal Dimension (Single Snapshot)**:
   - *Current Reality*: NetCDF test data represents a single daily time step (`2020-01-01`).
   - *Remedy*: Add at least 3–5 sequential daily snapshots or a seasonal cycle (Monsoon vs. Pre-Monsoon) to demonstrate time-step stepping.

---

## 5. Phase-Wise Implementation Roadmap

To transition Leher from **Prototype** to **Competition-Winning Gold Standard**, implement the following 5 phases:

```
[Phase 1: In-Situ Sensor Suite] ──────> [Phase 2: Colorbar & Log Scale] ──────> [Phase 3: INCOIS OPeNDAP]
  • Argo Multi-Float Network              • Min/Max Dynamic Sliders               • Connect las.incois.gov.in
  • Glider Sawtooth Transects             • Logarithmic Chlorophyll Scale         • OPeNDAP Remote Slicing
  • OMNI Moored Buoy Series               • Colormap Switcher (Viridis/Jet/Turbo) • NetCDF Streaming
             │                                       │                                       │
             └───────────────────────────────────────┴───────────────────────────────────────┘
                                                     │
                                                     v
                                [Phase 4: Unified 3D Volumetric Globe]
                                  • Co-display Floats & 3D Column on Globe
                                  • Interactive 20°C Isosurface Mesh
                                  • Multi-Step Temporal Playback (Monsoon Cycle)
                                                     │
                                                     v
                                [Phase 5: Operational Decision Support]
                                  • Model vs. Obs Anomaly (Δ = Model - Float)
                                  • INCOIS Cyclone / Marine Hazard Alerts
                                  • Exportable Automated Mission Dossier PDF
```

---

### 🚀 Phase 1: High-Impact In-Situ Multi-Sensor Expansion
**Goal**: Satisfy the "Co-display of Argo, Glider, CTD, and BGC data" mandate.

1. **Argo Multi-Float Network**:
   - Add a dataset of 15–20 active Argo floats across the Arabian Sea and Bay of Bengal with real WMO IDs (e.g., #2902345, #2902346, #2902347).
   - Render pulsing marker pins on the interactive map/globe.
   - Clicking a float opens a detailed modal displaying:
     - Float trajectory (GPS drift path over past 30 days).
     - Vertical Temperature & Salinity profile chart.
     - Measurement timestamps and calibration quality flags (QC flags 1–4).
2. **Underwater Glider Mission**:
   - Create a dedicated Glider tab in the operations HUD.
   - Display a simulated/real glider mission track (e.g., Bay of Bengal coastal transect) with sawtooth dive profiles (0m $\rightarrow$ 1,000m $\rightarrow$ 0m).
3. **INCOIS Moored Buoy Network (OMNI / RAMA)**:
   - Add markers for INCOIS OMNI buoys (e.g., `AD01` in Arabian Sea, `BD08` in Bay of Bengal).
   - Display dual surface meteorology (wind speed, air temp, atmospheric pressure) and subsurface thermistor chain data down to 500m.

---

### 🎨 Phase 2: Dynamic Colorbar & Oceanographic Control Suite
**Goal**: Fulfill the "Customizable Colorbar & Variable Controls" requirement.

1. **Interactive Colorbar Editor**:
   - Build a `ColorbarEditor.tsx` component in the operations panel:
     - **Colormap Palette Selector**: Switch between `Thermal`, `Haline`, `Turbo`, `Viridis`, `Cool-Warm`, and `Deep Sea`.
     - **Range Sliders**: Interactive double-handled slider to clamp min/max thresholds (e.g., adjust temperature bounds from [10°C, 32°C] to [24°C, 30°C] to highlight thermal fronts).
     - **Scale Type Toggle**: Seamlessly switch between **Linear** and **Logarithmic** scales.
2. **Logarithmic Scale for Chlorophyll**:
   - Implement logarithmic color mapping:
     $$C_{\text{norm}} = \frac{\log_{10}(C) - \log_{10}(C_{\min})}{\log_{10}(C_{\max}) - \log_{10}(C_{\min})}$$
   - Allows low-chlorophyll open-ocean waters ($0.05\text{ mg/m}^3$) and intense coastal blooms ($5.0\text{ mg/m}^3$) to be visualized simultaneously without clipping.
3. **Enhanced Vertical Exaggeration Slider**:
   - Bind the vertical exaggeration slider directly to the Three.js depth column ($50\times \rightarrow 300\times$) so judges can interactively stretch shallow thermocline layers.

---

### 🌐 Phase 3: INCOIS LAS & OPeNDAP Stream Integration
**Goal**: Connect directly to INCOIS infrastructure and open data portals.

1. **INCOIS LAS / OPeNDAP Connector**:
   - Implement a backend route `/api/ocean/las_stream` that queries INCOIS Live Access Server (`https://las.incois.gov.in/`) or Copernicus Marine OPeNDAP servers.
   - Use `xarray.open_dataset(opendap_url)` to fetch slices remotely without full downloads:
     ```python
     # Example OPeNDAP Remote Subsetting
     ds = xarray.open_dataset("https://las.incois.gov.in/dods/incois_roms_daily", engine="netcdf4")
     slice_data = ds["temp"].sel(lat=slice(10, 20), lon=slice(65, 75), depth=slice(0, 500)).to_dict()
     ```
2. **Delimited Text / CSV Ingestion Module**:
   - Build a generic CSV/ASCII parser in `backend/app/data/ascii_parser.py` capable of loading moored buoy observation tables with standard header formats.

---

### 🧊 Phase 4: Unified 3D Volumetric & Isosurface Globe Integration
**Goal**: Deliver the visual "WOW factor" expected of a flagship SIH entry.

1. **Isosurface Extraction (Thermocline 20°C Barrier)**:
   - Connect the existing `isosurface.worker.ts` to generate a 3D polygonal mesh of the **20°C Isotherm Surface** (the fundamental thermocline metric used by INCOIS for Tropical Cyclone Heat Potential / TCHP).
   - Render this undulating semi-transparent 3D surface underneath the ocean surface on the 3D globe.
2. **Multi-Step Temporal Playback**:
   - Package 4–8 sequential time steps (e.g., Pre-Monsoon May vs. Peak Southwest Monsoon July vs. Post-Monsoon October).
   - Allow pressing **Play** on the `TimeSlider` to watch surface currents reverse (Somali Current & East India Coastal Current reversal) and upwelling zones bloom in real time.

---

### 🛡️ Phase 5: Automated Model-Observation Anomaly & Decision Support
**Goal**: Realize the operational mandate for INCOIS forecasters.

1. **Automated Anomaly Engine**:
   - Compute model bias at runtime:
     $$\text{Bias}(z) = \text{Model}(lat, lon, z, t) - \text{Observation}_{\text{Argo}}(z, t)$$
   - Display a side-by-side **Model vs. Observed** anomaly curve in the inspection panel (e.g., *"Model overestimates mixed layer depth by +14.2m"*).
2. **One-Click Mission Briefing PDF Export**:
   - Add an **Export Mission Dossier** button on `/details` that compiles all locked coordinates, depth profiles, sonar ducting ranges, and risk badges into a downloadable PDF summary for naval / maritime operators.

---

## 6. Immediate Action Items (Next Steps for the Team)

| Priority | Task Description | Target File / Module | Expected Impact |
| :---: | :--- | :--- | :--- |
| **P0** | Add 15+ real Indian Ocean Argo float markers to the operations workbench with interactive profile charts. | `frontend/src/services/mockOceanData.ts`, `operations-page.tsx` | Directly resolves Clause 2 gap for evaluators. |
| **P1** | Add interactive Colorbar Editor with min/max clamp sliders and linear/logarithmic scale toggle. | `frontend/src/components/ocean/DepthSliceLegend.tsx`, `operations-page.tsx` | Completes Clause 4 requirement. |
| **P2** | Add a Glider Mission tab showing sawtooth dive profiles (0–1000m) in the Bay of Bengal. | `frontend/src/components/ui/operations-page.tsx`, `ArgoProfileChart.tsx` | Addresses PS dataset requirement (c). |
| **P3** | Add 2 INCOIS OMNI moored buoys (AD01 & BD08) with combined atmospheric/oceanic time series. | `frontend/src/lib/ocean/regions.ts`, `operations-page.tsx` | Directly aligns with INCOIS institutional assets. |
| **P4** | Host the FastAPI backend with Lahar ML model on a live URL and link `VITE_API_BASE_URL`. | `backend/`, `frontend/.env` | Validates live server-side scientific computing. |

---

## 7. Conclusion

Leher has already accomplished the hardest frontend and visualization challenges: delivering a smooth, aesthetically superior, multi-projection ocean workbench with real-time parameter simulation and Three.js depth slicing. 

By executing **Phases 1 through 3** (expanding the in-situ sensor fleet to include gliders and OMNI buoys, adding a dynamic colorbar editor with logarithmic scales, and documenting the INCOIS LAS / OPeNDAP connection), the team will have an **airtight, fully compliant, competition-winning submission** that precisely answers every requirement of SIH Problem Statement 26067.
