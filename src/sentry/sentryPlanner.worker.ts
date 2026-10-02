import init, { plan_sentries } from "../../wasm/pkg/wardmap_wasm";
import type { SentryPlacement } from "./planner";

interface PlannerRequest {
  columns: number;
  count: number;
  grid: Int16Array;
  minimumSpacing: number;
  rows: number;
  targets: Float64Array;
}

self.onmessage = (event: MessageEvent<PlannerRequest>) => {
  void plan(event.data);
};

async function plan(request: PlannerRequest) {
  try {
    await init();

    self.postMessage({
      placements: plan_sentries(
        request.targets,
        request.grid,
        request.rows,
        request.columns,
        request.count,
        request.minimumSpacing,
      ) as SentryPlacement[],
    });
  } catch (reason) {
    self.postMessage({
      error: reason instanceof Error ? reason.message : "Sentry planning failed",
    });
  }
}
