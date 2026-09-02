import type MapBrowserEvent from "ol/MapBrowserEvent";
import { useEffect, useRef, useState } from "react";
import { contextIds } from "../state/analysisContext";
import type { AnalysisScope } from "../state/analysisContext";
import { useMapStore } from "../state/mapState";
import type { InspectorTab } from "../state/workspaceState";
import { useWorkspaceStore } from "../state/workspaceState";
import type { Cluster, ClusterWard } from "../types";
import { getClusterFeatureData, getWardFeatureData } from "./features";
import type { ClusterFeature, WardFeature } from "./features";
import { createMap } from "./OLMap";
import layers from "./layers";
import { visibleWards } from "./useMapLayers";

interface MapInteractionOptions {
  clearMapLocationSelection: () => void;
  clearSelection: () => void;
  clearWardSelection: () => void;
  selectMapLocation: (clusterId: number, wardId?: number | null) => void;
  setContextOrigin: (scope: AnalysisScope | null) => void;
  setContextRefinement: (scope: AnalysisScope | null) => void;
  setInspectorTab: (tab: InspectorTab) => void;
}

export default function useMapInteractions({
  clearMapLocationSelection,
  clearSelection,
  clearWardSelection,
  selectMapLocation,
  setContextOrigin,
  setContextRefinement,
  setInspectorTab,
}: MapInteractionOptions) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<ReturnType<typeof createMap> | null>(null);
  const [hover, setHover] = useState<{ cluster: Cluster; x: number; y: number } | null>(null);
  const [wardHover, setWardHover] = useState<{
    ward: ClusterWard;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!mapElement.current) {
      return;
    }

    const targetElement = mapElement.current;
    const map = createMap(targetElement);

    mapInstance.current = map;

    const resizeObserver = new ResizeObserver(() => map.updateSize());
    resizeObserver.observe(targetElement);

    const updateSizeFrame = window.requestAnimationFrame(() => map.updateSize());

    function dismissSelectionLevel() {
      const mapState = useMapStore.getState();
      const { selectedClusterId: clusterId, selectedWardId: wardId } = mapState;
      const workspaceState = useWorkspaceStore.getState();
      const currentContext = workspaceState.analysisContext;

      if (wardId !== null) {
        const selectedFeature = (layers.wards.getSource()!.getFeatures() as ClusterFeature[]).find(
          (feature) => getClusterFeatureData(feature).cluster.cluster_id === clusterId,
        );
        const selectedCluster = selectedFeature
          ? getClusterFeatureData(selectedFeature).cluster
          : null;
        const { playerId, matchId } = contextIds(currentContext);
        const singleWardLocation =
          visibleWards(selectedCluster, mapState.currentSide, playerId, matchId).length <= 1;

        if (singleWardLocation) {
          clearMapLocationSelection();
          setInspectorTab(workspaceState.inspectorReturnTab);

          return;
        }

        clearWardSelection();

        return;
      }

      if (currentContext.refinement) {
        setContextRefinement(null);

        return;
      }

      if (clusterId !== null) {
        clearMapLocationSelection();
        setInspectorTab(workspaceState.inspectorReturnTab);

        return;
      }

      if (currentContext.origin) {
        setContextOrigin(null);
      }
    }

    function wardAt(event: MapBrowserEvent): WardFeature | null {
      let feature: WardFeature | null = null;

      map.forEachFeatureAtPixel(
        event.pixel,
        (candidate) => {
          feature = candidate as WardFeature;

          return true;
        },
        { hitTolerance: 8, layerFilter: (layer) => layer === layers.wardDetails },
      );

      return feature;
    }

    function clusterAt(event: MapBrowserEvent): ClusterFeature | null {
      let feature: ClusterFeature | null = null;

      map.forEachFeatureAtPixel(
        event.pixel,
        (candidate) => {
          feature = candidate as ClusterFeature;

          return true;
        },
        { hitTolerance: 8, layerFilter: (layer) => layer === layers.wards },
      );

      return feature;
    }

    function selectWard(wardFeature: WardFeature, event: MapBrowserEvent): boolean {
      const overlappingClusterFeature = clusterAt(event);
      const mapState = useMapStore.getState();
      const wardData = getWardFeatureData(wardFeature);
      const currentContext = useWorkspaceStore.getState().analysisContext;
      const { playerId, matchId } = contextIds(currentContext);
      const overlappingCluster = overlappingClusterFeature
        ? getClusterFeatureData(overlappingClusterFeature).cluster
        : null;
      const overlappingSelectedCluster =
        overlappingCluster?.cluster_id === mapState.selectedClusterId;
      const multiWardCluster =
        visibleWards(overlappingCluster, mapState.currentSide, playerId, matchId).length > 1;

      if (
        wardData.clusterId === mapState.selectedClusterId &&
        mapState.selectedWardId !== null &&
        overlappingSelectedCluster &&
        multiWardCluster
      ) {
        clearWardSelection();
        setInspectorTab("details");

        return true;
      }

      const ward = wardData.ward;
      const selected =
        mapState.selectedClusterId === wardData.clusterId && mapState.selectedWardId === ward.id;

      if (!selected) {
        selectMapLocation(wardData.clusterId, ward.id);
      }

      setInspectorTab("details");

      return true;
    }

    function selectCluster(feature: ClusterFeature): boolean {
      const cluster = getClusterFeatureData(feature).cluster;
      const selection = useMapStore.getState();
      const currentContext = useWorkspaceStore.getState().analysisContext;
      const origin = currentContext.origin;
      const { playerId, matchId } = contextIds(currentContext);
      const wards = visibleWards(cluster, selection.currentSide, playerId, matchId);

      if (cluster.cluster_id === selection.selectedClusterId) {
        if (selection.selectedWardId !== null && wards.length > 1) {
          clearWardSelection();
        }

        setInspectorTab("details");

        return true;
      }

      const wardId = wards.length === 1 ? wards[0]!.id : null;

      selectMapLocation(cluster.cluster_id, wardId);
      useWorkspaceStore
        .getState()
        .setWardView(
          origin?.kind === "player" ? "players" : origin?.kind === "match" ? "matches" : "wards",
        );
      setInspectorTab("details");

      return true;
    }

    function handleClick(event: MapBrowserEvent) {
      const wardFeature = wardAt(event);

      if (wardFeature && selectWard(wardFeature, event)) {
        return;
      }

      const clusterFeature = clusterAt(event);

      if (clusterFeature && selectCluster(clusterFeature)) {
        return;
      }

      dismissSelectionLevel();
    }

    function handlePointerMove(event: MapBrowserEvent) {
      if (event.dragging) {
        setHover(null);
        setWardHover(null);
        targetElement.style.cursor = "";

        return;
      }

      let feature: ClusterFeature | WardFeature | null = null;

      map.forEachFeatureAtPixel(
        event.pixel,
        (candidate) => {
          feature = candidate as ClusterFeature;

          return true;
        },
        {
          hitTolerance: 8,
          layerFilter: (layer) => layer === layers.wards || layer === layers.wardDetails,
        },
      );

      const hoveredFeature = feature as ClusterFeature | WardFeature | null;
      targetElement.style.cursor = hoveredFeature ? "pointer" : "";

      if (!hoveredFeature) {
        setHover(null);
        setWardHover(null);

        return;
      }

      const tooltipWidth = 224;
      const tooltipHeight = 190;
      const [pointerX = 0, pointerY = 0] = event.pixel;
      const x = Math.min(pointerX + 14, Math.max(8, targetElement.clientWidth - tooltipWidth - 8));
      const y =
        pointerY + tooltipHeight + 20 > targetElement.clientHeight
          ? Math.max(8, pointerY - tooltipHeight - 14)
          : pointerY + 14;

      if (hoveredFeature.get("wardData")) {
        setHover(null);
        setWardHover({ ward: getWardFeatureData(hoveredFeature).ward, x, y });

        return;
      }

      if (hoveredFeature.get("data")) {
        const cluster = getClusterFeatureData(hoveredFeature).cluster;
        const wards = cluster.wards ?? [];

        if (wards.length === 1) {
          setHover(null);
          setWardHover({ ward: wards[0]!, x, y });
        } else {
          setWardHover(null);
          setHover({ cluster, x, y });
        }

        return;
      }

      setHover(null);
      setWardHover(null);
    }

    function handlePointerLeave() {
      setHover(null);
      setWardHover(null);
      targetElement.style.cursor = "";
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        dismissSelectionLevel();
      }
    }

    map.on("click", handleClick);
    map.on("pointermove", handlePointerMove);
    targetElement.addEventListener("pointerleave", handlePointerLeave);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(updateSizeFrame);
      resizeObserver.disconnect();
      map.un("click", handleClick);
      map.un("pointermove", handlePointerMove);
      targetElement.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("keydown", handleKeyDown);
      mapInstance.current = null;
      map.setTarget(undefined);
      map.dispose();
      layers.vision.getSource()!.clear(true);
      layers.wards.getSource()!.clear(true);
      layers.wardDetails.getSource()!.clear(true);
      clearSelection();
    };
  }, [
    clearMapLocationSelection,
    clearSelection,
    clearWardSelection,
    selectMapLocation,
    setContextOrigin,
    setContextRefinement,
    setInspectorTab,
  ]);

  return { hover, mapElement, mapInstance, wardHover };
}
