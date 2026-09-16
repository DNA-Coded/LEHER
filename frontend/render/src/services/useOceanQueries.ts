import { useQuery } from '@tanstack/react-query';
import type { OceanVariable } from '../types/ocean';
import {
  fetchOceanSlice,
  fetchCurrentVectors,
  fetchArgoFloats,
  fetchArgoProfile,
} from './oceanApi';

export function useOceanSlice(
  regionId: string | null,
  variable: OceanVariable,
  depth: number,
  time: string,
  enabled = true
) {
  return useQuery({
    queryKey: ['ocean-slice', regionId, variable, depth, time],
    queryFn: () => {
      if (!regionId) throw new Error('Region ID required');
      return fetchOceanSlice(regionId, variable, depth, time);
    },
    enabled: Boolean(regionId) && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 15 * 60 * 1000,
  });
}

export function useCurrentVectors(
  regionId: string | null,
  depth: number,
  time: string,
  enabled = true
) {
  return useQuery({
    queryKey: ['current-vectors', regionId, depth, time],
    queryFn: () => {
      if (!regionId) throw new Error('Region ID required');
      return fetchCurrentVectors(regionId, depth, time);
    },
    enabled: Boolean(regionId) && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

export function useArgoFloats(regionId?: string | null) {
  return useQuery({
    queryKey: ['argo-floats', regionId || 'all'],
    queryFn: () => fetchArgoFloats(regionId || undefined),
    staleTime: 10 * 60 * 1000,
  });
}

export function useArgoProfile(floatId: string | null) {
  return useQuery({
    queryKey: ['argo-profile', floatId],
    queryFn: () => {
      if (!floatId) return null;
      return fetchArgoProfile(floatId);
    },
    enabled: Boolean(floatId),
    staleTime: 10 * 60 * 1000,
  });
}
