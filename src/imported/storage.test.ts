/// <reference types="node" />

import assert from "node:assert/strict";
import { test } from "node:test";
import { readImportedLibraryBackup } from "./storage";

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
