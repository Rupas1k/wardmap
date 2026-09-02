const configuredApiUrl = import.meta.env.VITE_API_URL as string | undefined;

export const apiUrl = (configuredApiUrl?.trim() || "https://api.rupasov.dev").replace(/\/$/, "");

export const maximumWardDatasetSize = 50_000;

export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;

  return `${base}${path.replace(/^\//, "")}`;
}
