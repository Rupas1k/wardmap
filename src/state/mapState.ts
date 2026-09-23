import { create } from "zustand";
import type { Cluster, Side } from "../types";
import { mapCenter, minZoom } from "../map/constants";

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
export type MapPosition = [number, number, number];
export type MapCameraRequest =
  | { kind: "center"; x: number; y: number }
  | { kind: "fit"; positions: MapPosition[] }
  | { kind: "restore"; center: [number, number]; zoom: number };
export interface MapCamera {
  center: [number, number];
  zoom: number;
}
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
  hoveredClusterId: number | null;
  hoveredWardId: number | null;
  elevations: number[][] | null;
  averageValues: Cluster | null;
  clusteringSettings: ClusteringSettings;
  clusterMarkerSize: ClusterMarkerSize;
  expandedClusterIds: number[];
  visionTechnique: VisionTechnique;
  focusRequest: MapFocusRequest | null;
  cameraRequest: MapCameraRequest | null;
  camera: MapCamera;
  sightingPosition: MapPosition | null;
  sightingRoutes: MapPosition[][];
  sightingSelectionId: string | null;
  hiddenLocationPreview: MapPosition | null;
  setCurrentSide: (side: Side) => void;
  setSelectedClusterId: (clusterId: number | null) => void;
  setSelectedWardId: (wardId: number | null) => void;
  setHoveredClusterId: (clusterId: number | null) => void;
  setHoveredWardId: (wardId: number | null) => void;
  setHoveredMapItem: (clusterId: number | null, wardId: number | null) => void;
  clearHover: () => void;
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
  showSightingAt: (selectionId: string, position: MapPosition, routes?: MapPosition[][]) => void;
  clearSighting: () => void;
  showHiddenLocationAt: (position: MapPosition) => void;
  clearHiddenLocationPreview: () => void;
  clearCameraRequest: () => void;
  setCamera: (camera: MapCamera) => void;
  restoreCamera: (camera: MapCamera) => void;
}

export const useMapStore = create<MapState>((set) => ({
  currentSide: "all",
  selectedClusterId: null,
  selectedWardId: null,
  hoveredClusterId: null,
  hoveredWardId: null,
  elevations: null,
  averageValues: null,
  clusteringSettings: defaultClusteringSettings,
  clusterMarkerSize: defaultClusterMarkerSize,
  expandedClusterIds: [],
  visionTechnique: "gridnav",
  focusRequest: null,
  cameraRequest: null,
  camera: { center: [mapCenter[0], mapCenter[1]], zoom: minZoom },
  sightingPosition: null,
  sightingRoutes: [],
  sightingSelectionId: null,
  hiddenLocationPreview: null,
  setCurrentSide: (currentSide) =>
    set({
      currentSide,
      expandedClusterIds: [],
      hoveredClusterId: null,
      hoveredWardId: null,
      hiddenLocationPreview: null,
    }),
  setSelectedClusterId: (selectedClusterId) =>
    set({
      selectedClusterId,
      selectedWardId: null,
      hoveredClusterId: null,
      hoveredWardId: null,
      sightingPosition: null,
      sightingRoutes: [],
      sightingSelectionId: null,
      hiddenLocationPreview: null,
    }),
  setSelectedWardId: (selectedWardId) =>
    set({ selectedWardId, sightingPosition: null, sightingRoutes: [], sightingSelectionId: null }),
  setHoveredClusterId: (hoveredClusterId) =>
    set((state) => (state.hoveredClusterId === hoveredClusterId ? state : { hoveredClusterId })),
  setHoveredWardId: (hoveredWardId) =>
    set((state) => (state.hoveredWardId === hoveredWardId ? state : { hoveredWardId })),
  setHoveredMapItem: (hoveredClusterId, hoveredWardId) =>
    set((state) =>
      state.hoveredClusterId === hoveredClusterId && state.hoveredWardId === hoveredWardId
        ? state
        : { hoveredClusterId, hoveredWardId },
    ),
  clearHover: () =>
    set((state) =>
      state.hoveredClusterId === null && state.hoveredWardId === null
        ? state
        : { hoveredClusterId: null, hoveredWardId: null },
    ),
  selectMapLocation: (selectedClusterId, selectedWardId = null) =>
    set({
      selectedClusterId,
      selectedWardId,
      hoveredClusterId: null,
      hoveredWardId: null,
      sightingPosition: null,
      sightingRoutes: [],
      sightingSelectionId: null,
      hiddenLocationPreview: null,
    }),
  clearWardSelection: () =>
    set({
      selectedWardId: null,
      hoveredClusterId: null,
      hoveredWardId: null,
      sightingPosition: null,
      sightingRoutes: [],
      sightingSelectionId: null,
    }),
  clearMapLocationSelection: () =>
    set({
      selectedClusterId: null,
      selectedWardId: null,
      hoveredClusterId: null,
      hoveredWardId: null,
      sightingPosition: null,
      sightingRoutes: [],
      sightingSelectionId: null,
    }),
  clearSelection: () =>
    set({
      selectedClusterId: null,
      selectedWardId: null,
      hoveredClusterId: null,
      hoveredWardId: null,
      sightingPosition: null,
      sightingRoutes: [],
      sightingSelectionId: null,
      hiddenLocationPreview: null,
    }),
  setElevations: (elevations) => set({ elevations }),
  setAverageValues: (averageValues) => set({ averageValues }),
  setClusteringSettings: (clusteringSettings) =>
    set({
      clusteringSettings,
      selectedClusterId: null,
      selectedWardId: null,
      hoveredClusterId: null,
      hoveredWardId: null,
      sightingPosition: null,
      sightingRoutes: [],
      sightingSelectionId: null,
      expandedClusterIds: [],
      hiddenLocationPreview: null,
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
  centerMapAt: (x, y) => set({ cameraRequest: { kind: "center", x, y } }),
  showSightingAt: (sightingSelectionId, sightingPosition, sightingRoutes = []) => {
    const routePositions = sightingRoutes.flat();

    set({
      sightingSelectionId,
      sightingPosition,
      sightingRoutes,
      cameraRequest:
        routePositions.length > 1
          ? { kind: "fit", positions: routePositions }
          : { kind: "center", x: sightingPosition[0], y: sightingPosition[1] },
    });
  },
  clearSighting: () =>
    set({ sightingPosition: null, sightingRoutes: [], sightingSelectionId: null }),
  showHiddenLocationAt: (hiddenLocationPreview) =>
    set({
      hiddenLocationPreview,
      cameraRequest: {
        kind: "center",
        x: hiddenLocationPreview[0],
        y: hiddenLocationPreview[1],
      },
    }),
  clearHiddenLocationPreview: () => set({ hiddenLocationPreview: null }),
  clearCameraRequest: () => set({ cameraRequest: null }),
  setCamera: (camera) => set({ camera }),
  restoreCamera: (camera) => set({ camera, cameraRequest: { kind: "restore", ...camera } }),
}));
