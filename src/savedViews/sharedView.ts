import { normalizeViewState } from "./viewState";
import type { ViewState } from "./viewState";

export type SharedView = ViewState;

const hashPrefix = "#view=";

export function sharedViewUrl(view: SharedView): string {
  const bytes = new TextEncoder().encode(JSON.stringify(view));
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  const encoded = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");

  return `${window.location.origin}${window.location.pathname}${window.location.search}${hashPrefix}${encoded}`;
}

export function sharedViewFromHash(hash = window.location.hash): SharedView | null {
  if (!hash.startsWith(hashPrefix)) {
    return null;
  }

  try {
    const encoded = hash.slice(hashPrefix.length).replaceAll("-", "+").replaceAll("_", "/");
    const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));

    return normalizeViewState(value);
  } catch {
    return null;
  }
}
