/// <reference types="node" />

import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultDataset, normalizeDataset } from "../dataset/model";
import { fallbackMapVersion } from "../map/constants";
import { useWorkspaceStore } from "../state/workspaceState";
import type { League } from "../types";
import { compatibleLeagueDataset } from "./workspaceDataset";

void test("imported settings restore without a default league", () => {
  const dataset = normalizeDataset({ source: "imported", importedMapVersion: 1, leagueIds: [42] });

  assert.equal(dataset.importedMapVersion, 1);
  assert.deepEqual(dataset.leagueIds, []);
  assert.deepEqual(compatibleLeagueDataset(dataset, [], null), dataset);
});

void test("API leagues cannot change an imported map", () => {
  const dataset = { ...defaultDataset, source: "imported" as const, importedMapVersion: 0 };
  const league: League = {
    id: 42,
    name: "Online league",
    version: 2,
    parsed_matches: 10,
    latest_parsed_match_id: null,
  };

  assert.deepEqual(compatibleLeagueDataset(dataset, [league], league), dataset);
});

void test("legacy imported settings get a local map default without a league", () => {
  const dataset = normalizeDataset({ source: "imported" });

  assert.equal(dataset.importedMapVersion, fallbackMapVersion);
  assert.deepEqual(dataset.leagueIds, []);
});

void test("switching to imported clears a stale API error", () => {
  useWorkspaceStore.setState({ draftDataset: defaultDataset, error: "Failed to fetch" });
  useWorkspaceStore.getState().setDraftDataset({ ...defaultDataset, source: "imported" });
  assert.equal(useWorkspaceStore.getState().error, null);
  useWorkspaceStore.getState().setError("Unable to read local storage");
  useWorkspaceStore
    .getState()
    .setDraftDataset((dataset) => ({ ...dataset, importedMapVersion: 1 }));
  assert.equal(useWorkspaceStore.getState().error, "Unable to read local storage");
  useWorkspaceStore.setState({ draftDataset: defaultDataset, error: null });
});
