import type { Ward } from "../types";
import { effectiveLifetime, mean, percentile, wardTimeline } from "./wardMetrics";

export interface DatasetPhaseSummary {
  amount: number;
  dewarded: number;
}

export interface DatasetAnalysis {
  matches: number;
  medianWardsPerMatch: number | null;
  observerCount: number;
  sentryCount: number;
  meanLifetime: number | null;
  dewardedWithinTwoMinutes: number;
  dewardedWithinFourMinutes: number;
  dewardedWithinSixMinutes: number;
  phases: readonly [string, DatasetPhaseSummary][];
  placedTimeline: number[];
  dewardedTimeline: number[];
  missingPlayer: number;
  missingSide: number;
}

export function analyzeDataset(wards: Ward[]): DatasetAnalysis {
  const matchCounts = new Map<number, number>();

  for (const ward of wards) {
    matchCounts.set(ward.match_id, (matchCounts.get(ward.match_id) ?? 0) + 1);
  }

  const phases: readonly [string, Ward[]][] = [
    ["Pregame", wards.filter((ward) => ward.time_placed < 0)],
    ["0–10 min", wards.filter((ward) => ward.time_placed >= 0 && ward.time_placed < 600)],
    ["10–20 min", wards.filter((ward) => ward.time_placed >= 600 && ward.time_placed < 1200)],
    ["20–35 min", wards.filter((ward) => ward.time_placed >= 1200 && ward.time_placed < 2100)],
    ["35–50 min", wards.filter((ward) => ward.time_placed >= 2100 && ward.time_placed < 3000)],
    ["50+ min", wards.filter((ward) => ward.time_placed >= 3000)],
  ];

  return {
    matches: matchCounts.size,
    medianWardsPerMatch: percentile([...matchCounts.values()], 0.5),
    observerCount: wards.filter((ward) => ward.is_obs).length,
    sentryCount: wards.filter((ward) => !ward.is_obs).length,
    meanLifetime: mean(wards.map(effectiveLifetime)),
    dewardedWithinTwoMinutes: wards.filter((ward) => ward.is_destroyed && ward.duration <= 120)
      .length,
    dewardedWithinFourMinutes: wards.filter((ward) => ward.is_destroyed && ward.duration <= 240)
      .length,
    dewardedWithinSixMinutes: wards.filter((ward) => ward.is_destroyed && ward.duration <= 360)
      .length,
    phases: phases.map(([name, phaseWards]) => [
      name,
      {
        amount: phaseWards.length,
        dewarded: phaseWards.filter((ward) => ward.is_destroyed).length,
      },
    ]),
    placedTimeline: wardTimeline(wards),
    dewardedTimeline: wardTimeline(wards, true),
    missingPlayer: wards.filter((ward) => ward.player_placed_id === null).length,
    missingSide: wards.filter((ward) => ward.is_radiant === null).length,
  };
}
