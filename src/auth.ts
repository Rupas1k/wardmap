import { apiUrl } from "./config";

const storageKey = "wardmap-api-key";

export interface AccessStatus {
  access_level: "anonymous" | "advanced" | "admin";
  authenticated: boolean;
  key_prefix: string | null;
  owner: string | null;
}

export function getApiKey(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const apiKey =
    window.localStorage.getItem(storageKey) ?? window.sessionStorage.getItem(storageKey) ?? "";

  if (apiKey && !window.localStorage.getItem(storageKey)) {
    window.localStorage.setItem(storageKey, apiKey);
    window.sessionStorage.removeItem(storageKey);
  }

  return apiKey;
}

export function authHeaders(apiKey = getApiKey()): Record<string, string> {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

export async function verifyApiKey(apiKey: string): Promise<AccessStatus> {
  const response = await fetch(`${apiUrl}/api/v1/auth/me`, {
    headers: authHeaders(apiKey),
  });

  if (!response.ok) {
    throw new Error("The API key is invalid or revoked");
  }

  return (await response.json()) as AccessStatus;
}

export function saveApiKey(apiKey: string): void {
  if (apiKey) {
    window.localStorage.setItem(storageKey, apiKey);
  } else {
    window.localStorage.removeItem(storageKey);
    window.sessionStorage.removeItem(storageKey);
  }
}
