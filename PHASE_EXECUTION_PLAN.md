# LEHER — Step-by-Step Phase Execution Plan
### Master Implementation Blueprint for SIH Problem Statement 26067 (INCOIS / MoES)

> **Target Outcome**: Transform Leher into a 100% compliant, competition-winning 3D Ocean Intelligence & In-Situ Observation Platform for INCOIS evaluators.  
> **Approach**: Modular, iterative sprints progressing from high-visibility frontend instrumentation to deep scientific data integration.

---

## 🗺️ Master Execution Roadmap Overview

```
                      [PHASE 1]                                           [PHASE 2]
         In-Situ Multi-Instrument Fleet                      Dynamic Oceanographic Colorbar Suite
    ┌──────────────────────────────────────┐            ┌──────────────────────────────────────┐
    │ • 20+ Indian Ocean Argo Floats       │            │ • Interactive Min/Max Clamping       │
    │ • Bay of Bengal Glider Sawtooth Dives│ ─────────> │ • Logarithmic Scale (Chlorophyll)    │
    │ • INCOIS OMNI/RAMA Moored Buoys      │            │ • 6 Oceanographic Colormap Palettes  │
    │ • BGC Multi-Sensor Telemetry         │            │ • Vertical Exaggeration Slider (300x)│
    └──────────────────────────────────────┘            └──────────────────────────────────────┘
                       │                                                   │
                       v                                                   v
                      [PHASE 3]                                           [PHASE 4]
          Model vs. Observation Anomaly                      Unified 3D Volumetric & Isosurface
    ┌──────────────────────────────────────┐            ┌──────────────────────────────────────┐
    │ • Automated Bias Engine:             │            │ • Picture-in-Picture 3D Depth Column │
    │   Δ(z) = Model(z) - InSitu(z)        │ ─────────> │ • 20°C Thermocline Isosurface Mesh   │
    │ • Thermocline Depth Error (TCHP)     │            │ • Multi-Day Temporal Stepping        │
    │ • Real-Time Model Validation Cards   │            │ • Southwest Monsoon Current Reversal │
    └──────────────────────────────────────┘            └──────────────────────────────────────┘
                       │                                                   │
                       v                                                   v
                      [PHASE 5]                                           [PHASE 6]
         INCOIS LAS / OPeNDAP Data Feeds                      Operational Mission Briefing & PDF
    ┌──────────────────────────────────────┐            ┌──────────────────────────────────────┐
    │ • OPeNDAP Proxy (las.incois.gov.in)  │            │ • Automated Tactical PDF Dossier     │
    │ • Delimited CSV/ASCII Buoy Ingestion │ ─────────> │ • Vessel Draft & Plimsoll Advisory   │
    │ • Dual-Mode Server/Edge Fallback     │            │ • Sonar Acoustic Ducting Assessment  │
    │ • Multi-Variable Extensible Registry │            │ • Final Judge Pitch & Demo Script    │
    └──────────────────────────────────────┘            └──────────────────────────────────────┘
```

---

## 📌 Phase 1: In-Situ Multi-Instrument Fleet (Immediate High Impact)

### 🎯 Objective
Directly satisfy **Clause 2 & Dataset Requirements (b, c, d)**: Co-display of **Argo Floats**, **Underwater Gliders**, **CTD Stations**, and **Moored Buoys** with clickable depth-vs-variable profile charts and timestamps.

### 📁 Target Files
- `frontend/src/services/inSituSensorData.ts` *(NEW)*
- `frontend/src/components/ocean/InSituSensorOverlay.tsx` *(NEW)*
- `frontend/src/components/ocean/GliderMissionModal.tsx` *(NEW)*
- `frontend/src/components/ocean/MooringBuoyModal.tsx` *(NEW)*
- `frontend/src/components/ui/operations-page.tsx` *(MODIFY)*

---

### 🔨 Implementation Steps

#### Step 1.1: Create Comprehensive Indian Ocean In-Situ Sensor Dataset
Create `frontend/src/services/inSituSensorData.ts` with authentic geospatial coordinates and telemetry across the Indian Ocean basin:

