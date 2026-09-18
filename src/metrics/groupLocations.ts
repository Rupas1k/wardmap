import type { LocationSort, LocationView, SortDirection } from "../state/workspaceState";
import type { Cluster, ClusterSideData, ClusterWard, Side } from "../types";
import { mean } from "./wardMetrics";

export interface LocationEntry {
  cluster: Cluster;
  data: ClusterSideData;
}

export interface LocationInGroup {
  entry: LocationEntry;
  wardCount: number;
}

export interface LocationGroup {
  id: string;
  label: string;
  meta?: string;
  locations: LocationInGroup[];
  wardCount: number;
  matchIds: Set<number>;
  destroyed: number;
  lifetimeTotal: number;
  placementTotal: number;
  wards: ClusterWard[];
  sortId: number;
}

type MeasurementSort = Extract<LocationSort, "added-vision" | "fresh-sightings">;

function compareNumbers(left: number, right: number, direction: SortDirection): number {
  return direction === "ascending" ? left - right : right - left;
}

function compareMeasured(
  left: number | null,
  right: number | null,
  direction: SortDirection,
): number {
  if (left === null) {
    return right === null ? 0 : 1;
  }
  if (right === null) {
    return -1;
  }

  return compareNumbers(left, right, direction);
}

function meanMeasurement(wards: ClusterWard[], sort: MeasurementSort): number | null {
  const values = wards.flatMap((ward) => {
    const value =
      sort === "added-vision"
        ? ward.measurement?.added_vision_seconds
        : ward.measurement?.fresh_sightings;

    return value == null ? [] : [value];
  });

  return mean(values);
}

export function locationSurvival(entry: LocationEntry): number {
  return entry.data.amount ? 1 - entry.data.destroyed / entry.data.amount : 0;
}

function wardsInEntry(entry: LocationEntry): ClusterWard[] {
  if (entry.data === entry.cluster.radiant) {
    return wardsForSide(entry.cluster, "radiant");
  }
  if (entry.data === entry.cluster.dire) {
    return wardsForSide(entry.cluster, "dire");
  }

  return wardsForSide(entry.cluster, "all");
}

export function compareLocations(
  sort: LocationSort,
  direction: SortDirection,
  left: LocationEntry,
  right: LocationEntry,
): number {
  if (sort === "added-vision" || sort === "fresh-sightings") {
    return (
      compareMeasured(
        meanMeasurement(wardsInEntry(left), sort),
        meanMeasurement(wardsInEntry(right), sort),
        direction,
      ) || right.data.amount - left.data.amount
    );
  }

  switch (sort) {
    case "matches":
      return compareNumbers(left.data.match_count, right.data.match_count, direction);
    case "removals":
      return compareNumbers(
        left.data.destroyed / left.data.amount,
        right.data.destroyed / right.data.amount,
        direction,
      );
    case "placement":
      return compareNumbers(left.data.time_placed, right.data.time_placed, direction);
    case "lifetime":
      return compareNumbers(left.data.duration, right.data.duration, direction);
    default:
      return compareNumbers(left.data.amount, right.data.amount, direction);
  }
}

function wardsForSide(cluster: Cluster, side: Side): ClusterWard[] {
  return (cluster.wards ?? []).filter(
    (ward) => side === "all" || ward.is_radiant === (side === "radiant"),
  );
}

function addWardsToGroup(group: LocationGroup, wards: ClusterWard[]) {
  group.wardCount += wards.length;
  group.wards.push(...wards);

  for (const ward of wards) {
    group.matchIds.add(ward.match_id);
    group.destroyed += ward.is_destroyed ? 1 : 0;
    group.lifetimeTotal += ward.duration;
    group.placementTotal += ward.time_placed;
  }
}

export function compareLocationGroups(
  sort: LocationSort,
  direction: SortDirection,
  view: Exclude<LocationView, "locations">,
  left: LocationGroup,
  right: LocationGroup,
): number {
  if (sort === "added-vision" || sort === "fresh-sightings") {
    return (
      compareMeasured(
        meanMeasurement(left.wards, sort),
        meanMeasurement(right.wards, sort),
        direction,
      ) || left.label.localeCompare(right.label)
    );
  }

  switch (sort) {
    case "matches":
      return (
        compareNumbers(
          view === "matches" ? left.sortId : left.matchIds.size,
          view === "matches" ? right.sortId : right.matchIds.size,
          direction,
        ) || left.label.localeCompare(right.label)
      );
    case "removals":
      return (
        compareNumbers(
          left.destroyed / left.wardCount,
          right.destroyed / right.wardCount,
          direction,
        ) || left.label.localeCompare(right.label)
      );
    case "placement":
      return (
        compareNumbers(
          left.placementTotal / left.wardCount,
          right.placementTotal / right.wardCount,
          direction,
        ) || left.label.localeCompare(right.label)
      );
    case "lifetime":
      return (
        compareNumbers(
          left.lifetimeTotal / left.wardCount,
          right.lifetimeTotal / right.wardCount,
          direction,
        ) || left.label.localeCompare(right.label)
      );
    default:
      return (
        compareNumbers(left.wardCount, right.wardCount, direction) ||
        left.label.localeCompare(right.label)
      );
  }
}

export function groupLocationsByPlayer(locations: LocationEntry[], side: Side): LocationGroup[] {
  const groups = new Map<number, LocationGroup>();

  for (const entry of locations) {
    const players = new Map<number, { name: string; wards: ClusterWard[] }>();

    for (const ward of wardsForSide(entry.cluster, side)) {
      const player = players.get(ward.player_placed_id) ?? {
        name: ward.player_name ?? "Unknown player",
        wards: [],
      };

      player.wards.push(ward);
      players.set(ward.player_placed_id, player);
    }

    for (const [playerId, player] of players) {
      const group = groups.get(playerId) ?? {
        id: `player:${playerId}`,
        label: player.name,
        locations: [],
        wardCount: 0,
        matchIds: new Set(),
        destroyed: 0,
        lifetimeTotal: 0,
        placementTotal: 0,
        wards: [],
        sortId: playerId,
      };

      group.locations.push({ entry, wardCount: player.wards.length });
      addWardsToGroup(group, player.wards);
      groups.set(playerId, group);
    }
  }

  return [...groups.values()];
}

export function groupLocationsByMatch(locations: LocationEntry[], side: Side): LocationGroup[] {
  const groups = new Map<number, LocationGroup>();

  for (const entry of locations) {
    const matches = new Map<number, ClusterWard[]>();

    for (const ward of wardsForSide(entry.cluster, side)) {
      const wards = matches.get(ward.match_id) ?? [];

      wards.push(ward);
      matches.set(ward.match_id, wards);
    }

    for (const [matchId, wards] of matches) {
      const first = wards[0]!;
      const group = groups.get(matchId) ?? {
        id: `match:${matchId}`,
        label: String(matchId),
        meta: `${first.team_name ?? "Unknown"} vs ${first.opponent_team_name ?? "Unknown"}`,
        locations: [],
        wardCount: 0,
        matchIds: new Set([matchId]),
        destroyed: 0,
        lifetimeTotal: 0,
        placementTotal: 0,
        wards: [],
        sortId: matchId,
      };

      group.locations.push({ entry, wardCount: wards.length });
      addWardsToGroup(group, wards);
      groups.set(matchId, group);
    }
  }

  return [...groups.values()];
}
