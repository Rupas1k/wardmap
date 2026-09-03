import type {
  Cluster,
  ClusterPlayer,
  ClusterResult,
  ClusterSets,
  ClusterSideData,
  ClusterWard,
  Ward,
} from "../types";
import {
  effectiveLifetime,
  placingAdvantage,
  roundedMean,
  wardTimeline,
} from "../metrics/wardMetrics";

function mode(values: number[]): number {
  const counts = new Map<number, number>();
  let result = values[0] ?? 0;

  for (const value of values) {
    const count = (counts.get(value) ?? 0) + 1;
    counts.set(value, count);

    if (count > (counts.get(result) ?? 0)) {
      result = value;
    }
  }

  return result;
}

function playerSummaries(wards: Ward[]): ClusterPlayer[] {
  const players = new Map<number, ClusterPlayer>();
  const matches = new Map<number, Set<number>>();

  for (const ward of wards) {
    const playerId = ward.player_placed_id ?? 0;
    const player = players.get(playerId) ?? {
      player_placed_id: playerId,
      name: ward.player_name ?? "Unknown",
      amount: 0,
      match_ids: [],
    };
    player.amount += 1;
    players.set(playerId, player);
    const playerMatches = matches.get(playerId) ?? new Set<number>();
    playerMatches.add(ward.match_id);
    matches.set(playerId, playerMatches);
  }

  for (const [playerId, player] of players) {
    player.match_ids = [...(matches.get(playerId) ?? [])].sort((left, right) => right - left);
  }

  return [...players.values()].sort(
    (left, right) =>
      right.amount - left.amount || (left.name ?? "").localeCompare(right.name ?? ""),
  );
}

function sideData(wards: Ward[]): ClusterSideData | null {
  if (wards.length === 0) {
    return null;
  }

  const advantages = wards.flatMap((ward) => {
    const advantage = placingAdvantage(ward);

    return advantage === null ? [] : [advantage];
  });

  return {
    amount: wards.length,
    match_count: new Set(wards.map((ward) => ward.match_id)).size,
    destroyed: wards.filter((ward) => ward.is_destroyed).length,
    advantage: advantages.length ? roundedMean(advantages) : null,
    duration: roundedMean(wards.map(effectiveLifetime)),
    time_placed: roundedMean(wards.map((ward) => ward.time_placed)),
    players: playerSummaries(wards),
    graphs: {
      wards: {
        placed: wardTimeline(wards),
        destroyed: wardTimeline(wards, true),
      },
    },
  };
}

function wardRecord(ward: Ward): ClusterWard {
  return {
    id: ward.id,
    match_id: ward.match_id,
    player_placed_id: ward.player_placed_id ?? 0,
    player_name: ward.player_name ?? "Unknown",
    player_destroyed_id: ward.player_destroyed_id,
    player_destroyed_name: ward.player_destroyed_name,
    is_radiant: ward.is_radiant === true,
    is_obs: ward.is_obs,
    is_destroyed: ward.is_destroyed,
    time_placed: ward.time_placed,
    duration: effectiveLifetime(ward),
    x_pos: ward.x_pos,
    y_pos: ward.y_pos,
    z_pos: ward.z_pos,
    team_id: ward.team_id,
    team_name: ward.team_name,
    opponent_team_id: ward.opponent_team_id,
    opponent_team_name: ward.opponent_team_name,
    team_won: ward.team_won,
  };
}

export function buildClusters(wards: Ward[], memberships: Map<number, number[]>): ClusterResult {
  const wardsById = new Map(wards.map((ward) => [ward.id, ward]));
  const clusters: Cluster[] = [];

  for (const [clusterId, wardIds] of memberships) {
    if (clusterId < 0) {
      for (const id of wardIds) {
        const ward = wardsById.get(id);

        if (!ward) {
          continue;
        }

        const radiant = ward.is_radiant === true ? [ward] : [];
        const dire = ward.is_radiant === false ? [ward] : [];
        clusters.push({
          cluster_id: -(ward.id + 2),
          unclustered: true,
          x_pos: ward.x_pos,
          y_pos: ward.y_pos,
          z_pos: ward.z_pos,
          wards: [wardRecord(ward)],
          radiant: sideData(radiant),
          dire: sideData(dire),
          all: sideData([ward]),
        });
      }
      continue;
    }

    const members = wardIds.flatMap((id) => {
      const ward = wardsById.get(id);

      return ward ? [ward] : [];
    });

    if (members.length === 0) {
      continue;
    }

    const radiant = members.filter((ward) => ward.is_radiant === true);
    const dire = members.filter((ward) => ward.is_radiant === false);
    clusters.push({
      cluster_id: clusterId,
      x_pos: roundedMean(members.map((ward) => ward.x_pos)),
      y_pos: roundedMean(members.map((ward) => ward.y_pos)),
      z_pos: mode(members.map((ward) => ward.z_pos)),
      wards: members.map(wardRecord),
      radiant: sideData(radiant),
      dire: sideData(dire),
      all: sideData(members),
    });
  }

  const radiant = wards.filter((ward) => ward.is_radiant === true);
  const dire = wards.filter((ward) => ward.is_radiant === false);

  return {
    clusters,
    average: {
      cluster_id: -1,
      x_pos: 0,
      y_pos: 0,
      z_pos: 0,
      wards: [],
      radiant: sideData(radiant),
      dire: sideData(dire),
      all: sideData(wards),
    },
  };
}

export function buildEmptyClusterSets(): ClusterSets {
  const empty = buildClusters([], new Map());

  return { all: [], radiant: [], dire: [], average: empty.average };
}
