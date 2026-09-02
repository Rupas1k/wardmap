import type { ClusteringSettings } from "../state/mapState";
import type { ClusterSets, Side } from "../types";
import { fieldControlClass } from "../components/ui";
import { Field } from "../dataset/DatasetFormControls";
import { automaticMergeDistance, automaticMinClusterSize, automaticMinSamples } from "./automatic";
import { useMapStore } from "../state/mapState";

type GroupingMode = ClusteringSettings["algorithm"] | "grid-cell" | "individual";

export default function GroupingControls({
  clusterSets,
  clustering,
  clusteringEnabled,
  currentSide,
  groupByGridCell,
  settings,
  showUnclustered,
  update,
  updateClusteringEnabled,
  updateGridCellGrouping,
  updateUnclusteredVisibility,
}: {
  clusterSets: ClusterSets | null;
  clustering: boolean;
  clusteringEnabled: boolean;
  currentSide: Side;
  groupByGridCell: boolean;
  settings: ClusteringSettings;
  showUnclustered: boolean;
  update: <K extends keyof ClusteringSettings>(key: K, value: ClusteringSettings[K]) => void;
  updateClusteringEnabled: (enabled: boolean) => void;
  updateGridCellGrouping: (enabled: boolean) => void;
  updateUnclusteredVisibility: (show: boolean) => void;
}) {
  const clearExpandedClusters = useMapStore((state) => state.clearExpandedClusters);
  const mode: GroupingMode = clusteringEnabled
    ? settings.algorithm
    : groupByGridCell
      ? "grid-cell"
      : "individual";
  const usesClustering = clusteringEnabled;
  const usesFixedRadius = ["dbscan", "st_dbscan"].includes(settings.algorithm);
  const locations = clusterSets?.[currentSide] ?? [];
  const wardCount = locations.reduce((total, location) => total + (location.wards?.length ?? 0), 0);
  const algorithmName: Partial<Record<GroupingMode, string>> = {
    auto: "HDBSCAN",
    hdbscan: "HDBSCAN",
    time_weighted_hdbscan: "Time-weighted HDBSCAN",
    dbscan: "DBSCAN",
    st_dbscan: "ST-DBSCAN",
  };

  function setMode(next: GroupingMode) {
    clearExpandedClusters();

    if (next === "individual") {
      updateClusteringEnabled(false);
      updateGridCellGrouping(false);

      return;
    }

    if (next === "grid-cell") {
      updateClusteringEnabled(false);
      updateGridCellGrouping(true);

      return;
    }

    update("algorithm", next);
    updateGridCellGrouping(false);
    updateClusteringEnabled(true);
  }

  return (
    <section>
      <label className="block text-[11px] text-slate-500">
        Mode
        <select
          className={fieldControlClass}
          value={mode}
          onChange={(event) => setMode(event.target.value as GroupingMode)}
        >
          <option value="auto">Automatic clusters</option>
          <option value="hdbscan">Adaptive clusters</option>
          <option value="time_weighted_hdbscan">Adaptive clusters + timing</option>
          <option value="dbscan">Radius clusters</option>
          <option value="st_dbscan">Radius clusters + timing</option>
          <option value="grid-cell">Map grid cells</option>
          <option value="individual">Individual wards</option>
        </select>
      </label>
      {algorithmName[mode] ? (
        <p className="mt-1 text-[10px] text-slate-600">{algorithmName[mode]}</p>
      ) : null}

      {usesClustering && settings.algorithm === "auto" ? (
        <div className="mt-3 grid grid-cols-2 gap-2 opacity-50">
          <Field label="Minimum wards">
            <input
              className={fieldControlClass}
              disabled
              type="number"
              value={automaticMinClusterSize(wardCount)}
            />
          </Field>
          <Field label="Minimum wards nearby">
            <input
              className={fieldControlClass}
              disabled
              type="number"
              value={automaticMinSamples(wardCount)}
            />
          </Field>
          <Field label="Merge distance">
            <input
              className={fieldControlClass}
              disabled
              type="number"
              value={automaticMergeDistance(wardCount)}
            />
          </Field>
          <Field label="Cluster selection">
            <select className={fieldControlClass} disabled value="leaf">
              <option value="leaf">Leaf</option>
            </select>
          </Field>
        </div>
      ) : usesClustering ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {usesFixedRadius ? (
            <Field label="Radius">
              <input
                className={fieldControlClass}
                min="1"
                type="number"
                value={settings.radius}
                onChange={(event) => update("radius", Math.max(1, Number(event.target.value)))}
              />
            </Field>
          ) : (
            <Field label="Minimum wards">
              <input
                className={fieldControlClass}
                min="2"
                type="number"
                value={settings.minClusterSize}
                onChange={(event) =>
                  update("minClusterSize", Math.max(2, Number(event.target.value)))
                }
              />
            </Field>
          )}

          {settings.algorithm === "st_dbscan" ? (
            <Field label="Time window">
              <div className="relative">
                <input
                  className={`${fieldControlClass} pr-7`}
                  min="1"
                  type="number"
                  value={Math.round(settings.timeWindow / 60)}
                  onChange={(event) =>
                    update("timeWindow", Math.max(60, Number(event.target.value) * 60))
                  }
                />
                <span className="pointer-events-none absolute right-2 bottom-1.5 text-[10px] text-slate-600">
                  min
                </span>
              </div>
            </Field>
          ) : settings.algorithm === "time_weighted_hdbscan" ? (
            <Field label="Time scale">
              <div className="relative">
                <input
                  className={`${fieldControlClass} pr-7`}
                  min="0.25"
                  step="0.25"
                  type="number"
                  value={settings.timeScaleSeconds / 60}
                  onChange={(event) =>
                    update("timeScaleSeconds", Math.max(15, Number(event.target.value) * 60))
                  }
                />
                <span className="pointer-events-none absolute right-2 bottom-1.5 text-[10px] text-slate-600">
                  min
                </span>
              </div>
            </Field>
          ) : null}

          <Field label="Minimum wards nearby">
            <input
              className={fieldControlClass}
              min="1"
              type="number"
              value={settings.minSamples}
              onChange={(event) => update("minSamples", Math.max(1, Number(event.target.value)))}
            />
          </Field>

          {!usesFixedRadius ? (
            <Field label="Merge distance">
              <input
                className={fieldControlClass}
                min="0"
                type="number"
                value={settings.selectionEpsilon}
                onChange={(event) =>
                  update("selectionEpsilon", Math.max(0, Number(event.target.value)))
                }
              />
            </Field>
          ) : null}

          {!usesFixedRadius ? (
            <Field label="Cluster selection">
              <select
                className={fieldControlClass}
                value={settings.selectionMethod ?? "eom"}
                onChange={(event) =>
                  update("selectionMethod", event.target.value as "eom" | "leaf")
                }
              >
                <option value="eom">EOM</option>
                <option value="leaf">Leaf</option>
              </select>
            </Field>
          ) : null}
        </div>
      ) : null}

      {usesClustering ? (
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-slate-400">
          <input
            checked={showUnclustered}
            className="accent-cyan-400"
            type="checkbox"
            onChange={(event) => updateUnclusteredVisibility(event.target.checked)}
          />
          Show unclustered wards
        </label>
      ) : null}

      <p className="mt-3 text-[10px] text-slate-600">
        {clustering
          ? "Updating map…"
          : clusterSets
            ? `${locations.length.toLocaleString()} locations`
            : null}
      </p>
    </section>
  );
}