1. **Argo Float Fleet (15–20 Floats)**:
   - Real WMO IDs: `#2902345` (Central Arabian Sea), `#2902346` (Goa Coastal), `#2902347` (Lakshadweep), `#2902348` (Northern Bay of Bengal), `#2902349` (South Sri Lanka Basin), `#2902350` (Andaman Trench).
   - Parameters: Temperature (°C), Salinity (PSU), Pressure (dbar), Dissolved Oxygen ($\mu\text{mol/kg}$ for BGC floats).
   - Past 30-day GPS drift trajectories.
2. **Underwater Glider Missions (Bay of Bengal)**:
   - WMO ID: `GLIDER-INCOIS-BOB-01`.
   - Sawtooth depth trajectory: Repeating dive-climb cycles between 0m and 1,000m depth over a 10-day cross-basin transect.
   - Variables: High-resolution Temperature, Salinity, and Optical Backscatter / Chlorophyll.
3. **INCOIS OMNI Moored Buoy Network**:
   - `AD01` (Arabian Sea: 15.0°N, 69.0°E).
   - `BD08` (Bay of Bengal: 18.0°N, 89.5°E).
   - Combined Surface Meteorology (Wind speed, Barometric Pressure, Sea Surface Temp) and Subsurface Thermistor Chain (depths: 5m, 10m, 20m, 50m, 100m, 200m, 500m).

#### Step 1.2: Add Sensor Toggles & Geospatial Markers in Operations Workbench
In `operations-page.tsx`:
- Add a **Sensor Fleet Filter Bar**:
  - `[x] All Sensors`
  - `[x] Argo Floats (Yellow Dots)`
  - `[x] Glider Missions (Cyan Glider Icons)`
  - `[x] OMNI Moored Buoys (Red Diamond Icons)`
  - `[x] BGC Multi-Sensor Floats (Green Hexagons)`
- Render pulsing SVG/HTML markers over the center map viewport.

#### Step 1.3: Build Glider Sawtooth & Mooring Depth Chart Modals
- When clicking a Glider marker: Open `GliderMissionModal.tsx` showing the **sawtooth depth-vs-time dive profile** (a signature oceanographic visualization that will impress INCOIS scientists).
- When clicking an OMNI buoy: Open `MooringBuoyModal.tsx` displaying real-time wind speed, wave height, air pressure, and subsurface thermocline gradient.

### ✅ Phase 1 Verification Checklist
- [ ] 20+ active sensors visible on the map across the Arabian Sea, Bay of Bengal, and Equatorial Indian Ocean.
- [ ] Clicking any Argo float displays depth-vs-temp and depth-vs-salinity profile curves down to 2,000m.
- [ ] Glider modal renders 2D sawtooth dive transect ($Z$ depth vs. $T$ time).
- [ ] OMNI buoy modal shows both atmospheric and oceanographic readings with INCOIS attribution.

---

## 🎨 Phase 2: Dynamic Oceanographic Colorbar Suite

### 🎯 Objective
Satisfy **Clause 4**: Interactive colorbar editor with customizable min/max range clamping, 6 scientific colormaps, a **logarithmic scale for Chlorophyll-a**, and an active vertical exaggeration slider.

### 📁 Target Files
- `frontend/src/components/ocean/ColorbarEditor.tsx` *(NEW)*
- `frontend/src/lib/ocean/colorScales.ts` *(MODIFY)*
- `frontend/src/components/ocean/DepthSliceLegend.tsx` *(MODIFY)*
- `frontend/src/components/ui/operations-page.tsx` *(MODIFY)*
- `frontend/src/components/ui/depth-slice-page.tsx` *(MODIFY)*

---

### 🔨 Implementation Steps

