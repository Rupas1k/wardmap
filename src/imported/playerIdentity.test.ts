/// <reference types="node" />

import assert from "node:assert/strict";
import { test } from "node:test";
import type { ImportedMatch } from "./model";
import { newestPlayerNames } from "./playerIdentity";

function match(
  matchId: number,
  startedAt: number | null,
  importedAt: number,
  name: string,
): ImportedMatch {
  return {
    matchId,
    fileName: `${matchId}.dem`,
    fileHash: `hash-${matchId}`,
    mapVersion: 2,
    startedAt,
    duration: 100,
    importedAt,
    parserVersion: 1,
    radiantWon: true,
    players: [{ id: 42, name, hero: null, isRadiant: true }],
    wards: [],
  };
}

void test("uses the newest real nickname for a Steam account", () => {
  const names = newestPlayerNames([
    match(1, 100, 1000, "Old name"),
    match(2, 300, 1100, "New name"),
    match(3, 200, 1200, "Middle name"),
  ]);

  assert.equal(names.get(42), "New name");
});

void test("does not replace a known nickname with a placeholder", () => {
  const names = newestPlayerNames([
    match(1, 100, 1000, "Known name"),
    match(2, 200, 1100, "Player 42"),
    match(3, 300, 1200, "Unknown Player"),
  ]);

  assert.equal(names.get(42), "Known name");
});
