import type { Ward } from "../types";

export type ClusterParameters =
  | { algorithm: "dbscan"; eps: number; minSamples: number }
  | { algorithm: "st_dbscan"; radius: number; timeWindow: number; minSamples: number }
  | {
      algorithm: "hdbscan";
      minClusterSize: number;
      minSamples: number;
      epsilon: number;
      selectionMethod: "eom" | "leaf";
    }
  | {
      algorithm: "time_weighted_hdbscan";
      minClusterSize: number;
      minSamples: number;
      epsilon: number;
      selectionMethod: "eom" | "leaf";
      timeScaleSeconds: number;
    };

interface WorkerResponse {
  result?: [number, number[]][];
  error?: string;
}

export function runWasm(
  parameters: ClusterParameters,
  wards: Ward[],
  signal?: AbortSignal,
): Promise<Map<number, number[]>> {
  const worker = new Worker(new URL("./clustering.worker.ts", import.meta.url), { type: "module" });

  return new Promise((resolve, reject) => {
    const abort = () => {
      worker.terminate();
      reject(new DOMException("Clustering cancelled", "AbortError"));
    };

    const finish = () => signal?.removeEventListener("abort", abort);

    if (signal?.aborted) {
      abort();

      return;
    }
    signal?.addEventListener("abort", abort, { once: true });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      worker.terminate();
      finish();

      if (event.data.error) {
        reject(new Error(event.data.error));

        return;
      }
      resolve(new Map((event.data.result ?? []).sort(([left], [right]) => left - right)));
    };
    worker.onerror = (event) => {
      worker.terminate();
      finish();
      reject(new Error(event.message || "Clustering worker failed"));
    };
    worker.postMessage({ parameters, wards });
  });
}
