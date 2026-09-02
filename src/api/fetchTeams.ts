import { apiGet } from "./client";
import { parseTeams } from "./validation";
import type { Team } from "../types";

export async function fetchTeams(leagueIds: number[], signal?: AbortSignal): Promise<Team[]> {
  const parameters = new URLSearchParams();

  for (const leagueId of leagueIds) {
    parameters.append("league_ids", String(leagueId));
  }

  return apiGet(`/api/v1/teams?${parameters}`, parseTeams, signal);
}
