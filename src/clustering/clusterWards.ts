import { gridOrigin, gridSize } from "../map/constants";
import type { ClusteringSettings } from "../state/mapState";
import type { ClusterResult, ClusterSets, Ward } from "../types";
import {
  automaticMergeDistance,
  automaticMinClusterSize,
  automaticMinSamples,
  shouldClusterAutomatically,
} from "./automatic";
import { buildClusters } from "./buildClusters";
import { runWasm } from "./runWasm";
import type { ClusterParameters } from "./runWasm";

function manualParameters(settings: ClusteringSettings): ClusterParameters {
  if (settings.algorithm === "time_weighted_hdbscan") {
    return {
      algorithm: "time_weighted_hdbscan",
      minClusterSize: settings.minClusterSize,
      minSamples: settings.minSamples,
      epsilon: settings.selectionEpsilon,
      selectionMethod: settings.selectionMethod ?? "eom",
      timeScaleSeconds: settings.timeScaleSeconds,
    };
  }

  if (settings.algorithm === "hdbscan") {
    return {
      algorithm: "hdbscan",
      minClusterSize: settings.minClusterSize,
      minSamples: settings.minSamples,
      epsilon: settings.selectionEpsilon,
      selectionMethod: settings.selectionMethod ?? "eom",
    };
  }

  if (settings.algorithm === "st_dbscan") {
    return {
      algorithm: "st_dbscan",
      radius: settings.radius,
      timeWindow: settings.timeWindow ?? 180,
      minSamples: settings.minSamples,
    };
  }

  return { algorithm: "dbscan", eps: settings.radius, minSamples: settings.minSamples };
}

function splitByWardType(wards: Ward[]): Ward[][] {
  const observers = wards.filter((ward) => ward.is_obs);
  const sentries = wards.filter((ward) => !ward.is_obs);

  return [observers, sentries].filter((group) => group.length > 0);
}

function mergeTypeResults(wards: Ward[], results: ClusterResult[]): ClusterResult {
  let nextClusterId = 0;
  const clusters = results.flatMap((result) =>
    result.clusters.map((cluster) =>
      cluster.unclustered ? cluster : { ...cluster, cluster_id: nextClusterId++ },
    ),
  );

  return {
    clusters,
    average: buildClusters(wards, new Map()).average,
  };
}

function gridMemberships(wards: Ward[], groupByGridCell: boolean): Map<number, number[]> {
  if (!groupByGridCell) {
    return new Map(wards.map((ward) => [ward.id, [ward.id]]));
  }

  const cells = new Map<string, number[]>();

  for (const ward of wards) {
    const column = Math.round((ward.x_pos - gridOrigin.x) / gridSize);
    const row = Math.round((ward.y_pos - gridOrigin.y) / gridSize);
    const key = `${column}:${row}`;
    const members = cells.get(key) ?? [];

    members.push(ward.id);
    cells.set(key, members);
  }

  return new Map([...cells.values()].map((ids, index) => [index, ids]));
}

function unclusteredLocations(wards: Ward[], groupByGridCell: boolean): ClusterResult {
  const result = mergeTypeResults(
    wards,
    splitByWardType(wards).map((group) =>
      buildClusters(group, gridMemberships(group, groupByGridCell)),
    ),
  );

  if (!groupByGridCell) {
    return result;
  }

  for (const cluster of result.clusters) {
    const ward = cluster.wards?.[0];

    if (!ward) {
      continue;
    }

    const column = Math.round((ward.x_pos - gridOrigin.x) / gridSize);
    const row = Math.round((ward.y_pos - gridOrigin.y) / gridSize);

    cluster.x_pos = gridOrigin.x + column * gridSize;
    cluster.y_pos = gridOrigin.y + row * gridSize;
  }

  return result;
}

async function clusterWardType(
  wards: Ward[],
  settings: ClusteringSettings,
  signal?: AbortSignal,
): Promise<ClusterResult> {
  if (settings.algorithm === "auto" && !shouldClusterAutomatically(wards.length)) {
    return buildClusters(wards, new Map(wards.map((ward) => [ward.id, [ward.id]])));
  }

  if (settings.algorithm !== "auto") {
    const memberships = await runWasm(manualParameters(settings), wards, signal);

    return buildClusters(wards, memberships);
  }

  const memberships = await runWasm(
    {
      algorithm: "hdbscan",
      minClusterSize: automaticMinClusterSize(wards.length),
      minSamples: automaticMinSamples(wards.length),
      epsilon: automaticMergeDistance(wards.length),
      selectionMethod: "leaf",
    },
    wards,
    signal,
  );

  return buildClusters(wards, memberships);
}

async function clusteredLocations(
  wards: Ward[],
  settings: ClusteringSettings,
  signal?: AbortSignal,
): Promise<ClusterResult> {
  const results = await Promise.all(
    splitByWardType(wards).map((group) => clusterWardType(group, settings, signal)),
  );

  return mergeTypeResults(wards, results);
}

export default async function clusterWards(
  wards: Ward[],
  settings: ClusteringSettings,
  enabled: boolean,
  groupByGridCell: boolean,
  signal?: AbortSignal,
): Promise<ClusterSets> {
  if (wards.length === 0) {
    const empty = buildClusters([], new Map());

    return { all: [], radiant: [], dire: [], average: empty.average };
  }

  const radiant = wards.filter((ward) => ward.is_radiant === true);
  const dire = wards.filter((ward) => ward.is_radiant === false);

  if (!enabled) {
    const all = unclusteredLocations(wards, groupByGridCell);
    const radiantClusters = unclusteredLocations(radiant, groupByGridCell);
    const direClusters = unclusteredLocations(dire, groupByGridCell);

    return {
      all: all.clusters,
      radiant: radiantClusters.clusters,
      dire: direClusters.clusters,
      average: all.average,
    };
  }

  const [all, radiantClusters, direClusters] = await Promise.all([
    clusteredLocations(wards, settings, signal),
    clusteredLocations(radiant, settings, signal),
    clusteredLocations(dire, settings, signal),
  ]);

  return {
    all: all.clusters,
    radiant: radiantClusters.clusters,
    dire: direClusters.clusters,
    average: all.average,
  };
}