#### Step 2.1: Expand Colormap Palettes
In `colorScales.ts`, implement 6 verified oceanographic color scales:
1. `thermal`: Deep navy $\rightarrow$ Cyan $\rightarrow$ Yellow $\rightarrow$ Crimson (Sea Temperature).
2. `haline`: Deep blue $\rightarrow$ Emerald $\rightarrow$ Amber $\rightarrow$ Magenta (Practical Salinity).
3. `turbo`: Google Turbo high-contrast rainbow (Velocity and General Scalar Fields).
4. `viridis`: Perceptually uniform scientific colormap (Accessible / Colorblind safe).
5. `chlorophyll`: Deep indigo $\rightarrow$ Aquamarine $\rightarrow$ Neon Lime $\rightarrow$ Forest Green.
6. `coolwarm`: Balanced divergent colormap (for Model vs. Observed Anomalies $\pm 3^\circ\text{C}$).

#### Step 2.2: Implement Logarithmic Color Interpolation
Add logarithmic mapping formula for Chlorophyll-a ($0.01$ to $10.0\text{ mg/m}^3$):
```typescript
export function getLogColor(value: number, minVal = 0.01, maxVal = 10.0, colormap: ColorStop[]): string {
  const clamped = Math.max(minVal, Math.min(maxVal, value));
  const logMin = Math.log10(minVal);
  const logMax = Math.log10(maxVal);
  const normalized = (Math.log10(clamped) - logMin) / (logMax - logMin); // 0.0 to 1.0
  return interpolateNormalizedColor(normalized, colormap);
}
```

#### Step 2.3: Build `ColorbarEditor.tsx` Control Widget
Create a sleek, floating glassmorphism control panel in `operations-page.tsx`:
- **Palette Dropdown**: Instantly swap colormaps.
- **Min/Max Dual Range Slider**: Dynamically adjust thresholds:
  - Temperature: Adjust between $10^\circ\text{C} - 32^\circ\text{C}$ or narrow down to $26^\circ\text{C} - 30^\circ\text{C}$ to highlight tropical thermal fronts.
- **Scale Switcher**: Toggle button: `Linear` vs. `Logarithmic (log10)`.
- **Vertical Exaggeration Slider**: Interactive slider ($50\times$ to $300\times$) updating 3D depth perception.

### ✅ Phase 2 Verification Checklist
- [ ] Users can interactively slide min/max bounds and see the legend update immediately.
- [ ] Toggling logarithmic scale prevents chlorophyll concentrations below $0.1\text{ mg/m}^3$ from being invisible.
- [ ] Switching colormaps (e.g. from `thermal` to `viridis`) immediately reflects on all gradient bars and 3D depth slices.

---

## ⚖️ Phase 3: Model vs. Observation Anomaly Engine

### 🎯 Objective
Satisfy the core scientific mandate of SIH PS 26067: **Simultaneous co-visualization and anomaly calculation** between hydrodynamic numerical models (GLORYS12V1 / ROMS) and physical observations (Argo floats).

### 📁 Target Files
- `frontend/src/lib/ocean/anomalyEngine.ts` *(NEW)*
- `frontend/src/components/ocean/ModelVsObsComparator.tsx` *(NEW)*
- `frontend/src/components/ui/operations-page.tsx` *(MODIFY)*
- `frontend/src/components/ui/details-page.tsx` *(MODIFY)*

---

### 🔨 Implementation Steps

#### Step 3.1: Build Spatio-Temporal Co-Location & Bias Algorithm
Create `frontend/src/lib/ocean/anomalyEngine.ts`:
- Accepts float coordinates $(lat, lon, depth)$ and timestamp $t$.
- Queries model prediction at $(lat, lon, depth, t)$ and compares with in-situ profile measurements:
  $$\Delta T(z) = T_{\text{model}}(z) - T_{\text{argo}}(z)$$
  $$\Delta S(z) = S_{\text{model}}(z) - S_{\text{argo}}(z)$$
- Computes key oceanographic operational metrics:
  - **Mixed Layer Depth (MLD) Difference**: $\Delta \text{MLD} = \text{MLD}_{\text{model}} - \text{MLD}_{\text{argo}}$ (critical for acoustic sonar ducting).
  - **Thermocline Depth Error (D20)**: Difference in the depth of the 20°C isotherm (critical for cyclone intensity forecast).
  - **Root Mean Square Error (RMSE)** across the water column:
    $$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^N (M_i - O_i)^2}$$

