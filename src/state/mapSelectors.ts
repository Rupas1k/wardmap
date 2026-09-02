import { useMapStore } from "./mapState";
import { useWorkspaceStore } from "./workspaceState";
import { useShallow } from "zustand/react/shallow";
import { selectDisplayedClusterSets } from "./workspaceSelectors";

export function useWorkspaceMapSettings() {
  return useMapStore(
    useShallow((state) => ({
      clusteringSettings: state.clusteringSettings,
      clusterMarkerSize: state.clusterMarkerSize,
      visionTechnique: state.visionTechnique,
      setClusteringSettings: state.setClusteringSettings,
      setClusterMarkerSize: state.setClusterMarkerSize,
      setVisionTechnique: state.setVisionTechnique,
      setCurrentSide: state.setCurrentSide,
      setSelectedClusterId: state.setSelectedClusterId,
      clearSelection: state.clearSelection,
      clearExpandedClusters: state.clearExpandedClusters,
    })),
  );
}

export function useMapViewState() {
  return useMapStore(
    useShallow((state) => ({
      selectedClusterId: state.selectedClusterId,
      selectedWardId: state.selectedWardId,
      expandedClusterIds: state.expandedClusterIds,
      focusRequest: state.focusRequest,
      cameraRequest: state.cameraRequest,
      elevations: state.elevations,
      currentSide: state.currentSide,
      visionTechnique: state.visionTechnique,
      setSelectedClusterId: state.setSelectedClusterId,
      setSelectedWardId: state.setSelectedWardId,
      selectMapLocation: state.selectMapLocation,
      clearWardSelection: state.clearWardSelection,
      clearMapLocationSelection: state.clearMapLocationSelection,
      clearSelection: state.clearSelection,
      clearFocusRequest: state.clearFocusRequest,
      clearCameraRequest: state.clearCameraRequest,
      centerMapAt: state.centerMapAt,
      setElevations: state.setElevations,
      setAverageValues: state.setAverageValues,
    })),
  );
}

export function useSelectedCluster() {
  const currentSide = useMapStore((state) => state.currentSide);
  const selectedClusterId = useMapStore((state) => state.selectedClusterId);

  return useWorkspaceStore(
    (state) =>
      selectDisplayedClusterSets(state)?.[currentSide].find(
        (cluster) => cluster.cluster_id === selectedClusterId,
      ) ?? null,
  );
}
