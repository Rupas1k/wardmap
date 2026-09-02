import { useShallow } from "zustand/react/shallow";
import { useWorkspaceStore } from "./workspaceState";
import type { WorkspaceState } from "./workspaceState";

export function selectDisplayedClusterSets(state: WorkspaceState) {
  return state.contextClusterSets ?? state.clusterSets;
}

export function useWorkspaceData() {
  return useWorkspaceStore(
    useShallow((state) => ({
      leagues: state.leagues,
      draftDataset: state.draftDataset,
      loadedDataset: state.loadedDataset,
      wards: state.wards,
      clusterSets: state.clusterSets,
      displayClusterSets: selectDisplayedClusterSets(state),
      loadedLeagueFreshness: state.loadedLeagueFreshness,
      savedViews: state.savedViews,
      teams: state.teams,
      players: state.players,
      opponentPlayers: state.opponentPlayers,
      clusteringEnabled: state.clusteringEnabled,
      groupByGridCell: state.groupByGridCell,
      showUnclustered: state.showUnclustered,
    })),
  );
}

export function useWorkspacePanels() {
  return useWorkspaceStore(
    useShallow((state) => ({
      controlsOpen: state.controlsOpen,
      inspectorOpen: state.inspectorOpen,
    })),
  );
}

export function useWorkspaceStatus() {
  return useWorkspaceStore(
    useShallow((state) => ({
      ready: state.ready,
      loadingData: state.loadingData,
      dataLoadProgress: state.dataLoadProgress,
      clustering: state.clustering,
      error: state.error,
    })),
  );
}

export function useWorkspaceActions() {
  return useWorkspaceStore(
    useShallow((state) => ({
      setDraftDataset: state.setDraftDataset,
      setLoadedDataset: state.setLoadedDataset,
      setWards: state.setWards,
      setClusterSets: state.setClusterSets,
      setContextClusterSets: state.setContextClusterSets,
      setLoadedLeagueFreshness: state.setLoadedLeagueFreshness,
      setSavedViews: state.setSavedViews,
      setMetadata: state.setMetadata,
      setDatasetSnapshot: state.setDatasetSnapshot,
      setControlsOpen: state.setControlsOpen,
      setInspectorOpen: state.setInspectorOpen,
      setClusteringEnabled: state.setClusteringEnabled,
      setGroupByGridCell: state.setGroupByGridCell,
      setShowUnclustered: state.setShowUnclustered,
      setReady: state.setReady,
      setLoadingData: state.setLoadingData,
      setDataLoadProgress: state.setDataLoadProgress,
      setClustering: state.setClustering,
      setError: state.setError,
    })),
  );
}