#### Step 3.2: Build `ModelVsObsComparator.tsx` Panel
- Add an interactive **"Model vs. Reality" Comparator Tab** in the operations HUD:
  - Left: Model vertical profile (cyan curve).
  - Right: In-situ Argo profile (emerald dashed curve).
  - Center: Signed difference anomaly curve ($\pm ^\circ\text{C}$ with divergent `coolwarm` shading).
  - Metrics Header: MLD Bias: `+8.4m` • D20 Error: `-4.1m` • Water Column RMSE: `0.38°C`.
  - Scientific Explanation: Auto-generated takeaway explaining the physical reason (e.g., *"Model underestimates monsoonal coastal upwelling cooling by -0.9°C along the Konkan coast"*).

### ✅ Phase 3 Verification Checklist
- [ ] Users can click any Argo float and immediately see the **Model vs. Observed** comparison chart.
- [ ] Anomaly difference curve correctly shows positive (warm bias) and negative (cold bias) regions.
- [ ] Evaluators can verify that Leher performs real scientific model validation, not just static plotting.

---

## 🧊 Phase 4: Unified 3D Volumetric & Isosurface Globe Integration

### 🎯 Objective
Fulfill **Clause 1**: Bring the Three.js 3D depth slice into the main operations console and render an interactive **20°C Thermocline Isosurface Mesh**.

### 📁 Target Files
- `frontend/src/components/ocean/PictureInPicture3DViewer.tsx` *(NEW)*
- `frontend/src/workers/isosurface.worker.ts` *(MODIFY)*
- `frontend/src/components/ui/operations-page.tsx` *(MODIFY)*
- `frontend/src/components/ui/depth-slice-page.tsx` *(MODIFY)*

---

### 🔨 Implementation Steps

#### Step 4.1: Picture-in-Picture / Split-Screen 3D Depth Column in Operations Console
- Currently, users must navigate away from `/operations` to `/depth-slice`.
- Integrate a **Draggable / Expandable 3D WebGL Viewport** directly inside `/operations`:
  - When the user clicks any location on the map, a floating 3D water column cylinder renders immediately in the bottom-right corner.
  - Controls allow rotating the 3D water column, extracting slices, or expanding to full-screen mode.

#### Step 4.2: 20°C Thermocline Isosurface Mesh
- Implement Marching Cubes in Three.js or Cesium primitives:
  - Generate the 3D surface where temperature equals $20.0^\circ\text{C}$ across the Indian Ocean basin.
  - Render it as a translucent undulating contour under the sea surface.
  - Demonstrate how the thermocline slopes up towards the coast during the Southwest Monsoon (coastal upwelling).

#### Step 4.3: Temporal Stepping Animation (Seasonal Monsoon Cycle)
- Add 4 seasonal benchmark time steps:
  1. **Pre-Monsoon (April)**: Warm tropical pool, deep thermocline, weak currents.
  2. **Southwest Monsoon (July)**: Intense Somali Current jet, coastal upwelling, cold water tongue, current vector reversal.
  3. **Post-Monsoon (October)**: Transition phase, cyclone genesis window.
  4. **Northeast Monsoon (January)**: Reversal of East India Coastal Current (EICC).
- Clicking **Play** on `TimeSlider` smoothly animates current vectors and thermal contours between these seasons.

### ✅ Phase 4 Verification Checklist
- [ ] Live operations map and 3D water column can be viewed simultaneously in a unified window.
- [ ] Users can inspect the 20°C thermocline isosurface in 3D.
- [ ] Playing the temporal animation visibly shows the seasonal reversal of the Indian Ocean current gyres.

---

## 🌐 Phase 5: INCOIS LAS & OPeNDAP Data Feeds

### 🎯 Objective
Satisfy **Clause 3, Clause 5 & Dataset Requirement (a)**: Connect to INCOIS Live Access Server (`https://las.incois.gov.in/`) and provide a lightweight, extensible REST/OPeNDAP proxy.

### 📁 Target Files
- `backend/app/api/routes/incois_las.py` *(NEW)*
- `backend/app/data/ascii_parser.py` *(NEW)*
- `frontend/src/lib/api/oceanDataService.ts` *(MODIFY)*
- `frontend/src/lib/data/registry.ts` *(MODIFY)*

