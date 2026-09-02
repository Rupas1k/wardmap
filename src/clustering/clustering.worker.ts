/// <reference lib="webworker" />

import init, { dbscan, hdbscan, st_dbscan } from "../../wasm/pkg/wardmap_wasm";
import type { ClusterParameters } from "./runWasm";
import type { Ward } from "../types";

interface ClusterRequest {
  parameters: ClusterParameters;
  wards: Ward[];
}

self.onmessage = (event: MessageEvent<ClusterRequest>) => {
  void cluster(event.data);
};

async function cluster({ parameters, wards }: ClusterRequest): Promise<void> {
  try {
    await init();
    const points = wards.map(({ id, x_pos, y_pos, time_placed }) => ({
      id,
      x_pos,
      y_pos,
      time_placed,
    }));
    let result: Map<number, number[]>;

    if (parameters.algorithm === "dbscan") {
      result = dbscan({
        radius: parameters.eps,
        min_samples: parameters.minSamples,
        wards: points,
      }) as Map<number, number[]>;
    } else if (parameters.algorithm === "st_dbscan") {
      result = st_dbscan({
        radius: parameters.radius,
        time_window: parameters.timeWindow,
        min_samples: parameters.minSamples,
        wards: points,
      }) as Map<number, number[]>;
    } else {
      result = hdbscan({
        min_cluster_size: parameters.minClusterSize,
        min_samples: parameters.minSamples,
        epsilon: parameters.epsilon,
        selection_method: parameters.selectionMethod,
        ...(parameters.algorithm === "time_weighted_hdbscan"
          ? { time_weight_scale_seconds: parameters.timeScaleSeconds }
          : {}),
        wards: points,
      }) as Map<number, number[]>;
    }

    self.postMessage({ result: [...result.entries()] });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : String(error) });
  }
}
