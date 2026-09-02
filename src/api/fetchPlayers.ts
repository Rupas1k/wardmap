import { apiGet } from "./client";
import { parsePlayers } from "./validation";
import type { Player } from "../types";

export async function fetchPlayers(
  leagueIds: number[],
  teamIds: number[] = [],
  role: "participant" | "placer" = "participant",
  signal?: AbortSignal,
): Promise<Player[]> {
  const parameters = new URLSearchParams();

  parameters.set("role", role);

  for (const leagueId of leagueIds) {
    parameters.append("league_ids", String(leagueId));
  }

  for (const teamId of teamIds) {
    parameters.append("team_ids", String(teamId));
  }

  return apiGet(`/api/v1/players?${parameters}`, parsePlayers, signal);
}