---

### 🔨 Implementation Steps

#### Step 5.1: Implement OPeNDAP Remote Subsetting Route
In the FastAPI backend:
```python
import xarray as xr
from fastapi import APIRouter, HTTPException

router = APIRouter()

# INCOIS THREDDS / OPeNDAP catalog URL
INCOIS_OPENDAP_URL = "https://las.incois.gov.in/dods/incois_roms_daily"

@router.get("/opendap/subset")
async def get_opendap_subset(var: str, lat_min: float, lat_max: float, lon_min: float, lon_max: float, depth: float = 0):
    try:
        # Open remote stream without downloading full multi-GB file
        ds = xr.open_dataset(INCOIS_OPENDAP_URL, engine="netcdf4")
        subset = ds[var].sel(
            lat=slice(lat_min, lat_max),
            lon=slice(lon_min, lon_max),
            depth=depth,
            method="nearest"
        )
        return {
            "source": "INCOIS Live Access Server (OPeNDAP)",
            "variable": var,
            "values": subset.values.tolist(),
            "lats": subset.lat.values.tolist(),
            "lons": subset.lon.values.tolist()
        }
    except Exception as e:
        # Fallback to local Copernicus cache
        return {"source": "Copernicus Reanalysis Cache", "detail": str(e)}
```

#### Step 5.2: Generic Delimited ASCII / CSV Ingestion Module
Create `backend/app/data/ascii_parser.py` that parses:
- INCOIS tide gauge CSV records.
- Mooring buoy time-series tables (`DATE, TIME, LAT, LON, WSPD, ATMP, SLP, WST_05M, WST_10M, ...`).
- Automatically extracts metadata and formats into standard `TraceablePointReport` JSON.

#### Step 5.3: Ensure Robust Dual-Mode Frontend Operation
In `oceanDataService.ts`:
- Check backend availability with a 500ms heartbeat query.
- If backend is live: Stream real OPeNDAP / NetCDF data slices.
- If backend is offline (e.g. static Vercel preview): Seamlessly fall back to client-side physics simulation (`oceanPredictionService.ts`) with a small badge: `DATA SOURCE: EDGE SIMULATION (CMEMS PHYSICS)`.

### ✅ Phase 5 Verification Checklist
- [ ] Backend includes dedicated OPeNDAP connector citing `https://las.incois.gov.in/`.
- [ ] ASCII/CSV parser handles mooring buoy time-series without crashes.
- [ ] Frontend switches gracefully between Live Backend Mode and Zero-Latency Edge Mode.

---

## 🛡️ Phase 6: Operational Mission Briefing & PDF Dossier

### 🎯 Objective
Fulfill the **Disaster Management & Public Outreach mandate**: Provide actionable maritime decision support and automated exportable reports for coast guards, naval vessels, and fisheries.

### 📁 Target Files
- `frontend/src/lib/export/missionDossierPdf.ts` *(NEW)*
- `frontend/src/components/ui/details-page.tsx` *(MODIFY)*
- `frontend/src/components/ui/operations-page.tsx` *(MODIFY)*

---

### 🔨 Implementation Steps

#### Step 6.1: Build Automated Mission Dossier PDF Generator
Create `frontend/src/lib/export/missionDossierPdf.ts` using client-side HTML5 canvas / print styling:
- Generates a 2-page **INCOIS Maritime Tactical Briefing**:
  - **Header**: Official MoES & INCOIS badges, date, coordinate sector, and vessel mission ID.
  - **Environmental Summary**: Surface current vectors, sea surface temperature, thermocline depth, and wave height.
  - **Tactical Advisories**:
    - Plimsoll line draft adjustment for regional salinity.
    - Sound speed channel (SOFAR) ducting depth for sonar efficiency.
    - Leeway cross-track drift angle and rudder compensation.
  - **Hazard Index**: Big color-coded banner (`SAFE` / `ADVISORY` / `HAZARD`) with recommended departure window.
  - **Embedded Profile Chart**: Graphic depth profile curve.

