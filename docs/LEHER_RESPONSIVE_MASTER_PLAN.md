# LEHER Responsive Design & Multi-Device Optimization Master Plan
**Platform:** Indian Ocean Maritime Safety & Hazard Intelligence Platform (LEHER)  
**Standard:** WCAG 2.1 AA Compliant, Mobile-First, Touch-Optimized, Cross-Browser (iOS / Android / Desktop)  
**Target Viewports:** 320px (Mobile Compact) → 768px (Tablet) → 1024px (Laptop) → 1440px (Desktop) → 2560px+ (Ultra-Wide/4K)

---

## 1. Executive Summary & Problem Analysis

LEHER delivers high-fidelity 3D bathymetry, 3D volumetric ocean depth slicing, real-time in-situ sensor telemetry (Argo, Gliders, Mooring buoys), and predictive hazard intelligence. While the desktop experience is rich and immersive, real-world maritime users—including **coastal fishing vessel operators, offshore patrol crews, marine scientists in the field, and port command centers**—frequently access the platform via **mobile smartphones, ruggedized tablets, and shipboard touch consoles**.

### Key Responsive Audit Findings:
1. **Depth Slice 3D Viewport Collapse (`depth-slice-page.tsx`)**:
   - The desktop layout features a 3-column architecture: a left parameter dock (`w-80` to `w-380px`), a center Three.js 3D canvas (`flex-1`), and a right intelligence dock (`w-80` to `w-430px`).
   - On screens `< 1024px`, having both side panels visible squeezes the 3D canvas into a narrow strip or pushes content off-screen horizontally (> 700px minimum width required).
2. **Fixed Pixel Overlays & Off-Screen Clipping (`PointDepthPanel.tsx` & `LocationInspector.tsx`)**:
   - `PointDepthPanel` has fixed CSS `width: 420px; right: 24px`. On devices under 440px (e.g. iPhone SE at 375px or Galaxy S22 at 360px), this causes severe horizontal overflow.
   - `LocationInspector` has hardcoded `right: selectedRegion ? '420px' : '28px'`, causing it to render completely off-screen on mobile devices.
3. **Interactive 3D Globe & Iframe Scroll-Traps (`landing-page.tsx`)**:
   - On mobile, scrolling through the landing page causes users to get "trapped" in the 3D Earth iframe or Globe canvas, where swipe gestures rotate the map rather than scrolling the page.
   - The floating 3D globe sits at `top: 66vh, left: 50vw` on mobile, colliding with action buttons and workflow step cards.
4. **Operations Console Preview Stacking (`landing-page.tsx`)**:
   - The 12-column workbench preview stacks vertically into 3 blocks on mobile, requiring excessive scrolling past inputs and the iframe to reach the prediction answers.
5. **Header Clutter & Touch Targets (`app-navbar.tsx`, `details-page.tsx`)**:
   - The Details page top navigation bar contains 5 action buttons and real-time clock. On mobile devices (< 640px), these crowd the header and cause layout wrapping.
   - Touch targets for preset buttons (e.g. depth preset ticks, coordinates inputs) are under 32px tall, creating friction on touchscreen devices.

---

## 2. Universal Breakpoint System & Grid Foundation

To ensure harmonious scaling across all screens, LEHER adopts Tailwind CSS v4's fluid scale, supplemented with device-specific container boundaries:

| Breakpoint Tier | Screen Range | Primary Devices | Layout Strategy |
| :--- | :--- | :--- | :--- |
| **`xs` (Compact Mobile)** | 320px – 479px | iPhone SE, Galaxy S21/S22/S23, Pixel 7a | Single-column stacked; drawer/modal bottom sheets; tab bar navigation; compact floating HUDs; 44px min touch targets. |
| **`sm` (Large Mobile / Phablet)** | 480px – 767px | iPhone Pro Max, Galaxy Ultra, Folded Devices | Fluid single column with 2-col mini grids; sticky bottom sheets; horizontal swipe tabs with edge fades. |
| **`md` (Tablets / Foldables)** | 768px – 1023px | iPad Mini, iPad 10th Gen, Galaxy Tab A/S | Hybrid layout; collapsible side-drawers; slide-over panels; floating bottom docks with auto-minimize. |
| **`lg` (Laptops / Landscape Tablet)** | 1024px – 1279px | iPad Pro 12.9" landscape, MacBook Air 13" | 2-column or docked 3-column with auto-compact widths; split-screen 3D globe & workbench. |
| **`xl` (Desktop)** | 1280px – 1535px | Standard 1080p Desktop, iMac 24" | Full expansive multi-column workspaces; side-by-side telemetry & 3D canvas; persistent inspection tools. |
| **`2xl` (Ultra-Wide / 4K)** | 1536px – 3840px+ | QHD 1440p, 4K UHD, Multi-monitor bridge | Max container containment (`max-w-7xl` or `max-w-[1800px]`); enhanced telemetry grid density. |

