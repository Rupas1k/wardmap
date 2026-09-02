import { useEffect } from "react";
import { getSetting, listAnalyses, setSetting } from "../indexedDb";
import type { StoredAnalysis } from "../indexedDb";
import { useWorkspaceMapSettings } from "../state/mapSelectors";
import type { ClusteringSettings, ClusterMarkerSize } from "../state/mapState";
import { useWorkspaceStore } from "../state/workspaceState";
import {
  isVisionTechnique,
  isWorkspaceSettings,
  normalizeClusteringSettings,
} from "../dataset/model";
import type { WorkspaceSettings } from "../dataset/model";

const settingsKeys = {
  clustering: "main-clustering-settings",
  vision: "main-vision-technique",
  clusteringEnabled: "main-clustering-enabled",
  groupByGridCell: "main-group-by-grid-cell",
  showUnclustered: "main-show-unclustered",
  clusterMarkerSize: "map-cluster-marker-size",
  controlsOpen: "workspace-controls-open",
  inspectorOpen: "workspace-inspector-open",
} as const;

function isClusterMarkerSize(value: unknown): value is ClusterMarkerSize {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ClusterMarkerSize>;

  return Boolean(
    Number.isFinite(candidate.minimum) &&
    Number.isFinite(candidate.maximum) &&
    candidate.minimum! >= 2 &&
    candidate.maximum! <= 20 &&
    candidate.minimum! <= candidate.maximum!,
  );
}

export default function useWorkspaceSettings() {
  const clusteringEnabled = useWorkspaceStore((state) => state.clusteringEnabled);
  const groupByGridCell = useWorkspaceStore((state) => state.groupByGridCell);
  const showUnclustered = useWorkspaceStore((state) => state.showUnclustered);
  const setControlsOpen = useWorkspaceStore((state) => state.setControlsOpen);
  const setInspectorOpen = useWorkspaceStore((state) => state.setInspectorOpen);
  const setClusteringEnabled = useWorkspaceStore((state) => state.setClusteringEnabled);
  const setGroupByGridCell = useWorkspaceStore((state) => state.setGroupByGridCell);
  const setShowUnclustered = useWorkspaceStore((state) => state.setShowUnclustered);
  const setSavedViews = useWorkspaceStore((state) => state.setSavedViews);
  const setReady = useWorkspaceStore((state) => state.setReady);
  const setError = useWorkspaceStore((state) => state.setError);
  const {
    clusteringSettings,
    clusterMarkerSize,
    visionTechnique,
    setClusteringSettings,
    setClusterMarkerSize,
    setVisionTechnique,
  } = useWorkspaceMapSettings();

  useEffect(() => {
    let active = true;

    void Promise.all([
      getSetting(settingsKeys.clustering),
      getSetting(settingsKeys.vision),
      getSetting(settingsKeys.clusteringEnabled),
      getSetting(settingsKeys.groupByGridCell),
      getSetting(settingsKeys.showUnclustered),
      getSetting(settingsKeys.clusterMarkerSize),
      getSetting(settingsKeys.controlsOpen),
      getSetting(settingsKeys.inspectorOpen),
      listAnalyses("saved"),
    ])
      .then(
        ([
          clustering,
          vision,
          enabled,
          gridCells,
          unclustered,
          markerSize,
          controls,
          inspector,
          views,
        ]) => {
          if (!active) {
            return;
          }

          const restoredClustering = normalizeClusteringSettings(clustering);

          if (restoredClustering) {
            setClusteringSettings(restoredClustering);
          }
          if (isVisionTechnique(vision)) {
            setVisionTechnique(vision);
          }
          if (typeof enabled === "boolean") {
            setClusteringEnabled(enabled);
          }
          if (typeof gridCells === "boolean") {
            setGroupByGridCell(gridCells);
          }
          if (typeof unclustered === "boolean") {
            setShowUnclustered(unclustered);
          }
          if (isClusterMarkerSize(markerSize)) {
            setClusterMarkerSize(markerSize);
          }
          if (typeof controls === "boolean") {
            setControlsOpen(controls);
          }
          if (typeof inspector === "boolean") {
            setInspectorOpen(inspector);
          }

          setSavedViews(
            views.filter((view): view is StoredAnalysis<WorkspaceSettings> =>
              isWorkspaceSettings(view.settings),
            ),
          );
          setReady(true);
        },
      )
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Unable to restore workspace");
          setReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, [
    setClusterMarkerSize,
    setClusteringEnabled,
    setClusteringSettings,
    setError,
    setGroupByGridCell,
    setInspectorOpen,
    setReady,
    setSavedViews,
    setShowUnclustered,
    setControlsOpen,
    setVisionTechnique,
  ]);

  function persist<T>(key: string, value: T) {
    void setSetting(key, value).catch((reason: unknown) => {
      setError(
        reason instanceof Error
          ? `Unable to save settings: ${reason.message}`
          : "Unable to save settings",
      );
    });
  }

  function updateClustering<K extends keyof ClusteringSettings>(
    key: K,
    value: ClusteringSettings[K],
  ) {
    const next = { ...clusteringSettings, [key]: value };

    setClusteringSettings(next);
    persist(settingsKeys.clustering, next);
  }

  function replaceClustering(settings: ClusteringSettings) {
    setClusteringSettings(settings);
    persist(settingsKeys.clustering, settings);
  }

  function updateClusteringEnabled(enabled: boolean) {
    setClusteringEnabled(enabled);
    persist(settingsKeys.clusteringEnabled, enabled);
  }

  function updateGridCellGrouping(enabled: boolean) {
    setGroupByGridCell(enabled);
    persist(settingsKeys.groupByGridCell, enabled);
  }

  function updateUnclusteredVisibility(show: boolean) {
    setShowUnclustered(show);
    persist(settingsKeys.showUnclustered, show);
  }

  function updateVisionTechnique(technique: WorkspaceSettings["visionTechnique"]) {
    setVisionTechnique(technique);
    persist(settingsKeys.vision, technique);
  }

  function updateClusterMarkerSize(size: ClusterMarkerSize) {
    setClusterMarkerSize(size);
    persist(settingsKeys.clusterMarkerSize, size);
  }

  function updateControlsOpen(open: boolean) {
    setControlsOpen(open);
    persist(settingsKeys.controlsOpen, open);
  }

  function updateInspectorOpen(open: boolean) {
    setInspectorOpen(open);
    persist(settingsKeys.inspectorOpen, open);
  }

  return {
    clusteringEnabled,
    clusteringSettings,
    clusterMarkerSize,
    groupByGridCell,
    showUnclustered,
    visionTechnique,
    updateClustering,
    replaceClustering,
    updateClusteringEnabled,
    updateClusterMarkerSize,
    updateGridCellGrouping,
    updateControlsOpen,
    updateInspectorOpen,
    updateUnclusteredVisibility,
    updateVisionTechnique,
  };
}
