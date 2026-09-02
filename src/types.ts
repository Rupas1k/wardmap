export type Side = "radiant" | "dire" | "all";

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
  players: ClusterPlayer[];
  graphs: {
    wards: {
      placed: number[];
      destroyed: number[];
    };
  };
}

export interface ClusterWard {
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
  enemy_hero_vision_seconds: number | null;
  unique_enemy_hero_vision_seconds: number | null;
  heroes_spotted: number | null;
  hero_reveal_events: number | null;
  unique_hero_reveal_events: number | null;
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
