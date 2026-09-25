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
import {
  datasetFreshness as calculateDatasetFreshness,
  selectDefaultLeague,
} from "./workspaceDataset";
import { useWorkspaceStore } from "../state/workspaceState";

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
  const excludedWardIds = useWorkspaceStore((state) => state.excludedWardIds);
  const activeWards = useMemo(() => {
    if (excludedWardIds.length === 0) {
      return wards;
    }

    const excluded = new Set(excludedWardIds);

    return wards.filter((ward) => !excluded.has(ward.id));
  }, [excludedWardIds, wards]);

  const {
    clusteringSettings,
    clusterMarkerSize,
    colorMode,
    colorStatistic,
    visionTechnique,
    clusteringEnabled,
    groupByGridCell,
    showUnclustered,
    replaceClustering,
    updateClustering,
    updateControlsOpen,
    updateClusteringEnabled,
    updateClusterMarkerSize,
    updateColorMode,
    updateColorStatistic,
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
    wards: activeWards,
  });

  const defaultLeague = selectDefaultLeague(leagues);
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

  const autoViewReady = useWorkspaceRestore({
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
    clusteringWards: activeWards,
    wards,
  });

  const {
    activeView,
    deletedView,
    exportView,
    importView,
    removeView,
    renameView,
    resetCurrentView,
    restoreView,
    revertView,
    saveView,
    updateView,
    undoRemoveView,
    viewModified,
  } = useSavedViews({
    autoViewReady,
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
      colorMode,
      colorStatistic,
    },
    status: {
      ready,
      loadingData,
      dataLoadProgress,
      clustering,
      error,
      datasetFreshness,
      activeView,
      deletedView,
      viewModified,
    },
    actions: {
      setDraftDataset,
      setControlsOpen: updateControlsOpen,
      setInspectorOpen: updateInspectorOpen,
      updateClusteringEnabled,
      updateGridCellGrouping,
      updateUnclusteredVisibility,
      updateVisionTechnique,
      updateClusterMarkerSize,
      updateColorMode,
      updateColorStatistic,
      updateClustering,
      replaceClustering,
      saveView,
      exportView,
      importView,
      restoreView,
      revertView,
      renameView,
      removeView,
      resetCurrentView,
      updateView,
      undoRemoveView,
      loadDataset,
      cancelDatasetLoad,
    },
  };
}
