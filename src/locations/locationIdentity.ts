import type { Cluster, ClusterSets, Side } from "../types";

function wardIds(cluster: Cluster, side: Side): number[] {
  return (cluster.wards ?? [])
    .filter((ward) => side === "all" || ward.is_radiant === (side === "radiant"))
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
  const ids = wardIds(cluster, side);

  return `${side}:${ids.length}:${hashIds(ids)}`;
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

  return clusters.filter((cluster) => !hidden.has(locationFingerprint(cluster, side)));
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
