import { useMemo, useState } from "react";
import { BsArrowCounterclockwise, BsChevronDown, BsDashCircle, BsEyeSlash } from "react-icons/bs";
import {
  compareLocationGroups,
  compareLocations,
  groupLocationsByMatch,
  groupLocationsByPlayer,
  locationSurvival,
} from "../metrics/groupLocations";
import type { LocationEntry, LocationGroup, LocationInGroup } from "../metrics/groupLocations";
import { formatGameTime } from "../metrics/wardMetrics";
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
import {
  locationKey,
  locationName,
  visibleClusters as filterVisibleClusters,
} from "../locations/locationIdentity";

type LocationSortOption = `${LocationSort}:${SortDirection}`;

function measurementMean(
  wards: LocationEntry["cluster"]["wards"],
  sort: "added-vision" | "fresh-sightings",
): number | null {
  const values = (wards ?? []).flatMap((ward) => {
    const value =
      sort === "added-vision"
        ? ward.measurement?.added_vision_seconds
        : ward.measurement?.fresh_sightings;

    return value === null || value === undefined ? [] : [value];
  });

  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
}

function LocationChanges({ baseClusters, side }: { baseClusters: Cluster[]; side: Side }) {
  const [open, setOpen] = useState(false);
  const excludedWardIds = useWorkspaceStore((state) => state.excludedWardIds);
  const hiddenLocationFingerprints = useWorkspaceStore((state) => state.hiddenLocationFingerprints);
  const locationNames = useWorkspaceStore((state) => state.locationNames);
  const manualLocations = useWorkspaceStore((state) => state.manualLocations);
  const wards = useWorkspaceStore((state) => state.wards);
  const restoreWard = useWorkspaceStore((state) => state.restoreWard);
  const restoreLocation = useWorkspaceStore((state) => state.restoreLocation);
  const restoreAll = useWorkspaceStore((state) => state.restoreLocationChanges);
  const setPendingLocationReselection = useWorkspaceStore(
    (state) => state.setPendingLocationReselection,
  );
  const clearSelection = useMapStore((state) => state.clearSelection);
  const clearExpandedClusters = useMapStore((state) => state.clearExpandedClusters);
  const excluded = useMemo(() => {
    const wardsById = new Map(wards.map((ward) => [ward.id, ward]));

    return excludedWardIds.map((id) => ({ id, ward: wardsById.get(id) }));
  }, [excludedWardIds, wards]);
  const hidden = useMemo(() => {
    const clustersByFingerprint = new Map(
      baseClusters.map((cluster) => [locationKey(cluster, side), cluster]),
    );

    return hiddenLocationFingerprints.map((fingerprint) => ({
      fingerprint,
      cluster: clustersByFingerprint.get(fingerprint),
    }));
  }, [baseClusters, hiddenLocationFingerprints, side]);

  if (excluded.length === 0 && hidden.length === 0) {
    return null;
  }

  const count = excluded.length + hidden.length;

  return (
    <div className="mb-3 overflow-hidden rounded-sm border border-white/8 bg-white/[0.02] text-xs">
      <div className="flex items-center justify-between gap-2 px-2.5 py-2">
        <button
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-slate-300 hover:text-white"
          type="button"
          onClick={() => setOpen((current) => !current)}
        >
          <BsEyeSlash className="shrink-0 text-slate-500" />
          <span className="truncate">Hidden items</span>
          <span className="text-slate-500 tabular-nums">{count}</span>
          <BsChevronDown
            className={`ml-auto shrink-0 text-[10px] text-slate-600 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
        <button
          aria-label="Restore all hidden items"
          className="rounded-sm p-1 text-slate-500 hover:bg-white/5 hover:text-slate-200"
          title="Restore all"
          type="button"
          onClick={() => {
            clearSelection();
            clearExpandedClusters();

            if (excludedWardIds.length > 0) {
              setPendingLocationReselection({
                changedWardIds: excludedWardIds,
                kind: "restore",
                sourceFingerprint: null,
                wardIds: excludedWardIds,
              });
            }

            restoreAll();
          }}
        >
          <BsArrowCounterclockwise />
        </button>
      </div>
      {open ? (
        <div className="max-h-56 overflow-y-auto border-t border-white/8 px-2.5 py-1">
          {excluded.map(({ id, ward }) => (
            <div
              className="flex items-center gap-2 border-b border-white/6 py-2 last:border-0"
              key={id}
            >
              <BsDashCircle className="shrink-0 text-slate-600" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-slate-300">
                  {ward?.player_name ?? "Unknown player"}
                </span>
                <span className="mt-0.5 block truncate text-slate-500">
                  Excluded ward, match {ward?.match_id ?? id}
                </span>
              </span>
              <button
                className="shrink-0 px-1 py-1 text-slate-400 hover:text-white"
                type="button"
                onClick={() => {
                  clearSelection();
                  clearExpandedClusters();
                  setPendingLocationReselection({
                    changedWardIds: [id],
                    kind: "restore",
                    sourceFingerprint: null,
                    wardIds: [id],
                  });
                  restoreWard(id);
                }}
              >
                Restore
              </button>
            </div>
          ))}
          {hidden.map(({ fingerprint, cluster }) => (
            <div
              className="flex items-center gap-2 border-b border-white/6 py-2 last:border-0"
              key={fingerprint}
            >
              <BsEyeSlash className="shrink-0 text-slate-600" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-slate-300">
                  {cluster
                    ? (locationName(cluster, side, locationNames, manualLocations) ??
                      "Unnamed location")
                    : "Unnamed location"}
                </span>
                <span className="mt-0.5 block truncate text-slate-500">
                  Hidden location, {cluster?.[side]?.amount.toLocaleString() ?? "unknown"} wards
                </span>
              </span>
              <button
                className="shrink-0 px-1 py-1 text-slate-400 hover:text-white"
                type="button"
                onClick={() => restoreLocation(fingerprint)}
              >
                Restore
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

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
  { value: "added-vision:descending", label: "Most added vision on average" },
  { value: "added-vision:ascending", label: "Least added vision on average" },
  { value: "fresh-sightings:descending", label: "Most new enemy sightings on average" },
  { value: "fresh-sightings:ascending", label: "Fewest new enemy sightings on average" },
];

function formatDecimal(value: number): string {
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
}

function locationSortSummary(entry: LocationEntry, sort: LocationSort, wardCount: string): string {
  if (sort === "wards") {
    return wardCount;
  }
  if (sort === "matches") {
    return `${entry.data.match_count.toLocaleString()} ${entry.data.match_count === 1 ? "match" : "matches"}`;
  }
  if (sort === "placement") {
    return `${formatGameTime(entry.data.time_placed)} placed`;
  }
  if (sort === "lifetime") {
    return `${formatGameTime(entry.data.duration)} lifetime`;
  }

  if (sort === "added-vision") {
    const value = measurementMean(entry.cluster.wards, sort);

    return value === null ? "No vision data" : `${formatGameTime(value)} vision`;
  }

  if (sort === "fresh-sightings") {
    const value = measurementMean(entry.cluster.wards, sort);

    return value === null ? "No sightings" : `${formatDecimal(value)} enemy sightings`;
  }

  const removalRate = (1 - locationSurvival(entry)) * 100;

  return `${removalRate.toFixed(0)}% removed`;
}

function locationContext(entry: LocationEntry, wardCount: string): string {
  const matchCount = `${entry.data.match_count.toLocaleString()} ${
    entry.data.match_count === 1 ? "match" : "matches"
  }`;

  return `${wardCount}, ${matchCount}`;
}

function groupSortSummary(
  group: LocationGroup,
  sort: LocationSort,
  view: "matches" | "players",
): string {
  if (sort === "matches" && view === "players") {
    return `${group.matchIds.size.toLocaleString()} ${group.matchIds.size === 1 ? "match" : "matches"}`;
  }
  if (sort === "removals") {
    return `${((group.destroyed / group.wardCount) * 100).toFixed(0)}% removed`;
  }
  if (sort === "placement") {
    return `${formatGameTime(group.placementTotal / group.wardCount)} placed`;
  }
  if (sort === "lifetime") {
    return `${formatGameTime(group.lifetimeTotal / group.wardCount)} lifetime`;
  }
  if (sort === "added-vision" || sort === "fresh-sightings") {
    const value = measurementMean(group.wards, sort);

    if (value === null) {
      return sort === "added-vision" ? "No vision data" : "No sightings";
    }

    return sort === "added-vision"
      ? `${formatGameTime(value)} vision`
      : `${formatDecimal(value)} enemy sightings`;
  }

  return `${group.wardCount.toLocaleString()} ${group.wardCount === 1 ? "ward" : "wards"}`;
}

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
  const locationNames = useWorkspaceStore((state) => state.locationNames);
  const manualLocations = useWorkspaceStore((state) => state.manualLocations);
  const hiddenLocationFingerprints = useWorkspaceStore((state) => state.hiddenLocationFingerprints);
  const selectedClusterId = useMapStore((state) => state.selectedClusterId);
  const clearMapSelection = useMapStore((state) => state.clearSelection);
  const clearExpandedClusters = useMapStore((state) => state.clearExpandedClusters);
  const focusCluster = useMapStore((state) => state.focusCluster);
  const focusWard = useMapStore((state) => state.focusWard);
  const setInspectorTab = useWorkspaceStore((state) => state.setInspectorTab);
  const setWardView = useWorkspaceStore((state) => state.setWardView);
  const [query, setQuery] = useState("");
  const visibleBaseClusters = useMemo(
    () => filterVisibleClusters(baseClusters, side, hiddenLocationFingerprints),
    [baseClusters, hiddenLocationFingerprints, side],
  );
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
      visibleBaseClusters
        .flatMap((cluster): LocationEntry[] => {
          const data = cluster[side];

          return data && (!cluster.unclustered || showUnclustered) ? [{ cluster, data }] : [];
        })
        .sort((left, right) => compareLocations(sort, sortDirection, left, right)),
    [showUnclustered, side, sort, sortDirection, visibleBaseClusters],
  );
  const visibleLocations = useMemo(
    () => locations.filter((entry) => entry.data.amount >= minimumWards),
    [locations, minimumWards],
  );
  const groupBaseLocations = useMemo(
    () =>
      visibleBaseClusters
        .flatMap((cluster): LocationEntry[] => {
          const data = cluster[side];

          return data ? [{ cluster, data }] : [];
        })
        .sort((left, right) => compareLocations(sort, sortDirection, left, right)),
    [side, sort, sortDirection, visibleBaseClusters],
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
    const ward = singleWard(entry);
    const locationNumber = locationNumbers.get(cluster.cluster_id) ?? 0;
    const wardCountLabel =
      wardCount === data.amount
        ? `${data.amount.toLocaleString()} ${data.amount === 1 ? "ward" : "wards"}`
        : `${wardCount.toLocaleString()} of ${data.amount.toLocaleString()} wards`;

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
        clusterId={cluster.cluster_id}
        key={cluster.cluster_id}
        label={
          locationName(cluster, side, locationNames, manualLocations) ??
          `Location ${locationNumber}`
        }
        primaryValue={locationSortSummary(entry, sort, wardCountLabel)}
        secondary={locationContext(entry, wardCountLabel)}
        selected={selected}
        onSelect={() => selectLocation(entry, true)}
      />
    );
  }

  if ((view === "locations" ? baseLocations : groupBaseLocations).length === 0) {
    return (
      <div>
        <LocationChanges baseClusters={baseClusters} side={side} />
        <EmptyState className="py-10">
          {clusteringEnabled && !showUnclustered
            ? "No grouped locations. Enable unclustered wards to see individual entries."
            : "No ward locations."}
        </EmptyState>
      </div>
    );
  }

  return (
    <div>
      <LocationChanges baseClusters={baseClusters} side={side} />
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
          : query.trim()
            ? `${visibleGroups.length.toLocaleString()} of ${groups.length.toLocaleString()} ${view}`
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
            const useContextResult = expanded && context.status === "ready";
            const contextualGroup = contextGroups.get(group.id);
            const displayedGroup = useContextResult ? contextualGroup : group;
            const displayedLocations = displayedGroup?.locations ?? [];
            const sortSummary = groupSortSummary(group, sort, view);
            const groupMeta =
              group.meta ??
              `${group.wardCount.toLocaleString()} wards in ${group.matchIds.size.toLocaleString()} ${group.matchIds.size === 1 ? "match" : "matches"}`;

            return (
              <div key={group.id}>
                <DisclosureRow
                  expanded={expanded}
                  label={group.label}
                  meta={groupMeta}
                  trailing={
                    <span className="shrink-0 text-right text-xs text-slate-300 tabular-nums">
                      {sortSummary}
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
                      <div className="space-y-1">
                        {displayedLocations.map((location) => renderLocation(location))}
                      </div>
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
