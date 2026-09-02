import type { InspectorTab } from "../state/workspaceState";

interface InspectorTabDefinition {
  id: InspectorTab;
  label: string;
  requiresSelection: boolean;
}

export const inspectorTabs: readonly InspectorTabDefinition[] = [
  { id: "overview", label: "Overview", requiresSelection: false },
  { id: "locations", label: "Context", requiresSelection: false },
  { id: "details", label: "Location Details", requiresSelection: true },
];
