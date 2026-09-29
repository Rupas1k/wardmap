/// <reference types="node" />

import "fake-indexeddb/auto";

import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { getSetting, listImportedMatches, setSetting } from "../indexedDb";
import type { ImportedLibrary, ImportedMatch } from "./model";
import {
  loadImportedLibrary,
  readImportedLibraryBackup,
  removeImportedMatches,
  replaceImportedLibrary,
} from "./storage";

void test("restores a valid replay-library backup", async () => {
  const backup = new File(
    [
      JSON.stringify({
        format: "wardmap-replay-library",
        version: 1,
        exportedAt: new Date().toISOString(),
        library: {
          matches: [],
          collections: [
            {
              id: "collection",
              name: "Collection",
              matchIds: [123],
              createdAt: 100,
            },
          ],
          profile: { accountIds: [1, 1, 2] },
        },
      }),
    ],
    "library.json",
    { type: "application/json" },
  );

  const library = await readImportedLibraryBackup(backup);

  assert.deepEqual(library.profile.accountIds, [1, 2]);
  assert.deepEqual(library.collections[0]?.matchIds, []);
  assert.equal(library.collections[0]?.description, "");
  assert.equal(library.collections[0]?.updatedAt, 100);
});

void test("rejects unrelated JSON as a library backup", async () => {
  const backup = new File([JSON.stringify({ matches: [] })], "library.json");

  await assert.rejects(readImportedLibraryBackup(backup), /not a supported Wardmap/);
});

function importedMatch(matchId: number, fileHash = `hash-${matchId}`): ImportedMatch {
  return {
    matchId,
    fileName: `${matchId}.dem`,
    fileHash,
    mapVersion: 2,
    startedAt: null,
    duration: null,
    importedAt: 100,
    parserVersion: 1,
    radiantWon: null,
    players: [],
    wards: [],
  };
}

function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase("dota2wardmap");

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Test database deletion failed"));
    request.onblocked = () => reject(new Error("Test database deletion was blocked"));
  });
}

void afterEach(deleteDatabase);

void test("migrates the legacy replay library into per-match records", async () => {
  const legacy: ImportedLibrary = {
    matches: [importedMatch(123)],
    collections: [
      {
        id: "collection",
        name: "Collection",
        matchIds: [123],
        createdAt: 100,
      },
    ],
    profile: { accountIds: [42] },
  };

  await setSetting("imported-match-library", legacy);

  const library = await loadImportedLibrary();

  assert.deepEqual(
    library.matches.map(({ matchId }) => matchId),
    [123],
  );
  assert.deepEqual(library.collections[0]?.matchIds, [123]);
  assert.deepEqual(await listImportedMatches<ImportedMatch>(), library.matches);
  assert.equal(await getSetting("imported-match-library"), null);
});

void test("replaces and removes individual replay records", async () => {
  const library: ImportedLibrary = {
    matches: [importedMatch(123), importedMatch(456)],
    collections: [],
    profile: { accountIds: [] },
  };

  await replaceImportedLibrary(library);
  await removeImportedMatches([123]);

  const restored = await loadImportedLibrary();

  assert.deepEqual(
    restored.matches.map(({ matchId }) => matchId),
    [456],
  );
});
