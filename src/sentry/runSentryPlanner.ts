import type { Side, Ward } from "../types";
import type { SentryPlacement } from "./planner";

interface PlannerResponse {
  placements?: SentryPlacement[];
  error?: string;
}

export default function runSentryPlanner(
  wards: Ward[],
  placingSide: Exclude<Side, "all">,
  count: number,
  minimumSpacing: number,
  minimumTime: number | null,
  maximumTime: number | null,
  grid: number[][],
  signal?: AbortSignal,
): Promise<SentryPlacement[]> {
  const targetValues = wards.flatMap((ward) =>
    ward.is_obs &&
    ward.is_radiant === (placingSide === "dire") &&
    (minimumTime === null || ward.time_placed >= minimumTime) &&
    (maximumTime === null || ward.time_placed < maximumTime)
      ? [ward.match_id, ward.x_pos, ward.y_pos]
      : [],
  );
  const targets = new Float64Array(targetValues);
  const rows = grid.length;
  const columns = Math.max(0, ...grid.map((row) => row.length));
  const gridValues = new Int16Array(rows * columns);

  gridValues.fill(-32768);

  for (let row = 0; row < rows; row += 1) {
    gridValues.set(grid[row] ?? [], row * columns);
  }

  const worker = new Worker(new URL("./sentryPlanner.worker.ts", import.meta.url), {
    type: "module",
  });

  return new Promise((resolve, reject) => {
    const abort = () => {
      worker.terminate();
      reject(new DOMException("Sentry planning was cancelled.", "AbortError"));
    };

    if (signal?.aborted) {
      abort();

      return;
    }

    signal?.addEventListener("abort", abort, { once: true });

    worker.onmessage = (event: MessageEvent<PlannerResponse>) => {
      signal?.removeEventListener("abort", abort);
      worker.terminate();

      if (event.data.error) {
        reject(new Error(event.data.error));

        return;
      }

      resolve(event.data.placements ?? []);
    };
    worker.onerror = (event) => {
      signal?.removeEventListener("abort", abort);
      worker.terminate();
      reject(new Error(event.message || "Sentry planner worker failed"));
    };
    worker.postMessage({ columns, count, grid: gridValues, minimumSpacing, rows, targets }, [
      gridValues.buffer,
      targets.buffer,
    ]);
  });
}
