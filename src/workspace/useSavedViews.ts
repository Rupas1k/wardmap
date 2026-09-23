import { useEffect, useMemo, useRef, useState } from "react";
import { parseWardRecords } from "../api/validation";
import { defaultDataset, isClusterSets, normalizeDataset } from "../dataset/model";
import type { DatasetSettings, WorkspaceSettings } from "../dataset/model";
import {
  clusterDataVersion,
  deleteWorkspaceView,
  persistSavedView,
  renameWorkspaceView,
  restoreWorkspaceView,
  savedWorkspaceViews,
  wardDataVersion,
  withStorageVersion,
} from "../dataset/storage";
import type { StoredAnalysis } from "../indexedDb";
import { getSetting, setSetting } from "../indexedDb";
import type { SharedView } from "../savedViews/sharedView";
import { autoViewSettingKey } from "../savedViews/viewState";
import type { ViewState } from "../savedViews/viewState";
import { locationKey } from "../locations/locationIdentity";
import {
  defaultClusteringSettings,
  defaultClusterMarkerSize,
  useMapStore,
} from "../state/mapState";
import { useWorkspaceMapSettings } from "../state/mapSelectors";
import { useWorkspaceActions, useWorkspaceData } from "../state/workspaceSelectors";
import type { ClusteringSettings } from "../state/mapState";
import { useWorkspaceStore } from "../state/workspaceState";
import type { League } from "../types";
import type { BooleanRef } from "./useDatasetLoader";
import { mapCenter, minZoom } from "../map/constants";

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
  autoViewReady: BooleanRef;
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
  autoViewReady,
}: SavedViewOptions) {
  const [activeViewKey, setActiveViewKey] = useState<string | null>(null);
  const [deletedView, setDeletedView] = useState<StoredAnalysis<ViewState> | null>(null);
  const deletedViewWasActive = useRef(false);
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
    void getSetting("active-saved-view")
      .then((key) => {
        if (typeof key === "string") {
          setActiveViewKey(key);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!autoViewReady.current || !currentViewState) {
      return;
    }

    void setSetting(autoViewSettingKey, currentViewState).catch((reason: unknown) => {
      console.warn("Unable to save Auto view", reason);
    });
  }, [autoViewReady, currentViewState]);

  useEffect(() => {
    if (!deletedView) {
      return;
    }

    const timeout = window.setTimeout(() => setDeletedView(null), 6000);

    return () => window.clearTimeout(timeout);
  }, [deletedView]);

  function selectActiveView(key: string | null) {
    setActiveViewKey(key);
    void setSetting("active-saved-view", key).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Unable to remember active view");
    });
  }

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
      selectActiveView(key);

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
    selectActiveView(null);

    await loadDataset(dataset, false);
    restoreAnalysisState(view);
  }

  async function resetCurrentView() {
    if (!defaultLeague) {
      setError("Unable to load leagues");

      return;
    }

    const dataset = { ...defaultDataset, leagueIds: [defaultLeague.id] };
    const workspaceState = useWorkspaceStore.getState();
    const mapState = useMapStore.getState();

    pendingSelection.current = null;
    selectActiveView(null);

    workspaceState.setLocationSort("wards");
    workspaceState.setLocationSortDirection("descending");
    workspaceState.setLocationMinimumWards(3);
    workspaceState.setWardOutcomeFilter("all");
    workspaceState.setWardSort("placement");
    workspaceState.setContextOrigin(null);
    workspaceState.clearWardSelectionSet();
    workspaceState.setLocationChanges([], [], {}, []);
    workspaceState.setPendingLocationReselection(null);

    setClusteringSettings(defaultClusteringSettings);
    setClusteringEnabled(true);
    setGroupByGridCell(false);
    setShowUnclustered(false);
    setVisionTechnique("gridnav");
    setClusterMarkerSize(defaultClusterMarkerSize);

    mapState.setCurrentSide("all");
    mapState.clearSelection();
    mapState.clearExpandedClusters();
    mapState.clearHiddenLocationPreview();
    mapState.restoreCamera({ center: [mapCenter[0], mapCenter[1]], zoom: minZoom });

    await loadDataset(dataset, false);
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
    selectActiveView(key);

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

  async function renameView(view: StoredAnalysis<ViewState>, name: string): Promise<boolean> {
    const nextName = name.trim();

    if (!nextName || nextName === view.name) {
      return true;
    }

    try {
      setSavedViews(await renameWorkspaceView(view, nextName));

      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to rename view");

      return false;
    }
  }

  async function removeView(view: StoredAnalysis<ViewState>) {
    try {
      await deleteWorkspaceView(view.key);
      setSavedViews((current) => current.filter((candidate) => candidate.key !== view.key));
      setDeletedView(view);
      deletedViewWasActive.current = view.key === activeViewKey;

      if (deletedViewWasActive.current) {
        selectActiveView(null);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete view");
    }
  }

  async function undoRemoveView() {
    if (!deletedView) {
      return;
    }

    try {
      await restoreWorkspaceView(deletedView);
      setSavedViews(await savedWorkspaceViews());

      if (deletedViewWasActive.current) {
        selectActiveView(deletedView.key);
      }

      setDeletedView(null);
      deletedViewWasActive.current = false;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to restore view");
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
    deletedView,
    removeView,
    renameView,
    resetCurrentView,
    restoreView,
    revertView,
    saveView,
    updateView,
    undoRemoveView,
    viewModified,
  };
}
