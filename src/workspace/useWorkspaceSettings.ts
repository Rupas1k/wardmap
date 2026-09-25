import { useEffect } from "react";
import { getSetting, setSetting } from "../indexedDb";
import { savedWorkspaceViews } from "../dataset/storage";
import { useWorkspaceMapSettings } from "../state/mapSelectors";
import type {
  ClusteringSettings,
  ClusterMarkerSize,
  MapColorMode,
  MapColorStatistic,
} from "../state/mapState";
import { isMapColorMode, isMapColorStatistic } from "../state/mapState";
import { useWorkspaceStore } from "../state/workspaceState";
import { isVisionTechnique, normalizeClusteringSettings } from "../dataset/model";
import type { WorkspaceSettings } from "../dataset/model";

const settingsKeys = {
  clustering: "main-clustering-settings",
  vision: "main-vision-technique",
  clusteringEnabled: "main-clustering-enabled",
  groupByGridCell: "main-group-by-grid-cell",
  showUnclustered: "main-show-unclustered",
  clusterMarkerSize: "map-cluster-marker-size",
  colorMode: "map-color-mode",
  colorStatistic: "map-color-statistic",
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
    colorMode,
    colorStatistic,
    setClusteringSettings,
    setClusterMarkerSize,
    setColorMode,
    setColorStatistic,
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
      getSetting(settingsKeys.colorMode),
      getSetting(settingsKeys.colorStatistic),
      getSetting(settingsKeys.controlsOpen),
      getSetting(settingsKeys.inspectorOpen),
      savedWorkspaceViews(),
    ])
      .then(
        ([
          clustering,
          vision,
          enabled,
          gridCells,
          unclustered,
          markerSize,
          storedColorMode,
          storedColorStatistic,
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
          if (isMapColorMode(storedColorMode)) {
            setColorMode(storedColorMode);
          }
          if (isMapColorStatistic(storedColorStatistic)) {
            setColorStatistic(storedColorStatistic);
          }
          if (typeof controls === "boolean") {
            setControlsOpen(controls);
          }
          if (typeof inspector === "boolean") {
            setInspectorOpen(inspector);
          }

          setSavedViews(views);
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
    setColorMode,
    setColorStatistic,
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

  function updateColorMode(mode: MapColorMode) {
    setColorMode(mode);
    persist(settingsKeys.colorMode, mode);
  }

  function updateColorStatistic(statistic: MapColorStatistic) {
    setColorStatistic(statistic);
    persist(settingsKeys.colorStatistic, statistic);
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
    colorMode,
    colorStatistic,
    groupByGridCell,
    showUnclustered,
    visionTechnique,
    updateClustering,
    replaceClustering,
    updateClusteringEnabled,
    updateClusterMarkerSize,
    updateColorMode,
    updateColorStatistic,
    updateGridCellGrouping,
    updateControlsOpen,
    updateInspectorOpen,
    updateUnclusteredVisibility,
    updateVisionTechnique,
  };
}
