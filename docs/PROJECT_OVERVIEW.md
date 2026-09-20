# Leher — 3D Ocean Intelligence & Visualization Platform
### Comprehensive System Architecture, Codebase Map, and Developer Knowledge Base

> **Platform Version**: 2.0 (SIH PS 26067)  
> **Target Problem Statement**: Smart India Hackathon Problem Statement 26067 — *Interactive 3D Visualization Platform for Numerical Ocean Models and In-Situ Observations*  
> **Sponsoring Agency**: Indian National Centre for Ocean Information Services (**INCOIS**), Ministry of Earth Sciences (**MoES**), Government of India  
> **Production URLs**:
> - Primary Live Web App: [https://leher-sih.vercel.app/](https://leher-sih.vercel.app/)
> - GitHub Repository: [https://github.com/DNA-Coded/LEHER](https://github.com/DNA-Coded/LEHER)

---

## Table of Contents

1. [Executive Summary & Purpose](#1-executive-summary--purpose)
2. [Codebase Directory Structure](#2-codebase-directory-structure)
3. [Architecture & System Flow](#3-architecture--system-flow)
4. [Routing & Application Lifecycle](#4-routing--application-lifecycle)
5. [Key Components & User Interfaces](#5-key-components--user-interfaces)
6. [Visualization Engines](#6-visualization-engines)
7. [Oceanographic Data Engine & Services](#7-oceanographic-data-engine--services)
8. [Machine Learning Engine (Lahar V2)](#8-machine-learning-engine-lahar-v2)
9. [FastAPI Backend Specifications](#9-fastapi-backend-specifications)
10. [Coordinate Systems, Projections & Transformations](#10-coordinate-systems-projections--transformations)
11. [State Management (Zustand & React Hooks)](#11-state-management-zustand--react-hooks)
12. [Styling, Design System & Theming](#12-styling-design-system--theming)
13. [Build, Deployment & Configuration](#13-build-deployment--configuration)
14. [Developer Cheatsheet & Future Roadmap](#14-developer-cheatsheet--future-roadmap)

---

## 1. Executive Summary & Purpose

### What is Leher?
**Leher** (meaning *"Wave"* in Hindi) is a 3D ocean intelligence, spatial visualization, and maritime risk assessment platform. Built for INCOIS (Ministry of Earth Sciences, Govt. of India), it solves the challenge of visualizing complex 4-dimensional oceanographic datasets ($X$ Longitude, $Y$ Latitude, $Z$ Depth, $T$ Time) inside standard web browsers without requiring specialized GIS desktop software (such as Ocean Data View, ParaView, or MATLAB).

### Core Problem Solved
Traditional oceanographic workflows suffer from four major pain points:
1. **Massive Datasets**: Raw NetCDF4/Zarr hydrodynamic model files range from tens of gigabytes to terabytes, making client-side downloads impossible.
2. **Flattened 2D Representations**: Surface maps hide the vertical dimension where 90% of oceanic heat, acoustic channels, and thermocline dynamics exist.
3. **Siloed Models vs. Real Observations**: Numerical hydrodynamic models (Copernicus GLORYS12V1, INCOIS ROMS/MOM) are rarely co-visualized with physical *in-situ* observational networks (Argo floats, CTD casts, NOAA OSCAR surface current drift).
4. **Operator Friction**: Maritime crews, coast guards, and fisheries need immediate, actionable decision support (safe transit windows, drift leeway, engine cooling salinity, acoustic sound ducting) rather than deciphering raw NetCDF matrices.

### How Leher Solves This
- **Hybrid Visualization**: Combines a multi-projection vector particle canvas (NOAA OSCAR & GFS winds), an interactive 3D Earth Globe, and an independent Three.js WebGL 3D volumetric water column renderer.
- **Client-Side & Hybrid Prediction Engine**: Employs an ultra-fast Copernicus Marine parameter simulation engine (`oceanPredictionService.ts`) paired with an optional FastAPI xarray backend and a 10.7 MB XGBoost multi-output regressor for deep-ocean predictions.
- **Decision Intelligence**: Converts complex physical parameters into clear operational guidance (Plimsoll line buoyancy, sonar acoustic ducting, geoid anomalies, safe/caution/hazard badges).

---

## 2. Codebase Directory Structure

```
c:\Users\Arya Bhagat\Desktop\Sih\FR\
├── .env.local                    # Local Vercel authentication token
├── .gitignore                    # Git exclusions (*.nc, node_modules, dist, .env)
├── .npmrc                        # NPM configuration
├── .vercel/                      # Vercel project deployment cache
├── .vercelignore                 # Vercel bundle exclusions
├── README.md                     # Master project documentation (47KB)
├── package.json                  # Root monorepo / workspace script wrapper
├── package-lock.json             # Root package lockfile
├── vercel.json                   # Vercel SPA rewrites & static build configuration
├── logo.png                      # Leher official brand mark
│
├── dist/                         # Production output directory (synced from frontend/dist)
│
├── backend/                      # Python FastAPI Backend (Isolated for local scientific server)
│   └── (Contains xarray subsetting, NetCDF loaders, and ML inference routes)
│
└── frontend/                     # Active React 19 + TypeScript + Vite Application
    ├── .env                      # Local frontend environment variables (VITE_API_BASE_URL)
    ├── .env.example              # Template environment variables
    ├── .oxlintrc.json            # Fast Oxlint configuration
    ├── .vercelignore             # Frontend Vercel exclusions
    ├── components.json           # Shadcn/ui component configuration
    ├── index.html                # Vite HTML5 SPA entry point
    ├── package.json              # Frontend dependencies and build scripts
    ├── tsconfig.json             # TypeScript root project configuration
    ├── tsconfig.app.json         # TypeScript application config
    ├── tsconfig.node.json        # TypeScript Node/Vite build config
    ├── vite.config.ts            # Vite 6 config with Tailwind v4 and Earth route plugin
    │
    ├── globe/                    # Standalone 3D Bathymetry & Topography Globe
    │   ├── index.html            # ESRI ArcGIS 3D SceneView implementation
    │   ├── extreme-points.geojson# Geospatial feature layers
    │   ├── style.css             # Globe-specific styling
    │   └── utils/                # ExaggeratedElevationLayer custom shader extension
    │
    ├── public/                   # Static public assets
    │   ├── depth-slice.html      # Standalone single-file 3D Volumetric Depth Slice viewer
    │   ├── favicon.ico           # Application favicon
    │   ├── globe.jpeg            # High-resolution world texture
    │   ├── icons.svg             # SVG icon sprite sheet
    │   ├── logo.png              # Public brand asset
    │   │
    │   ├── globe/                # Mirrored static assets for /globe route
    │   └── earth/                # D3.js + HTML5 Canvas Particle Streamlet Engine
    │       ├── index.html        # Embedded iframe rendering canvas
    │       ├── server.js         # Optional local preview server
    │       ├── data/             # GRIB-JSON data files (OSCAR currents, GFS winds)
    │       ├── libs/             # D3 v3, TopoJSON, Underscore, When.js
    │       │   └── earth/1.0.0/  # earth.js (core render loop), globes.js (projections)
    │       └── styles/           # Canvas CSS, fonts, and controls styling
    │
    └── src/                      # React 19 Application Source Code
        ├── App.tsx               # Root view router (home, operations, depth-slice, details, about)
        ├── main.tsx              # React 19 DOM entry root (createRoot)
        ├── index.css             # Tailwind v4 theme, fonts, custom cybernetic utility classes
        │
        ├── assets/               # Local images and icons
        │
        ├── cesium/               # Cesium 3D Globe integration module
        │   ├── viewerManager.ts  # Cesium viewer singleton manager
        │   ├── materials/        # Custom GLSL ocean shader materials
        │   └── primitives/       # Depth slices, current vectors, point depth primitives
        │
        ├── components/
        │   ├── ocean/            # Ocean-specific visual components
        │   │   ├── ArgoFloatModal.tsx        # In-situ Argo float telemetry modal
        │   │   ├── ArgoProfileChart.tsx      # SVG temperature/salinity depth profile chart
        │   │   ├── ControlPanel.tsx          # Layer and projection control panel
        │   │   ├── DepthSlice.tsx            # Depth slice renderer wrapper
        │   │   ├── DepthSliceLegend.tsx      # Gradient colorbar legend
        │   │   ├── DepthSlider.tsx           # Vertical/horizontal depth level selector
        │   │   ├── GlobeOverlay.tsx          # Coordinate HUD overlay for 3D globe
        │   │   ├── LocationInspector.tsx     # Lat/Lon/Depth inspector card
        │   │   ├── OceanAnalysis.tsx         # Analytical dashboard container
        │   │   ├── OceanGlobe.tsx            # Cesium interactive ocean basin globe
        │   │   ├── OpacityControls.tsx       # Volume alpha & shader opacity controls
        │   │   ├── PointDepthPanel.tsx       # Point inspection telemetry side-panel
        │   │   ├── TimeSlider.tsx            # Temporal slider and play/pause controls
        │   │   ├── VariableSelector.tsx      # Temperature, Salinity, Velocity, Chlorophyll toggles
        │   │   └── depth-slice/              # Standalone & embedded 3D depth slice components
        │   │       ├── DepthSliceSideTab.tsx
        │   │       ├── DepthSliceStandalone.tsx
        │   │       └── StandaloneDepthSliceViewer.tsx
        │   │
        │   └── ui/               # Primary Page Views & Reusable UI Elements
        │       ├── about-page.tsx            # /about route — Mission story, problem, architecture
        │       ├── app-navbar.tsx            # Universal top navbar with active route indicators
        │       ├── button.tsx                # Base button component
        │       ├── card-curtain-reveal.tsx   # Interactive hover-reveal card
        │       ├── cyber-card.css            # Futuristic glassmorphism & holographic styling
        │       ├── depth-slice-page.tsx      # /depth-slice route — Full Three.js 3D Volumetric viewer
        │       ├── details-page.tsx          # /details route — Maritime operational dossier
        │       ├── etheral-shadow.tsx        # Dynamic atmospheric background shadow animation
        │       ├── flow-field-background.tsx # Interactive HTML5 Canvas vector flow particles
        │       ├── globe.tsx                 # CSS 3D Earth Globe with draggable rotation
        │       ├── how-it-works.tsx          # 4-step mission workflow component
        │       ├── landing-page.tsx          # / route — Master Landing Page & Workbench preview
        │       ├── maritime-pattern.tsx      # SVG navigational grid, sonar rings, bathymetric contours
        │       ├── menu-hover-effects.tsx    # Smooth hover line animations
        │       ├── operations-page.tsx       # /operations route — Live 3-panel command workbench
        │       ├── ray-card.tsx              # Glowing border card container
        │       ├── risk-badge.tsx            # Standardized SAFE / ADVISORY / HAZARD badge
        │       ├── shiny-button.tsx          # Animated gradient metallic action button
        │       ├── spinning-border-button.tsx# Tech-themed border spinning action button
        │       └── water-splash-canvas.tsx   # Interactive fluid ripple canvas
        │
        ├── lib/                  # Core Utilities & Scientific Engines
        │   ├── utils.ts          # Classnames helper (`clsx` + `tailwind-merge`)
        │   ├── coordinates.ts    # Spherical (Lat/Lon) to Cartesian (Vector3) conversions
        │   ├── api/
        │   │   ├── oceanDataService.ts       # Service connecting to FastAPI backend (with fallback)
        │   │   ├── oceanPredictionService.ts # Client-side Copernicus Marine parameter simulation engine
        │   │   └── types.ts                  # API request/response interfaces
        │   ├── data/
        │   │   ├── registry.ts               # Traceable scientific data registry singleton
        │   │   ├── types.ts                  # Traceable measurements and point report types
        │   │   └── loaders/
        │   │       ├── gfsTemperature.ts     # GFS GRIB-JSON loader and bilinear interpolator
        │   │       └── oscarCurrents.ts      # NOAA OSCAR surface current loader & interpolator
        │   └── ocean/
        │       ├── colorScales.ts            # Scientifically calibrated ocean color maps
        │       ├── regions.ts                # Indian Ocean basin polygons, bounding boxes, metadata
        │       └── variables.ts              # Ocean variable configurations and physical bounds
        │
        ├── shaders/              # Custom GLSL Shaders
        │   └── oceanColorMap.glsl.ts         # Fragment shaders for thermal, haline, chlorophyll ramps
        │
        ├── store/                # Client State Management
        │   └── useOceanStore.ts  # Zustand store for spatial, depth, temporal, and layer states
        │
        ├── types/                # TypeScript Interfaces
        │   └── ocean.ts          # Core domain models (OceanVariable, OceanRegion, Telemetry)
        │
        └── workers/              # Web Workers for Multi-Threaded Heavy Processing
            ├── isosurface.worker.ts          # Marching cubes isosurface generator
            ├── sliceDecoder.worker.ts        # NetCDF binary slice decoder
            └── vectorProcessor.worker.ts     # Vector field particle streamlet processor
```

---

## 3. Architecture & System Flow

```
+---------------------------------------------------------------------------------------+
|                                    USER BROWSER                                       |
|                                                                                       |
|   +-------------------------------------------------------------------------------+   |
|   |                         React 19 Presentation Layer                           |   |
|   |   - Route Orchestration (App.tsx)                                             |   |
|   |   - Pages: LandingPage (/), OperationsPage (/operations), DepthSlicePage     |   |
|   |     (/depth-slice), DetailsPage (/details), AboutLeherPage (/about)           |   |
|   +-------------------------------------------------------------------------------+   |
|              |                                        |                               |
|              v                                        v                               |
|   +-----------------------+              +----------------------------------------+   |
|   |  Interactive Visuals  |              |    Oceanographic Intelligence Engine   |   |
|   |  - Three.js 3D Column |              |  - oceanPredictionService.ts (Client)  |   |
|   |  - CSS 3D Earth Globe |              |  - oceanDataService.ts (Dual Mode)     |   |
|   |  - Embedded Earth     |              |  - useOceanStore.ts (Zustand State)    |   |
|   |    Canvas Iframe      |              +----------------------------------------+   |
|   +-----------------------+                                   |                       |
+---------------------------------------------------------------|-----------------------+
                                                                |
                                             HTTP REST Requests | (Optional Live Mode)
                                                                v
                                           +----------------------------------------+
                                           |            FASTAPI BACKEND             |
                                           |      (http://127.0.0.1:8000)           |
                                           |                                        |
                                           |  - /api/ocean/temperature              |
                                           |  - /api/ocean/salinity                 |
                                           |  - /api/ocean/currents                 |
                                           |  - /api/ocean/bathymetry               |
                                           |  - /api/ocean/profiles                 |
                                           |  - /api/ocean/predict/deep_ocean (ML)  |
                                           +----------------------------------------+
                                                                |
                                                                v
                                           +----------------------------------------+
                                           |    SCIENTIFIC DATA & ML INFERENCE      |
                                           |                                        |
                                           |  - xarray + NetCDF4 Subsetting         |
                                           |  - Copernicus GLORYS12V1 3D Dataset    |
                                           |  - Argo GDAC Float Profile #2902345    |
                                           |  - GEBCO 2023 Bathymetry Grid          |
                                           |  - Lahar V2 MultiOutput XGBoost Model  |
                                           +----------------------------------------+
```

---

## 4. Routing & Application Lifecycle

Rather than introducing heavy routing libraries (such as `react-router-dom`), Leher uses a lightweight, zero-overhead routing mechanism in [App.tsx](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/frontend/src/App.tsx) based on browser history (`popstate`), URL path prefixes, and hash changes.

### Supported Routes & Aliases
| Route Key | Path / Hash Matches | Active Component | Purpose |
| :--- | :--- | :--- | :--- |
| `'home'` | `/`, default | `LandingPage` | Visual overview, interactive globe, mission flow, quick inspection |
| `'operations'` | `/operations`, `/direction`, `#operations`, `#direction` | `OperationsPage` | Live 3-panel command workbench with Earth iframe, parameter HUD, and controls |
| `'depth-slice'` | `/depth-slice`, `/slice`, `#depth-slice`, `#slice` | `DepthSlicePage` | Full-screen Three.js 3D volumetric water column renderer |
| `'details'` | `/details`, `/dossier`, `#details`, `#dossier` | `DetailsPage` | Operational maritime dossier, variable guidance, and sonar propagation analysis |
| `'about'` | `/about`, `#about` | `AboutLeherPage` | Scientific background, problem statement, technology stack, and architecture |

### Standalone HTML Visualizer Routes (Vercel Rewrites)
Handled via [vercel.json](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/vercel.json) and Vite's custom `earthRoutePlugin` in [vite.config.ts](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/frontend/vite.config.ts):
- `/earth` $\rightarrow$ `/earth/index.html` (D3 Canvas particle vector field)
- `/globe` $\rightarrow$ `/globe/index.html` (ESRI ArcGIS 3D Bathymetry globe)
- Direct link: `/depth-slice.html` (Standalone single-file 3D depth slice viewer)

---

## 5. Key Components & User Interfaces

### 1. Landing Page ([landing-page.tsx](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/frontend/src/components/ui/landing-page.tsx))
- **Hero Section**: Includes a dynamic particle flow field (`FlowFieldBackground`), maritime navigational grid (`MaritimePattern`), and a draggable CSS 3D Earth Globe (`Globe`).
- **Interactive Coordinate Inspector**: Users can click the 3D globe or enter coordinates (Lat 4°N–25°N, Lon 53°E–99°E) and depth (0–2000m) to inspect live ocean parameters.
- **Workflow Stepper**: Implements the 4-step mission pipeline (`SEE` $\rightarrow$ `CLICK` $\rightarrow$ `UNDERSTAND` $\rightarrow$ `ACT`).
- **Feature Cards & Projections**: Showcases multi-projection support, subsurface depth stratification, and model-observation validation.

### 2. Operations Workbench ([operations-page.tsx](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/frontend/src/components/ui/operations-page.tsx))
- **3-Panel Desktop Layout**:
  - **Left HUD (360px)**: Displays locked coordinates, quick location presets (Arabian Sea, Bay of Bengal, Lakshadweep, Andaman Sea, Maldives, Gulf of Mannar), live real-time clock across 6 timezones (IST, UTC, EST, PST, JST, SGT), and expandable Copernicus parameter cards (`thetao`, `so`, `uo`, `vo`, `zos`, `mlotst`, `bottomT`, `chl`).
  - **Center Viewport**: Embeds the interactive Earth canvas iframe (`/earth/index.html`), supporting bidirectional `postMessage` synchronization.
  - **Right Controls (360px)**: Houses projection switchers (Orthographic, Plate Carrée, Winkel Tripel, Waterman Butterfly, Stereographic, Azimuthal Equidistant, Conic Equidistant, Atlantis, Concentric Region), depth level slider (0m to 2000m), and quick-launch buttons for the 3D depth slice viewer.
- **Bi-Directional Iframe Synchronization**:
  - Clicking on the Earth iframe posts an `earth:location` message with latitude and longitude back to the parent React state.
  - Selecting a projection in React sends an `{ action: "set-projection", projection: "..." }` message into the iframe.

### 3. Depth Slice Page ([depth-slice-page.tsx](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/frontend/src/components/ui/depth-slice-page.tsx))
- **3D Volumetric Scene**: Renders a vertical ocean water column (0m to 2000m) with 13 standard depth layers ($0, 30, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000\text{ m}$).
- **Interactive Slicing & Extraction**: Selecting a depth layer animates the target layer laterally out of the column via a holographic extraction tether.
- **Scientifically Calibrated Color Scales**: Maps temperature, salinity, velocity, and chlorophyll to verified oceanographic color ramps.
- **Draggable Telemetry HUD**: A movable cybernetic card displaying depth-specific telemetry, layer descriptions, and acoustic propagation characteristics.

### 4. Details & Operational Dossier ([details-page.tsx](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/frontend/src/components/ui/details-page.tsx))
- Translates numerical ocean state variables into concrete operational directives:
  - `thetao`: Engine seawater cooling efficiency & sonar acoustic sound speed profile (~1,535 m/s).
  - `so`: Water mass density, Plimsoll line draft markings, and vessel buoyancy calculations.
  - `uo` / `vo`: Cross-track leeway drift correction vectors and heading compensations.
  - `zos`: Dynamic sea surface height anomalies and mesoscale eddy circulation.
  - `mlotst`: Mixed layer depth for acoustic sound ducting and submarine sonar channels.
  - `bottomT`: Benthic boundary temperatures for subsea cable laying and ROV operations.

---

## 6. Visualization Engines

### 1. Embedded Vector Particle Canvas Engine (`public/earth/`)
- **Technology**: HTML5 2D Canvas Context, D3.js v3, D3 Geo Projections, TopoJSON.
- **Data Ingestion**: Reads GRIB-JSON arrays (`public/earth/data/oscar/` and `public/earth/data/weather/current/`).
- **Algorithm**:
  - Unpacks 1D scalar/vector grids.
  - Bilinear spatial interpolation calculates vector magnitude and direction at any fractional $(x, y)$.
  - Spawns a pool of 1,000–3,000 particles that follow velocity streamlines, aging out and respawning dynamically.
  - Re-projects coordinates into orthographic (3D globe) or flat cartographic geometries at 60 FPS.

### 2. Three.js 3D Volumetric Water Column (`depth-slice-page.tsx`)
- **Technology**: Three.js (`three` v0.185.1), WebGLRenderer, OrbitControls.
- **Scene Setup**:
  - `THREE.PerspectiveCamera` (FOV 42°, Near 0.1, Far 2000).
  - Multi-directional lighting: Ambient light, directional key light, and underside cyan point light for subsurface illumination.
  - **Geometry Options**: Interactive toggle between Cylinder (`THREE.CylinderGeometry`) and Cuboid (`THREE.BoxGeometry`).
  - **Surface Waves**: Mesh with animated vertex displacement simulating surface wave swells.
  - **Slice Extraction**: Lerped transformation animating the selected depth layer along $X$ and $Z$ axes with a dynamic tether line and extraction socket.
  - **Holographic Floating HUD**: Offscreen HTML5 2D canvas dynamically rendered into a `THREE.CanvasTexture` mapped to a 3D sprite floating adjacent to the extracted slice.

### 3. CSS 3D Earth Globe (`frontend/src/components/ui/globe.tsx`)
- **Technology**: CSS 3D transforms (`preserve-3d`, `rotateX`, `rotateY`), Pointer Events API.
- **Features**: Smooth drag-to-rotate interaction, inertial momentum, automatic idle rotation, and atmosphere halo glow effects.

---

## 7. Oceanographic Data Engine & Services

### 1. Client-Side Prediction Service ([oceanPredictionService.ts](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/frontend/src/lib/api/oceanPredictionService.ts))
Implements deterministic, continuous physical oceanographic equations modeled after Copernicus Marine CMEMS physics reanalysis:
- **Temperature Stratification ($\theta_o$)**: Computes surface temperature from latitude and applies an exponential thermocline decay down to abyssal temperatures ($1.5^\circ\text{C}$–$3.5^\circ\text{C}$).
- **Salinity Dynamics ($S_o$)**: Models regional evaporation vs. precipitation balances (high salinity in northern Arabian Sea ~36.5 PSU; lower salinity in Bay of Bengal ~33.5 PSU due to Ganga-Brahmaputra river runoff).
- **Current Vectors ($U_o, V_o$)**: Generates eastward and northward velocities, total current speed in m/s and knots, and converts heading degrees into 16-point compass notations (e.g., `"ENE"`, `"SSW"`).
- **In-Memory LRU Caching**: Caches up to 120 spatial-depth coordinates (`${lat},${lon},${depth}`) for instantaneous 0ms UI re-renders.

### 2. Dual-Mode Data Service ([oceanDataService.ts](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/frontend/src/lib/api/oceanDataService.ts))
Acts as the interface between React and data sources:
- If a live FastAPI backend is running (`VITE_API_BASE_URL` or `http://127.0.0.1:8000/api/ocean`), it fetches real NetCDF subsetted arrays:
  - `GET /temperature?lat=...&lon=...&depth=...`
  - `GET /salinity?lat=...&lon=...&depth=...`
  - `GET /currents?lat=...&lon=...`
  - `GET /bathymetry?lat=...&lon=...`
  - `GET /profiles?lat=...&lon=...`
  - `POST /predict/deep_ocean`
- If the backend is unavailable (e.g., standard Vercel serverless deployment), it falls back seamlessly to client-side approximations without throwing uncaught errors.

### 3. Traceable Scientific Data Registry ([registry.ts](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/frontend/src/lib/data/registry.ts))
Maintains provenance records for every measurement:
- Variable standard names (CF-1.4 convention).
- Native physical units (°C, PSU, m/s, meters, mg/m³).
- Data sources (Copernicus GLORYS12V1, Argo GDAC, NOAA OSCAR, GEBCO).
- Processing levels (L2 processed, L4 reanalysis).

---

## 8. Machine Learning Engine (Lahar V2)

### Overview
Developed under the code name **Lahar V2**, this machine learning subsystem is designed to replace heavy multi-gigabyte NetCDF disk slicing with a lightweight, ultra-fast inference model.

### Architecture
- **Model Type**: Multi-Output XGBoost Regressor (`MultiOutputRegressor` wrapping 4 XGBoost models).
- **Model Artifact**: `backend/models/lahar_ocean_model_v2.pkl` (~10.7 MB).
- **Inference Latency**: 5 to 15 milliseconds.
- **Trained Domain**: Indian Ocean basin (`Lat: -20°S to 25°N`, `Lon: 50°E to 100°E`, `Depth: 0m to 2000m`).

### Input Features (9 Dimensions)
1. `latitude`: $-20.0^\circ$ to $25.0^\circ$
2. `longitude`: $50.0^\circ$ to $100.0^\circ$
3. `depth`: $0.0\text{ m}$ to $2000.0\text{ m}$
4. `surface_temp`: Sea surface temperature (°C)
5. `surface_salinity`: Sea surface salinity (PSU)
6. `month_sin`: $\sin(2\pi \cdot \text{month} / 12)$
7. `month_cos`: $\cos(2\pi \cdot \text{month} / 12)$
8. `doy_sin`: $\sin(2\pi \cdot \text{day\_of\_year} / 365.25)$
9. `doy_cos`: $\cos(2\pi \cdot \text{day\_of\_year} / 365.25)$

### Predicted Outputs (5 Variables)
1. `thetao`: Potential temperature (°C)
2. `so`: Practical salinity (PSU)
3. `uo`: Eastward velocity component (m/s)
4. `vo`: Northward velocity component (m/s)
5. `current_speed`: Derived scalar magnitude $\sqrt{u_o^2 + v_o^2}$ (m/s)

---

## 9. FastAPI Backend Specifications

The backend architecture (located in `backend/` in git history and local deployments) is built using Python 3.14, FastAPI, and `xarray`:

### Core Endpoints
- `GET /`: Health check and API version info.
- `GET /api/ocean/temperature`: Spatial bounding box or point temperature subsetting.
- `GET /api/ocean/salinity`: Spatial bounding box or point salinity subsetting.
- `GET /api/ocean/currents`: Vector component ($U, V$) and speed extraction.
- `GET /api/ocean/bathymetry`: GEBCO seafloor elevation lookup.
- `GET /api/ocean/profiles`: Vertical temperature and salinity profiles down to 2,000m.
- `POST /api/ocean/predict/deep_ocean`: Real-time Lahar ML inference endpoint.

### Dataset Storage & Pre-Processing
- **GLORYS12V1**: 3D daily physics reanalysis NetCDF (`cmems_mod_glo_phy_my_0.083deg_P1D-m`) preserving all 50 vertical depth levels.
- **Argo GDAC**: Real profiling float NetCDF casts (Float `#2902345` in the Arabian Sea at 15.4°N, 71.2°E).
- **GEBCO 2023**: Global relief NetCDF grid processed to $100 \times 100$ bounding boxes.

---

## 10. Coordinate Systems, Projections & Transformations

### Coordinate Conversion ([coordinates.ts](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/frontend/src/lib/coordinates.ts))
Converts spherical Earth coordinates (Latitude, Longitude) into 3D Cartesian coordinates (Vector3) for Three.js:
- **Convention**:
  - $+Y$: North Pole ($\text{Lat} = +90^\circ$)
  - $+Z$: Prime Meridian ($\text{Lat} = 0^\circ, \text{Lon} = 0^\circ$)
  - $+X$: $90^\circ\text{ East}$ ($\text{Lat} = 0^\circ, \text{Lon} = +90^\circ$)
- Formulas:
  $$\phi = (90^\circ - \text{lat}) \cdot \frac{\pi}{180}$$
  $$\theta = (\text{lon} + 90^\circ) \cdot \frac{\pi}{180}$$
  $$x = -r \sin(\phi) \cos(\theta),\quad y = r \cos(\phi),\quad z = r \sin(\phi) \sin(\theta)$$

### Supported Cartographic Projections
Configured in [landing-page.tsx](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/frontend/src/components/ui/landing-page.tsx) and rendered inside the D3 canvas engine:
1. `concentric_region`: Concentric bounded projection focusing on the Indian Ocean basin (4°N–25°N, 53°E–99°E).
2. `orthographic`: 3D spherical globe perspective.
3. `equirectangular`: Standard Plate Carrée cylindrical map.
4. `winkel3`: Winkel Tripel compromise projection.
5. `waterman`: Waterman Butterfly polyhedron projection.
6. `stereographic`: Conformal polar stereographic projection.
7. `azimuthal_equidistant`: Polar equidistant projection preserving true distance from center.
8. `conic_equidistant`: Conic projection with equidistant standard parallels.
9. `atlantis`: Transverse equal-area projection.

---

## 11. State Management (Zustand & React Hooks)

### Ocean Store ([useOceanStore.ts](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/frontend/src/store/useOceanStore.ts))
Centralized state managed via Zustand:
- `selectedRegion`: Currently highlighted ocean basin ID (`'arabian-sea'`, `'bay-of-bengal'`, etc.).
- `variable`: Active scalar/vector variable (`'temperature'`, `'salinity'`, `'currents'`, `'chlorophyll'`).
- `depth`: Selected subsurface depth level (0m to 6,000m).
- `time`: Active ISO timestamp.
- `colorScale`: Active colormap ramp (`'thermal'`, `'haline'`, `'turbo'`, `'chlorophyll'`).
- `opacity`: Subsurface volumetric opacity (0.1 to 1.0).
- `verticalExaggeration`: Bathymetric vertical scaling factor (default: $120\times$).
- `clickedLocation`: Inspected coordinate metadata (lat, lon, depth, value, regionName).
- `isPointDepthOpen`: Toggle for the point inspection telemetry side panel.

---

## 12. Styling, Design System & Theming

### Aesthetics & Design Language
The UI follows a **cybernetic maritime command console** design language:
- **Background Palette**: Deep obsidian and abyssal navy (`#080808`, `#010a18`, `#031428`).
- **Accent Palette**:
  - Electric Cyan (`#00e5ff`): Primary action items, radar lines, water column wireframes.
  - Emerald Green (`#00f5a0`): Safe operational status, chlorophyll indicators.
  - Solar Amber (`#ffaa00`): Advisory warnings, elevated salinity markers.
  - Flame Red (`#ff3b30`): Maritime hazard alerts, high temperature cores.
  - Abyssal Violet (`#c084fc`): Deep water and benthic boundary markers.
- **Glassmorphism & Shadows**: `cyber-card.css` defines frosted glass borders, glowing corner brackets, and backdrop blurs (`backdrop-filter: blur(16px)`).
- **Typography**: Inter (primary sans-serif) combined with JetBrains Mono / monospace (telemetry, coordinates, and real-time clock).

---

## 13. Build, Deployment & Configuration

### Scripts
```bash
# Start Vite development server
npm run dev

# Typecheck and produce optimized production bundle
npm run build

# Preview production build locally
npm run preview

# Run Oxlint linter
npm run lint
```

### Vercel Deployment Workflow
1. Root [package.json](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/package.json) contains the monorepo build script:
   ```json
   "build": "npm --prefix frontend run build && node -e \"const fs=require('fs'); fs.cpSync('frontend/dist', 'dist', {recursive: true});\""
   ```
2. Vercel runs `npm run build` from the workspace root.
3. Vite bundles the application into `frontend/dist/`.
4. The Node script synchronizes `frontend/dist/` into root `dist/`.
5. [vercel.json](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/vercel.json) routes all requests to `frontend/dist` with SPA fallbacks and static `/earth` and `/globe` rewrites.

---

## 14. Developer Cheatsheet & Future Roadmap

### Important File Paths for Quick Editing
- **Main View Router**: [frontend/src/App.tsx](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/frontend/src/App.tsx)
- **Landing Page & Preview Workbench**: [frontend/src/components/ui/landing-page.tsx](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/frontend/src/components/ui/landing-page.tsx)
- **Live Operations Workbench**: [frontend/src/components/ui/operations-page.tsx](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/frontend/src/components/ui/operations-page.tsx)
- **Three.js 3D Volumetric Water Column**: [frontend/src/components/ui/depth-slice-page.tsx](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/frontend/src/components/ui/depth-slice-page.tsx)
- **Ocean Prediction Physics Formulas**: [frontend/src/lib/api/oceanPredictionService.ts](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/frontend/src/lib/api/oceanPredictionService.ts)
- **Dual-Mode Data Loader**: [frontend/src/lib/api/oceanDataService.ts](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/frontend/src/lib/api/oceanDataService.ts)
- **Basin Polygons & Bounding Boxes**: [frontend/src/lib/ocean/regions.ts](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/frontend/src/lib/ocean/regions.ts)
- **Global CSS & Cyberpunk Utilities**: [frontend/src/index.css](file:///c:/Users/Arya%20Bhagat/Desktop/Sih/FR/frontend/src/index.css)

### Future Roadmap & Enhancements
1. **Direct WebGL Volumetric Raymarching**: Transition subsurface 3D rendering from sliced polygonal cylinders to direct 3D volumetric raymarching shaders sampling 3D texture voxels.
2. **Automated Model-Observation Co-Location**: Implement serverless geospatial interpolation calculating exact spatio-temporal differences ($\Delta = \text{Model} - \text{Argo}$) along real-time Argo float drift tracks.
3. **Live ROMS/MOM Feeds**: Connect automated daily scrapers for live INCOIS hydrodynamic ocean model outputs.
4. **Offline PWA & Mobile Optimization**: Add service worker caching for offline maritime navigational maps and bathymetric grids.
