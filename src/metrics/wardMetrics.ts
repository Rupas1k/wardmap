import type { Ward } from "../types";

export const timelineBucketCount = 14;

export function mean(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function roundedMean(values: number[]): number {
  return Math.round(mean(values) ?? 0);
}

export function percentile(values: number[], fraction: number): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = (sorted.length - 1) * fraction;
  const lower = sorted[Math.floor(index)]!;
  const upper = sorted[Math.ceil(index)]!;

  return lower + (upper - lower) * (index - Math.floor(index));
}

export function effectiveLifetime(ward: Ward): number {
  if (ward.match_duration === null) {
    return ward.duration;
  }

  return Math.min(ward.duration, Math.max(0, ward.match_duration - ward.time_placed));
}

export function placingAdvantage(ward: Ward): number | null {
  if (ward.radiant_networth === null || ward.dire_networth === null || ward.is_radiant === null) {
    return null;
  }

  const difference = ward.radiant_networth - ward.dire_networth;

  return ward.is_radiant ? difference : -difference;
}

export function formatGameTime(seconds: number | null, padMinutes = false): string {
  if (seconds === null) {
    return "--";
  }

  const rounded = Math.round(seconds);
  const sign = rounded < 0 ? "-" : "";
  const absolute = Math.abs(rounded);
  const minutes = String(Math.floor(absolute / 60));

  return `${sign}${padMinutes ? minutes.padStart(2, "0") : minutes}:${String(absolute % 60).padStart(2, "0")}`;
}

export function wardTimeline(wards: Ward[], dewardedOnly = false): number[] {
  const values = Array.from({ length: timelineBucketCount }, () => 0);

  for (const ward of wards) {
    if (dewardedOnly && !ward.is_destroyed) {
      continue;
    }

    const index =
      ward.time_placed < 0
        ? 0
        : Math.min(timelineBucketCount - 1, Math.floor(ward.time_placed / 300) + 1);
    values[index] = (values[index] ?? 0) + 1;
  }

  return values;
}
