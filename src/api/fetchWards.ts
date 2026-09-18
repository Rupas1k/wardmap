import { apiPost } from "./client";
import { parseWardCount, parseWardPage, parseWardPopulation } from "./validation";
import type { ParsedWardPage } from "./validation";
import type { Ward, WardPopulation } from "../types";

export interface WardFilters {
  league_ids: number[];
  match_ids: string[];
  player_ids: string[];
  opponent_player_ids: string[];
  destroyed_by_player_ids: string[];
  team_ids: number[];
  opponent_team_ids: number[];
  team_result: "all" | "won" | "lost";
  side: "all" | "radiant" | "dire";
  ward_type: "all" | "observer" | "sentry";
  outcome: "all" | "dewarded" | "expired" | "allied_removed" | "match_ended" | "unresolved_removal";
  minimum_game_minute: number;
  maximum_game_minute: number;
  minimum_match_duration: number;
  maximum_match_duration: number;
  minimum_ward_lifetime: number;
  maximum_ward_lifetime: number;
  minimum_added_vision_seconds: number | null;
  maximum_added_vision_seconds: number | null;
  minimum_fresh_sightings: number | null;
  maximum_fresh_sightings: number | null;
  minimum_enemy_hero_vision_seconds: number | null;
  maximum_enemy_hero_vision_seconds: number | null;
  minimum_unique_enemy_hero_vision_seconds: number | null;
  maximum_unique_enemy_hero_vision_seconds: number | null;
  minimum_heroes_spotted: number | null;
  maximum_heroes_spotted: number | null;
  minimum_hero_reveal_events: number | null;
  maximum_hero_reveal_events: number | null;
  minimum_unique_hero_reveal_events: number | null;
  maximum_unique_hero_reveal_events: number | null;
  minimum_scouting_score: number | null;
  maximum_scouting_score: number | null;
  minimum_scouting_tracking_seconds: number | null;
  maximum_scouting_tracking_seconds: number | null;
  minimum_scouting_discovery_seconds: number | null;
  maximum_scouting_discovery_seconds: number | null;
}

export interface WardLoadProgress {
  loaded: number;
  total: number;
}

export class DatasetTooLargeError extends Error {
  constructor(
    readonly count: number,
    readonly maximum: number,
  ) {
    super(
      `${count.toLocaleString()} wards match these filters; narrow them to ${maximum.toLocaleString()} or fewer`,
    );
    this.name = "DatasetTooLargeError";
  }
}

export async function fetchWardCount(filters: WardFilters, signal?: AbortSignal): Promise<number> {
  return apiPost("/api/v1/wards/query", { ...filters, count_only: true }, parseWardCount, signal);
}

export async function fetchWardPopulation(
  filters: WardFilters,
  signal?: AbortSignal,
): Promise<WardPopulation> {
  return apiPost("/api/v1/wards/population", filters, parseWardPopulation, signal);
}

export async function fetchWards(
  filters: WardFilters,
  total: number,
  maximum: number,
  onProgress?: (progress: WardLoadProgress) => void,
  signal?: AbortSignal,
): Promise<Ward[]> {
  const wards: Ward[] = [];
  let cursor: number | null = null;

  onProgress?.({ loaded: 0, total });

  do {
    const payload: ParsedWardPage = await apiPost(
      "/api/v1/wards/query",
      { ...filters, page_size: 5000, cursor },
      parseWardPage,
      signal,
    );
    wards.push(...payload.data);

    if (wards.length > maximum) {
      throw new DatasetTooLargeError(wards.length, maximum);
    }

    onProgress?.({ loaded: wards.length, total });
    cursor = payload.pagination.has_more ? payload.pagination.next_cursor : null;
  } while (cursor !== null);

  return wards;
}
