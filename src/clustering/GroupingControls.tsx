import type { ReactNode } from "react";
import type { ClusteringSettings } from "../state/mapState";
import type { ClusterSets, Side } from "../types";
import { formControlClass } from "../components/ui";
import {
  automaticMaximumDiameter,
  automaticMergeDistance,
  automaticMinClusterSize,
  automaticMinSamples,
} from "./automatic";
import { useMapStore } from "../state/mapState";
import { useWorkspaceStore } from "../state/workspaceState";
import { visibleClusters } from "../locations/locationIdentity";

type GroupingMode = ClusteringSettings["algorithm"] | "grid-cell" | "individual";

function parameterRange(values: number[]): string {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);

  return minimum === maximum ? String(minimum) : `${minimum}–${maximum}`;
}

function GroupingField({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3 text-xs text-slate-500">
      <span>{label}</span>
      <span className="min-w-0">{children}</span>
    </label>
  );
}

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
  const hiddenLocations = useWorkspaceStore((state) => state.hiddenLocationFingerprints);
  const mode: GroupingMode = clusteringEnabled
    ? settings.algorithm
    : groupByGridCell
      ? "grid-cell"
      : "individual";
  const usesClustering = clusteringEnabled;
  const usesFixedRadius = ["dbscan", "st_dbscan"].includes(settings.algorithm);
  const locations = clusterSets?.[currentSide] ?? [];
  const automaticWardCounts = [true, false]
    .map((observer) =>
      locations.reduce(
        (total, location) =>
          total +
          (location.manual_location_id
            ? 0
            : (location.wards?.filter((ward) => ward.is_obs === observer).length ?? 0)),
        0,
      ),
    )
    .filter((count) => count > 0);
  const parameterCounts = automaticWardCounts.length ? automaticWardCounts : [0];
  const visibleLocations = visibleClusters(locations, currentSide, hiddenLocations).filter(
    (location) => showUnclustered || !location.unclustered,
  );
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
      <GroupingField label="Mode">
        <select
          className={formControlClass}
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
      </GroupingField>

      {usesClustering && settings.algorithm === "auto" ? (
        <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
          <GroupingField label="Minimum wards">
            <input
              className={`${formControlClass} disabled:opacity-50`}
              disabled
              type="text"
              value={parameterRange(parameterCounts.map(automaticMinClusterSize))}
            />
          </GroupingField>
          <GroupingField label="Wards nearby">
            <input
              className={`${formControlClass} disabled:opacity-50`}
              disabled
              type="text"
              value={parameterRange(parameterCounts.map(automaticMinSamples))}
            />
          </GroupingField>
          <GroupingField label="Merge distance">
            <input
              className={`${formControlClass} disabled:opacity-50`}
              disabled
              type="number"
              value={automaticMergeDistance()}
            />
          </GroupingField>
          <GroupingField label="Maximum span">
            <input
              className={`${formControlClass} disabled:opacity-50`}
              disabled
              type="number"
              value={automaticMaximumDiameter}
            />
          </GroupingField>
          <GroupingField label="Selection">
            <select className={`${formControlClass} disabled:opacity-50`} disabled value="leaf">
              <option value="leaf">Leaf</option>
            </select>
          </GroupingField>
        </div>
      ) : usesClustering ? (
        <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
          {usesFixedRadius ? (
            <GroupingField label="Radius">
              <input
                className={formControlClass}
                min="1"
                type="number"
                value={settings.radius}
                onChange={(event) => update("radius", Math.max(1, Number(event.target.value)))}
              />
            </GroupingField>
          ) : (
            <GroupingField label="Minimum wards">
              <input
                className={formControlClass}
                min="2"
                type="number"
                value={settings.minClusterSize}
                onChange={(event) =>
                  update("minClusterSize", Math.max(2, Number(event.target.value)))
                }
              />
            </GroupingField>
          )}

          {settings.algorithm === "st_dbscan" ? (
            <GroupingField label="Time window">
              <div className="relative">
                <input
                  className={`${formControlClass} pr-9`}
                  min="1"
                  type="number"
                  value={Math.round(settings.timeWindow / 60)}
                  onChange={(event) =>
                    update("timeWindow", Math.max(60, Number(event.target.value) * 60))
                  }
                />
                <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-slate-500">
                  min
                </span>
              </div>
            </GroupingField>
          ) : settings.algorithm === "time_weighted_hdbscan" ? (
            <GroupingField label="Time scale">
              <div className="relative">
                <input
                  className={`${formControlClass} pr-9`}
                  min="0.25"
                  step="0.25"
                  type="number"
                  value={settings.timeScaleSeconds / 60}
                  onChange={(event) =>
                    update("timeScaleSeconds", Math.max(15, Number(event.target.value) * 60))
                  }
                />
                <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-slate-500">
                  min
                </span>
              </div>
            </GroupingField>
          ) : null}

          <GroupingField label="Wards nearby">
            <input
              className={formControlClass}
              min="1"
              type="number"
              value={settings.minSamples}
              onChange={(event) => update("minSamples", Math.max(1, Number(event.target.value)))}
            />
          </GroupingField>

          {!usesFixedRadius ? (
            <GroupingField label="Maximum span">
              <input
                className={formControlClass}
                min="1"
                placeholder="No limit"
                type="number"
                value={settings.maximumSpan ?? ""}
                onChange={(event) =>
                  update(
                    "maximumSpan",
                    event.target.value === "" ? null : Math.max(1, Number(event.target.value)),
                  )
                }
              />
            </GroupingField>
          ) : null}

          {!usesFixedRadius ? (
            <GroupingField label="Merge distance">
              <input
                className={formControlClass}
                min="0"
                type="number"
                value={settings.selectionEpsilon}
                onChange={(event) =>
                  update("selectionEpsilon", Math.max(0, Number(event.target.value)))
                }
              />
            </GroupingField>
          ) : null}

          {!usesFixedRadius ? (
            <GroupingField label="Selection">
              <select
                className={formControlClass}
                value={settings.selectionMethod ?? "eom"}
                onChange={(event) =>
                  update("selectionMethod", event.target.value as "eom" | "leaf")
                }
              >
                <option value="eom">EOM</option>
                <option value="leaf">Leaf</option>
              </select>
            </GroupingField>
          ) : null}
        </div>
      ) : null}

      {usesClustering ? (
        <label className="mt-4 flex cursor-pointer items-center gap-2 border-t border-white/10 pt-4 text-xs text-slate-400">
          <input
            checked={showUnclustered}
            className="accent-cyan-400"
            type="checkbox"
            onChange={(event) => updateUnclusteredVisibility(event.target.checked)}
          />
          Show unclustered wards
        </label>
      ) : null}

      <p className="mt-4 text-right text-xs text-slate-500 tabular-nums">
        {clustering
          ? "Updating map…"
          : clusterSets
            ? `${visibleLocations.length.toLocaleString()} locations`
            : null}
      </p>
    </section>
  );
}
