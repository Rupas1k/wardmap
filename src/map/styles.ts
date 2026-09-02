import type { FeatureLike } from "ol/Feature";
import { Circle, Fill, Stroke, Style } from "ol/style";
import type { ClusterFeatureData } from "./features";
import type { Side } from "../types";
import { defaultClusterMarkerSize } from "../state/mapState";
import type { ClusterMarkerSize } from "../state/mapState";
import { survivalColor } from "../colors";

const defaultFill = new Fill({ color: "rgba(255,255,255, 0.5)" });
const defaultStroke = new Stroke({ color: "#3399CC", width: 1.25 });
const defaultStyle = new Style({
  image: new Circle({ fill: defaultFill, stroke: defaultStroke, radius: 5 }),
  fill: defaultFill,
  stroke: defaultStroke,
});

function featureData(feature: FeatureLike): ClusterFeatureData | null {
  return (feature.get("data") as ClusterFeatureData | undefined) ?? null;
}

function pointColor(feature: FeatureLike, side: Side): string {
  const cluster = featureData(feature)?.cluster;
  const sideData = cluster?.[side];

  if (!sideData || sideData.amount === 0) {
    return "#64748b";
  }
  if (cluster.wards?.length && cluster.wards.every((ward) => !ward.is_obs)) {
    return "#38bdf8";
  }

  return survivalColor(sideData.destroyed, sideData.amount);
}

function pointRadius(feature: FeatureLike, side: Side, markerSize: ClusterMarkerSize): number {
  const amount = featureData(feature)?.cluster[side]?.amount;

  if (amount === undefined) {
    return markerSize.minimum;
  }

  const radius = 3.25 + Math.sqrt(amount) * 0.5;

  return Math.min(Math.max(radius, markerSize.minimum), markerSize.maximum);
}

function colorWithAlpha(color: string, alpha: number): string {
  if (!/^#[\da-f]{6}$/i.test(color)) {
    return color;
  }

  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export default function mainStyle(
  feature: FeatureLike,
  side: Side = "all",
  markerSize: ClusterMarkerSize = defaultClusterMarkerSize,
): Style | Style[] | undefined {
  if (feature.get("visionFill")) {
    return new Style({
      fill: new Fill({
        color: feature.get("sentryVision") ? "rgba(56, 189, 248, 0.32)" : [188, 156, 60, 0.5],
      }),
    });
  }
  if (feature.get("visionBorder")) {
    return new Style({
      stroke: new Stroke({
        color: feature.get("sentryVision") ? "rgba(125, 211, 252, 0.95)" : [255, 255, 170],
        width: 1.25,
      }),
    });
  }

  const geometryType = feature.getGeometry()?.getType();

  if (geometryType === "Point") {
    if (feature.get("hidden")) {
      return [];
    }

    const cluster = featureData(feature)?.cluster;
    const sideData = cluster?.[side];
    const unclustered = cluster?.unclustered === true;
    const selected = Boolean(feature.get("selected"));
    const dimmed = Boolean(feature.get("dimmed"));
    const radius = unclustered ? 3.5 : sideData ? pointRadius(feature, side, markerSize) : 4;
    const color = sideData ? pointColor(feature, side) : "#808080";
    const marker = new Style({
      image: new Circle({
        radius,
        fill: new Fill({ color: dimmed ? colorWithAlpha(color, 0.24) : color }),
        stroke: new Stroke({
          width: selected ? 2 : unclustered ? 1 : 1.5,
          color: dimmed ? "rgba(2, 6, 23, 0.45)" : "#020617",
        }),
      }),
      zIndex: selected ? 21 : dimmed ? 5 : 10,
    });

    if (!selected) {
      return marker;
    }

    const halo = new Style({
      image: new Circle({
        radius: radius + 4,
        fill: new Fill({ color: "rgba(14, 165, 233, 0.12)" }),
        stroke: new Stroke({ color: "rgba(224, 242, 254, 0.95)", width: 2.25 }),
      }),
      zIndex: 20,
    });

    return [halo, marker];
  }
  if (geometryType === "Polygon" || geometryType === "MultiPolygon") {
    const sentryVision = Boolean(feature.get("sentryVision"));

    return new Style({
      fill: new Fill({
        color: sentryVision ? "rgba(56, 189, 248, 0.32)" : [188, 156, 60, 0.5],
      }),
      stroke: new Stroke({ color: sentryVision ? "rgba(125, 211, 252, 0.95)" : [255, 255, 170] }),
    });
  }

  return defaultStyle;
}
