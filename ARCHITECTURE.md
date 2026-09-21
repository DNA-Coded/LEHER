# LEHER — Comprehensive System Architecture & Data Flow Specification
### Official Architecture Reference for Smart India Hackathon (SIH) Problem Statement 26067
**Ministry**: Ministry of Earth Sciences (MoES)  
**Department**: Indian National Centre for Ocean Information Services (INCOIS), Ocean Valley  
**Platform**: **LEHER** (Indian Ocean Maritime Safety & Hazard Intelligence System)  
**Repository**: [DNA-Coded/LEHER](https://github.com/DNA-Coded/LEHER)  

---

## 1. End-to-End System Architecture Diagram

```mermaid
graph TB
    %% External Data Providers Layer
    subgraph External_Data_Sources ["1. External Earth Observation & Ocean Model Providers"]
        D1["Copernicus Marine Service (CMEMS)<br/>GLOBAL_MULTIYEAR_PHY_001_030<br/>(GLORYS12V1 4D Reanalysis)"]
        D2["INCOIS Live Access Server (LAS)<br/>Regional ROMS & MOM Forecasts<br/>(Arabian Sea & Bay of Bengal)"]
        D3["Argo GDAC (IFREMER / Coriolis FTP)<br/>Global Profiling Floats<br/>(0–2000m CTD NetCDF)"]
        D4["OceanGliders Global Repository<br/>Autonomous Underwater Gliders<br/>(Sawtooth Dive Profiles)"]
        D5["INCOIS OMNI Buoy Network<br/>Moored Met-Ocean Buoys<br/>(Surface Met + Subsurface Chains)"]
        D6["GEBCO & NOAA IBTrACS<br/>High-Res Bathymetry &<br/>Historical Cyclone Tracks"]
    end

    %% Ingestion & Normalization Layer (Jal-Chakra)
    subgraph Ingestion_Fabric ["2. Samudra Data Fabric & Jal-Chakra Pipeline"]
        JC1["Jal-Chakra Harvester & FTP Client<br/>(Automated Schedulers / Cron)"]
        JC2["Stage 1: Utpatti (Acquire)<br/>Raw NetCDF-4 / HDF5 / CSV"]
        JC3["Stage 2: Pariksha (Examine)<br/>xarray / NetCDF Validation & CF-1.8 Compliance"]
        JC4["Stage 3: Rupantar (Transform)<br/>Zarr Chunking & Parquet Normalization"]
        JC5["Stage 4: Prakashan (Publish)<br/>Manifest Indexing & Atomic Activation"]
    end

    %% Storage & Caching Layer
    subgraph Storage_Fabric ["3. Persistent Data Fabric & Analytical Stores"]
        S1[("GLORYS 4D Zarr Stores<br/>temperature, salinity,<br/>uo, vo, current_speed, chlorophyll")]
        S2[("DuckDB In-Memory Catalog<br/>Metadata, Spatiotemporal Indices,<br/>Vertical Depth Levels")]
        S3[("In-Situ Parquet Datasets<br/>Argo Profiles, Glider Dives,<br/>OMNI Thermistor Chains")]
        S4[("Rakshak ML Stores<br/>safe_zones.geojson, hazards.parquet,<br/>ecosystem.json, XGBoost JSONs")]
    end

    %% Backend Microservices (FastAPI)
    subgraph Backend_Services ["4. High-Performance Asynchronous Microservices (FastAPI)"]
        API_GATE["FastAPI Gateway & Lifespan Controller<br/>CORS, OpenTelemetry, Health Probes"]
        
        subgraph Routers ["API Routing Endpoints"]
            R_MODEL["/api/v1/model/slices<br/>Zero-Copy Arrow IPC Slices"]
            R_VEC["/api/v1/vectors/slices<br/>Arrow IPC Current Flow Vectors"]
            R_CAT["/api/v1/catalog/*<br/>Dataset, Variable & Depth Queries"]
            R_INS["/api/v1/instruments/*<br/>In-Situ Platforms, Profiles & Drift"]
            R_ML["/api/v1/ml/*<br/>Hazard Events, Safe Zones, Ecosystem"]
            R_OGC["/api/v1/ogc/wms & /wcs<br/>OGC Web Map & Coverage Services"]
        end

        subgraph Core_Engines ["Backend Core Engines"]
            E_ARROW["Arrow Memory Encoder<br/>Columnar Zero-Copy Serialization"]
            E_RAKSHAK["Rakshak Operational ML Suite<br/>Surge Model & Cyclone Predictor"]
            E_ZONES["Safe Zones Corridors Engine<br/>Wave Energy & Current Shear Classifier"]
            E_ECO["Ecosystem Health Engine<br/>Coral Bleaching, HAB & Hypoxia Risk"]
            E_VOICE["Voice Advisory Synthesizer<br/>Automated Maritime Radio TTS"]
        end
    end

    %% Network Boundary
    subgraph Transport_Layer ["5. High-Throughput Binary Transport"]
        T_ARROW["Binary Stream: application/vnd.apache.arrow.stream (Sub-50ms)"]
        T_JSON["REST / OGC GeoJSON: application/geo+json & application/json"]
        T_TILES["WMS Raster Tiles: image/png & OPeNDAP Array Streams"]
    end

    %% Frontend Web Client (React 19)
    subgraph Frontend_Client ["6. Browser-Native Presentation & Analytics (React 19 + Vite 6 + TypeScript)"]
        
        subgraph Web_Workers ["Dedicated Off-Thread Web Workers"]
            W_SLICE["sliceDecoder.worker.ts<br/>Off-thread Arrow IPC Table Parser"]
            W_VEC["vectorProcessor.worker.ts<br/>Flow Vector Decimation & Direction"]
            W_ISO["isosurface.worker.ts<br/>CPU Marching Cubes 3D Mesh Extraction"]
        end

        subgraph UI_Modules ["Interactive Visual & Operational Modules"]
            UI_3D["3D Volumetric Water Column (Three.js)<br/>• Cylinder (Core Sounding)<br/>• Cuboid (Oceanic Grid Block)<br/>• 0–2000m Depth Slider<br/>• 50x–300x Vertical Exaggeration<br/>• 8 Scientific Colormaps (Log/Lin)"]
            
            UI_GLOBE["Interactive 3D Earth Globe (Cesium.js)<br/>• GEBCO 3D Bathymetric Terrain<br/>• 16 In-Situ Observation Markers<br/>• Rakshak Hazard Pins (Surge/Cyclone)<br/>• Fishermen Safe Navigation Corridors"]
            
            UI_BIAS["Model vs. Obs Hydrodynamic Bias Engine<br/>• Dual Sounding Curves (GLORYS vs In-Situ)<br/>• Signed Depth Anomaly Bar Chart<br/>• Physical KPIs: RMSE, Bias, dMLD, D20, r<br/>• Tactical Naval Acoustic Assessment"]
            
            UI_INSPECT["In-Situ Platform Inspector Modal<br/>• Multi-day Drift Tracks (0–30 Days)<br/>• WMO Telemetry & QC Status (QC 1/2)<br/>• Battery & Satellite Ping Timestamps"]
            
            UI_DOSSIER["Executive Mission Dossier & Reporting<br/>• Client-Side Print-Ready PDF Generator<br/>• Official MoES / INCOIS Styling"]
        end
    end

    %% Connections
    D1 --> JC1
    D2 --> JC1
    D3 --> JC1
    D4 --> JC1
    D5 --> JC1
    D6 --> JC1

    JC1 --> JC2 --> JC3 --> JC4 --> JC5

    JC4 --> S1
    JC4 --> S3
    JC5 --> S2
    E_RAKSHAK --> S4
    E_ZONES --> S4
    E_ECO --> S4

    S1 --> R_MODEL
    S1 --> R_VEC
    S2 --> R_CAT
    S3 --> R_INS
    S4 --> R_ML
    S1 --> R_OGC

    R_MODEL --> E_ARROW
    R_VEC --> E_ARROW
    API_GATE --> Routers

    E_ARROW --> T_ARROW
    R_ML --> T_JSON
    R_INS --> T_JSON
    R_CAT --> T_JSON
    R_OGC --> T_TILES

    T_ARROW --> W_SLICE
    T_ARROW --> W_VEC
    W_SLICE --> UI_3D
    W_VEC --> UI_3D
    W_ISO --> UI_3D

    T_JSON --> UI_GLOBE
    T_JSON --> UI_BIAS
    T_JSON --> UI_INSPECT
    T_TILES --> UI_GLOBE

    UI_BIAS --> UI_DOSSIER
    UI_3D --> UI_DOSSIER
    UI_GLOBE --> UI_DOSSIER
```

---

## 2. Ingestion & Transformation Pipeline (Jal-Chakra)

The **Jal-Chakra** engine manages automated data transformation across four deterministic stages, converting raw oceanographic datasets into high-speed analytical formats:

```mermaid
sequenceDiagram
    autonumber
    participant Ext as External Data Provider (CMEMS / Argo / INCOIS)
    participant Harvester as Jal-Chakra Harvester (Python / Cron)
    participant Validator as Stage 2: Pariksha (Validator)
    participant Normalizer as Stage 3: Rupantar (Zarr/Parquet Engine)
    participant Catalog as Stage 4: Prakashan (DuckDB Catalog)
    participant Fabric as Samudra Data Fabric (Zarr / Parquet)

    Ext->>Harvester: Download Raw Data (NetCDF / ASCII / CSV)
    Harvester->>Validator: Pass raw file (raw_glorys_YYYYMMDD.nc)
    Note over Validator: Validate CF-1.8 Conventions,<br/>Coordinates (time, depth, lat, lon),<br/>and Physical Variable Ranges
    Validator->>Normalizer: Validated xarray Dataset
    Note over Normalizer: Chunk Array into 3D Spatial Blocks,<br/>Apply Blosc LZ4 Compression,<br/>Normalize Coordinate Names
    Normalizer->>Fabric: Write Zarr Stores & Parquet Tables
    Normalizer->>Catalog: Build Immutable Manifest (manifest.json)
    Note over Catalog: Atomic Activation:<br/>Deactivate Previous Revision,<br/>Index Variables, Depths & Bounds
    Catalog-->>Harvester: Ingestion Completed Successfully
```

### Jal-Chakra Pipeline Stages
1. **Utpatti (Origin)**: Automated download via Copernicus Marine API (`copernicusmarine`) or Argo/Glider GDAC FTP servers into `fabric/raw/`.
2. **Pariksha (Examination)**: Verification using `xarray` and `validator.py`. Validates Climate and Forecast (CF-1.8) conventions, positive-down depth standards, spatial bounding coordinates, and absence of corrupted tiles.
3. **Rupantar (Transformation)**: Re-chunks dense multi-dimensional floating-point tensors into optimized Zarr arrays (`temperature.zarr`, `salinity.zarr`, `uo.zarr`, `vo.zarr`, `chlorophyll.zarr`) and columnar Apache Parquet stores.
4. **Prakashan (Publication)**: Publishes dataset manifests with cryptographic checksums (`SHA-256`), register metadata into DuckDB, and switches the dataset state to active atomically.

---

## 3. High-Speed Binary Streaming Architecture (Arrow IPC)

To eliminate the CPU bottlenecks and network overhead of traditional large JSON payloads, LEHER uses **Zero-Copy Apache Arrow Columnar IPC streaming**:

```mermaid
flowchart LR
    subgraph Backend_Server ["Backend Server (FastAPI)"]
        ZARR[("GLORYS Zarr Arrays")] --> SAMUDRA["Samudra Reader<br/>(Bounding Box & Depth Slicer)"]
        SAMUDRA --> MEM["In-Memory Contiguous<br/>NumPy / Polars Buffer"]
        MEM --> ENCODER["PyArrow IPC Stream Encoder<br/>(RecordBatchStreamWriter)"]
    end

    ENCODER -- "application/vnd.apache.arrow.stream<br/>(Binary IPC Bytes)" --> NETWORK((HTTP/2 Stream))

    subgraph Browser_Client ["Browser Client (React 19)"]
        NETWORK --> WORKER["sliceDecoder.worker.ts<br/>(Dedicated Web Worker)"]
        WORKER --> ARROW_JS["tableFromIPC()<br/>(Zero-Copy Column Unpack)"]
        ARROW_JS --> FLOAT_BUF["Shared Float32Array<br/>(Flat Scalar Grid)"]
        FLOAT_BUF --> GPU["WebGL Shader / Three.js Mesh<br/>(Volumetric Render @ 60 FPS)"]
    end
```

### Performance Advantages:
- **Zero JSON Overhead**: Eliminates text serialization of tens of thousands of coordinate points.
- **Off-Main-Thread Execution**: Web Workers decode Arrow tables asynchronously, ensuring UI animations never drop below 60 FPS.
- **Sub-50ms Latency**: Depth slices transfer in under 50ms across high-density spatial meshes.

---

## 4. Model vs. Observation Hydrodynamic Bias Architecture

The Hydrodynamic Bias Engine simultaneously co-locates 4D numerical model outputs with physical in-situ measurements, addressing the primary operational mandate of INCOIS forecasters:

```mermaid
flowchart TD
    subgraph Selection ["1. Target Platform & Coordinate Selection"]
        P1["User Selects In-Situ Platform<br/>(Argo Float, Glider, OMNI Buoy, BGC)"]
        P2["Spatial Query: Target Lat, Lon, Time"]
    end

    subgraph Data_Extraction ["2. Dual Telemetry Extraction"]
        P1 --> D_OBS["In-Situ Profile Extraction<br/>(0–2000m Depth Levels, Temp, Salinity, QC)"]
        P2 --> D_MOD["Numerical Model Column Slice<br/>(GLORYS12V1 Spatiotemporal Interpolation)"]
    end

    subgraph Analytics_Engine ["3. Hydrodynamic Bias Engine (anomalyEngine.ts)"]
        D_OBS & D_MOD --> MATCH["Discrete Depth Layer Matching<br/>z = [0, 10, 20, 50, 75, 100, 200, 500, 1000, 2000m]"]
        MATCH --> DIFF["Depth-Resolved Signed Anomaly Vector<br/>Δ(z) = Model(z) - Obs(z)"]
        
        DIFF --> KPI1["Water Column RMSE<br/>RMSE = sqrt(mean(Δ²))"]
        DIFF --> KPI2["Mean Bias<br/>Bias = mean(Δ)"]
        DIFF --> KPI3["Mixed Layer Depth Anomaly (ΔMLD)<br/>0.2°C Temperature Threshold"]
        DIFF --> KPI4["D20 Thermocline Error<br/>Depth Deviation of 20°C Isotherm"]
        DIFF --> KPI5["Pearson Correlation (r)<br/>Profile Gradient Fidelity"]
        DIFF --> NARRATIVE["Oceanographic & Tactical Acoustic Intelligence<br/>Barrier Layer Trapping, Salinity Effects, Sonar Refraction"]
    end

    subgraph Visualization ["4. Dual-View Operational Display"]
        MATCH --> V_SVG["Dual Sounding SVG Curves<br/>(Cyan: Model vs Emerald: Observation)"]
        DIFF --> V_BARS["Signed Anomaly Bar Chart<br/>(Left: Cold/Fresh vs Right: Warm/Saline)"]
        NARRATIVE --> V_REPORT["Tactical Briefing & Executive Dossier Export"]
    end
```

---

## 5. Rakshak Operational Machine Learning & Disaster Intelligence

The **Rakshak ML Engine** runs continuous monitoring jobs over ocean state variables to provide operational early warnings for INCOIS mandates:

```mermaid
graph LR
    subgraph Inputs ["Ocean State Inputs"]
        I1["Sea Surface Temperature (SST)"]
        I2["Upper Ocean Heat Content (UOHC)"]
        I3["Sea Surface Height Anomaly (SSHA)"]
        I4["Current Velocity Shear (u, v)"]
        I5["Chlorophyll-a Concentration"]
        I6["Subsurface Dissolved O2 (DO)"]
    end

    subgraph ML_Models ["Rakshak Machine Learning Models"]
        I1 & I2 & I3 --> M_CYCLONE["XGBoost Cyclone Genesis Model<br/>(Predicts cyclone probability)"]
        I1 & I3 & I4 --> M_SURGE["XGBoost Storm Surge Regressor<br/>(Predicts coastal surge height in meters)"]
        I4 --> M_ZONES["Hydrodynamic Energy Classifier<br/>(Safe, Caution, Prohibited Corridors)"]
        I1 & I5 & I6 --> M_ECO["Marine Ecosystem Health Engine<br/>(Coral Bleaching DHW, HAB, Hypoxia)"]
    end

    subgraph Operational_Outputs ["Actionable Maritime Outputs"]
        M_CYCLONE --> O_WARN["Cyclone Track & Intensity Alerts"]
        M_SURGE --> O_INUND["Coastal Inundation Warning Polygons"]
        M_ZONES --> O_FISH["Fishermen Safe Navigation Corridors (GeoJSON)"]
        M_ECO --> O_ECO["4,000 Spatial Cell Ecosystem Alerts"]
        M_SURGE & M_CYCLONE --> O_VOICE["Automated Coastal Radio Voice Advisory (TTS)"]
    end
```

---

## 6. Frontend State & WebGL Rendering Architecture

The frontend architecture separates high-frequency rendering loops from user interactions and state synchronization:

```mermaid
graph TD
    subgraph React_State ["Zustand Global State Store (useOceanStore)"]
        ST_REG["selectedRegion / hoveredRegionId"]
        ST_DEP["selectedDepth (0–2000m)"]
        ST_VAR["activeVariable (temp, salinity, currents, chlorophyll)"]
        ST_COLOR["activeColorScale & colorbarState (Log/Linear)"]
        ST_TIME["activeTimeStep & Monsoon Season"]
        ST_PLAT["selectedInSituPlatformId"]
    end

    subgraph Viewports ["Interactive 3D Viewports"]
        V_THREE["Three.js WebGL Viewport (depth-slice-page)<br/>• Stratified Cylinder Geometry<br/>• Stratified Cuboid Geometry<br/>• OrbitControls (Pan, Orbit, Zoom)<br/>• Dynamic Shader Material (Multi-stop Ramps)<br/>• Particle Flow Direction Field"]
        
        V_CESIUM["Cesium.js 3D Globe (OceanGlobe)<br/>• Global WGS84 Ellipsoid<br/>• GEBCO Bathymetric Terrain Provider<br/>• ScreenSpaceEventHandler (Hover & Tap)<br/>• Entity Billboards (Argo, Glider, Buoy, BGC)<br/>• Rakshak Hazard Polygons & Safe Corridors"]
    end

    ST_DEP --> V_THREE
    ST_VAR --> V_THREE
    ST_COLOR --> V_THREE
    ST_TIME --> V_THREE

    ST_REG --> V_CESIUM
    ST_PLAT --> V_CESIUM
    ST_PLAT --> UI_MODAL["InSituSensorModal & ModelVsObsComparator"]
```

---

## 7. Technology Stack Reference Table

| Tier | Component | Technology / Library | Role in LEHER |
|---|---|---|---|
| **Frontend Core** | Application Framework | React 19 + TypeScript + Vite 6 | High-performance, browser-native UI without client dependencies |
| **Frontend 3D** | Volumetric Sounder | Three.js (WebGL) + @react-three/fiber | Depth-slice visualization, 3D cylinder and cuboid water column models |
| **Frontend Globe** | 3D Geospatial Engine | Cesium.js (Ion & Offline Providers) | Global bathymetry, hazard polygons, and in-situ platform tracking |
| **Frontend Styling** | UI & Glassmorphism | Vanilla CSS + TailwindCSS + Lucide Icons | Dark oceanographic tactical command console styling |
| **Frontend Workers** | Multi-Threading | Web Workers API (`sliceDecoder`, `vectorProcessor`) | Off-thread binary decoding and CPU Marching Cubes calculation |
| **Frontend Transport** | Columnar Client | Apache Arrow JS (`tableFromIPC`) | Sub-50ms zero-copy deserialization of model depth slices |
| **Backend API** | Asynchronous Gateway | Python 3.11+ / FastAPI / Uvicorn | Async REST API, OpenAPI 3.0 schemas, CORS, and lifespan management |
| **Backend Analytics** | In-Memory Catalog | DuckDB + Polars | High-speed analytical metadata indexing and Parquet scanning |
| **Backend Ocean Data** | Multi-Dimensional Parser | `xarray` + `zarr` + `netCDF4` + `h5netcdf` | Climate & Forecast (CF-1.8) NetCDF slicing and chunked Zarr access |
| **Backend Harvester** | Model Fetcher | `copernicusmarine` API Client | Automated subsetting and acquisition of GLORYS12V1 reanalysis |
| **Backend ML** | Hazard Predictors | XGBoost + Scikit-Learn | Real-time storm surge prediction and cyclone genesis probability |
| **Backend Audio** | Coastal Radio Synthesis | `pyttsx3` / gTTS | Automated voice advisory generator for coastal fishing communities |
| **Data Formats** | Standards Compliance | Zarr, Apache Arrow IPC, GeoJSON, Parquet, CF-1.8 | Open standards enabling interoperability with national & international portals |

---

## 8. Directory & Architectural Mapping

```
LEHER/
├── ARCHITECTURE.md                  # Complete System Architecture & Data Flow Reference (This Document)
├── LEHER_SOLUTION_OFFERINGS_PS26067.md # Official SIH PS 26067 Offerings & Compliance Audit
├── PS26067_GAP_ANALYSIS_AND_ROADMAP.md # Detailed Implementation Gap Analysis & Phased Roadmap
├── README.md                        # Project Overview, Setup Instructions & System Guide
│
├── backend/                         # Backend Services & Data Fabric
│   ├── apps/api/leher/              # FastAPI Application Gateway
│   │   ├── main.py                  # API Entrypoint, Lifespan, Scheduler, Routers
│   │   ├── config.py                # Environment Configuration & CORS
│   │   ├── paths.py                 # File & Fabric Path Resolver
│   │   ├── core/                    # Core Utilities (arrow_encoder.py)
│   │   ├── catalog/                 # DuckDB Catalog Metadata Service
│   │   ├── jobs/                    # APScheduler Background Workers (rakshak_job.py)
│   │   └── routers/                 # API Route Handlers (slices, vectors, catalog, ml)
│   │
│   ├── services/jal-chakra/         # Jal-Chakra Ingestion & Transformation Engine
│   │   ├── core/                    # Pipeline, Normalizer, Validator, Rakshak ML Suite
│   │   └── plugins/                 # Ingestion Plugins (copernicus, argo)
│   │
│   └── fabric/                      # Samudra Persistent Data Fabric
│       ├── datasets/glorys/         # GLORYS12V1 Zarr Stores & manifest.json
│       ├── ml/                      # Hazard Models, safe_zones.geojson, ecosystem.json
│       └── raw/                     # Staging Area for Raw NetCDF & ASCII Inputs
│
└── frontend/                        # Frontend Browser-Native Web Application
    ├── src/
    │   ├── App.tsx                  # Client-Side Routing & Top-Level Layout
    │   ├── main.tsx                 # React DOM Root Entry
    │   ├── components/
    │   │   ├── ocean/               # 3D Ocean Components (OceanGlobe, ModelVsObsComparator,
    │   │   │                        # InSituSensorModal, DepthSliceStandalone)
    │   │   └── ui/                  # Application Screens (operations-page, depth-slice-page,
    │   │                            # details-page, about-page, landing-page)
    │   ├── services/                # API Clients (oceanApi.ts, inSituSensorData.ts)
    │   ├── workers/                 # Web Workers (sliceDecoder, vectorProcessor, isosurface)
    │   ├── store/                   # Zustand Global State (useOceanStore.ts)
    │   └── lib/                     # Algorithms (anomalyEngine, bathymetry, colorScales)
    └── public/                      # Static Assets, Bathymetry Models, Earth Simulation
```
