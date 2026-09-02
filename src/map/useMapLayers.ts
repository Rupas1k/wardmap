import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { useEffect } from "react";
import type { MapFocusRequest, VisionTechnique } from "../state/mapState";
import type { Cluster, ClusterSets, ClusterWard, Side } from "../types";
import { calculateGridNavVision } from "./calculateGridNavVision";
import calculateVision from "./calculateVision";
import { mapSize, sentryDetectionRadius } from "./constants";
import type { ClusterFeature } from "./features";
import { getClusterFeatureData } from "./features";
import layers from "./layers";
import { unitToPixel } from "./projections";
export function useClusterLayer({
  clearMapLocationSelection,
  clusterSets,
  currentSide,
  expandedClusterIds,
  selectedClusterId,
  setAverageValues,
  showUnclustered,
  locationFilter,
}: {
  clearMapLocationSelection: () => void;
  clusterSets: ClusterSets;
  currentSide: Side;
  expandedClusterIds: number[];
  selectedClusterId: number | null;
  setAverageValues: (average: Cluster | null) => void;
  showUnclustered: boolean;
  locationFilter: { playerId: number } | { matchId: number } | null;
}) {
  useEffect(() => {
    const source = layers.wards.getSource()!;
    const visibleClusters = clusterSets[currentSide].filter((cluster) => {
      if (!showUnclustered && cluster.unclustered === true) {
        return false;
      }

      return (cluster.wards ?? []).some(
        (ward) =>
          (currentSide === "all" || ward.is_radiant === (currentSide === "radiant")) &&
          (!locationFilter ||
            ("playerId" in locationFilter
              ? ward.player_placed_id === locationFilter.playerId
              : ward.match_id === locationFilter.matchId)),
      );
    });
    const expandedIds = new Set(expandedClusterIds);
    const features: ClusterFeature[] = visibleClusters.map((cluster) => {
      const coordinates: [number, number, number] = [cluster.x_pos, cluster.y_pos, cluster.z_pos];

      return new Feature({
        geometry: new Point(unitToPixel(coordinates)),
        data: { cluster, coordinates },
        dimmed: selectedClusterId !== null && cluster.cluster_id !== selectedClusterId,
        hidden: cluster.cluster_id !== selectedClusterId && expandedIds.has(cluster.cluster_id),
        selected: cluster.cluster_id === selectedClusterId,
      });
    });

    source.clear(true);
    source.addFeatures(features);
    layers.vision.getSource()!.clear(true);
    layers.wardDetails.getSource()!.clear(true);
    setAverageValues(clusterSets.average);

    if (
      selectedClusterId !== null &&
      !visibleClusters.some((cluster) => cluster.cluster_id === selectedClusterId)
    ) {
      clearMapLocationSelection();
    }
  }, [
    clearMapLocationSelection,
    clusterSets,
    currentSide,
    expandedClusterIds,
    selectedClusterId,
    setAverageValues,
    showUnclustered,
    locationFilter,
  ]);
}

export function useWardDetailLayer({
  clusters,
  currentSide,
  selectedClusterId,
  selectedMatchId,
  selectedPlayerId,
  selectedWardId,
}: {
  clusters: Cluster[];
  currentSide: Side;
  selectedClusterId: number | null;
  selectedMatchId: number | null;
  selectedPlayerId: number | null;
  selectedWardId: number | null;
}) {
  useEffect(() => {
    const source = layers.wardDetails.getSource()!;

    source.clear(true);

    if (clusters.length === 0) {
      return;
    }

    source.addFeatures(
      clusters.flatMap((cluster) =>
        (cluster.wards ?? [])
          .filter(
            (ward) =>
              (currentSide === "all" || ward.is_radiant === (currentSide === "radiant")) &&
              (selectedPlayerId === null || ward.player_placed_id === selectedPlayerId) &&
              (selectedMatchId === null || ward.match_id === selectedMatchId),
          )
          .map(
            (ward) =>
              new Feature({
                geometry: new Point(unitToPixel([ward.x_pos, ward.y_pos])),
                wardData: {
                  clusterId: cluster.cluster_id,
                  ward,
                  coordinates: [ward.x_pos, ward.y_pos, ward.z_pos],
                },
                selected: cluster.cluster_id === selectedClusterId && ward.id === selectedWardId,
              }),
          ),
      ),
    );
  }, [clusters, currentSide, selectedClusterId, selectedMatchId, selectedPlayerId, selectedWardId]);
}

