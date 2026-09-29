import { getSetting, setSetting } from "../indexedDb";
import { parseWardRecords } from "../api/validation";
import { emptyImportedLibrary } from "./model";
import type { ImportedLibrary } from "./model";

const libraryKey = "imported-match-library";
const backupFormat = "wardmap-replay-library";
const backupVersion = 1;
const maximumBackupBytes = 256 * 1024 * 1024;

interface LibraryBackup {
  format: typeof backupFormat;
  version: typeof backupVersion;
  exportedAt: string;
  library: ImportedLibrary;
}

function normalizeLibrary(value: ImportedLibrary): ImportedLibrary {
  const matches = value.matches
    .filter((match) => match.parserVersion > 0)
    .map((match) => ({
      ...match,
      warnings: match.warnings ?? [],
      wards: parseWardRecords(match.wards),
    }));
  const ids = new Set(matches.map((match) => match.matchId));

  return {
    ...(value.nextWardId === undefined ? {} : { nextWardId: value.nextWardId }),
    matches,
    collections: value.collections.map((collection) => ({
      ...collection,
      description: collection.description ?? "",
      updatedAt: collection.updatedAt ?? collection.createdAt,
      matchIds: [...new Set(collection.matchIds.filter((id) => ids.has(id)))],
    })),
    profile: {
      accountIds: [...new Set(value.profile.accountIds.filter(Number.isSafeInteger))],
    },
  };
}

export async function loadImportedLibrary(): Promise<ImportedLibrary> {
  const library = (await getSetting<ImportedLibrary>(libraryKey)) ?? emptyImportedLibrary;
  const cleaned = normalizeLibrary(library);

  if (JSON.stringify(cleaned) !== JSON.stringify(library)) {
    await saveImportedLibrary(cleaned);
  }

  return cleaned;
}

export async function saveImportedLibrary(library: ImportedLibrary): Promise<void> {
  await setSetting(libraryKey, library);
}

export function downloadImportedLibrary(library: ImportedLibrary): void {
  const backup: LibraryBackup = {
    format: backupFormat,
    version: backupVersion,
    exportedAt: new Date().toISOString(),
    library,
  };
  const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.download = `wardmap-replay-library-${new Date().toISOString().slice(0, 10)}.json`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

export async function readImportedLibraryBackup(file: File): Promise<ImportedLibrary> {
  if (file.size > maximumBackupBytes) {
    throw new Error("Library backup is larger than 256 MB");
  }

  let value: unknown;

  try {
    value = JSON.parse(await file.text());
  } catch {
    throw new Error("This is not a valid JSON library backup");
  }

  if (!value || typeof value !== "object") {
    throw new Error("This is not a Wardmap replay library backup");
  }

  const backup = value as Partial<LibraryBackup>;

  if (
    backup.format !== backupFormat ||
    backup.version !== backupVersion ||
    !backup.library ||
    !Array.isArray(backup.library.matches) ||
    !Array.isArray(backup.library.collections) ||
    !backup.library.profile ||
    !Array.isArray(backup.library.profile.accountIds)
  ) {
    throw new Error("This is not a supported Wardmap replay library backup");
  }

  try {
    return normalizeLibrary(backup.library);
  } catch {
    throw new Error("The replay library backup contains invalid match data");
  }
}
