import * as Cesium from 'cesium';
import type { OceanRegion } from '@/types/ocean';
import { registerOceanMaterials } from './materials/oceanShaderMaterial';

export interface ViewerInitOptions {
  container: HTMLElement;
}

// Initial Indian Ocean Overview — centered over Indian subcontinent at altitude
// showing Arabian Sea, Bay of Bengal, and surrounding waters together
export const INITIAL_CAMERA_VIEW = {
  destination: Cesium.Cartesian3.fromDegrees(78.5, 14.0, 5200000.0),
  orientation: {
    heading: Cesium.Math.toRadians(0.0),
    pitch: Cesium.Math.toRadians(-88.0),
    roll: 0.0,
  },
};

export class OceanViewerManager {
  private viewer: Cesium.Viewer | null = null;
  private handler: Cesium.ScreenSpaceEventHandler | null = null;

  public initViewer(options: ViewerInitOptions): Cesium.Viewer {
    if (this.viewer && !this.viewer.isDestroyed()) {
      return this.viewer;
    }

    // Cesium Ion token — use the free public token
    // Users can replace this with their own token from https://ion.cesium.com
    Cesium.Ion.defaultAccessToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlZGM3NTdmZi00Mjk0LTRhOGYtODhhYS0xN2EyNjBkYTY1NzMiLCJpZCI6MTU2MDcsImlhdCI6MTY3MTIwMzU2OH0.m9VzL434g61t-X3f6sAomK2Q_7s9cO2sB1r4pM9QdLo';

    registerOceanMaterials();

    const viewer = new Cesium.Viewer(options.container, {
      animation: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      navigationHelpButton: false,
      navigationInstructionsInitiallyVisible: false,
      scene3DOnly: true,
      shouldAnimate: true,
      orderIndependentTranslucency: true,
      // Use Photorealistic ESRI World Imagery for natural green land and blue oceans
      imageryProvider: new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maximumLevel: 19,
        credit: '© Esri, Earthstar Geographics',
      }),
      contextOptions: {
        webgl: {
          alpha: true,
          depth: true,
          stencil: true,
          antialias: true,
          powerPreference: 'high-performance',
        },
      },
    });

    // Globe appearance - photorealistic Earth with full daytime illumination
    viewer.scene.globe.enableLighting = false; // Keep land and oceans brightly lit, no harsh night shadows
    viewer.scene.globe.depthTestAgainstTerrain = false;
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#021a38');
    viewer.scene.backgroundColor = new Cesium.Color(0.01, 0.04, 0.09, 1.0);

    // Atmosphere tinted for realistic blue horizon
    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.show = true;
      viewer.scene.skyAtmosphere.hueShift = 0.0;
      viewer.scene.skyAtmosphere.saturationShift = 0.1;
      viewer.scene.skyAtmosphere.brightnessShift = 0.05;
    }

    // Hide the Cesium credit / branding bar (we have our own)
    const creditContainer = viewer.cesiumWidget.creditContainer as HTMLElement;
    creditContainer.style.display = 'none';

    // Set initial camera synchronously — India & Indian Ocean overview
    viewer.camera.setView(INITIAL_CAMERA_VIEW);

    this.viewer = viewer;
    this.handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    return viewer;
  }

  public getViewer(): Cesium.Viewer | null {
    return this.viewer && !this.viewer.isDestroyed() ? this.viewer : null;
  }

  public getHandler(): Cesium.ScreenSpaceEventHandler | null {
    return this.handler;
  }

  /** Fly camera back to India / Indian Ocean full overview */
  public flyToIndiaOverview(duration = 2.0) {
    if (!this.viewer || this.viewer.isDestroyed()) return;
    this.viewer.camera.flyTo({
      destination: INITIAL_CAMERA_VIEW.destination,
      orientation: INITIAL_CAMERA_VIEW.orientation,
      duration,
      easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
    });
  }

  /**
   * Fly camera to a selected ocean region.
   * When offsetGlobe=true, shifts the camera angle to leave room for the 3D depth slice panel.
   */
  public flyToRegion(region: OceanRegion, offsetGlobe = false, duration = 2.0) {
    if (!this.viewer || this.viewer.isDestroyed()) return;

    const lonOffset = offsetGlobe ? -5.5 : 0.0;
    const latOffset = offsetGlobe ? -2.0 : 0.0;
    const height = offsetGlobe ? region.center.zoomDistance * 1.35 : region.center.zoomDistance;

    const targetPos = Cesium.Cartesian3.fromDegrees(
      region.center.lon + lonOffset,
      region.center.lat + latOffset,
      height
    );

    const pitchAngle = offsetGlobe ? -52.0 : -75.0;

    this.viewer.camera.flyTo({
      destination: targetPos,
      orientation: {
        heading: Cesium.Math.toRadians(offsetGlobe ? 15.0 : 0.0),
        pitch: Cesium.Math.toRadians(pitchAngle),
        roll: 0.0,
      },
      duration,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }

  public destroy() {
    if (this.handler && !this.handler.isDestroyed()) {
      this.handler.destroy();
      this.handler = null;
    }
    if (this.viewer && !this.viewer.isDestroyed()) {
      this.viewer.destroy();
      this.viewer = null;
    }
  }
}

export const oceanViewerManager = new OceanViewerManager();
