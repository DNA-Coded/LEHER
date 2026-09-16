import { create } from 'zustand';
import type { OceanVariable, AnimationState, ColorScaleName, VisualizationState } from '../types/ocean';
import { getRegionById } from '../utils/regions';
import { OCEAN_VARIABLES } from '../utils/variables';

interface OceanStoreActions {
  setSelectedRegion: (regionId: string | null) => void;
  setHoveredRegion: (regionId: string | null) => void;
  setVariable: (variable: OceanVariable) => void;
  setDepth: (depth: number) => void;
  setTime: (time: string) => void;
  setAnimationState: (animationState: AnimationState) => void;
  setGlobeOffset: (globeOffset: number) => void;
  setColorScale: (colorScale: ColorScaleName) => void;
  setOpacity: (opacity: number) => void;
  setDepthScaleFactor: (depthScaleFactor: number) => void;
  setVerticalExaggeration: (verticalExaggeration: number) => void;
  setIsPlayingTime: (isPlayingTime: boolean) => void;
  setActiveArgoFloatId: (activeArgoFloatId: string | null) => void;
  setIsLoadingSlice: (isLoading: boolean) => void;
  toggleCurrentVectors: () => void;
  toggleArgoMarkers: () => void;
  toggleDepthIsoPlanes: () => void;
  closeRegion: () => void;
}

export type OceanStore = VisualizationState & OceanStoreActions;

export const useOceanStore = create<OceanStore>((set, get) => ({
  selectedRegion: null,
  selectedRegionBounds: null,
  selectedRegionName: null,
  variable: 'temperature',
  depth: 0,
  time: '2026-06-15T00:00:00Z', // Peak Southwest Monsoon date
  sliceVisible: false,
  animationState: 'idle',
  globeOffset: 0,
  colorScale: 'thermal',
  opacity: 0.88,
  depthScaleFactor: 1.0,
  verticalExaggeration: 120, // 120x vertical exaggeration for clear 3D bathymetric column
  isPlayingTime: false,
  activeArgoFloatId: null,
  hoveredRegionId: null,
  isLoadingSlice: false,
  showCurrentVectors: true,
  showArgoMarkers: true,
  showDepthIsoPlanes: true,

  setSelectedRegion: (regionId) => {
    if (!regionId) {
      get().closeRegion();
      return;
    }
    const region = getRegionById(regionId);
    if (!region) return;

    set({
      selectedRegion: regionId,
      selectedRegionBounds: region.bbox,
      selectedRegionName: region.name,
      animationState: 'opening',
      sliceVisible: true,
      globeOffset: 0.45, // Shift globe center to create room for 3D analytical slice & HUD
    });

    // After animation delay, transition to 'expanded'
    setTimeout(() => {
      if (get().selectedRegion === regionId) {
        set({ animationState: 'expanded' });
      }
    }, 1200);
  },

  setHoveredRegion: (regionId) => set({ hoveredRegionId: regionId }),

  setVariable: (variable) => {
    const meta = OCEAN_VARIABLES[variable];
    set({
      variable,
      colorScale: meta ? meta.defaultColormap : 'turbo',
    });
  },

  setDepth: (depth) => set({ depth }),

  setTime: (time) => set({ time }),

  setAnimationState: (animationState) => set({ animationState }),

  setGlobeOffset: (globeOffset) => set({ globeOffset }),

  setColorScale: (colorScale) => set({ colorScale }),

  setOpacity: (opacity) => set({ opacity }),

  setDepthScaleFactor: (depthScaleFactor) => set({ depthScaleFactor }),

  setVerticalExaggeration: (verticalExaggeration) => set({ verticalExaggeration }),

  setIsPlayingTime: (isPlayingTime) => set({ isPlayingTime }),

  setActiveArgoFloatId: (activeArgoFloatId) => set({ activeArgoFloatId }),

  setIsLoadingSlice: (isLoadingSlice) => set({ isLoadingSlice }),

  toggleCurrentVectors: () => set((s) => ({ showCurrentVectors: !s.showCurrentVectors })),

  toggleArgoMarkers: () => set((s) => ({ showArgoMarkers: !s.showArgoMarkers })),

  toggleDepthIsoPlanes: () => set((s) => ({ showDepthIsoPlanes: !s.showDepthIsoPlanes })),

  closeRegion: () => {
    set({
      animationState: 'closing',
      globeOffset: 0,
      activeArgoFloatId: null,
    });
    setTimeout(() => {
      set({
        selectedRegion: null,
        selectedRegionBounds: null,
        selectedRegionName: null,
        sliceVisible: false,
        animationState: 'idle',
      });
    }, 800);
  },
}));