---

## 3. Detailed Component & Page Implementation Plan

### Phase 1: Global Navigation & Foundation (`AppNavbar.tsx`, `index.html`, `index.css`)
- **Viewport Meta & Safe Areas**:
  - Update `index.html` viewport meta tag to support iOS safe-area-insets:
    `viewport-fit=cover, width=device-width, initial-scale=1.0, maximum-scale=5.0`.
  - Add safe area utility padding classes (`pb-[env(safe-area-inset-bottom)]`) to mobile drawers and bottom floating docks.
- **Dynamic Mobile Header (`AppNavbar.tsx`)**:
  - Responsive height: `h-16` (64px) on mobile (`< md`), `h-20` (80px) on desktop (`>= md`).
  - Mobile action bar: Include a prominent compact "Launch" icon button in the header so mobile users can jump straight to the platform without opening the hamburger drawer.
  - Hamburger Drawer: Full viewport height with smooth backdrop blur, high-contrast touchable nav tiles, and safe-area margin at the bottom.

### Phase 2: Landing Page & Operational Workflow (`landing-page.tsx`, `how-it-works.tsx`)
- **3D Globe Positioning & Interaction Guard**:
  - Implement a mobile gesture lock: When viewing on mobile (`< 1024px`), disable direct pointer scroll-trapping by default and show a subtle floating badge: *"Tap globe to interact with 3D Earth"* or use pointer-events management.
  - Responsive Globe scaling: Adjust `currentScale` dynamically based on screen width (`0.55` on `< 480px`, `0.70` on `480px-768px`, `0.85` on `768px-1024px`, `1.2` on desktop).
  - Ensure the globe does not sit directly behind the Hero CTA buttons, maintaining clean contrast and legibility.
- **How It Works (`how-it-works.tsx`)**:
  - Mobile: Clean vertical workflow timeline with step cards stacked neatly (`flex flex-col space-y-6`).
  - Tap-to-inspect popups: On mobile touch screens where `:hover` is unavailable, support tap/click toggles for the educational popups.
- **Workbench Operations Console Preview (`landing-page.tsx`)**:
  - For `< lg` screens, add a segmented tab bar: `[Controls]` | `[3D Earth Map]` | `[Prediction Answers]`.
  - On desktop (`lg+`), maintain the side-by-side 3-column console grid.
- **Copernicus Parameter Dossier Modal**:
  - Replace static multi-column header with a responsive vertical stack.
  - Convert the 10-parameter grid into mobile-optimized collapsible cards with prominent metric badges.

### Phase 3: Operations & 3D Globe Workbench (`operations-page.tsx`)
- **Mobile Split Navigation**:
  - Refine the existing tab toggle (`3D Globe View` vs `Operations Workbench`):
    - Ensure smooth transitions and persistent state.
    - Provide a quick floating toggle button on the 3D map: *"Open Parameters (10)"* with badge indicator.
  - Floating Coordinate HUD:
    - On mobile, render a compact floating pill at the bottom center (`bottom-4 px-3 py-1.5`) with tap-to-expand capabilities.
  - In-Situ Sensor Filter & Presets:
    - Enable horizontal swipe scrolling (`overflow-x-auto no-scrollbar`) for location presets and platform category pills.
  - Target Coordinates Modal:
    - Ensure modal inputs, range sliders, and depth ticks are full-width with 44px min touch height.

### Phase 4: Volumetric 3D Depth Slice (`depth-slice-page.tsx`)
- **Responsive Workspace Architecture (The 3-View Mode)**:
  - On desktop (`lg+`): Standard 3-column docked layout with collapsible left and right panels.
  - On mobile/tablet (`< lg`): Convert into a seamless **Single-Focus Responsive Layout** with a bottom navigation bar:
    1. **Tab 1: 3D Water Column** (Expansive Three.js canvas with floating depth scrubber and variable badge).
    2. **Tab 2: Depth & Parameters** (Full-height scrollable parameter list, temperature, salinity, velocity, density).
    3. **Tab 3: Intelligence & Sensors** (Rakshak ML predictions, ecosystem health, nearby Argo/glider profiles).
- **Three.js Canvas Auto-Resize**:
  - Attach a `ResizeObserver` to the canvas container to automatically update `camera.aspect` and trigger `renderer.setSize(newWidth, newHeight)` without stretching the 3D cylinder/cuboid.
- **Touch Orbit Controls**:
  - Configure Three.js `OrbitControls` with `enableDamping = true`, single-finger rotation, two-finger pinch-to-zoom, and vertical angle clamps so users do not invert the ocean floor.

