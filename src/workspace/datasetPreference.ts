import { fallbackMapVersion } from "../map/constants";
import type { DatasetSource } from "../dataset/model";

const preferenceKey = "wardmap:dataset-source";

export interface DatasetPreference {
  source: DatasetSource;
  importedMapVersion: number;
}

const defaultPreference: DatasetPreference = {
  source: "competitive",
  importedMapVersion: fallbackMapVersion,
};

export function readDatasetPreference(
  storage: Pick<Storage, "getItem"> | undefined,
): DatasetPreference {
  if (!storage) {
    return defaultPreference;
  }

  try {
    const value = JSON.parse(
      storage.getItem(preferenceKey) ?? "null",
    ) as Partial<DatasetPreference> | null;

    if (
      !value ||
      !["competitive", "imported"].includes(value.source ?? "") ||
      ![0, 1, 2].includes(value.importedMapVersion ?? -1)
    ) {
      return defaultPreference;
    }

    return value as DatasetPreference;
  } catch {
    return defaultPreference;
  }
}

export function writeDatasetPreference(
  storage: Pick<Storage, "setItem"> | undefined,
  preference: DatasetPreference,
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(preferenceKey, JSON.stringify(preference));
  } catch {
    // Workspace persistence remains available through IndexedDB.
  }
}
