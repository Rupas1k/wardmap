import type { LocationSort, LocationView } from "../state/workspaceState";
import type { Cluster, ClusterSideData, ClusterWard, Side } from "../types";

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
  sortId: number;
}

export function locationSurvival(entry: LocationEntry): number {
  return entry.data.amount ? 1 - entry.data.destroyed / entry.data.amount : 0;
}

export function compareLocations(
  sort: LocationSort,
  left: LocationEntry,
  right: LocationEntry,
): number {
  switch (sort) {
    case "matches":
      return right.data.match_count - left.data.match_count;
    case "survival-high":
      return locationSurvival(right) - locationSurvival(left);
    case "survival-low":
      return locationSurvival(left) - locationSurvival(right);
    case "placement-early":
      return left.data.time_placed - right.data.time_placed;
    case "placement-late":
      return right.data.time_placed - left.data.time_placed;
    case "lifetime-high":
      return right.data.duration - left.data.duration;
    default:
      return right.data.amount - left.data.amount;
  }
}

function wardsForSide(cluster: Cluster, side: Side): ClusterWard[] {
  return (cluster.wards ?? []).filter(
    (ward) => side === "all" || ward.is_radiant === (side === "radiant"),
  );
}

function addWardsToGroup(group: LocationGroup, wards: ClusterWard[]) {
  group.wardCount += wards.length;

  for (const ward of wards) {
    group.matchIds.add(ward.match_id);
    group.destroyed += ward.is_destroyed ? 1 : 0;
    group.lifetimeTotal += ward.duration;
    group.placementTotal += ward.time_placed;
  }
}

export function compareLocationGroups(
  sort: LocationSort,
  view: Exclude<LocationView, "locations">,
  left: LocationGroup,
  right: LocationGroup,
): number {
  const leftSurvival = left.wardCount ? 1 - left.destroyed / left.wardCount : 0;
  const rightSurvival = right.wardCount ? 1 - right.destroyed / right.wardCount : 0;

  switch (sort) {
    case "matches":
      return view === "matches"
        ? right.sortId - left.sortId
        : right.matchIds.size - left.matchIds.size || left.label.localeCompare(right.label);
    case "survival-high":
      return rightSurvival - leftSurvival || left.label.localeCompare(right.label);
    case "survival-low":
      return leftSurvival - rightSurvival || left.label.localeCompare(right.label);
    case "placement-early":
      return (
        left.placementTotal / left.wardCount - right.placementTotal / right.wardCount ||
        left.label.localeCompare(right.label)
      );
    case "placement-late":
      return (
        right.placementTotal / right.wardCount - left.placementTotal / left.wardCount ||
        left.label.localeCompare(right.label)
      );
    case "lifetime-high":
      return (
        right.lifetimeTotal / right.wardCount - left.lifetimeTotal / left.wardCount ||
        left.label.localeCompare(right.label)
      );
    default:
      return right.wardCount - left.wardCount || left.label.localeCompare(right.label);
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
        sortId: matchId,
      };

      group.locations.push({ entry, wardCount: wards.length });
      addWardsToGroup(group, wards);
      groups.set(matchId, group);
    }
  }

  return [...groups.values()];
}
