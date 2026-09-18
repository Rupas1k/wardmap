import { getApiKey } from "../auth";
import type { WardEvidence } from "../types";
import { apiGet } from "./client";
import { parseWardEvidence } from "./validation";

const evidenceCache = new Map<string, Promise<WardEvidence>>();

export function fetchWardEvidence(wardId: number): Promise<WardEvidence> {
  const access = getApiKey() ? "authenticated" : "anonymous";
  const key = `${access}:${wardId}`;
  const cached = evidenceCache.get(key);

  if (cached) {
    return cached;
  }

  const request = apiGet(`/api/v1/wards/${wardId}/evidence`, parseWardEvidence).catch(
    (error: unknown) => {
      evidenceCache.delete(key);
      throw error;
    },
  );
  evidenceCache.set(key, request);

  return request;
}
