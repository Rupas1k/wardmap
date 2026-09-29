import {
  deleteImportedMatches,
  deleteSetting,
  getSetting,
  listImportedMatches,
  replaceImportedMatches,
  saveImportedMatch as saveImportedMatchRecord,
  setSetting,
} from "../indexedDb";
import { parseWardRecords } from "../api/validation";
import { emptyImportedLibrary } from "./model";
import type { ImportedLibrary, ImportedMatch } from "./model";

const legacyLibraryKey = "imported-match-library";
const metadataKey = "imported-library-metadata";
const backupFormat = "wardmap-replay-library";
const backupVersion = 1;
const maximumBackupBytes = 256 * 1024 * 1024;

type ImportedLibraryMetadata = Omit<ImportedLibrary, "matches">;

interface LibraryBackup {
  format: typeof backupFormat;
  version: typeof backupVersion;
  exportedAt: string;
  library: ImportedLibrary;
}

function normalizeLibrary(value: ImportedLibrary): ImportedLibrary {
  const matches = value.matches
    .filter((match) => match.parserVersion > 0)
    .map((match) => {
      const cleaned = { ...match } as ImportedMatch & {
        gameVersion?: unknown;
        warnings?: unknown;
      };

      delete cleaned.gameVersion;
      delete cleaned.warnings;

      return {
        ...cleaned,
        wards: parseWardRecords(cleaned.wards),
      };
    });
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

function metadata(library: ImportedLibrary): ImportedLibraryMetadata {
  return {
    ...(library.nextWardId === undefined ? {} : { nextWardId: library.nextWardId }),
    collections: library.collections,
    profile: library.profile,
  };
}

async function migrateLegacyLibrary(library: ImportedLibrary): Promise<ImportedLibrary> {
  const cleaned = normalizeLibrary(library);

  await replaceImportedMatches(cleaned.matches);
  await setSetting(metadataKey, metadata(cleaned));
  await deleteSetting(legacyLibraryKey);

  return cleaned;
}

export async function loadImportedLibrary(): Promise<ImportedLibrary> {
  const [storedMetadata, matches, legacy] = await Promise.all([
    getSetting<ImportedLibraryMetadata>(metadataKey),
    listImportedMatches<ImportedMatch>(),
    getSetting<ImportedLibrary>(legacyLibraryKey),
  ]);

  if (!storedMetadata && legacy) {
    return migrateLegacyLibrary(legacy);
  }

  const library = normalizeLibrary({
    matches,
    collections: storedMetadata?.collections ?? [],
    profile: storedMetadata?.profile ?? emptyImportedLibrary.profile,
    ...(storedMetadata?.nextWardId === undefined ? {} : { nextWardId: storedMetadata.nextWardId }),
  });

  if (library.matches.length !== matches.length) {
    await replaceImportedMatches(library.matches);
  }
  if (JSON.stringify(metadata(library)) !== JSON.stringify(storedMetadata)) {
    await setSetting(metadataKey, metadata(library));
  }
  if (legacy) {
    await deleteSetting(legacyLibraryKey);
  }

  return library;
}

export async function saveImportedLibraryMetadata(library: ImportedLibrary): Promise<void> {
  await setSetting(metadataKey, metadata(library));
}

export async function saveImportedMatch(
  match: ImportedMatch,
  replacedMatchId?: number,
): Promise<void> {
  await saveImportedMatchRecord(match, replacedMatchId);
}

export async function removeImportedMatches(matchIds: readonly number[]): Promise<void> {
  await deleteImportedMatches(matchIds);
}

export async function replaceImportedLibrary(library: ImportedLibrary): Promise<void> {
  const cleaned = normalizeLibrary(library);

  await replaceImportedMatches(cleaned.matches);
  await setSetting(metadataKey, metadata(cleaned));
  await deleteSetting(legacyLibraryKey);
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
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
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
