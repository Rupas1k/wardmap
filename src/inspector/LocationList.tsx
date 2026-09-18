import { useMemo, useState } from "react";
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
import type { LocationSort, SortDirection } from "../state/workspaceState";
import type { Cluster, Side } from "../types";
import { EmptyState, formControlClass } from "../components/ui";
import { BrowseTabs, DisclosureRow } from "./InspectorBrowse";
import LocationRow from "./LocationRow";
import WardRow from "./WardRow";
import { contextIds, sameScope } from "../state/analysisContext";
import type { AnalysisScope } from "../state/analysisContext";

type LocationSortOption = `${LocationSort}:${SortDirection}`;

const sortOptions: { value: LocationSortOption; label: string }[] = [
  { value: "wards:descending", label: "Most wards" },
  { value: "wards:ascending", label: "Fewest wards" },
  { value: "matches:descending", label: "Most matches" },
  { value: "matches:ascending", label: "Fewest matches" },
  { value: "removals:descending", label: "Highest removal rate" },
  { value: "removals:ascending", label: "Lowest removal rate" },
  { value: "placement:ascending", label: "Earliest placement" },
  { value: "placement:descending", label: "Latest placement" },
  { value: "lifetime:descending", label: "Longest lifetime" },
  { value: "lifetime:ascending", label: "Shortest lifetime" },
  { value: "added-vision:descending", label: "Highest mean added vision" },
  { value: "added-vision:ascending", label: "Lowest mean added vision" },
  { value: "fresh-sightings:descending", label: "Highest mean new enemy sightings" },
  { value: "fresh-sightings:ascending", label: "Lowest mean new enemy sightings" },
];

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
  const sortDirection = useWorkspaceStore((state) => state.locationSortDirection);
  const setSortDirection = useWorkspaceStore((state) => state.setLocationSortDirection);
  const minimumWards = useWorkspaceStore((state) => state.locationMinimumWards);
  const setMinimumWards = useWorkspaceStore((state) => state.setLocationMinimumWards);
  const selectedClusterId = useMapStore((state) => state.selectedClusterId);
  const clearMapSelection = useMapStore((state) => state.clearSelection);
  const clearExpandedClusters = useMapStore((state) => state.clearExpandedClusters);
  const focusCluster = useMapStore((state) => state.focusCluster);
  const focusWard = useMapStore((state) => state.focusWard);
  const setInspectorTab = useWorkspaceStore((state) => state.setInspectorTab);
  const setWardView = useWorkspaceStore((state) => state.setWardView);
  const [query, setQuery] = useState("");
  const locations = useMemo(
    () =>
      clusters
        .flatMap((cluster): LocationEntry[] => {
          const data = cluster[side];

          return data && (!cluster.unclustered || showUnclustered) ? [{ cluster, data }] : [];
        })
        .sort((left, right) => compareLocations(sort, sortDirection, left, right)),
    [clusters, showUnclustered, side, sort, sortDirection],
  );
  const baseLocations = useMemo(
    () =>
      baseClusters
        .flatMap((cluster): LocationEntry[] => {
          const data = cluster[side];

          return data && (!cluster.unclustered || showUnclustered) ? [{ cluster, data }] : [];
        })
        .sort((left, right) => compareLocations(sort, sortDirection, left, right)),
    [baseClusters, showUnclustered, side, sort, sortDirection],
  );
  const visibleLocations = useMemo(
    () => locations.filter((entry) => entry.data.amount >= minimumWards),
    [locations, minimumWards],
  );
  const groupBaseLocations = useMemo(
    () =>
      baseClusters
        .flatMap((cluster): LocationEntry[] => {
          const data = cluster[side];

          return data ? [{ cluster, data }] : [];
        })
        .sort((left, right) => compareLocations(sort, sortDirection, left, right)),
    [baseClusters, side, sort, sortDirection],
  );
  const groups = useMemo(() => {
    if (view === "locations") {
      return [];
    }

    const next =
      view === "players"
        ? groupLocationsByPlayer(groupBaseLocations, side)
        : groupLocationsByMatch(groupBaseLocations, side);

    return next
      .filter((group) => group.wardCount >= minimumWards)
      .sort((left, right) => compareLocationGroups(sort, sortDirection, view, left, right));
  }, [groupBaseLocations, minimumWards, side, sort, sortDirection, view]);
  const visibleGroups = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();

    if (!normalized) {
      return groups;
    }

    return groups.filter(
      (group) =>
        group.label.toLocaleLowerCase().includes(normalized) ||
        group.meta?.toLocaleLowerCase().includes(normalized),
    );
  }, [groups, query]);
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
  const locationNumbers = useMemo(() => {
    const stableLocations = [...locations].sort(
      (left, right) => left.cluster.cluster_id - right.cluster.cluster_id,
    );

    return new Map(stableLocations.map((entry, index) => [entry.cluster.cluster_id, index + 1]));
  }, [locations]);

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
    const removalRate = (1 - locationSurvival(entry)) * 100;
    const ward = singleWard(entry);
    const locationNumber = locationNumbers.get(cluster.cluster_id) ?? 0;

    if (ward) {
      return (
        <WardRow
          key={cluster.cluster_id}
          ward={ward}
          onSelect={() => selectLocation(entry, true)}
          onSelected={() => selectLocation(entry, true)}
        />
      );
    }

    return (
      <LocationRow
        key={cluster.cluster_id}
        label={`Location ${locationNumber}`}
        matchCount={data.match_count}
        metric={`${removalRate.toFixed(0)}% removed`}
        placement={data.time_placed}
        selected={selected}
        wardCount={
          wardCount === data.amount
            ? `${data.amount.toLocaleString()} ${data.amount === 1 ? "ward" : "wards"}`
            : `${wardCount.toLocaleString()} of ${data.amount.toLocaleString()} wards`
        }
        onSelect={() => selectLocation(entry, true)}
      />
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
        <p className="shrink-0 text-xs text-slate-500">Browse by</p>
        <BrowseTabs
          active={view}
          options={["locations", "players", "matches"]}
          onChange={(option) => {
            setQuery("");
            setView(option);
            changeContextOrigin(null);
          }}
        />
      </div>

      <div className="mb-3 space-y-2">
        <label className="flex items-center justify-between gap-3 text-xs text-slate-500">
          <span className="shrink-0">Sort by</span>
          <span className="w-[13.5rem] shrink-0">
            <select
              className={formControlClass}
              value={`${sort}:${sortDirection}`}
              onChange={(event) => {
                const [nextSort, nextDirection] = event.target.value.split(":") as [
                  LocationSort,
                  SortDirection,
                ];

                setSort(nextSort);
                setSortDirection(nextDirection);
              }}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {view === "matches" && option.value === "matches:descending"
                    ? "Newest match"
                    : view === "matches" && option.value === "matches:ascending"
                      ? "Oldest match"
                      : option.label}
                </option>
              ))}
            </select>
          </span>
        </label>
        <label className="flex items-center justify-between gap-3 text-xs text-slate-500">
          <span className="shrink-0">Min wards</span>
          <span className="w-[13.5rem] shrink-0">
            <input
              aria-label="Minimum wards"
              className={`${formControlClass} text-right`}
              min={1}
              step={1}
              type="number"
              value={minimumWards}
              onChange={(event) => {
                const value = Number.parseInt(event.target.value, 10);

                setMinimumWards(Number.isFinite(value) ? Math.max(1, value) : 1);
              }}
            />
          </span>
        </label>
        {view !== "locations" ? (
          <label className="flex items-center justify-between gap-3 text-xs text-slate-500">
            <span className="shrink-0">Search</span>
            <span className="w-[13.5rem] shrink-0">
              <input
                aria-label={`Search ${view}`}
                className={formControlClass}
                placeholder={view === "players" ? "Player name" : "Match or team"}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </span>
          </label>
        ) : null}
      </div>

      <p className="mb-2 border-t border-white/8 pt-3 text-xs text-slate-500 tabular-nums">
        {view === "locations"
          ? `${visibleLocations.length.toLocaleString()} locations`
          : `${visibleGroups.length.toLocaleString()} ${view}`}
      </p>

      {view === "locations" && visibleLocations.length === 0 ? (
        <EmptyState className="py-10">No results with at least {minimumWards} wards.</EmptyState>
      ) : view === "locations" ? (
        <div className="space-y-1">
          {visibleLocations.map((entry) => renderLocation({ entry, wardCount: entry.data.amount }))}
        </div>
      ) : visibleGroups.length === 0 ? (
        <EmptyState className="py-10">
          {query.trim()
            ? `No ${view} match this search.`
            : `No results with ${minimumWards} wards.`}
        </EmptyState>
      ) : (
        <div className="space-y-1">
          {visibleGroups.map((group) => {
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
                    <span className="text-right text-xs text-slate-500">
                      <span className="block">{group.wardCount} wards</span>
                    </span>
                  }
                  onClick={() => changeContextOrigin(expanded ? null : scope)}
                />
                {expanded ? (
                  <div className="mt-1 ml-2 space-y-1 border-l border-white/10 pl-3">
                    <div className="flex items-center justify-between py-1 text-xs text-slate-500">
                      <span>
                        {context.status === "clustering"
                          ? "Updating locations…"
                          : `${displayedLocations.length.toLocaleString()} locations`}
                      </span>
                      <button
                        className="rounded-sm px-1 py-0.5 text-slate-400 transition hover:bg-white/4 hover:text-slate-200"
                        type="button"
                        onClick={() => setInspectorTab("overview")}
                      >
                        View overview
                      </button>
                    </div>
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
