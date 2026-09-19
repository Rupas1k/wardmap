import { isWorkspaceSettings } from "../dataset/model";
import type { WorkspaceSettings } from "../dataset/model";
import type { AnalysisScope } from "../state/analysisContext";
import type { ClusterMarkerSize } from "../state/mapState";
import type { InspectorTab } from "../state/workspaceState";
import type { Side } from "../types";

export interface ViewState {
  settings: WorkspaceSettings;
  map: {
    side: Side;
    markerSize: ClusterMarkerSize;
  };
  inspector: {
    tab: InspectorTab;
    context: AnalysisScope | null;
  };
}

export function normalizeViewState(value: unknown): ViewState | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<ViewState>;
  const map = candidate.map;
  const inspector = candidate.inspector;
  const markerSize = map?.markerSize;
  const context = inspector?.context;

  if (
    !isWorkspaceSettings(candidate.settings) ||
    !map ||
    !["all", "radiant", "dire"].includes(map.side) ||
    !markerSize ||
    !Number.isFinite(markerSize.minimum) ||
    !Number.isFinite(markerSize.maximum) ||
    markerSize.minimum < 2 ||
    markerSize.maximum > 20 ||
    markerSize.minimum > markerSize.maximum ||
    !inspector ||
    !["overview", "locations", "details"].includes(inspector.tab) ||
    (context != null &&
      (!Number.isFinite(context?.id) || !["player", "match"].includes(context?.kind ?? "")))
  ) {
    return null;
  }

  return {
    settings: candidate.settings,
    map: {
      side: map.side,
      markerSize,
    },
    inspector: {
      tab: inspector.tab,
      context: context ?? null,
    },
  };
}
