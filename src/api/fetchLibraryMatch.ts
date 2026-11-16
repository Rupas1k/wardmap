import { apiGet } from "./client";
import { parseWardRecords } from "./validation";
import type { ImportedMatch, ImportedPlayer } from "../imported/model";

export const serverLibraryRevision = 2;

function record(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Invalid ${context} response`);
  }

  return value as Record<string, unknown>;
}

function requiredNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid server match field: ${field}`);
  }

  return value;
}

function nullableNumber(value: unknown, field: string): number | null {
  return value === null ? null : requiredNumber(value, field);
}

function parsePlayer(value: unknown): ImportedPlayer {
  const player = record(value, "server match player");

  if (typeof player.name !== "string" || typeof player.is_radiant !== "boolean") {
    throw new Error("Invalid server match player");
  }

  return {
    id: requiredNumber(player.id, "player.id"),
    name: player.name,
    isRadiant: player.is_radiant,
    hero: typeof player.hero === "string" ? player.hero : null,
  };
}

function parseLibraryMatch(payload: unknown): ImportedMatch {
  const match = record(payload, "server match");
  const matchId = requiredNumber(match.match_id, "match_id");

  if (!Array.isArray(match.players)) {
    throw new Error("Invalid server match players");
  }
  if (match.radiant_won !== null && typeof match.radiant_won !== "boolean") {
    throw new Error("Invalid server match result");
  }

  return {
    origin: "server",
    sourceRevision: requiredNumber(match.library_revision, "library_revision"),
    matchId,
    fileName: `Match ${matchId} · server`,
    fileHash: `server:${matchId}`,
    mapVersion: requiredNumber(match.map_version, "map_version"),
    startedAt: nullableNumber(match.started_at, "started_at"),
    duration: nullableNumber(match.duration, "duration"),
    importedAt: Date.now(),
    parserVersion: 1,
    radiantWon: match.radiant_won,
    players: match.players.map(parsePlayer),
    wards: parseWardRecords(match.wards),
  };
}

export function fetchLibraryMatch(matchId: number, signal?: AbortSignal) {
  return apiGet(`/api/v1/matches/${matchId}/library`, parseLibraryMatch, signal);
}
