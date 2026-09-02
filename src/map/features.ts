import type Feature from "ol/Feature";
import type Point from "ol/geom/Point";
import type { Cluster, ClusterWard } from "../types";

export interface ClusterFeatureData {
  cluster: Cluster;
  coordinates: [number, number, number];
}

export interface WardFeatureData {
  clusterId: number;
  ward: ClusterWard;
  coordinates: [number, number, number];
}

export type ClusterFeature = Feature<Point>;
export type WardFeature = Feature<Point>;

export function getClusterFeatureData(feature: ClusterFeature): ClusterFeatureData {
  return feature.get("data") as ClusterFeatureData;
}

export function getWardFeatureData(feature: WardFeature): WardFeatureData {
  return feature.get("wardData") as WardFeatureData;
}
