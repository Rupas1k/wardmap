export type Side = "radiant" | "dire" | "all";

export interface WardSightingSegment {
  time: number;
  gap_seconds: number | null;
  start_position: [number, number, number] | null;
  visible_seconds: number | null;
  lost_position: [number, number, number] | null;
  route: { time: number; position: [number, number, number] }[];
}

export interface WardSighting {
  sample_tick: number | null;
  time: number;
  target_player_slot: number | null;
  target_steam_id: string | null;
  target_player_name: string | null;
  target_hero_name: string | null;
  target_is_radiant: boolean | null;
  target_position: [number, number, number] | null;
  hidden_seconds: number;
  segments: WardSightingSegment[];
  observer_handles: number[];
  credit: number;
}

export interface WardEvidence {
  ward_id: number;
  sightings: WardSighting[];
}

export interface WardMeasurement {
  sightings: WardSighting[];
  vision_complete: boolean;
  placed_at_seconds: number;
  ended_at_seconds: number;
  outcome: "dewarded" | "allied_removed" | "expired" | "match_ended" | "replay_ended" | "unknown";
  outcome_reason: string;
  added_vision_seconds: number | null;
  fresh_sightings: number | null;
  fresh_sighting_threshold_seconds: number;
  vision_possible_seconds: number;
  vision_measured_seconds: number;
  vision_coverage: number | null;
}

export interface WardPopulation {
  matches: number;
  match_sides: number;
  selection_conditioned: boolean;
}

export interface League {
  id: number;
  name: string;
  version: number;
  parsed_matches: number;
  latest_parsed_match_id: number | null;
}

export interface Team {
  id: number;
  name: string | null;
  tag: string | null;
  logo_url: string | null;
}

export interface Player {
  id: number;
  name: string | null;
  ward_count?: number;
}

export interface ClusterPlayer {
  player_placed_id: number;
  name: string | null;
  amount: number;
  match_ids: number[];
}

export interface ClusterSideData {
  amount: number;
  match_count: number;
  destroyed: number;
  advantage: number | null;
  duration: number;
  time_placed: number;
  scouting_tracking_seconds: number | null;
  scouting_discovery_seconds: number | null;
  players: ClusterPlayer[];
  graphs: {
    wards: {
      placed: number[];
      destroyed: number[];
    };
  };
}

export interface ClusterWard {
  measurement: WardMeasurement;
  id: number;
  match_id: number;
  player_placed_id: number;
  player_name: string;
  player_destroyed_id: number | null;
  player_destroyed_name: string | null;
  is_radiant: boolean;
  is_obs: boolean;
  is_destroyed: boolean;
  time_placed: number;
  duration: number;
  scouting_tracking_seconds: number | null;
  scouting_discovery_seconds: number | null;
  x_pos: number;
  y_pos: number;
  z_pos: number;
  team_id: number | null;
  team_name: string | null;
  opponent_team_id: number | null;
  opponent_team_name: string | null;
  team_won: boolean | null;
}

export interface Cluster {
  cluster_id: number;
  manual_location_id?: string;
  unclustered?: boolean;
  x_pos: number;
  y_pos: number;
  z_pos: number;
  wards?: ClusterWard[];
  radiant: ClusterSideData | null;
  dire: ClusterSideData | null;
  all: ClusterSideData | null;
}

export interface ClusterSets {
  all: Cluster[];
  radiant: Cluster[];
  dire: Cluster[];
  average: Cluster;
}

export interface ClusterResult {
  clusters: Cluster[];
  average: Cluster;
}

export interface Ward {
  id: number;
  match_id: number;
  player_placed_id: number | null;
  player_name: string | null;
  player_destroyed_id: number | null;
  player_destroyed_name: string | null;
  is_radiant: boolean | null;
  is_obs: boolean;
  is_destroyed: boolean;
  time_placed: number;
  duration: number;
  scouting_tracking_seconds: number | null;
  scouting_discovery_seconds: number | null;
  measurement: WardMeasurement;
  x_pos: number;
  y_pos: number;
  z_pos: number;
  radiant_networth: number | null;
  dire_networth: number | null;
  match_duration: number | null;
  team_id: number | null;
  team_name: string | null;
  opponent_team_id: number | null;
  opponent_team_name: string | null;
  team_won: boolean | null;
}
