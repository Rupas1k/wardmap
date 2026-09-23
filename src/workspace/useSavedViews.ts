import { useEffect, useMemo, useRef, useState } from "react";
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
import { locationKey } from "../locations/locationIdentity";
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
  const [activeViewKey, setActiveViewKey] = useState<string | null>(null);
  const pendingSelection = useRef<ViewState | null>(null);
  const {
    clusterSets,
    displayClusterSets,
    loadedDataset,
    loadedLeagueFreshness,
    savedViews,
    wards,
  } = useWorkspaceData();
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
  const camera = useMapStore((state) => state.camera);
  const selectedClusterId = useMapStore((state) => state.selectedClusterId);
  const selectedWardId = useMapStore((state) => state.selectedWardId);
  const expandedClusterIds = useMapStore((state) => state.expandedClusterIds);
  const setContextOrigin = useWorkspaceStore((state) => state.setContextOrigin);
  const setContextRefinement = useWorkspaceStore((state) => state.setContextRefinement);
  const context = useWorkspaceStore((state) => state.analysisContext);
  const locationSort = useWorkspaceStore((state) => state.locationSort);
  const locationSortDirection = useWorkspaceStore((state) => state.locationSortDirection);
  const locationMinimumWards = useWorkspaceStore((state) => state.locationMinimumWards);
  const wardOutcomeFilter = useWorkspaceStore((state) => state.wardOutcomeFilter);
  const wardSort = useWorkspaceStore((state) => state.wardSort);
  const excludedWardIds = useWorkspaceStore((state) => state.excludedWardIds);
  const hiddenLocationFingerprints = useWorkspaceStore((state) => state.hiddenLocationFingerprints);
  const locationNames = useWorkspaceStore((state) => state.locationNames);
  const manualLocations = useWorkspaceStore((state) => state.manualLocations);
  const setLocationChanges = useWorkspaceStore((state) => state.setLocationChanges);
  const visibleLocations = displayClusterSets?.[currentSide] ?? [];
  const selectedLocation =
    visibleLocations.find((cluster) => cluster.cluster_id === selectedClusterId) ?? null;
  const expandedLocationKeys = visibleLocations
    .filter((cluster) => expandedClusterIds.includes(cluster.cluster_id))
    .map((cluster) => locationKey(cluster, currentSide));
  const currentViewState = useMemo<ViewState | null>(() => {
    if (!loadedDataset) {
      return null;
    }

    return {
      workspace: withStorageVersion({
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
      }),
      browse: {
        locationSort,
        locationSortDirection,
        locationMinimumWards,
        wardOutcomeFilter,
        wardSort,
      },
      context: {
        origin: context.origin,
        refinement: context.refinement,
      },
      selection: {
        locationKey: selectedLocation ? locationKey(selectedLocation, currentSide) : null,
        wardId: selectedWardId,
        expandedLocationKeys,
      },
      map: {
        side: currentSide,
        markerSize: clusterMarkerSize,
        camera,
      },
    };
  }, [
    camera,
    clusterMarkerSize,
    clusteringEnabled,
    clusteringSettings,
    context.origin,
    context.refinement,
    currentSide,
    excludedWardIds,
    groupByGridCell,
    hiddenLocationFingerprints,
    expandedLocationKeys,
    locationMinimumWards,
    locationSort,
    locationSortDirection,
    loadedDataset,
    locationNames,
    manualLocations,
    selectedLocation,
    selectedWardId,
    showUnclustered,
    visionTechnique,
    wardOutcomeFilter,
    wardSort,
  ]);
  const activeView = savedViews.find((view) => view.key === activeViewKey) ?? null;
  const viewModified = Boolean(
    activeView &&
    currentViewState &&
    JSON.stringify(activeView.settings) !== JSON.stringify(currentViewState),
  );

  useEffect(() => {
    const state = pendingSelection.current;

    if (!state || !displayClusterSets || (state.context.origin && context.status !== "ready")) {
      return;
    }

    const clusters = displayClusterSets[state.map.side];
    const clustersByKey = new Map(
      clusters.map((cluster) => [locationKey(cluster, state.map.side), cluster]),
    );
    const selected = state.selection.locationKey
      ? clustersByKey.get(state.selection.locationKey)
      : null;
    const mapState = useMapStore.getState();

    mapState.clearExpandedClusters();
    for (const key of state.selection.expandedLocationKeys) {
      const cluster = clustersByKey.get(key);

      if (cluster) {
        mapState.setClusterExpanded(cluster.cluster_id, true);
      }
    }

    if (selected) {
      const wardId = selected.wards?.some((ward) => ward.id === state.selection.wardId)
        ? state.selection.wardId
        : null;
      mapState.selectMapLocation(selected.cluster_id, wardId);
    } else {
      mapState.clearMapLocationSelection();
    }

    pendingSelection.current = null;
  }, [context.status, displayClusterSets]);

  function restoreAnalysisState(state: ViewState) {
    const workspaceState = useWorkspaceStore.getState();
    const mapState = useMapStore.getState();

    workspaceState.setLocationSort(state.browse.locationSort);
    workspaceState.setLocationSortDirection(state.browse.locationSortDirection);
    workspaceState.setLocationMinimumWards(state.browse.locationMinimumWards);
    workspaceState.setWardOutcomeFilter(state.browse.wardOutcomeFilter);
    workspaceState.setWardSort(state.browse.wardSort);
    setCurrentSide(state.map.side);
    setContextOrigin(state.context.origin);
    setContextRefinement(state.context.refinement);

    if (state.map.camera) {
      mapState.restoreCamera(state.map.camera);
    }

    pendingSelection.current = state;
  }

  async function saveView(name: string): Promise<boolean> {
    if (!currentViewState || !clusterSets) {
      return false;
    }

    const savedAt = Date.now();
    const key = `workspace:saved:${savedAt}`;

    try {
      await persistSavedView(
        key,
        name,
        currentViewState,
        wards,
        clusterSets,
        loadedLeagueFreshness ?? undefined,
      );
      setSavedViews(await savedWorkspaceViews());
      setActiveViewKey(key);

      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save view");

      return false;
    }
  }

  async function updateView(): Promise<boolean> {
    if (!activeView || !currentViewState || !clusterSets) {
      return false;
    }

    try {
      await persistSavedView(
        activeView.key,
        activeView.name,
        currentViewState,
        wards,
        clusterSets,
        loadedLeagueFreshness ?? undefined,
      );
      setSavedViews(await savedWorkspaceViews());

      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update view");

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
    setActiveViewKey(null);

    await loadDataset(dataset, false);
    restoreAnalysisState(view);
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
    setActiveViewKey(key);

    if (removedIncompatibleLeagues || settings.wardDataVersion !== wardDataVersion) {
      setWards([]);
      setClusterSets(null);
      void loadDataset(dataset, false).then(() => restoreAnalysisState(state));

      return;
    }

    setWards(restoredWards);
    setClusterSets(clustersMatchCurrentModel ? view.clusterSets : null);
    setLoadedLeagueFreshness(view.leagueFreshness ?? null);
    restoreAnalysisState(state);
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

      if (view.key === activeViewKey) {
        setActiveViewKey(null);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete view");
    }
  }

  function revertView() {
    if (activeView) {
      restoreView(activeView.key);
    }
  }

  return {
    activeView,
    applySharedView,
    removeView,
    renameView,
    restoreView,
    revertView,
    saveView,
    updateView,
    viewModified,
  };
}
