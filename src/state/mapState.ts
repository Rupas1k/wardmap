import { create } from "zustand";
import type { Cluster, Side } from "../types";

export interface ClusteringSettings {
  algorithm: "auto" | "dbscan" | "hdbscan" | "st_dbscan" | "time_weighted_hdbscan";
  selectionMethod?: "eom" | "leaf";
  radius: number;
  timeWindow: number;
  timeScaleSeconds: number;
  minSamples: number;
  minClusterSize: number;
  selectionEpsilon: number;
}

export type VisionTechnique = "polygon" | "gridnav";
export type MapFocusRequest = {
  kind: "ward" | "cluster";
  id: number;
};
export type MapCameraRequest = { x: number; y: number };
export interface ClusterMarkerSize {
  minimum: number;
  maximum: number;
}

export const defaultClusterMarkerSize: ClusterMarkerSize = { minimum: 4, maximum: 11 };
export const defaultClusteringSettings: ClusteringSettings = {
  algorithm: "auto",
  selectionMethod: "eom",
  radius: 300,
  timeWindow: 180,
  timeScaleSeconds: 180,
  minSamples: 10,
  minClusterSize: 10,
  selectionEpsilon: 64,
};

interface MapState {
  currentSide: Side;
  selectedClusterId: number | null;
  selectedWardId: number | null;
  elevations: number[][] | null;
  averageValues: Cluster | null;
  clusteringSettings: ClusteringSettings;
  clusterMarkerSize: ClusterMarkerSize;
  expandedClusterIds: number[];
  visionTechnique: VisionTechnique;
  focusRequest: MapFocusRequest | null;
  cameraRequest: MapCameraRequest | null;
  setCurrentSide: (side: Side) => void;
  setSelectedClusterId: (clusterId: number | null) => void;
  setSelectedWardId: (wardId: number | null) => void;
  selectMapLocation: (clusterId: number, wardId?: number | null) => void;
  clearWardSelection: () => void;
  clearMapLocationSelection: () => void;
  clearSelection: () => void;
  clearExpandedClusters: () => void;
  setElevations: (elevations: number[][] | null) => void;
  setAverageValues: (values: Cluster | null) => void;
  setClusteringSettings: (settings: ClusteringSettings) => void;
  setClusterMarkerSize: (size: ClusterMarkerSize) => void;
  setClusterExpanded: (clusterId: number, expanded: boolean) => void;
  setVisionTechnique: (technique: VisionTechnique) => void;
  focusWard: (wardId: number) => void;
  focusCluster: (clusterId: number) => void;
  clearFocusRequest: () => void;
  centerMapAt: (x: number, y: number) => void;
  clearCameraRequest: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  currentSide: "all",
  selectedClusterId: null,
  selectedWardId: null,
  elevations: null,
  averageValues: null,
  clusteringSettings: defaultClusteringSettings,
  clusterMarkerSize: defaultClusterMarkerSize,
  expandedClusterIds: [],
  visionTechnique: "gridnav",
  focusRequest: null,
  cameraRequest: null,
  setCurrentSide: (currentSide) => set({ currentSide, expandedClusterIds: [] }),
  setSelectedClusterId: (selectedClusterId) => set({ selectedClusterId, selectedWardId: null }),
  setSelectedWardId: (selectedWardId) => set({ selectedWardId }),
  selectMapLocation: (selectedClusterId, selectedWardId = null) =>
    set({ selectedClusterId, selectedWardId }),
  clearWardSelection: () => set({ selectedWardId: null }),
  clearMapLocationSelection: () => set({ selectedClusterId: null, selectedWardId: null }),
  clearSelection: () =>
    set({
      selectedClusterId: null,
      selectedWardId: null,
    }),
  setElevations: (elevations) => set({ elevations }),
  setAverageValues: (averageValues) => set({ averageValues }),
  setClusteringSettings: (clusteringSettings) =>
    set({
      clusteringSettings,
      selectedClusterId: null,
      selectedWardId: null,
      expandedClusterIds: [],
    }),
  clearExpandedClusters: () => set({ expandedClusterIds: [] }),
  setClusterMarkerSize: (clusterMarkerSize) => set({ clusterMarkerSize }),
  setClusterExpanded: (clusterId, expanded) =>
    set((state) => ({
      expandedClusterIds: expanded
        ? [...new Set([...state.expandedClusterIds, clusterId])]
        : state.expandedClusterIds.filter((id) => id !== clusterId),
    })),
  setVisionTechnique: (visionTechnique) => set({ visionTechnique }),
  focusWard: (id) => set({ focusRequest: { kind: "ward", id } }),
  focusCluster: (id) => set({ focusRequest: { kind: "cluster", id } }),
  clearFocusRequest: () => set({ focusRequest: null }),
  centerMapAt: (x, y) => set({ cameraRequest: { x, y } }),
  clearCameraRequest: () => set({ cameraRequest: null }),
}));
