import { getSetting, setSetting } from "../indexedDb";
import { emptyImportedLibrary } from "./model";
import type { ImportedLibrary } from "./model";

const libraryKey = "imported-match-library";

export async function loadImportedLibrary(): Promise<ImportedLibrary> {
  return (await getSetting<ImportedLibrary>(libraryKey)) ?? emptyImportedLibrary;
}

export async function saveImportedLibrary(library: ImportedLibrary): Promise<void> {
  await setSetting(libraryKey, library);
}
