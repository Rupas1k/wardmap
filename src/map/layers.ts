import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource, XYZ } from "ol/source";
import { Circle, Fill, Stroke, Style, Text } from "ol/style";
import { pixelProjection } from "./projections";
import mainStyle from "./styles";
import { useMapStore } from "../state/mapState";

function wardPointStyle(color: string, emphasized: boolean, radius: number): Style {
  return new Style({
    image: new Circle({
      radius: emphasized ? radius + 1 : radius,
      fill: new Fill({ color }),
      stroke: new Stroke({ color: "#020617", width: 2 }),
    }),
    zIndex: emphasized ? 21 : 10,
  });
}

type WardHalo = "selected" | "hovered" | "multiSelected";

const wardHaloStyles = new Map<string, Style>();

function wardHaloStyle(radius: number, kind: WardHalo): Style {
  const key = `${radius}:${kind}`;
  const cached = wardHaloStyles.get(key);

  if (cached) {
    return cached;
  }

  const selected = kind === "selected";
  const multiSelected = kind === "multiSelected";
  const style = new Style({
    image: new Circle({
      radius: radius + 5,
      fill: new Fill({
        color: selected
          ? "rgba(250, 204, 21, 0.18)"
          : multiSelected
            ? "rgba(34, 211, 238, 0.16)"
            : "rgba(34, 211, 238, 0.12)",
      }),
      stroke: new Stroke({
        color: selected
          ? "#fde047"
          : multiSelected
            ? "rgba(103, 232, 249, 1)"
            : "rgba(103, 232, 249, 0.95)",
        width: selected || multiSelected ? 2.5 : 2,
      }),
    }),
    zIndex: selected ? 20 : multiSelected ? 19 : 18,
  });

  wardHaloStyles.set(key, style);

  return style;
}

const sightingStyle = [
  new Style({
    image: new Circle({
      radius: 10,
      fill: new Fill({ color: "rgba(250, 204, 21, 0.16)" }),
      stroke: new Stroke({ color: "rgba(253, 224, 71, 0.65)", width: 1.5 }),
    }),
    zIndex: 30,
  }),
  new Style({
    image: new Circle({
      radius: 4,
      fill: new Fill({ color: "#fde047" }),
      stroke: new Stroke({ color: "#020617", width: 1.5 }),
    }),
    zIndex: 31,
  }),
];
const sightingRouteStyle = new Style({
  stroke: new Stroke({ color: "rgba(253, 224, 71, 0.8)", width: 2 }),
  zIndex: 29,
});
const hiddenLocationStyle = [
  new Style({
    image: new Circle({
      radius: 12,
      fill: new Fill({ color: "rgba(34, 211, 238, 0.1)" }),
      stroke: new Stroke({ color: "rgba(103, 232, 249, 0.9)", width: 2, lineDash: [4, 3] }),
    }),
    zIndex: 32,
  }),
  new Style({
    image: new Circle({
      radius: 3.5,
      fill: new Fill({ color: "#67e8f9" }),
      stroke: new Stroke({ color: "#020617", width: 1.5 }),
    }),
    zIndex: 33,
  }),
];
const sentryCoverageStyle = new Style({
  fill: new Fill({ color: "rgba(56, 189, 248, 0.06)" }),
  stroke: new Stroke({ color: "rgba(125, 211, 252, 0.3)", width: 1 }),
  zIndex: 30,
});
const selectedSentryCoverageStyle = new Style({
  fill: new Fill({ color: "rgba(56, 189, 248, 0.1)" }),
  stroke: new Stroke({ color: "rgba(165, 243, 252, 0.85)", width: 1.75 }),
  zIndex: 32,
});

function sentryPlacementStyle(rank: number, selected: boolean): Style {
  return new Style({
    image: new Circle({
      radius: selected ? 11 : 9,
      fill: new Fill({ color: selected ? "#0891b2" : "#155e75" }),
      stroke: new Stroke({
        color: selected ? "#ecfeff" : "#a5f3fc",
        width: selected ? 2.5 : 1.5,
      }),
    }),
    text: new Text({
      text: String(rank),
      fill: new Fill({ color: "#ecfeff" }),
      font: "600 10px ui-sans-serif",
    }),
    zIndex: selected ? 34 : 31,
  });
}

const wardStyleCache = new Map<string, Style>();

function coloredWardStyle(color: string, emphasized: boolean, radius: number): Style {
  const key = `${color}:${emphasized}:${radius}`;
  const cached = wardStyleCache.get(key);

  if (cached) {
    return cached;
  }

  const style = wardPointStyle(color, emphasized, radius);

  wardStyleCache.set(key, style);

  return style;
}

const layers = {
  tiles: new TileLayer({
    source: new XYZ({ projection: pixelProjection, wrapX: false }),
  }),
  elevations: new VectorLayer({
    source: new VectorSource(),
    style: new Style({
      fill: new Fill({ color: "rgba(56, 189, 248, 0.22)" }),
      stroke: new Stroke({ color: "rgba(125, 211, 252, 0.45)", width: 0.75 }),
    }),
  }),
  wards: new VectorLayer({
    source: new VectorSource(),
    style: (feature) => mainStyle(feature, "all", useMapStore.getState().clusterMarkerSize),
  }),
  wardDetails: new VectorLayer({
    source: new VectorSource(),
    style: (feature) => {
      const selected = Boolean(feature.get("selected"));
      const hovered = Boolean(feature.get("hovered"));
      const multiSelected = Boolean(feature.get("multiSelected"));
      const color = (feature.get("color") as string | undefined) ?? "#64748b";
      const emphasized = selected || hovered || multiSelected;
      const radius = useMapStore.getState().clusterMarkerSize.minimum;
      const marker = coloredWardStyle(color, emphasized, radius);

      if (selected) {
        return [wardHaloStyle(radius, "selected"), marker];
      }
      if (multiSelected) {
        return [wardHaloStyle(radius, "multiSelected"), marker];
      }
      if (hovered) {
        return [wardHaloStyle(radius, "hovered"), marker];
      }

      return marker;
    },
  }),
  sentryPlan: new VectorLayer({
    source: new VectorSource(),
    style: (feature) => {
      const selected = Boolean(feature.get("selected"));

      return feature.get("coverage")
        ? selected
          ? selectedSentryCoverageStyle
          : sentryCoverageStyle
        : sentryPlacementStyle(Number(feature.get("rank")), selected);
    },
  }),
  sightings: new VectorLayer({
    source: new VectorSource(),
    style: (feature) => (feature.get("route") ? sightingRouteStyle : sightingStyle),
  }),
  hiddenLocationPreview: new VectorLayer({
    source: new VectorSource(),
    style: hiddenLocationStyle,
  }),
  trees: new VectorLayer({
    source: new VectorSource(),
    style: new Style({
      fill: new Fill({ color: "rgba(74, 222, 128, 0.28)" }),
      stroke: new Stroke({ color: "rgba(134, 239, 172, 0.55)", width: 0.75 }),
    }),
  }),
  vision: new VectorLayer({ source: new VectorSource(), style: (feature) => mainStyle(feature) }),
};

export const overlayLayers = [
  layers.elevations,
  layers.vision,
  layers.wards,
  layers.wardDetails,
  layers.sentryPlan,
  layers.trees,
  layers.sightings,
  layers.hiddenLocationPreview,
];

export const mapLayers = [layers.tiles, ...overlayLayers];

export default layers;
