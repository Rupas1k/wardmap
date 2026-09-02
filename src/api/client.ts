import { authHeaders } from "../auth";
import { apiUrl } from "../config";

interface ApiErrorBody {
  detail?: string;
  message?: string;
  error?: { message?: string };
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
    readonly retryAfterSeconds: number | null,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

function retryAfterSeconds(response: Response): number | null {
  const value = response.headers.get("Retry-After");

  if (!value) {
    return null;
  }

  const seconds = Number(value);

  if (Number.isFinite(seconds)) {
    return Math.max(0, Math.ceil(seconds));
  }

  const date = Date.parse(value);

  return Number.isNaN(date) ? null : Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

async function apiRequest(path: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init.headers },
  });

  if (!response.ok) {
    let detail = "";

    try {
      const body = (await response.json()) as ApiErrorBody;
      detail = body.error?.message ?? body.detail ?? body.message ?? "";
    } catch {
      // The status and endpoint remain useful when an error body is not JSON.
    }

    const retryAfter = retryAfterSeconds(response);
    const fallback = `Request failed with status ${response.status}`;
    const message =
      response.status === 429
        ? `Rate limit reached${retryAfter === null ? "" : `; try again in ${retryAfter}s`}`
        : detail || fallback;

    throw new ApiRequestError(`${message} (${path})`, response.status, path, retryAfter);
  }

  return response.json() as Promise<unknown>;
}

export async function apiGet<T>(
  path: string,
  parse: (payload: unknown) => T,
  signal?: AbortSignal,
): Promise<T> {
  return parse(await apiRequest(path, signal ? { signal } : {}));
}

export async function apiPost<TBody, TResponse>(
  path: string,
  body: TBody,
  parse: (payload: unknown) => TResponse,
  signal?: AbortSignal,
): Promise<TResponse> {
  const init: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };

  if (signal) {
    init.signal = signal;
  }

  return parse(await apiRequest(path, init));
}
