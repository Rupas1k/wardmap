import { isWorkspaceSettings } from "../dataset/model";
import type { WorkspaceSettings } from "../dataset/model";
import type { AnalysisScope } from "../state/analysisContext";
import { defaultClusterMarkerSize } from "../state/mapState";
import type { ClusterMarkerSize } from "../state/mapState";
import type {
  LocationSort,
  SortDirection,
  WardOutcomeFilter,
  WardSort,
} from "../state/workspaceState";
import type { Side } from "../types";

interface SavedAnalysisContext {
  origin: AnalysisScope | null;
  refinement: AnalysisScope | null;
}

export interface ViewState {
  workspace: WorkspaceSettings;
  browse: {
    locationSort: LocationSort;
    locationSortDirection: SortDirection;
    locationMinimumWards: number;
    wardOutcomeFilter: WardOutcomeFilter;
    wardSort: WardSort;
  };
  context: SavedAnalysisContext;
  selection: {
    locationKey: string | null;
    wardId: number | null;
    expandedLocationKeys: string[];
  };
  map: {
    side: Side;
    markerSize: ClusterMarkerSize;
  };
}

export const autoViewSettingKey = "workspace:auto-view";

const defaultBrowse: ViewState["browse"] = {
  locationSort: "wards",
  locationSortDirection: "descending",
  locationMinimumWards: 3,
  wardOutcomeFilter: "all",
  wardSort: "placement",
};

function normalizedWorkspace(settings: WorkspaceSettings): WorkspaceSettings {
  return {
    ...settings,
    clusteringEnabled: settings.clusteringEnabled ?? true,
    groupByGridCell: settings.groupByGridCell ?? false,
    showUnclustered: settings.showUnclustered ?? false,
    excludedWardIds: settings.excludedWardIds ?? [],
    hiddenLocationFingerprints: settings.hiddenLocationFingerprints ?? [],
    locationNames: settings.locationNames ?? {},
    manualLocations: settings.manualLocations ?? [],
  };
}

export function normalizeViewState(value: unknown): ViewState | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<ViewState> & {
    settings?: unknown;
    inspector?: { context?: AnalysisScope | null };
  };
  const workspace = candidate.workspace ?? candidate.settings;
  const map = candidate.map;
  const markerSize = map?.markerSize;

  if (
    !isWorkspaceSettings(workspace) ||
    !map ||
    !["all", "radiant", "dire"].includes(map.side) ||
    !markerSize ||
    !Number.isFinite(markerSize.minimum) ||
    !Number.isFinite(markerSize.maximum) ||
    markerSize.minimum < 2 ||
    markerSize.maximum > 20 ||
    markerSize.minimum > markerSize.maximum
  ) {
    return null;
  }

  const legacyContext = candidate.inspector?.context ?? null;
  const context = normalizeContext(candidate.context, legacyContext);
  const browse = normalizeBrowse(candidate.browse);
  const selection = normalizeSelection(candidate.selection);

  return {
    workspace: normalizedWorkspace(workspace),
    browse,
    context,
    selection,
    map: {
      side: map.side,
      markerSize,
    },
  };
}

export function normalizeSavedViewState(value: unknown): ViewState | null {
  const state = normalizeViewState(value);

  if (state) {
    return state;
  }
  if (!isWorkspaceSettings(value)) {
    return null;
  }

  return {
    workspace: normalizedWorkspace(value),
    browse: defaultBrowse,
    context: { origin: null, refinement: null },
    selection: { locationKey: null, wardId: null, expandedLocationKeys: [] },
    map: {
      side: value.dataset.side,
      markerSize: defaultClusterMarkerSize,
    },
  };
}

function validScope(value: unknown): value is AnalysisScope {
  if (!value || typeof value !== "object") {
    return false;
  }

  const scope = value as Partial<AnalysisScope>;

  return Number.isSafeInteger(scope.id) && ["player", "match"].includes(scope.kind ?? "");
}

function normalizeContext(
  value: Partial<SavedAnalysisContext> | undefined,
  legacyContext: AnalysisScope | null,
): SavedAnalysisContext {
  const origin = validScope(value?.origin) ? value.origin : legacyContext;
  const refinement = validScope(value?.refinement) ? value.refinement : null;

  return {
    origin: validScope(origin) ? origin : null,
    refinement: validScope(refinement) ? refinement : null,
  };
}

function normalizeBrowse(value: Partial<ViewState["browse"]> | undefined): ViewState["browse"] {
  const locationSorts: LocationSort[] = [
    "wards",
    "matches",
    "removals",
    "placement",
    "lifetime",
    "added-vision",
    "fresh-sightings",
  ];
  const wardSorts: WardSort[] = [
    "amount",
    "placement",
    "lifetime",
    "match",
    "player",
    "added-vision",
    "fresh-sightings",
  ];
  const outcomes: WardOutcomeFilter[] = [
    "all",
    "dewarded",
    "expired",
    "allied_removed",
    "match_ended",
    "unresolved_removal",
  ];
  const minimumWards = value?.locationMinimumWards;

  return {
    locationSort:
      value?.locationSort && locationSorts.includes(value.locationSort)
        ? value.locationSort
        : defaultBrowse.locationSort,
    locationSortDirection:
      value?.locationSortDirection &&
      ["ascending", "descending"].includes(value.locationSortDirection)
        ? value.locationSortDirection
        : defaultBrowse.locationSortDirection,
    locationMinimumWards:
      Number.isSafeInteger(minimumWards) && minimumWards !== undefined && minimumWards >= 1
        ? minimumWards
        : defaultBrowse.locationMinimumWards,
    wardOutcomeFilter:
      value?.wardOutcomeFilter && outcomes.includes(value.wardOutcomeFilter)
        ? value.wardOutcomeFilter
        : defaultBrowse.wardOutcomeFilter,
    wardSort:
      value?.wardSort && wardSorts.includes(value.wardSort)
        ? value.wardSort
        : defaultBrowse.wardSort,
  };
}

function normalizeSelection(
  value: Partial<ViewState["selection"]> | undefined,
): ViewState["selection"] {
  const wardId = value?.wardId;

  return {
    locationKey: typeof value?.locationKey === "string" ? value.locationKey : null,
    wardId:
      typeof wardId === "number" && Number.isSafeInteger(wardId) && wardId > 0 ? wardId : null,
    expandedLocationKeys: Array.isArray(value?.expandedLocationKeys)
      ? [...new Set(value.expandedLocationKeys.filter((key) => typeof key === "string"))]
      : [],
  };
}
