import { create } from 'zustand';
import type { OceanVariable, AnimationState, ColorScaleName, VisualizationState } from '@/types/ocean';
import { getRegionById } from '@/lib/ocean/regions';
import { OCEAN_VARIABLES } from '@/lib/ocean/variables';
import type { DeepOceanPrediction, DepthColumnResponse } from '@/lib/api/types';

export interface ClickedLocationInfo {
  lon: number;
  lat: number;
  depth?: number;
  regionName?: string;
  variableName?: string;
  value?: number;
  unit?: string;
}

export interface PointDepthData {
  temperature: number;
  salinity: number;
  bathymetry: number;
  currentSpeed: number;
  currentDirection: number;
  chlorophyll: number;
  profiles?: {
    depthLevels: number[];
    temperature: number[];
    salinity: number[];
  };
  mlPrediction?: DeepOceanPrediction;
  isLiveBackend: boolean;
  isLiveMl?: boolean;
}

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
  clickedLocation: ClickedLocationInfo | null;
  setClickedLocation: (loc: ClickedLocationInfo | null) => void;

  // Point depth inspection & Independent 3D Depth Slice
  isPointDepthOpen: boolean;
  pointGeometryType: 'cylinder' | 'cuboid';
  pointDepthData: PointDepthData | null;
  depthColumnData: DepthColumnResponse | null;
  isPointDataLoading: boolean;
  selectedDepthIndex: number;
  isSideTabCollapsed: boolean;
  openPointDepth: () => void;
  closePointDepth: () => void;
  setPointGeometryType: (type: 'cylinder' | 'cuboid') => void;
  setPointDepthData: (data: PointDepthData | null) => void;
  setDepthColumnData: (data: DepthColumnResponse | null) => void;
  setSelectedDepthIndex: (index: number) => void;
  setIsSideTabCollapsed: (collapsed: boolean) => void;
  toggleSideTabCollapsed: () => void;
  setIsPointDataLoading: (loading: boolean) => void;
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
  clickedLocation: null,

  // Point depth state
  isPointDepthOpen: false,
  pointGeometryType: 'cylinder',
  pointDepthData: null,
  depthColumnData: null,
  isPointDataLoading: false,
  selectedDepthIndex: 0,
  isSideTabCollapsed: false,

  setSelectedRegion: (regionId) => {
    if (!regionId) {
      get().closeRegion();
      return;
    }
    const region = getRegionById(regionId);
    if (!region) return;

    // Close point depth if a named region is selected from the top bar
    set({
      selectedRegion: regionId,
      selectedRegionBounds: region.bbox,
      selectedRegionName: region.name,
      animationState: 'opening',
      sliceVisible: true,
      globeOffset: 0.45,
      isPointDepthOpen: false,
      pointDepthData: null,
    });

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

  setClickedLocation: (clickedLocation) => set({ clickedLocation }),

  // Point depth actions
  openPointDepth: () => {
    // Close any existing region slice to avoid overlap
    const state = get();
    if (state.selectedRegion) {
      state.closeRegion();
    }
    set({
      isPointDepthOpen: true,
      isPointDataLoading: true,
      globeOffset: 0.45,
    });
  },

  closePointDepth: () => {
    set({
      isPointDepthOpen: false,
      pointDepthData: null,
      depthColumnData: null,
      isPointDataLoading: false,
      selectedDepthIndex: 0,
      globeOffset: 0,
    });
  },

  setPointGeometryType: (pointGeometryType) => set({ pointGeometryType }),

  setPointDepthData: (pointDepthData) => set({ pointDepthData, isPointDataLoading: false }),

  setDepthColumnData: (depthColumnData) => set({ depthColumnData, isPointDataLoading: false }),

  setSelectedDepthIndex: (selectedDepthIndex) => set({ selectedDepthIndex }),

  setIsSideTabCollapsed: (isSideTabCollapsed) => set({ isSideTabCollapsed }),

  toggleSideTabCollapsed: () => set((s) => ({ isSideTabCollapsed: !s.isSideTabCollapsed })),

  setIsPointDataLoading: (isPointDataLoading) => set({ isPointDataLoading }),

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

