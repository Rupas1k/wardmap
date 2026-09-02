import type { ClusterMarkerSize } from "../state/mapState";
import type { AnalysisScope } from "../state/analysisContext";
import type { InspectorTab } from "../state/workspaceState";
import type { Side } from "../types";
import { isWorkspaceSettings } from "../dataset/model";
import type { WorkspaceSettings } from "../dataset/model";

export interface SharedView {
  version: 1;
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

const hashPrefix = "#view=";

export function sharedViewUrl(view: SharedView): string {
  const bytes = new TextEncoder().encode(JSON.stringify(view));
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  const encoded = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");

  return `${window.location.origin}${window.location.pathname}${window.location.search}${hashPrefix}${encoded}`;
}

export function sharedViewFromHash(hash = window.location.hash): SharedView | null {
  if (!hash.startsWith(hashPrefix)) {
    return null;
  }

  try {
    const encoded = hash.slice(hashPrefix.length).replaceAll("-", "+").replaceAll("_", "/");
    const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));

    return isSharedView(value) ? value : null;
  } catch {
    return null;
  }
}

function isSharedView(value: unknown): value is SharedView {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SharedView>;
  const map = candidate.map;
  const inspector = candidate.inspector;
  const markerSize = map?.markerSize;
  const context = inspector?.context;

  return Boolean(
    candidate.version === 1 &&
    isWorkspaceSettings(candidate.settings) &&
    map &&
    ["all", "radiant", "dire"].includes(map.side) &&
    markerSize &&
    Number.isFinite(markerSize.minimum) &&
    Number.isFinite(markerSize.maximum) &&
    markerSize.minimum >= 2 &&
    markerSize.maximum <= 20 &&
    markerSize.minimum <= markerSize.maximum &&
    inspector &&
    ["overview", "locations", "details"].includes(inspector.tab) &&
    (context === null ||
      (Number.isFinite(context?.id) && ["player", "match"].includes(context?.kind ?? ""))),
  );
}
