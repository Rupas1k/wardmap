import type { Cluster, ClusterSets, ClusterWard, Side } from "../types";
import type { ManualLocation } from "./manualLocations";

export interface LocationWardFilter {
  side: Side;
  playerId?: number | null;
  matchId?: number | null;
}

export function locationWards(
  cluster: Cluster | null,
  { side, playerId = null, matchId = null }: LocationWardFilter,
): ClusterWard[] {
  return (cluster?.wards ?? []).filter(
    (ward) =>
      (side === "all" || ward.is_radiant === (side === "radiant")) &&
      (playerId === null || ward.player_placed_id === playerId) &&
      (matchId === null || ward.match_id === matchId),
  );
}

export function locationWardIds(cluster: Cluster, side: Side): number[] {
  return locationWards(cluster, { side })
    .map((ward) => ward.id)
    .sort((left, right) => left - right);
}

function hashIds(ids: number[]): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;

  for (const id of ids) {
    for (const character of `${id},`) {
      hash ^= BigInt(character.charCodeAt(0));
      hash = (hash * prime) & mask;
    }
  }

  return hash.toString(36);
}

export function locationFingerprint(cluster: Cluster, side: Side): string {
  const ids = locationWardIds(cluster, side);

  return `${side}:${ids.length}:${hashIds(ids)}`;
}

export function locationKey(cluster: Cluster, side: Side): string {
  return cluster.manual_location_id
    ? `manual:${cluster.manual_location_id}`
    : locationFingerprint(cluster, side);
}

export function locationName(
  cluster: Cluster,
  side: Side,
  names: Readonly<Record<string, string>>,
  manualLocations: readonly ManualLocation[] = [],
): string | null {
  const manualName = cluster.manual_location_id
    ? manualLocations.find((location) => location.id === cluster.manual_location_id)?.name
    : null;

  return manualName ?? names[locationKey(cluster, side)] ?? null;
}

export function normalizeLocationKeys(keys: string[]): string[] {
  return [...new Set(keys.map((key) => key.replace(/^(all|radiant|dire):manual:/, "manual:")))];
}

export function visibleClusters(
  clusters: Cluster[],
  side: Side,
  hiddenFingerprints: readonly string[],
): Cluster[] {
  if (hiddenFingerprints.length === 0) {
    return clusters;
  }

  const hidden = new Set(hiddenFingerprints);

  return clusters.filter((cluster) => !hidden.has(locationKey(cluster, side)));
}

export function withVisibleClusters(
  clusterSets: ClusterSets,
  side: Side,
  hiddenFingerprints: readonly string[],
): ClusterSets {
  return {
    ...clusterSets,
    [side]: visibleClusters(clusterSets[side], side, hiddenFingerprints),
  };
}
