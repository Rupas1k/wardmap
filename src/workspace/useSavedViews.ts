import { parseWardRecords } from "../api/validation";
import { isClusterSets, normalizeDataset } from "../dataset/model";
import type { DatasetSettings, WorkspaceSettings } from "../dataset/model";
import {
  clusterDataVersion,
  deleteWorkspaceView,
  persistSavedView,
  renameWorkspaceView,
  savedWorkspaceViews,
  wardDataVersion,
  withStorageVersion,
} from "../dataset/storage";
import type { StoredAnalysis } from "../indexedDb";
import type { SharedView } from "../savedViews/sharedView";
import type { ViewState } from "../savedViews/viewState";
import { useMapStore } from "../state/mapState";
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
  const {
    clusterMarkerSize,
    setClusteringSettings,
    setClusterMarkerSize,
    setCurrentSide,
    setVisionTechnique,
  } = useWorkspaceMapSettings();
  const currentSide = useMapStore((state) => state.currentSide);
  const setContextOrigin = useWorkspaceStore((state) => state.setContextOrigin);
  const setInspectorTab = useWorkspaceStore((state) => state.setInspectorTab);
  const inspectorTab = useWorkspaceStore((state) => state.inspectorTab);
  const contextOrigin = useWorkspaceStore((state) => state.analysisContext.origin);
  const excludedWardIds = useWorkspaceStore((state) => state.excludedWardIds);
  const hiddenLocationFingerprints = useWorkspaceStore((state) => state.hiddenLocationFingerprints);
  const locationNames = useWorkspaceStore((state) => state.locationNames);
  const manualLocations = useWorkspaceStore((state) => state.manualLocations);
  const setLocationChanges = useWorkspaceStore((state) => state.setLocationChanges);

  async function saveView(name: string): Promise<boolean> {
    if (!loadedDataset || !clusterSets) {
      return false;
    }

    const savedAt = Date.now();
    const workspace = withStorageVersion({
      dataset: loadedDataset,
      clustering: clusteringSettings,
      clusteringEnabled,
      groupByGridCell,
      showUnclustered,
      excludedWardIds,
      hiddenLocationFingerprints,
      locationNames,
      manualLocations,
      visionTechnique,
    });
    const state: ViewState = {
      workspace,
      map: {
        side: currentSide,
        markerSize: clusterMarkerSize,
      },
      inspector: {
        tab: inspectorTab === "details" ? "overview" : inspectorTab,
        context: contextOrigin,
      },
    };

    try {
      await persistSavedView(
        `workspace:saved:${savedAt}`,
        name,
        state,
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

    const settings = view.workspace;
    const dataset = compatibleDataset(normalizeDataset(settings.dataset, defaultLeague.id));

    setClusteringSettings(settings.clustering);
    setClusteringEnabled(settings.clusteringEnabled ?? true);
    setGroupByGridCell(settings.groupByGridCell ?? false);
    setShowUnclustered(settings.showUnclustered ?? false);
    setVisionTechnique(settings.visionTechnique);
    setLocationChanges(
      settings.excludedWardIds ?? [],
      settings.hiddenLocationFingerprints ?? [],
      settings.locationNames ?? {},
      settings.manualLocations ?? [],
    );
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

    const state = view.settings;
    const settings = state.workspace;
    const normalizedDataset = normalizeDataset(settings.dataset, defaultLeague.id);
    const dataset = compatibleDataset(normalizedDataset);
    const removedIncompatibleLeagues =
      dataset.leagueIds.length !== normalizedDataset.leagueIds.length;
    const clustersMatchCurrentModel = settings.clusterDataVersion === clusterDataVersion;
    let restoredWards = view.wards;

    if (settings.wardDataVersion === wardDataVersion) {
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
    setClusteringSettings(settings.clustering);

    if (settings.clusteringEnabled !== undefined) {
      setClusteringEnabled(settings.clusteringEnabled);
    }
    if (settings.groupByGridCell !== undefined) {
      setGroupByGridCell(settings.groupByGridCell);
    }
    if (settings.showUnclustered !== undefined) {
      setShowUnclustered(settings.showUnclustered);
    }

    setVisionTechnique(settings.visionTechnique);
    setLocationChanges(
      settings.excludedWardIds ?? [],
      settings.hiddenLocationFingerprints ?? [],
      settings.locationNames ?? {},
      settings.manualLocations ?? [],
    );
    setClusterMarkerSize(state.map.markerSize);
    setCurrentSide(state.map.side);
    setInspectorTab(state.inspector.tab);
    setContextOrigin(state.inspector.context);

    if (removedIncompatibleLeagues || settings.wardDataVersion !== wardDataVersion) {
      setWards([]);
      setClusterSets(null);
      void loadDataset(dataset, false);

      return;
    }

    setWards(restoredWards);
    setClusterSets(clustersMatchCurrentModel ? view.clusterSets : null);
    setLoadedLeagueFreshness(view.leagueFreshness ?? null);
  }

  async function renameView(view: StoredAnalysis<ViewState>) {
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

  async function removeView(view: StoredAnalysis<ViewState>) {
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