export function useMapFocus({
  centerMapAt,
  clearFocusRequest,
  focusRequest,
  selectMapLocation,
}: {
  centerMapAt: (x: number, y: number) => void;
  clearFocusRequest: () => void;
  focusRequest: MapFocusRequest | null;
  selectMapLocation: (clusterId: number, wardId?: number | null) => void;
}) {
  useEffect(() => {
    if (!focusRequest) {
      return;
    }

    const features = layers.wards.getSource()!.getFeatures() as ClusterFeature[];
    const feature = features.find((candidate) => {
      const cluster = getClusterFeatureData(candidate).cluster;

      return focusRequest.kind === "ward"
        ? cluster.wards?.some((ward) => ward.id === focusRequest.id)
        : cluster.cluster_id === focusRequest.id;
    });

    if (feature) {
      const cluster = getClusterFeatureData(feature).cluster;
      const ward =
        focusRequest.kind === "ward"
          ? cluster.wards?.find((candidate) => candidate.id === focusRequest.id)
          : null;

      selectMapLocation(cluster.cluster_id, focusRequest.kind === "ward" ? focusRequest.id : null);
      centerMapAt(ward?.x_pos ?? cluster.x_pos, ward?.y_pos ?? cluster.y_pos);
    }

    clearFocusRequest();
  }, [centerMapAt, clearFocusRequest, focusRequest, selectMapLocation]);
}

export function useVisionLayer({
  elevations,
  selectedCluster,
  selectedWardId,
  visionTechnique,
}: {
  elevations: number[][] | null;
  selectedCluster: Cluster | null;
  selectedWardId: number | null;
  visionTechnique: VisionTechnique;
}) {
  useEffect(() => {
    layers.vision.getSource()!.clear();

    if (!selectedCluster || !elevations) {
      return;
    }

    const selectedWard = selectedCluster.wards?.find((ward) => ward.id === selectedWardId);
    const coordinates: [number, number, number] = selectedWard
      ? [selectedWard.x_pos, selectedWard.y_pos, selectedWard.z_pos]
      : [selectedCluster.x_pos, selectedCluster.y_pos, selectedCluster.z_pos];
    const clusterWards = selectedCluster.wards ?? [];
    const sentry = selectedWard
      ? !selectedWard.is_obs
      : clusterWards.length > 0 && clusterWards.every((ward) => !ward.is_obs);
    const radius = sentry ? sentryDetectionRadius : undefined;
    const x = Math.floor(coordinates[0] - mapSize.units.x0);
    const y = Math.floor(coordinates[1] - mapSize.units.y0);
    const z = (coordinates[2] - 16384) / 128;
    const visionFeatures =
      visionTechnique === "gridnav"
        ? calculateGridNavVision(elevations, x, y, z, radius, sentry)
        : [calculateVision(elevations, x, y, z, radius, sentry)];

    layers.vision.getSource()!.addFeatures(visionFeatures);
  }, [elevations, selectedCluster, selectedWardId, visionTechnique]);
}

export function visibleWards(
  cluster: Cluster | null,
  side: Side,
  playerId: number | null,
  matchId: number | null,
): ClusterWard[] {
  return (cluster?.wards ?? []).filter(
    (ward) =>
      (side === "all" || ward.is_radiant === (side === "radiant")) &&
      (playerId === null || ward.player_placed_id === playerId) &&
      (matchId === null || ward.match_id === matchId),
  );
}