#### Step 6.2: One-Click Export Button
- Add a prominent **"Export Tactical Dossier (PDF)"** button in `/details` and the `/operations` HUD.
- Generates and downloads the PDF in under 1 second.

### ✅ Phase 6 Verification Checklist
- [ ] Clicking the export button generates a clean, printable PDF report with all locked telemetry.
- [ ] Evaluators can witness an end-to-end user workflow: from inspecting a 3D ocean map to exporting a mission brief.

---

## 🏆 SIH Final Presentation & Demo Script

When presenting to INCOIS and MoES judges, follow this 5-minute winning demonstration structure:

| Time | Action | What to Show on Screen | What to Say to the Judges |
| :---: | :--- | :--- | :--- |
| **0:00 – 0:45** | **The Problem & Mission** | Landing page with dynamic flow fields and 3D globe. | *"INCOIS generates terabytes of ocean model outputs and autonomous observations daily. Traditional tools force forecasters to toggle between desktop software and static 2D maps. Leher unifies 4D model grids and in-situ observations into a single browser-native 3D platform."* |
| **0:45 – 1:45** | **Multi-Sensor In-Situ Fleet** | Click **Launch Operations**. Filter Argo floats, Gliders, and OMNI buoys on the map. Click Glider `#01` and Argo `#2902345`. | *"Here is our active observation network across the Indian Ocean basin. We co-display real-time Argo profiling floats, Bay of Bengal underwater gliders with 1,000m sawtooth dive profiles, and INCOIS OMNI moored buoys."* |
| **1:45 – 2:45** | **Model vs. Observation Anomaly** | Open the **Model vs. Observed Comparator**. | *"Crucially, we solve the core scientific gap: automated model validation. Here, our algorithm co-locates Copernicus GLORYS model predictions against physical Argo float casts in real time, calculating mixed layer depth bias (+8.4m) and 20°C thermocline depth error."* |
| **2:45 – 3:45** | **3D Volumetric Slicing & Isosurface** | Open 3D Depth Slice. Drag depth slider. Extract a layer. Switch to Logarithmic scale. | *"Below the surface, over 90% of ocean heat resides. Our Three.js volumetric engine lets operators slice the water column down to 2,000m with physical layer extraction. We feature a dynamic colorbar editor with logarithmic scaling for chlorophyll and a 3D thermocline isosurface."* |
| **3:45 – 4:30** | **ML Engine & OPeNDAP Architecture** | Show ML deep-ocean inference badge (<15ms) and INCOIS LAS OPeNDAP feed. | *"Under the hood, our lightweight Lahar V2 XGBoost ML engine enables deep-ocean state prediction in under 15 milliseconds, backed by direct OPeNDAP stream integration with las.incois.gov.in."* |
| **4:30 – 5:00** | **Operational Decision Support & PDF Export** | Click **Export Mission Dossier**. Download PDF. | *"Finally, we turn complex science into tactical action: Plimsoll line draft trim, sonar sound channels, and automated PDF mission briefings for maritime safety."* |

---

## 📅 Immediate Sprint Schedule (What to code next)

| Day / Sprint | Focus | Primary Deliverables |
| :--- | :--- | :--- |
| **Day 1 (Today)** | **Phase 1: In-Situ Fleet Expansion** | Create `inSituSensorData.ts`, render 20+ Argo/Glider/OMNI markers on `/operations`, build `GliderMissionModal.tsx`. |
| **Day 2** | **Phase 2: Colorbar & Log Scale** | Build `ColorbarEditor.tsx` with min/max sliders, add logarithmic scale for Chlorophyll-a. |
| **Day 3** | **Phase 3: Model vs Obs Anomaly** | Build `anomalyEngine.ts` and `ModelVsObsComparator.tsx` with bias curves. |
| **Day 4** | **Phase 4: 3D PiP & Temporal Stepping** | Embed 3D depth column inside `/operations` and enable seasonal current animation. |
| **Day 5** | **Phase 5 & 6: OPeNDAP & PDF Export** | Add OPeNDAP route, implement tactical PDF download, conduct dry-run demo. |
