import { apiPost } from "./client";

export interface MatchSyncResult {
  matches: number;
  queued: number;
  parsed: number;
  pending: number;
  unavailable: number;
  failed: number;
  history: MatchHistoryEntry[];
}

export interface MatchHistoryEntry {
  matchId: number;
  status: "parsed" | "queued" | "pending" | "processing" | "unavailable" | "failed";
}

function parseCount(value: unknown, field: string) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid match sync response: ${field}`);
  }

  return value;
}

function parseMatchSyncResult(payload: unknown): MatchSyncResult {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Invalid match sync response");
  }

  const result = payload as Record<string, unknown>;
  const history = parseMatchHistory(result.history);

  return {
    matches: parseCount(result.matches, "matches"),
    queued: parseCount(result.queued, "queued"),
    parsed: parseCount(result.parsed, "parsed"),
    pending: parseCount(result.pending, "pending"),
    unavailable: parseCount(result.unavailable, "unavailable"),
    failed: parseCount(result.failed, "failed"),
    history,
  };
}

function parseMatchHistory(value: unknown): MatchHistoryEntry[] {
  return Array.isArray(value)
    ? value.map((value): MatchHistoryEntry => {
        if (typeof value !== "object" || value === null) {
          throw new Error("Invalid match sync response: history");
        }

        const entry = value as Record<string, unknown>;
        const matchId = parseCount(entry.match_id, "history.match_id");
        const statuses = [
          "parsed",
          "queued",
          "pending",
          "processing",
          "unavailable",
          "failed",
        ] as const;

        if (!statuses.some((status) => status === entry.status)) {
          throw new Error("Invalid match sync response: history.status");
        }

        return { matchId, status: entry.status as MatchHistoryEntry["status"] };
      })
    : [];
}

export function refreshMatchHistory(accountId: number, signal?: AbortSignal) {
  return apiPost<Record<string, never>, MatchSyncResult>(
    `/api/v1/tracked-players/${accountId}/sync`,
    {},
    parseMatchSyncResult,
    signal,
  );
}

export function fetchMatchStatuses(matchIds: number[], signal?: AbortSignal) {
  return apiPost(
    "/api/v1/matches/status",
    { match_ids: matchIds },
    (payload) => parseMatchHistory(recordHistory(payload)),
    signal,
  );
}

function recordHistory(payload: unknown): unknown {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Invalid match status response");
  }

  return (payload as Record<string, unknown>).history;
}
