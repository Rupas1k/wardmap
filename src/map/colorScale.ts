import { formatGameTime, mean, percentile } from "../metrics/wardMetrics";
import type { MapColorMode, MapColorStatistic } from "../state/mapState";
import type { ClusterWard } from "../types";

const missingColor = "#64748b";
const metricColors = ["#6366f1", "#3b82f6", "#06b6d4", "#2dd4bf", "#facc15"];
const riskColors = ["#2dd4bf", "#67e8f9", "#facc15", "#fb923c", "#fb7185"];

export interface MapColorLegendEntry {
  color: string;
  label: string;
}

export interface MapColorScale {
  mode: MapColorMode;
  label: string;
  description: string | null;
  entries: MapColorLegendEntry[];
  hasMissing: boolean;
  colorForWards: (wards: readonly ClusterWard[]) => string;
  colorForWard: (ward: ClusterWard) => string;
}

export function buildMapColorScale(
  wardGroups: readonly (readonly ClusterWard[])[],
  mode: MapColorMode,
  statistic: MapColorStatistic,
): MapColorScale {
  if (mode === "single") {
    return categoricalScale(
      mode,
      "Single color",
      [{ color: "#e2e8f0", label: "Locations" }],
      () => "#e2e8f0",
    );
  }

  if (mode === "ward-type") {
    return categoricalScale(
      mode,
      "Ward type",
      [
        { color: "#facc15", label: "Observer" },
        { color: "#38bdf8", label: "Sentry" },
        { color: "#a78bfa", label: "Mixed" },
      ],
      wardTypeColor,
    );
  }

  if (mode === "placement") {
    const entries = [
      { color: "#818cf8", label: "Pregame" },
      { color: "#60a5fa", label: "0–10" },
      { color: "#22d3ee", label: "10–20" },
      { color: "#2dd4bf", label: "20–35" },
      { color: "#facc15", label: "35–50" },
      { color: "#fb923c", label: "50+" },
    ];
    const color = (wards: readonly ClusterWard[]) => {
      const value = aggregate(
        wards.map((ward) => ward.time_placed),
        statistic,
      );

      return value === null ? missingColor : placementColor(value, entries);
    };

    return {
      mode,
      label: "Placement time",
      description: statisticLabel(statistic),
      entries,
      hasMissing: false,
      colorForWards: color,
      colorForWard: (ward) => placementColor(ward.time_placed, entries),
    };
  }

  const values = wardGroups.flatMap((wards) => {
    const value = metricValue(wards, mode, statistic);

    return value === null ? [] : [value];
  });
  const minimum = percentile(values, 0.1);
  const maximum = percentile(values, 0.9);
  const palette = mode === "deward-rate" ? riskColors : metricColors;
  const label = metricLabel(mode);
  const formatter =
    mode === "enemy-sightings"
      ? formatNumber
      : mode === "deward-rate"
        ? formatPercent
        : formatGameTime;
  const entries = palette.map((color, index) => ({
    color,
    label:
      minimum === null || maximum === null
        ? "--"
        : formatter(minimum + ((maximum - minimum) * index) / (palette.length - 1)),
  }));
  const hasMissing = wardGroups.some(
    (wards) =>
      metricValue(wards, mode, statistic) === null ||
      wards.some((ward) => wardMetricValue(ward, mode) === null),
  );
  const colorValue = (value: number | null) =>
    value === null ? missingColor : scaleColor(value, minimum, maximum, palette);

  return {
    mode,
    label,
    description: mode === "deward-rate" ? null : statisticLabel(statistic),
    entries,
    hasMissing,
    colorForWards: (wards) => colorValue(metricValue(wards, mode, statistic)),
    colorForWard: (ward) => colorValue(wardMetricValue(ward, mode)),
  };
}

function categoricalScale(
  mode: MapColorMode,
  label: string,
  entries: MapColorLegendEntry[],
  colorForWards: (wards: readonly ClusterWard[]) => string,
): MapColorScale {
  return {
    mode,
    label,
    description: null,
    hasMissing: false,
    entries,
    colorForWards,
    colorForWard: (ward) => colorForWards([ward]),
  };
}

function metricValue(
  wards: readonly ClusterWard[],
  mode: Exclude<MapColorMode, "single" | "ward-type" | "placement">,
  statistic: MapColorStatistic,
): number | null {
  if (mode === "deward-rate") {
    const observers = wards.filter((ward) => ward.is_obs);

    return observers.length
      ? observers.filter((ward) => ward.measurement.outcome === "dewarded").length /
          observers.length
      : null;
  }

  const values = wards.flatMap((ward) => {
    const value = wardMetricValue(ward, mode);

    return value === null ? [] : [value];
  });

  return aggregate(values, statistic);
}

function wardMetricValue(
  ward: ClusterWard,
  mode: Exclude<MapColorMode, "single" | "ward-type" | "placement">,
): number | null {
  if (!ward.is_obs) {
    return null;
  }

  if (mode === "deward-rate") {
    return ward.measurement.outcome === "dewarded" ? 1 : 0;
  }
  if (mode === "added-vision") {
    return ward.measurement.added_vision_seconds;
  }
  if (mode === "enemy-sightings") {
    return ward.measurement.fresh_sightings;
  }

  return ward.measurement.ended_at_seconds - ward.measurement.placed_at_seconds;
}

function aggregate(values: readonly number[], statistic: MapColorStatistic): number | null {
  return statistic === "mean" ? mean(values) : percentile(values, 0.5);
}

function scaleColor(
  value: number,
  minimum: number | null,
  maximum: number | null,
  palette: readonly string[],
): string {
  if (minimum === null || maximum === null) {
    return missingColor;
  }
  if (minimum === maximum) {
    return palette[Math.floor(palette.length / 2)]!;
  }

  const ratio = Math.min(1, Math.max(0, (value - minimum) / (maximum - minimum)));
  const index = Math.min(palette.length - 1, Math.floor(ratio * palette.length));

  return palette[index]!;
}

function wardTypeColor(wards: readonly ClusterWard[]): string {
  if (wards.length === 0) {
    return missingColor;
  }

  const observers = wards.filter((ward) => ward.is_obs).length;

  return observers === wards.length ? "#facc15" : observers === 0 ? "#38bdf8" : "#a78bfa";
}

function placementColor(seconds: number, entries: readonly MapColorLegendEntry[]): string {
  const index =
    seconds < 0
      ? 0
      : seconds < 10 * 60
        ? 1
        : seconds < 20 * 60
          ? 2
          : seconds < 35 * 60
            ? 3
            : seconds < 50 * 60
              ? 4
              : 5;

  return entries[index]!.color;
}

function metricLabel(mode: MapColorMode): string {
  switch (mode) {
    case "deward-rate":
      return "Deward rate";
    case "added-vision":
      return "Added vision";
    case "enemy-sightings":
      return "New enemy sightings";
    case "lifetime":
      return "Ward lifetime";
    default:
      return "Placement time";
  }
}

function statisticLabel(statistic: MapColorStatistic): string {
  return statistic === "mean" ? "Mean" : "Median";
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatNumber(value: number): string {
  return value.toFixed(1);
}
