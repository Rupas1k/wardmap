import { useMemo } from "react";
import useClusteringLifecycle from "../clustering/useClusteringLifecycle";
import useLocationClustering from "../clustering/useLocationClustering";
import useDatasetMetadata from "../dataset/useDatasetMetadata";
import {
  useWorkspaceActions,
  useWorkspaceData,
  useWorkspacePanels,
  useWorkspaceStatus,
} from "../state/workspaceSelectors";
import useDatasetLoader from "./useDatasetLoader";
import useSavedViews from "./useSavedViews";
import useWorkspaceRestore from "./useWorkspaceRestore";
import useWorkspaceSettings from "./useWorkspaceSettings";
import { datasetFreshness as calculateDatasetFreshness } from "./workspaceDataset";

export default function useWorkspaceController() {
  const {
    leagues,
    draftDataset,
    loadedDataset,
    wards,
    clusterSets,
    displayClusterSets,
    loadedLeagueFreshness,
    savedViews,
    teams,
    players,
    opponentPlayers,
  } = useWorkspaceData();
  const { controlsOpen, inspectorOpen } = useWorkspacePanels();
  const { ready, loadingData, dataLoadProgress, clustering, error } = useWorkspaceStatus();
  const { setClustering, setClusterSets, setDraftDataset, setError } = useWorkspaceActions();

  const {
    clusteringSettings,
    clusterMarkerSize,
    visionTechnique,
    clusteringEnabled,
    groupByGridCell,
    showUnclustered,
    replaceClustering,
    updateClustering,
    updateControlsOpen,
    updateClusteringEnabled,
    updateClusterMarkerSize,
    updateGridCellGrouping,
    updateInspectorOpen,
    updateUnclusteredVisibility,
    updateVisionTechnique,
  } = useWorkspaceSettings();

  useDatasetMetadata();
  useLocationClustering({
    clusteringEnabled,
    clusteringSettings,
    groupByGridCell,
    wards,
  });

  const defaultLeague = leagues[0] ?? null;
  const datasetFreshness = useMemo(
    () => calculateDatasetFreshness(loadedDataset, leagues, loadedLeagueFreshness),
    [leagues, loadedDataset, loadedLeagueFreshness],
  );
  const {
    cancelDatasetLoad,
    clustersMatchSettings,
    compatibleDataset,
    loadDataset,
    restoredClusters,
  } = useDatasetLoader(leagues, defaultLeague);

  useWorkspaceRestore({
    compatibleDataset,
    defaultLeague,
    loadDataset,
    ready,
    restoredClusters,
  });
  useClusteringLifecycle({
    clusterSets,
    clustering,
    clusteringEnabled,
    clusteringSettings,
    clustersMatchSettings,
    groupByGridCell,
    loadedDataset,
    loadedLeagueFreshness,
    restoredClusters,
    setClustering,
    setClusterSets,
    setError,
    showUnclustered,
    visionTechnique,
    wards,
  });

  const { applySharedView, removeView, renameView, restoreView, saveView } = useSavedViews({
    clusteringEnabled,
    clusteringSettings,
    clustersMatchSettings,
    compatibleDataset,
    defaultLeague,
    groupByGridCell,
    loadDataset,
    restoredClusters,
    showUnclustered,
    visionTechnique,
  });

  return {
    data: {
      leagues,
      draftDataset,
      loadedDataset,
      wards,
      clusterSets,
      displayClusterSets,
      savedViews,
      teams,
      players,
      opponentPlayers,
      defaultLeague,
    },
    panels: { controlsOpen, inspectorOpen },
    analysis: {
      clusteringSettings,
      clusteringEnabled,
      groupByGridCell,
      showUnclustered,
      visionTechnique,
      clusterMarkerSize,
    },
    status: { ready, loadingData, dataLoadProgress, clustering, error, datasetFreshness },
    actions: {
      setDraftDataset,
      setControlsOpen: updateControlsOpen,
      setInspectorOpen: updateInspectorOpen,
      updateClusteringEnabled,
      updateGridCellGrouping,
      updateUnclusteredVisibility,
      updateVisionTechnique,
      updateClusterMarkerSize,
      updateClustering,
      replaceClustering,
      saveView,
      applySharedView,
      restoreView,
      renameView,
      removeView,
      loadDataset,
      cancelDatasetLoad,
    },
  };
}
