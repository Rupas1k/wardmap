import { useEffect, useRef } from "react";
import { locationKey } from "../locations/locationIdentity";
import type { ViewState } from "../savedViews/viewState";
import { useWorkspaceMapSettings } from "../state/mapSelectors";
import { useMapStore } from "../state/mapState";
import { selectDisplayedClusterSets } from "../state/workspaceSelectors";
import { useWorkspaceActions } from "../state/workspaceSelectors";
import { useWorkspaceStore } from "../state/workspaceState";

export default function useViewRestoration() {
  const pendingView = useRef<ViewState | null>(null);
  const displayClusterSets = useWorkspaceStore(selectDisplayedClusterSets);
  const contextStatus = useWorkspaceStore((state) => state.analysisContext.status);
  const { setClusteringSettings, setClusterMarkerSize, setCurrentSide, setVisionTechnique } =
    useWorkspaceMapSettings();
  const { setClusteringEnabled, setGroupByGridCell, setShowUnclustered } = useWorkspaceActions();

  useEffect(() => {
    const state = pendingView.current;

    if (!state || !displayClusterSets || (state.context.origin && contextStatus !== "ready")) {
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
  }, [contextStatus, displayClusterSets]);

  function applyWorkspaceSettings(state: ViewState) {
    const settings = state.workspace;
    const workspace = useWorkspaceStore.getState();

    setClusteringSettings(settings.clustering);
    setClusteringEnabled(settings.clusteringEnabled ?? true);
    setGroupByGridCell(settings.groupByGridCell ?? false);
    setShowUnclustered(settings.showUnclustered ?? false);
    setVisionTechnique(settings.visionTechnique);
    setClusterMarkerSize(state.map.markerSize);
    workspace.setLocationChanges(
      settings.excludedWardIds ?? [],
      settings.hiddenLocationFingerprints ?? [],
      settings.locationNames ?? {},
      settings.manualLocations ?? [],
    );
  }

  function restorePresentation(state: ViewState) {
    const workspace = useWorkspaceStore.getState();

    workspace.setLocationSort(state.browse.locationSort);
    workspace.setLocationSortDirection(state.browse.locationSortDirection);
    workspace.setLocationMinimumWards(state.browse.locationMinimumWards);
    workspace.setWardOutcomeFilter(state.browse.wardOutcomeFilter);
    workspace.setWardSort(state.browse.wardSort);
    workspace.setContextOrigin(state.context.origin);
    workspace.setContextRefinement(state.context.refinement);
    setCurrentSide(state.map.side);

    pendingView.current = state;
  }

  function clearPendingPresentation() {
    pendingView.current = null;
  }

  return { applyWorkspaceSettings, clearPendingPresentation, restorePresentation };
}
