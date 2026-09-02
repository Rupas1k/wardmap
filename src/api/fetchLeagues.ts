import { apiGet } from "./client";
import { parseLeagues } from "./validation";
import type { League } from "../types";

export async function fetchLeagues(signal?: AbortSignal): Promise<League[]> {
  return apiGet("/api/v1/leagues", parseLeagues, signal);
}
