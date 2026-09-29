/// <reference types="node" />

import assert from "node:assert/strict";
import { test } from "node:test";
import { readDatasetPreference, writeDatasetPreference } from "./datasetPreference";

void test("remembers imported mode and its map", () => {
  let stored: string | null = null;
  const storage = {
    getItem: () => stored,
    setItem: (_key: string, value: string) => {
      stored = value;
    },
  };

  writeDatasetPreference(storage, { source: "imported", importedMapVersion: 1 });

  assert.deepEqual(readDatasetPreference(storage), {
    source: "imported",
    importedMapVersion: 1,
  });
});

void test("ignores an invalid source preference", () => {
  const storage = {
    getItem: () => JSON.stringify({ source: "invalid", importedMapVersion: 99 }),
  };

  assert.deepEqual(readDatasetPreference(storage), {
    source: "competitive",
    importedMapVersion: 2,
  });
});
