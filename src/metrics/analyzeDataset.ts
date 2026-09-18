import type { Ward } from "../types";
import { percentile, wardTimeline } from "./wardMetrics";

export interface DatasetAnalysis {
  matches: number;
  observerCount: number;
  playerCount: number;
  placedTimeline: number[];
  removedTimeline: number[];
  missingPlayer: number;
  missingSide: number;
  measurement: MeasurementSummary;
}

export interface DistributionSummary {
  count: number;
  median: number | null;
  lowerQuartile: number | null;
  upperQuartile: number | null;
}

export interface DewardSummary {
  seconds: number;
  rate: number | null;
}

export interface MeasurementSummary {
  measuredWards: number;
  outcomeWards: number;
  addedVision: DistributionSummary;
  freshSightings: DistributionSummary;
  lifetime: DistributionSummary;
  timeToDeward: DistributionSummary;
  dewardedWithin: DewardSummary[];
  outcomes: Record<NonNullable<Ward["measurement"]>["outcome"], number>;
}

function distribution(values: number[]): DistributionSummary {
  return {
    count: values.length,
    median: percentile(values, 0.5),
    lowerQuartile: percentile(values, 0.25),
    upperQuartile: percentile(values, 0.75),
  };
}

export function measurementSummary(wards: Ward[]): MeasurementSummary {
  const measured = wards.filter((ward) => ward.is_obs && ward.measurement !== null);
  const measurements = measured.map((ward) => ward.measurement!);
  const lifecycle = measured.map((ward) => ward.measurement!);
  const dewarded = lifecycle.filter((measurement) => measurement.outcome === "dewarded");
  const outcomes: MeasurementSummary["outcomes"] = {
    dewarded: 0,
    expired: 0,
    allied_removed: 0,
    match_ended: 0,
    replay_ended: 0,
    unknown: 0,
  };

  for (const measurement of lifecycle) {
    outcomes[measurement.outcome] += 1;
  }

  return {
    measuredWards: measured.length,
    outcomeWards: lifecycle.length,
    addedVision: distribution(measurements.flatMap((item) => item.added_vision_seconds ?? [])),
    freshSightings: distribution(measurements.flatMap((item) => item.fresh_sightings ?? [])),
    lifetime: distribution(lifecycle.map((item) => item.ended_at_seconds - item.placed_at_seconds)),
    timeToDeward: distribution(
      dewarded.map((item) => item.ended_at_seconds - item.placed_at_seconds),
    ),
    dewardedWithin: [60, 120, 180, 240, 300, 360].map((seconds) => ({
      seconds,
      rate: lifecycle.length
        ? dewarded.filter((item) => item.ended_at_seconds - item.placed_at_seconds <= seconds)
            .length / lifecycle.length
        : null,
    })),
    outcomes,
  };
}

export function analyzeDataset(wards: Ward[]): DatasetAnalysis {
  const observers = wards.filter((ward) => ward.is_obs);
  const matchCounts = new Map<number, number>();

  for (const ward of observers) {
    matchCounts.set(ward.match_id, (matchCounts.get(ward.match_id) ?? 0) + 1);
  }

  return {
    matches: matchCounts.size,
    observerCount: observers.length,
    playerCount: new Set(
      observers.flatMap((ward) => (ward.player_placed_id === null ? [] : [ward.player_placed_id])),
    ).size,
    placedTimeline: wardTimeline(observers),
    removedTimeline: wardTimeline(observers, true),
    missingPlayer: observers.filter((ward) => ward.player_placed_id === null).length,
    missingSide: observers.filter((ward) => ward.is_radiant === null).length,
    measurement: measurementSummary(observers),
  };
}
