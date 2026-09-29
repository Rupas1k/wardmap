/// <reference types="node" />

import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultClusteringSettings } from "../state/mapState";
import type { Ward } from "../types";
import { buildClusters } from "./buildClusters";
import clusterWards from "./clusterWards";

function ward(id: number, isObs = true): Ward {
  return {
    id,
    match_id: 8_000_000_001,
    player_placed_id: 123,
    player_name: "Player",
    player_destroyed_id: null,
    player_destroyed_name: null,
    is_radiant: true,
    is_obs: isObs,
    is_destroyed: false,
    time_placed: 0,
    duration: 360,
    scouting_tracking_seconds: null,
    scouting_discovery_seconds: null,
    measurement: {
      sightings: [],
      vision_complete: false,
      placed_at_seconds: 0,
      ended_at_seconds: 360,
      outcome: "expired",
      outcome_reason: "natural_expiry",
      added_vision_seconds: null,
      fresh_sightings: null,
      fresh_sighting_threshold_seconds: 5,
      vision_possible_seconds: 0,
      vision_measured_seconds: 0,
      vision_coverage: null,
    },
    x_pos: 16384,
    y_pos: 16384,
    z_pos: 16384,
    radiant_networth: null,
    dire_networth: null,
    match_duration: 2400,
    team_id: null,
    team_name: null,
    opponent_team_id: null,
    opponent_team_name: null,
    team_won: null,
  };
}

void test("imported wards remain visible when grouping is disabled", async () => {
  const wards = [ward(-1), ward(-2), ward(-3, false)];
  const sets = await clusterWards(wards, defaultClusteringSettings, false, false);
  const visible = sets.all.filter((cluster) => !cluster.unclustered);
  assert.equal(visible.length, wards.length);
  assert.deepEqual(
    visible.flatMap((cluster) => cluster.wards?.map((item) => item.id)),
    [-1, -2, -3],
  );
  assert.equal(new Set(sets.all.map((cluster) => cluster.cluster_id)).size, wards.length);
});

void test("automatic grouping shows a single imported ward", async () => {
  const sets = await clusterWards([ward(-1)], defaultClusteringSettings, true, false);
  assert.equal(sets.all.length, 1);
  assert.notEqual(sets.all[0]?.unclustered, true);
  assert.equal(sets.all[0]?.wards?.[0]?.id, -1);
});

void test("noise location IDs do not collide with groups or the average", () => {
  const wards = [ward(-1), ward(-2), ward(-3), ward(1)];
  const result = buildClusters(
    wards,
    new Map([
      [-1, [-1, -2, -3]],
      [0, [1]],
    ]),
  );
  const ids = result.clusters.map((cluster) => cluster.cluster_id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(!ids.includes(result.average.cluster_id));
  assert.ok(
    result.clusters
      .filter((cluster) => cluster.unclustered)
      .every((cluster) => cluster.cluster_id < -1),
  );
});
