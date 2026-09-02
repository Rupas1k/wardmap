import { forwardRef, useImperativeHandle, useMemo } from "react";
import { contextIds } from "../state/analysisContext";
import { useMapViewState } from "../state/mapSelectors";
import { useWorkspaceStore } from "../state/workspaceState";
import type { ClusterSets, League } from "../types";
import exportMapImage from "./exportMapImage";
import { ClusterTooltip, WardTooltip } from "./MapTooltips";
import { useClusterLayer, useMapFocus, useVisionLayer, useWardDetailLayer } from "./useMapLayers";
import useMapInteractions from "./useMapInteractions";
import { useElevationGrid, useMapCamera } from "./useMapRuntime";

interface MapViewProps {
  clusterSets: ClusterSets;
  league: League;
  showUnclustered: boolean;
}

export interface MapViewHandle {
  downloadImage: () => Promise<void>;
}

const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  { clusterSets, league, showUnclustered },
  ref,
) {
  const {
    selectedClusterId,
    selectedWardId,
    expandedClusterIds,
    focusRequest,
    elevations,
    currentSide,
    visionTechnique,
    selectMapLocation,
    clearWardSelection,
    clearMapLocationSelection,
    clearSelection,
    clearFocusRequest,
    centerMapAt,
    setAverageValues,
  } = useMapViewState();
  const setInspectorTab = useWorkspaceStore((state) => state.setInspectorTab);
  const context = useWorkspaceStore((state) => state.analysisContext);
  const setContextOrigin = useWorkspaceStore((state) => state.setContextOrigin);
  const setContextRefinement = useWorkspaceStore((state) => state.setContextRefinement);

  const { error, loading } = useElevationGrid(league.version);
  const { hover, mapElement, mapInstance, wardHover } = useMapInteractions({
    clearMapLocationSelection,
    clearSelection,
    clearWardSelection,
    selectMapLocation,
    setContextOrigin,
    setContextRefinement,
    setInspectorTab,
  });

  const { playerId: selectedPlayerId, matchId: selectedMatchId } = contextIds(context);
  const locationFilter = useMemo(() => {
    if (!context.origin) {
      return null;
    }

    return context.origin.kind === "player"
      ? { playerId: context.origin.id }
      : { matchId: context.origin.id };
  }, [context.origin]);
  const selectedCluster = useMemo(
    () =>
      clusterSets[currentSide].find((cluster) => cluster.cluster_id === selectedClusterId) ?? null,
    [clusterSets, currentSide, selectedClusterId],
  );
  const detailedClusters = useMemo(() => {
    const ids = new Set(expandedClusterIds);

    if (selectedClusterId !== null) {
      ids.add(selectedClusterId);
    }

    return clusterSets[currentSide].filter((cluster) => ids.has(cluster.cluster_id));
  }, [clusterSets, currentSide, expandedClusterIds, selectedClusterId]);

  useImperativeHandle(ref, () => ({
    async downloadImage() {
      if (!mapInstance.current) {
        throw new Error("Map is not ready");
      }

      await exportMapImage();
    },
  }));

  useMapCamera(mapInstance);
  useClusterLayer({
    clearMapLocationSelection,
    clusterSets,
    currentSide,
    expandedClusterIds,
    selectedClusterId,
    setAverageValues,
    showUnclustered,
    locationFilter,
  });
  useWardDetailLayer({
    clusters: detailedClusters,
    currentSide,
    selectedClusterId,
    selectedMatchId,
    selectedPlayerId,
    selectedWardId,
  });
  useMapFocus({ centerMapAt, clearFocusRequest, focusRequest, selectMapLocation });
  useVisionLayer({ elevations, selectedCluster, selectedWardId, visionTechnique });

  return (
    <div className="h-full w-full bg-slate-950">
      {error ? (
        <div className="absolute top-3 right-3 left-3 z-20 border border-red-500/30 bg-red-950/95 p-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      {loading ? (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-slate-950/35 backdrop-blur-[1px]">
          <div className="bg-slate-950/90 px-3 py-2 text-xs text-slate-300">Loading map…</div>
        </div>
      ) : null}
      <div id="map" ref={mapElement} />
      {hover ? (
        <ClusterTooltip cluster={hover.cluster} side={currentSide} x={hover.x} y={hover.y} />
      ) : null}
      {wardHover ? <WardTooltip ward={wardHover.ward} x={wardHover.x} y={wardHover.y} /> : null}
    </div>
  );
});

export default MapView;
