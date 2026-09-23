import { useEffect, useRef } from "react";
import { parseWardRecords } from "../api/validation";
import { defaultDataset, isClusterSets, normalizeDataset } from "../dataset/model";
import type { DatasetSettings } from "../dataset/model";
import { clusterDataVersion, wardDataVersion } from "../dataset/storage";
import { getAnalysis, getSetting } from "../indexedDb";
import { locationKey } from "../locations/locationIdentity";
import { autoViewSettingKey, normalizeSavedViewState } from "../savedViews/viewState";
import type { ViewState } from "../savedViews/viewState";
import { useWorkspaceMapSettings } from "../state/mapSelectors";
import { useMapStore } from "../state/mapState";
import { selectDisplayedClusterSets } from "../state/workspaceSelectors";
import { useWorkspaceActions } from "../state/workspaceSelectors";
import { useWorkspaceStore } from "../state/workspaceState";
import type { League } from "../types";
import type { BooleanRef } from "./useDatasetLoader";

interface WorkspaceRestoreOptions {
  compatibleDataset: (dataset: DatasetSettings) => DatasetSettings;
  defaultLeague: League | null;
  loadDataset: (dataset: DatasetSettings, forceRefresh: boolean) => Promise<void>;
  ready: boolean;
  restoredClusters: BooleanRef;
}

export default function useWorkspaceRestore({
  compatibleDataset,
  defaultLeague,
  loadDataset,
  ready,
  restoredClusters,
}: WorkspaceRestoreOptions): BooleanRef {
  const autoViewReady = useRef(false);
  const pendingView = useRef<ViewState | null>(null);
  const displayClusterSets = useWorkspaceStore(selectDisplayedClusterSets);
  const context = useWorkspaceStore((state) => state.analysisContext);
  const { setClusteringSettings, setClusterMarkerSize, setCurrentSide, setVisionTechnique } =
    useWorkspaceMapSettings();
  const {
    setClusteringEnabled,
    setDataLoadProgress,
    setDatasetSnapshot,
    setDraftDataset,
    setGroupByGridCell,
    setLoadingData,
    setShowUnclustered,
  } = useWorkspaceActions();

  function applyViewState(state: ViewState) {
    const workspace = useWorkspaceStore.getState();
    const map = useMapStore.getState();

    workspace.setLocationSort(state.browse.locationSort);
    workspace.setLocationSortDirection(state.browse.locationSortDirection);
    workspace.setLocationMinimumWards(state.browse.locationMinimumWards);
    workspace.setWardOutcomeFilter(state.browse.wardOutcomeFilter);
    workspace.setWardSort(state.browse.wardSort);
    workspace.setContextOrigin(state.context.origin);
    workspace.setContextRefinement(state.context.refinement);
    setCurrentSide(state.map.side);
    setClusterMarkerSize(state.map.markerSize);

    if (state.map.camera) {
      map.restoreCamera(state.map.camera);
    }

    pendingView.current = state;
    autoViewReady.current = true;
  }

  useEffect(() => {
    const state = pendingView.current;

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
    const map = useMapStore.getState();

    map.clearExpandedClusters();
    for (const key of state.selection.expandedLocationKeys) {
      const cluster = clustersByKey.get(key);

      if (cluster) {
        map.setClusterExpanded(cluster.cluster_id, true);
      }
    }

    if (selected) {
      const wardId = selected.wards?.some((ward) => ward.id === state.selection.wardId)
        ? state.selection.wardId
        : null;

      map.selectMapLocation(selected.cluster_id, wardId);
    } else {
      map.clearMapLocationSelection();
    }

    pendingView.current = null;
  }, [context.status, displayClusterSets]);

  useEffect(() => {
    if (!ready || !defaultLeague) {
      return;
    }

    let active = true;
    const initialDataset = { ...defaultDataset, leagueIds: [defaultLeague.id] };

    setLoadingData(true);
    setDataLoadProgress(null);
    setDatasetSnapshot(null, [], null);

    void Promise.all([getAnalysis("workspace:last"), getSetting(autoViewSettingKey)])
      .then(async ([session, storedAutoView]) => {
        if (!active) {
          return;
        }

        const autoView = normalizeSavedViewState(storedAutoView);
        const cachedView = session ? normalizeSavedViewState(session.settings) : null;
        const state = autoView ?? cachedView;

        if (!state) {
          setDraftDataset(initialDataset);
          setDatasetSnapshot(null, [], null);
          await loadDataset(initialDataset, false);
          autoViewReady.current = true;

          return;
        }

        const settings = state.workspace;
        const normalizedDataset = normalizeDataset(settings.dataset, defaultLeague.id);
        const dataset = compatibleDataset(normalizedDataset);
        const removedIncompatibleLeagues =
          dataset.leagueIds.length !== normalizedDataset.leagueIds.length;

        setDraftDataset(dataset);
        setClusteringSettings(settings.clustering);
        setClusteringEnabled(settings.clusteringEnabled ?? true);
        setGroupByGridCell(settings.groupByGridCell ?? false);
        setShowUnclustered(settings.showUnclustered ?? false);
        setVisionTechnique(settings.visionTechnique);
        useWorkspaceStore
          .getState()
          .setLocationChanges(
            settings.excludedWardIds ?? [],
            settings.hiddenLocationFingerprints ?? [],
            settings.locationNames ?? {},
            settings.manualLocations ?? [],
          );

        const cachedSettingsMatch = Boolean(
          cachedView && JSON.stringify(cachedView.workspace) === JSON.stringify(settings),
        );
        const canRestoreCache = Boolean(
          session &&
          isClusterSets(session.clusterSets) &&
          cachedSettingsMatch &&
          !removedIncompatibleLeagues &&
          settings.wardDataVersion === wardDataVersion,
        );

        if (!canRestoreCache || !session) {
          setDatasetSnapshot(null, [], null);
          await loadDataset(dataset, false);

          if (active) {
            applyViewState(state);
          }

          return;
        }

        let restoredWards;

        try {
          restoredWards = parseWardRecords(session.wards);
        } catch {
          setDatasetSnapshot(null, [], null);
          await loadDataset(dataset, false);

          if (active) {
            applyViewState(state);
          }

          return;
        }

        if (!active) {
          return;
        }

        const clustersMatchCurrentModel = settings.clusterDataVersion === clusterDataVersion;

        restoredClusters.current = clustersMatchCurrentModel;
        setDatasetSnapshot(
          dataset,
          restoredWards,
          clustersMatchCurrentModel ? session.clusterSets! : null,
          session.leagueFreshness ?? null,
        );
        setLoadingData(false);
        applyViewState(state);
      })
      .catch(async () => {
        await loadDataset(initialDataset, false);
        autoViewReady.current = true;
      });

    return () => {
      active = false;
    };
  }, [defaultLeague?.id, ready]);

  return autoViewReady;
}
