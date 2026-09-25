import { locationKey, locationName, locationWardIds } from "../locations/locationIdentity";
import { normalizeViewState } from "./viewState";
import type { LeagueFreshness } from "../indexedDb";
import type { ClusterSets, Side, Ward } from "../types";
import type { ViewState } from "./viewState";

const viewFileFormat = "wardmap-view";
const maximumViewFileBytes = 10 * 1024 * 1024;

interface WardReference {
  id: number;
  match_id: number;
  player_id: number | null;
  player_name: string | null;
  side: "radiant" | "dire" | null;
  type: "observer" | "sentry";
  placed_at: number;
  position: [number, number, number];
}

interface LocationReference {
  key: string;
  name: string | null;
  kind: "automatic" | "manual";
  hidden: boolean;
  position: [number, number, number];
  ward_ids: number[];
}

interface ViewFile {
  format: typeof viewFileFormat;
  name: string;
  exported_at: string;
  data_freshness: LeagueFreshness | null;
  view: ViewState;
  references: {
    wards: WardReference[];
    locations: LocationReference[];
  };
}

export interface ImportedView {
  name: string;
  view: ViewState;
}

export function downloadViewFile(
  name: string,
  view: ViewState,
  wards: Ward[],
  clusterSets?: ClusterSets,
  dataFreshness: LeagueFreshness | null = null,
): void {
  const contents: ViewFile = {
    format: viewFileFormat,
    name,
    exported_at: new Date().toISOString(),
    data_freshness: dataFreshness,
    view,
    references: buildReferences(view, wards, clusterSets),
  };
  const blob = new Blob([`${JSON.stringify(contents, null, 2)}\n`], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.download = `${safeFileName(name)}.wardmap.json`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

export async function readViewFile(file: File): Promise<ImportedView> {
  if (file.size > maximumViewFileBytes) {
    throw new Error("View file is larger than 10 MB");
  }

  let value: unknown;

  try {
    value = JSON.parse(await file.text());
  } catch {
    throw new Error("This is not a valid JSON view file");
  }

  if (!value || typeof value !== "object") {
    throw new Error("This is not a Wardmap view file");
  }

  const candidate = value as Partial<ViewFile>;
  const view = normalizeViewState(candidate.view);
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";

  if (candidate.format !== viewFileFormat || !view) {
    throw new Error("This is not a valid Wardmap view file");
  }

  const fallbackName = file.name.replace(/\.wardmap\.json$|\.json$/i, "").trim();

  return {
    name: (name || fallbackName || "Imported view").slice(0, 80),
    view,
  };
}

function buildReferences(view: ViewState, wards: Ward[], clusterSets?: ClusterSets) {
  const side = view.map.side;
  const settings = view.workspace;
  const excludedWardIds = settings.excludedWardIds ?? [];
  const hiddenLocationFingerprints = settings.hiddenLocationFingerprints ?? [];
  const locationNames = settings.locationNames ?? {};
  const manualLocations = settings.manualLocations ?? [];
  const locationKeys = new Set([
    ...hiddenLocationFingerprints,
    ...Object.keys(locationNames),
    ...manualLocations.map((location) => `manual:${location.id}`),
  ]);
  const locations = (clusterSets?.[side] ?? []).flatMap((cluster): LocationReference[] => {
    const key = locationKey(cluster, side);

    if (!locationKeys.has(key)) {
      return [];
    }

    return [
      {
        key,
        name: locationName(cluster, side, locationNames, manualLocations),
        kind: cluster.manual_location_id ? "manual" : "automatic",
        hidden: hiddenLocationFingerprints.includes(key),
        position: [cluster.x_pos, cluster.y_pos, cluster.z_pos],
        ward_ids: locationWardIds(cluster, side),
      },
    ];
  });
  const referencedWardIds = new Set([
    ...excludedWardIds,
    ...manualLocations.flatMap((location) => location.wardIds),
    ...locations.flatMap((location) => location.ward_ids),
  ]);
  const wardReferences = wards.flatMap((ward): WardReference[] => {
    if (!referencedWardIds.has(ward.id)) {
      return [];
    }

    return [wardReference(ward)];
  });

  return { wards: wardReferences, locations };
}

function wardReference(ward: Ward): WardReference {
  return {
    id: ward.id,
    match_id: ward.match_id,
    player_id: ward.player_placed_id,
    player_name: ward.player_name,
    side: wardSide(ward.is_radiant),
    type: ward.is_obs ? "observer" : "sentry",
    placed_at: ward.time_placed,
    position: [ward.x_pos, ward.y_pos, ward.z_pos],
  };
}

function wardSide(isRadiant: boolean | null): Exclude<Side, "all"> | null {
  return isRadiant === null ? null : isRadiant ? "radiant" : "dire";
}

function safeFileName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "wardmap-view"
  );
}
