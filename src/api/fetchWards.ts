import { apiPost } from "./client";
import { parseWardCount, parseWardPage } from "./validation";
import type { ParsedWardPage } from "./validation";
import type { Ward } from "../types";

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
  outcome: "all" | "survived" | "destroyed";
  minimum_game_minute: number;
  maximum_game_minute: number;
  minimum_match_duration: number;
  maximum_match_duration: number;
  minimum_ward_lifetime: number;
  maximum_ward_lifetime: number;
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
