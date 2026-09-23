import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import LineString from "ol/geom/LineString";
import { useEffect } from "react";
import { useMapStore } from "../state/mapState";
import { useWorkspaceStore } from "../state/workspaceState";
import type { MapFocusRequest, VisionTechnique } from "../state/mapState";
import type { MapPosition } from "../state/mapState";
import type { Cluster, ClusterSets, Side } from "../types";
import { locationWards } from "../locations/locationIdentity";
import { calculateGridNavVision } from "./calculateGridNavVision";
import calculateVision from "./calculateVision";
import { mapSize, sentryDetectionRadius } from "./constants";
import type { ClusterFeature, WardFeature } from "./features";
import { getClusterFeatureData, getWardFeatureData } from "./features";
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
  const selectedWardIds = useWorkspaceStore((state) => state.selectedWardIds);

  useEffect(() => {
    const source = layers.wards.getSource()!;
    const playerId =
      locationFilter && "playerId" in locationFilter ? locationFilter.playerId : null;
    const matchId = locationFilter && "matchId" in locationFilter ? locationFilter.matchId : null;
    const visibleClusters = clusterSets[currentSide].filter((cluster) => {
      if (!showUnclustered && cluster.unclustered === true) {
        return false;
      }

      return (
        locationWards(cluster, {
          side: currentSide,
          playerId,
          matchId,
        }).length > 0
      );
    });
    const expandedIds = new Set(expandedClusterIds);
    const selectedWards = new Set(selectedWardIds);
    const locationNumbers = new Map(
      [...visibleClusters]
        .sort((left, right) => left.cluster_id - right.cluster_id)
        .map((cluster, index) => [cluster.cluster_id, index + 1]),
    );
    const hoverState = useMapStore.getState();
    const features: ClusterFeature[] = visibleClusters.map((cluster) => {
      const coordinates: [number, number, number] = [cluster.x_pos, cluster.y_pos, cluster.z_pos];
      const wards = locationWards(cluster, { side: currentSide, playerId, matchId });
      const selectedWardCount = wards.filter((ward) => selectedWards.has(ward.id)).length;
      const multiSelection =
        selectedWardCount === 0 ? null : selectedWardCount === wards.length ? "full" : "partial";

      return new Feature({
        geometry: new Point(unitToPixel(coordinates)),
        data: {
          cluster,
          coordinates,
          locationNumber: locationNumbers.get(cluster.cluster_id) ?? 0,
        },
        dimmed: selectedClusterId !== null && cluster.cluster_id !== selectedClusterId,
        hidden:
          cluster.cluster_id !== selectedClusterId &&
          (expandedIds.has(cluster.cluster_id) || multiSelection === "partial"),
        hovered:
          cluster.cluster_id === hoverState.hoveredClusterId ||
          (cluster.wards?.some((ward) => ward.id === hoverState.hoveredWardId) ?? false),
        selected: cluster.cluster_id === selectedClusterId,
        multiSelection,
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
    selectedWardIds,
    setAverageValues,
    showUnclustered,
    locationFilter,
  ]);
}

export function useWardDetailLayer({
  clusters,
  currentSide,
  expandedClusterIds,
  selectedClusterId,
  selectedMatchId,
  selectedPlayerId,
  selectedWardId,
}: {
  clusters: Cluster[];
  currentSide: Side;
  expandedClusterIds: number[];
  selectedClusterId: number | null;
  selectedMatchId: number | null;
  selectedPlayerId: number | null;
  selectedWardId: number | null;
}) {
  const selectedWardIds = useWorkspaceStore((state) => state.selectedWardIds);

  useEffect(() => {
    const source = layers.wardDetails.getSource()!;

    source.clear(true);

    if (clusters.length === 0) {
      return;
    }

    const hoveredWardId = useMapStore.getState().hoveredWardId;
    const multiSelectedWardIds = new Set(selectedWardIds);
    const expandedIds = new Set(expandedClusterIds);

    source.addFeatures(
      clusters.flatMap((cluster) => {
        const wards = locationWards(cluster, {
          side: currentSide,
          playerId: selectedPlayerId,
          matchId: selectedMatchId,
        });
        const visibleWards =
          cluster.cluster_id === selectedClusterId || expandedIds.has(cluster.cluster_id)
            ? wards
            : wards.every((ward) => multiSelectedWardIds.has(ward.id))
              ? []
              : wards.filter((ward) => multiSelectedWardIds.has(ward.id));

        return visibleWards.map(
          (ward) =>
            new Feature({
              geometry: new Point(unitToPixel([ward.x_pos, ward.y_pos])),
              wardData: {
                clusterId: cluster.cluster_id,
                ward,
                coordinates: [ward.x_pos, ward.y_pos, ward.z_pos],
              },
              hovered: ward.id === hoveredWardId,
              multiSelected: multiSelectedWardIds.has(ward.id),
              selected: cluster.cluster_id === selectedClusterId && ward.id === selectedWardId,
            }),
        );
      }),
    );
  }, [
    clusters,
    currentSide,
    expandedClusterIds,
    selectedClusterId,
    selectedMatchId,
    selectedPlayerId,
    selectedWardId,
    selectedWardIds,
  ]);
}

export function useMapHoverState(hoveredClusterId: number | null, hoveredWardId: number | null) {
  useEffect(() => {
    const clusterFeatures = layers.wards.getSource()!.getFeatures() as ClusterFeature[];

    for (const feature of clusterFeatures) {
      const cluster = getClusterFeatureData(feature).cluster;
      const hovered =
        cluster.cluster_id === hoveredClusterId ||
        (cluster.wards?.some((ward) => ward.id === hoveredWardId) ?? false);

      feature.set("hovered", hovered, true);
    }

    const wardFeatures = layers.wardDetails.getSource()!.getFeatures() as WardFeature[];

    for (const feature of wardFeatures) {
      feature.set("hovered", getWardFeatureData(feature).ward.id === hoveredWardId, true);
    }

    layers.wards.changed();
    layers.wardDetails.changed();
  }, [hoveredClusterId, hoveredWardId]);
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

export function useSightingLayer(position: MapPosition | null, routes: MapPosition[][]) {
  useEffect(() => {
    const source = layers.sightings.getSource()!;

    source.clear(true);

    if (position) {
      source.addFeature(new Feature({ geometry: new Point(unitToPixel(position)) }));
    }

    for (const route of routes) {
      if (route.length > 1) {
        source.addFeature(
          new Feature({
            geometry: new LineString(route.map((point) => unitToPixel(point))),
            route: true,
          }),
        );
      }
    }
  }, [position, routes]);
}

export function useHiddenLocationPreviewLayer(position: MapPosition | null) {
  useEffect(() => {
    const source = layers.hiddenLocationPreview.getSource()!;

    source.clear(true);

    if (position) {
      source.addFeature(new Feature({ geometry: new Point(unitToPixel(position)) }));
    }
  }, [position]);
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
