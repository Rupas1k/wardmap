import { parseWardRecords } from "../api/validation";
import { isClusterSets, normalizeDataset } from "../dataset/model";
import type { DatasetSettings, WorkspaceSettings } from "../dataset/model";
import {
  clusterDataVersion,
  deleteWorkspaceView,
  persistWorkspace,
  renameWorkspaceView,
  savedWorkspaceViews,
  wardDataVersion,
  withStorageVersion,
} from "../dataset/storage";
import type { StoredAnalysis } from "../indexedDb";
import type { SharedView } from "../savedViews/sharedView";
import { useWorkspaceMapSettings } from "../state/mapSelectors";
import { useWorkspaceActions, useWorkspaceData } from "../state/workspaceSelectors";
import type { ClusteringSettings } from "../state/mapState";
import { useWorkspaceStore } from "../state/workspaceState";
import type { League } from "../types";
import type { BooleanRef } from "./useDatasetLoader";

interface SavedViewOptions {
  clusteringEnabled: boolean;
  clusteringSettings: ClusteringSettings;
  clustersMatchSettings: BooleanRef;
  compatibleDataset: (dataset: DatasetSettings) => DatasetSettings;
  defaultLeague: League | null;
  groupByGridCell: boolean;
  loadDataset: (dataset: DatasetSettings, forceRefresh: boolean) => Promise<void>;
  restoredClusters: BooleanRef;
  showUnclustered: boolean;
  visionTechnique: WorkspaceSettings["visionTechnique"];
}

export default function useSavedViews({
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
}: SavedViewOptions) {
  const { clusterSets, loadedDataset, loadedLeagueFreshness, savedViews, wards } =
    useWorkspaceData();
  const {
    setClusterSets,
    setClusteringEnabled,
    setDraftDataset,
    setError,
    setGroupByGridCell,
    setLoadedDataset,
    setLoadedLeagueFreshness,
    setSavedViews,
    setShowUnclustered,
    setWards,
  } = useWorkspaceActions();
  const { setClusteringSettings, setClusterMarkerSize, setCurrentSide, setVisionTechnique } =
    useWorkspaceMapSettings();
  const setContextOrigin = useWorkspaceStore((state) => state.setContextOrigin);
  const setInspectorTab = useWorkspaceStore((state) => state.setInspectorTab);

  async function saveView(name: string): Promise<boolean> {
    if (!loadedDataset || !clusterSets) {
      return false;
    }

    const savedAt = Date.now();

    try {
      await persistWorkspace(
        `workspace:saved:${savedAt}`,
        "saved",
        name,
        withStorageVersion({
          dataset: loadedDataset,
          clustering: clusteringSettings,
          clusteringEnabled,
          groupByGridCell,
          showUnclustered,
          visionTechnique,
        }),
        wards,
        clusterSets,
        loadedLeagueFreshness ?? undefined,
      );
      setSavedViews(await savedWorkspaceViews());

      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save view");

      return false;
    }
  }

  async function applySharedView(view: SharedView) {
    if (!defaultLeague) {
      setError("Unable to load leagues");

      return;
    }

    const dataset = compatibleDataset(normalizeDataset(view.settings.dataset, defaultLeague.id));

    setClusteringSettings(view.settings.clustering);
    setClusteringEnabled(view.settings.clusteringEnabled ?? true);
    setGroupByGridCell(view.settings.groupByGridCell ?? false);
    setShowUnclustered(view.settings.showUnclustered ?? false);
    setVisionTechnique(view.settings.visionTechnique);
    setClusterMarkerSize(view.map.markerSize);
    setInspectorTab(view.inspector.tab === "details" ? "overview" : view.inspector.tab);

    await loadDataset(dataset, false);
    setCurrentSide(view.map.side);
    setContextOrigin(view.inspector.context);
  }

  function restoreView(key: string) {
    if (!defaultLeague) {
      setError("Unable to load leagues");

      return;
    }

    const view = savedViews.find((candidate) => candidate.key === key);

    if (!view?.clusterSets || !isClusterSets(view.clusterSets)) {
      return;
    }

    const normalizedDataset = normalizeDataset(view.settings.dataset, defaultLeague.id);
    const dataset = compatibleDataset(normalizedDataset);
    const removedIncompatibleLeagues =
      dataset.leagueIds.length !== normalizedDataset.leagueIds.length;
    const clustersMatchCurrentModel = view.settings.clusterDataVersion === clusterDataVersion;
    let restoredWards = view.wards;

    if (view.settings.wardDataVersion === wardDataVersion) {
      try {
        restoredWards = parseWardRecords(view.wards);
      } catch {
        setError("This saved view contains invalid ward data and cannot be restored");

        return;
      }
    }

    restoredClusters.current = clustersMatchCurrentModel;
    clustersMatchSettings.current = clustersMatchCurrentModel;

    setDraftDataset(dataset);
    setLoadedDataset(dataset);
    setClusteringSettings(view.settings.clustering);

    if (view.settings.clusteringEnabled !== undefined) {
      setClusteringEnabled(view.settings.clusteringEnabled);
    }
    if (view.settings.groupByGridCell !== undefined) {
      setGroupByGridCell(view.settings.groupByGridCell);
    }
    if (view.settings.showUnclustered !== undefined) {
      setShowUnclustered(view.settings.showUnclustered);
    }

    setVisionTechnique(view.settings.visionTechnique);

    if (removedIncompatibleLeagues || view.settings.wardDataVersion !== wardDataVersion) {
      setWards([]);
      setClusterSets(null);
      void loadDataset(dataset, false);

      return;
    }

    setWards(restoredWards);
    setClusterSets(clustersMatchCurrentModel ? view.clusterSets : null);
    setLoadedLeagueFreshness(view.leagueFreshness ?? null);
  }

  async function renameView(view: StoredAnalysis<WorkspaceSettings>) {
    const name = window.prompt("Saved view name", view.name)?.trim();

    if (!name || name === view.name) {
      return;
    }

    try {
      setSavedViews(await renameWorkspaceView(view, name));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to rename view");
    }
  }

  async function removeView(view: StoredAnalysis<WorkspaceSettings>) {
    if (!window.confirm(`Delete saved view “${view.name}”?`)) {
      return;
    }

    try {
      await deleteWorkspaceView(view.key);
      setSavedViews((current) => current.filter((candidate) => candidate.key !== view.key));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete view");
    }
  }

  return { applySharedView, removeView, renameView, restoreView, saveView };
}