### Phase 5: Maritime Hazard & Tactical Dossier (`details-page.tsx`)
- **Responsive Header & Action Bar**:
  - On screens `< 768px`, replace the 5 horizontal text buttons with a sleek dropdown action menu ("Actions ▾") or compact icon buttons with tooltips.
  - Shorten the header title dynamically:
    - Desktop: `"Maritime Hazard & Environmental Intelligence Dossier"`
    - Mobile: `"Hazard Dossier"`
- **Executive Vital Metrics Banner**:
  - On mobile (`< 640px`), use a clean 2x2 grid with tight padding and clear risk indicators.
- **Horizontal Scroll Tabs**:
  - Add gradient edge fade indicators (`mask-image: linear-gradient(...)`) so mobile users intuitively know more hazard categories exist to the right.
- **Copernicus Variables Matrix**:
  - Provide a responsive card-list view on mobile and full data table on desktop.

### Phase 6: Cesium & Ocean Overlays (`PointDepthPanel.tsx`, `LocationInspector.tsx`, `ControlPanel.tsx`, `InSituSensorModal.tsx`, `ModelVsObsComparator.tsx`)
- **`PointDepthPanel.tsx`**:
  - Replace hardcoded `width: 420px; right: 24px` with responsive classes:
    - Mobile: Full-width bottom sheet (`fixed inset-x-2 bottom-2 top-16 max-h-[85vh] rounded-2xl`).
    - Desktop: Docked right panel (`w-[380px] lg:w-[420px] top-[74px] right-6`).
- **`LocationInspector.tsx`**:
  - Replace hardcoded `right: 420px` with responsive positioning:
    - Mobile: Centered floating pill/card (`inset-x-3 top-20 w-auto`).
    - Desktop: Floating beside the active region panel.
- **`ControlPanel.tsx` (Control Dock)**:
  - On mobile, replace the wide horizontal row with a compact collapsible bottom dock or segmented drawer.
- **`InSituSensorModal.tsx` & `ModelVsObsComparator.tsx`**:
  - Support `max-h-[92vh]` modal sheets with sticky header, touch-friendly tab switches, and responsive SVG charts with scalable `viewBox`.

---

## 4. Device Testing Matrix & Quality Assurance Plan

| Device Category | Target Models | Resolution / Viewport | Specific Test Scenarios |
| :--- | :--- | :--- | :--- |
| **Compact Phone** | iPhone SE (2nd/3rd Gen), Galaxy A10 | 375x667, 360x740 | Header fit, CTA button tap, modal edge clipping, safe area margins. |
| **Standard Phone** | iPhone 13 / 14 / 15, Pixel 7, Galaxy S23 | 390x844, 412x915 | 3D Depth Slice tab switcher, Operations mobile toggle, touch scroll trap check. |
| **Large Phone** | iPhone 15 Pro Max, Galaxy S24 Ultra | 430x932, 412x960 | Executive metric grid 2x2, Dossier action bar, In-situ sensor charts. |
| **Foldable** | Galaxy Z Fold 5 (Folded & Unfolded) | 344x882 (Front), 768x1024 (Inner) | Layout transition on screen unfold / orientation change. |
| **Tablet Portrait**| iPad 10th Gen, iPad Air | 810x1080, 820x1180 | Drawer toggles, Model vs Obs comparator modal, map zoom controls. |
| **Tablet Landscape**| iPad Pro 11", iPad Pro 12.9" | 1194x834, 1366x1024 | 3-column depth slice panel fit, globe side alignment. |
| **Laptop / Desktop**| MacBook Air 13", 1080p Monitor | 1440x900, 1920x1080 | Default expansive layout, hover animations, scrollbar aesthetics. |
| **Ultra-Wide** | 34" Ultrawide, 4K Display | 2560x1080, 3840x2160 | Container max-width alignment (`max-w-7xl`), no edge stretching. |

---

## 5. Success Criteria & Verification Checklist

- [ ] **Zero Horizontal Page Overflow**: No unexpected horizontal scrollbar on any screen size from 320px to 4K.
- [ ] **No Scroll Traps**: Mobile users can scroll freely through landing pages without 3D canvas / iframes capturing touch swipes unintentionally.
- [ ] **Accessible Touch Targets**: All interactive elements (buttons, preset pills, range sliders, close triggers) have a touch target of at least 44x44px.
- [ ] **Viewport Fit & Safe Areas**: Layouts respect notch, dynamic island, and home indicator bars on modern smartphones.
- [ ] **Three.js & Canvas Dynamic Resizing**: 3D ocean column slice and Cesium globe adapt instantly to screen orientation and window resizing without distortion.
- [ ] **Font Legibility**: Hierarchy is maintained across screen sizes without awkward line wrapping or text truncation of critical scientific data.
- [ ] **Performance**: Fast 60 FPS scrolling and lightweight CSS transforms across mobile and tablet hardware.
