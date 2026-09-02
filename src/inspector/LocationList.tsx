import { useMemo } from "react";
import { formatGameTime } from "../metrics/wardMetrics";
import {
  compareLocationGroups,
  compareLocations,
  groupLocationsByMatch,
  groupLocationsByPlayer,
  locationSurvival,
} from "../metrics/groupLocations";
import type { LocationEntry, LocationInGroup } from "../metrics/groupLocations";
import { useMapStore } from "../state/mapState";
import { useWorkspaceStore } from "../state/workspaceState";
import type { LocationSort } from "../state/workspaceState";
import type { Cluster, Side } from "../types";
import { EmptyState, formControlClass, selectableRowClass } from "../components/ui";
import { BrowseTabs, DisclosureRow } from "./InspectorBrowse";
import WardRow from "./WardRow";
import { contextIds, sameScope } from "../state/analysisContext";
import type { AnalysisScope } from "../state/analysisContext";

export default function LocationList({
  baseClusters,
  clusters,
  clusteringEnabled,
  showUnclustered,
  side,
}: {
  baseClusters: Cluster[];
  clusters: Cluster[];
  clusteringEnabled: boolean;
  showUnclustered: boolean;
  side: Side;
}) {
  const view = useWorkspaceStore((state) => state.locationView);
  const setView = useWorkspaceStore((state) => state.setLocationView);
  const context = useWorkspaceStore((state) => state.analysisContext);
  const setContextOrigin = useWorkspaceStore((state) => state.setContextOrigin);
  const sort = useWorkspaceStore((state) => state.locationSort);
  const setSort = useWorkspaceStore((state) => state.setLocationSort);
  const selectedClusterId = useMapStore((state) => state.selectedClusterId);
  const clearMapSelection = useMapStore((state) => state.clearSelection);
  const clearExpandedClusters = useMapStore((state) => state.clearExpandedClusters);
  const focusCluster = useMapStore((state) => state.focusCluster);
  const focusWard = useMapStore((state) => state.focusWard);
  const setInspectorTab = useWorkspaceStore((state) => state.setInspectorTab);
  const setWardView = useWorkspaceStore((state) => state.setWardView);
  const locations = useMemo(
    () =>
      clusters
        .flatMap((cluster): LocationEntry[] => {
          const data = cluster[side];

          return data && (!cluster.unclustered || showUnclustered) ? [{ cluster, data }] : [];
        })
        .sort((left, right) => compareLocations(sort, left, right)),
    [clusters, showUnclustered, side, sort],
  );
  const baseLocations = useMemo(
    () =>
      baseClusters
        .flatMap((cluster): LocationEntry[] => {
          const data = cluster[side];

          return data && (!cluster.unclustered || showUnclustered) ? [{ cluster, data }] : [];
        })
        .sort((left, right) => compareLocations(sort, left, right)),
    [baseClusters, showUnclustered, side, sort],
  );
  const groupBaseLocations = useMemo(
    () =>
      baseClusters
        .flatMap((cluster): LocationEntry[] => {
          const data = cluster[side];

          return data ? [{ cluster, data }] : [];
        })
        .sort((left, right) => compareLocations(sort, left, right)),
    [baseClusters, side, sort],
  );
  const groups = useMemo(() => {
    if (view === "locations") {
      return [];
    }

    const next =
      view === "players"
        ? groupLocationsByPlayer(groupBaseLocations, side)
        : groupLocationsByMatch(groupBaseLocations, side);

    return next.sort((left, right) => compareLocationGroups(sort, view, left, right));
  }, [groupBaseLocations, side, sort, view]);
  const contextGroups = useMemo(() => {
    if (view === "locations" || clusters === baseClusters) {
      return new Map<string, (typeof groups)[number]>();
    }

    const next =
      view === "players"
        ? groupLocationsByPlayer(locations, side)
        : groupLocationsByMatch(locations, side);

    return new Map(next.map((group) => [group.id, group]));
  }, [baseClusters, clusters, groups, locations, side, view]);
  const locationNumbers = useMemo(
    () => new Map(locations.map((entry, index) => [entry.cluster.cluster_id, index + 1])),
    [locations],
  );

  function changeContextOrigin(scope: AnalysisScope | null) {
    clearMapSelection();
    clearExpandedClusters();
    setContextOrigin(scope);
  }

  function singleWard(entry: LocationEntry) {
    if (entry.data.amount !== 1) {
      return null;
    }

    const { playerId, matchId } = contextIds(context);

    return (
      entry.cluster.wards?.find(
        (ward) =>
          (side === "all" || ward.is_radiant === (side === "radiant")) &&
          (playerId === null || ward.player_placed_id === playerId) &&
          (matchId === null || ward.match_id === matchId),
      ) ?? null
    );
  }

  function selectLocation(entry: LocationEntry, openDetails: boolean) {
    const ward = singleWard(entry);

    if (ward) {
      focusWard(ward.id);
    } else {
      focusCluster(entry.cluster.cluster_id);
    }

    setWardView(
      context.origin?.kind === "player"
        ? "players"
        : context.origin?.kind === "match"
          ? "matches"
          : "wards",
    );

    if (openDetails) {
      setInspectorTab("details");
    }
  }

  function renderLocation({ entry, wardCount }: LocationInGroup) {
    const { cluster, data } = entry;
    const selected = cluster.cluster_id === selectedClusterId;
    const survivalRate = locationSurvival(entry) * 100;
    const ward = singleWard(entry);
    const locationNumber = locationNumbers.get(cluster.cluster_id) ?? 0;

    if (ward) {
      return (
        <WardRow
          key={cluster.cluster_id}
          ward={ward}
          onSelect={() => selectLocation(entry, false)}
          onSelected={() => selectLocation(entry, true)}
        />
      );
    }

    return (
      <button
        className={`w-full py-2 text-left ${selectableRowClass(selected)}`}
        key={cluster.cluster_id}
        type="button"
        onClick={() => selectLocation(entry, selected)}
      >
        <span className="block min-w-0">
          <span className="flex items-baseline justify-between gap-3">
            <span className={selected ? "text-xs text-white" : "text-xs text-slate-300"}>
              {`Location ${locationNumber}`}
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              {wardCount === data.amount
                ? `${data.amount.toLocaleString()} ${data.amount === 1 ? "ward" : "wards"}`
                : `${wardCount.toLocaleString()} of ${data.amount.toLocaleString()} wards`}
            </span>
          </span>
          <span className="mt-1 grid grid-cols-3 gap-2 text-[10px] text-slate-600">
            <span>
              {data.match_count.toLocaleString()} {data.match_count === 1 ? "match" : "matches"}
            </span>
            <span className="text-center">{survivalRate.toFixed(0)}% not dewarded</span>
            <span className="text-right">{formatGameTime(data.time_placed)}</span>
          </span>
        </span>
      </button>
    );
  }

  if ((view === "locations" ? baseLocations : groupBaseLocations).length === 0) {
    return (
      <EmptyState className="py-10">
        {clusteringEnabled && !showUnclustered
          ? "No grouped locations. Enable unclustered wards to see individual entries."
          : "No ward locations."}
      </EmptyState>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">Browse by</p>
        <BrowseTabs
          active={view}
          options={["locations", "players", "matches"]}
          onChange={(option) => {
            setView(option);
            changeContextOrigin(null);
          }}
        />
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <label className="contents text-[11px] text-slate-500">
          <span className="shrink-0">Sort by</span>
          <span className="block w-[13.5rem] shrink-0">
            <select
              className={formControlClass}
              value={sort}
              onChange={(event) => setSort(event.target.value as LocationSort)}
            >
              <option value="wards">Most wards</option>
              <option value="matches">
                {view === "matches" ? "Newest match" : "Most matches"}
              </option>
              <option value="survival-high">Highest not dewarded rate</option>
              <option value="survival-low">Lowest not dewarded rate</option>
              <option value="placement-early">Earliest placement</option>
              <option value="placement-late">Latest placement</option>
              <option value="lifetime-high">Longest lifetime</option>
            </select>
          </span>
        </label>
      </div>

      {view === "locations" ? (
        <div className="space-y-1">
          {locations.map((entry) => renderLocation({ entry, wardCount: entry.data.amount }))}
        </div>
      ) : (
        <div className="space-y-1">
          {groups.map((group) => {
            const scope: AnalysisScope = {
              kind: view === "players" ? "player" : "match",
              id: group.sortId,
            };
            const expanded = sameScope(context.origin, scope);
            const useContextResult = expanded && context.status !== "idle";
            const contextualGroup = contextGroups.get(group.id);
            const displayedGroup = useContextResult ? contextualGroup : group;
            const displayedLocations = displayedGroup?.locations ?? [];

            return (
              <div key={group.id}>
                <DisclosureRow
                  expanded={expanded}
                  label={group.label}
                  meta={group.meta}
                  trailing={
                    <span className="text-right text-[10px] text-slate-500">
                      <span className="block">{group.wardCount} wards</span>
                      {expanded && context.status === "ready" ? (
                        <span className="block">
                          {displayedLocations.length} contextual locations
                        </span>
                      ) : null}
                    </span>
                  }
                  onClick={() => changeContextOrigin(expanded ? null : scope)}
                />
                {expanded ? (
                  <div className="mt-1 space-y-1 pl-3">
                    {displayedLocations.length > 0 ? (
                      displayedLocations.map((location) => renderLocation(location))
                    ) : (
                      <p className="py-3 text-xs text-slate-600">
                        {context.status === "clustering"
                          ? "Clustering selected wards…"
                          : context.status === "error"
                            ? "Unable to cluster this context."
                            : `No wards in this ${view === "players" ? "player" : "match"} context.`}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
