import type { WardSort } from "../state/workspaceState";
import type { ClusterWard } from "../types";
import { mean } from "./wardMetrics";

export interface PlayerWardGroup {
  id: number;
  name: string;
  wards: ClusterWard[];
}

export function earliestWardPlacement(wards: ClusterWard[]): number {
  return Math.min(...wards.map((ward) => ward.time_placed));
}

export function averageWardLifetime(wards: ClusterWard[]): number {
  return wards.reduce((total, ward) => total + ward.duration, 0) / wards.length;
}

export function averageWardPlacement(wards: ClusterWard[]): number {
  return wards.reduce((total, ward) => total + ward.time_placed, 0) / wards.length;
}

function measurementValue(ward: ClusterWard, sort: WardSort): number | null {
  if (sort === "added-vision") {
    return ward.measurement?.added_vision_seconds ?? null;
  }
  if (sort === "fresh-sightings") {
    return ward.measurement?.fresh_sightings ?? null;
  }

  return null;
}

export function averageWardMeasurement(wards: ClusterWard[], sort: WardSort): number | null {
  const values = wards.flatMap((ward) => measurementValue(ward, sort) ?? []);

  return mean(values);
}

export function sortWards(wards: ClusterWard[], sort: WardSort): ClusterWard[] {
  return [...wards].sort((left, right) => {
    switch (sort) {
      case "added-vision":
      case "fresh-sightings":
        return (
          (measurementValue(right, sort) ?? -1) - (measurementValue(left, sort) ?? -1) ||
          left.time_placed - right.time_placed
        );
      case "lifetime":
        return right.duration - left.duration || left.time_placed - right.time_placed;
      case "match":
        return right.match_id - left.match_id || left.time_placed - right.time_placed;
      case "player":
        return (
          (left.player_name ?? "").localeCompare(right.player_name ?? "") ||
          left.time_placed - right.time_placed
        );
      default:
        return left.time_placed - right.time_placed || right.match_id - left.match_id;
    }
  });
}

export function groupWardsByPlayer(wards: ClusterWard[], sort: WardSort): PlayerWardGroup[] {
  const groups = new Map<number, PlayerWardGroup>();

  for (const ward of wards) {
    const id = ward.player_placed_id;
    const group = groups.get(id) ?? {
      id,
      name: ward.player_name ?? "Unknown player",
      wards: [],
    };

    group.wards.push(ward);
    groups.set(id, group);
  }

  return [...groups.values()].sort((left, right) => {
    switch (sort) {
      case "added-vision":
      case "fresh-sightings":
        return (
          (averageWardMeasurement(right.wards, sort) ?? -1) -
          (averageWardMeasurement(left.wards, sort) ?? -1)
        );
      case "player":
        return left.name.localeCompare(right.name);
      case "placement":
        return averageWardPlacement(left.wards) - averageWardPlacement(right.wards);
      case "lifetime":
        return averageWardLifetime(right.wards) - averageWardLifetime(left.wards);
      default:
        return right.wards.length - left.wards.length || left.name.localeCompare(right.name);
    }
  });
}

export function groupWardsByMatch(wards: ClusterWard[], sort: WardSort): [number, ClusterWard[]][] {
  const groups = new Map<number, ClusterWard[]>();

  for (const ward of wards) {
    const group = groups.get(ward.match_id) ?? [];

    group.push(ward);
    groups.set(ward.match_id, group);
  }

  return [...groups].sort(([leftId, leftWards], [rightId, rightWards]) => {
    switch (sort) {
      case "added-vision":
      case "fresh-sightings":
        return (
          (averageWardMeasurement(rightWards, sort) ?? -1) -
          (averageWardMeasurement(leftWards, sort) ?? -1)
        );
      case "placement":
        return earliestWardPlacement(leftWards) - earliestWardPlacement(rightWards);
      case "lifetime":
        return averageWardLifetime(rightWards) - averageWardLifetime(leftWards);
      case "match":
        return rightId - leftId;
      default:
        return rightWards.length - leftWards.length || rightId - leftId;
    }
  });
}
