import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource, XYZ } from "ol/source";
import { Circle, Fill, Stroke, Style } from "ol/style";
import type { WardFeatureData } from "./features";
import { pixelProjection } from "./projections";
import mainStyle from "./styles";
import { useMapStore } from "../state/mapState";

function wardPointStyle(color: string, selected: boolean): Style {
  return new Style({
    image: new Circle({
      radius: selected ? 6.5 : 5.5,
      fill: new Fill({ color }),
      stroke: new Stroke({ color: "#020617", width: 2 }),
    }),
    zIndex: selected ? 21 : 10,
  });
}

const selectedWardHalo = new Style({
  image: new Circle({
    radius: 10,
    fill: new Fill({ color: "rgba(250, 204, 21, 0.18)" }),
    stroke: new Stroke({ color: "#fde047", width: 2.5 }),
  }),
  zIndex: 20,
});
const hoveredWardHalo = new Style({
  image: new Circle({
    radius: 9,
    fill: new Fill({ color: "rgba(34, 211, 238, 0.12)" }),
    stroke: new Stroke({ color: "rgba(103, 232, 249, 0.95)", width: 2 }),
  }),
  zIndex: 18,
});
const multiSelectedWardHalo = new Style({
  image: new Circle({
    radius: 10,
    fill: new Fill({ color: "rgba(34, 211, 238, 0.16)" }),
    stroke: new Stroke({ color: "rgba(103, 232, 249, 1)", width: 2.5 }),
  }),
  zIndex: 19,
});
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
const wardDetailStyles = {
  dewarded: wardPointStyle("#fb7185", false),
  hoveredDewarded: [hoveredWardHalo, wardPointStyle("#fb7185", true)],
  hoveredSentry: [hoveredWardHalo, wardPointStyle("#38bdf8", true)],
  hoveredSurvived: [hoveredWardHalo, wardPointStyle("#34d399", true)],
  multiSelectedDewarded: [multiSelectedWardHalo, wardPointStyle("#fb7185", true)],
  multiSelectedSentry: [multiSelectedWardHalo, wardPointStyle("#38bdf8", true)],
  multiSelectedSurvived: [multiSelectedWardHalo, wardPointStyle("#34d399", true)],
  sentry: wardPointStyle("#38bdf8", false),
  selectedDewarded: [selectedWardHalo, wardPointStyle("#fb7185", true)],
  selectedSentry: [selectedWardHalo, wardPointStyle("#38bdf8", true)],
  selectedSurvived: [selectedWardHalo, wardPointStyle("#34d399", true)],
  survived: wardPointStyle("#34d399", false),
};

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
      const wardData = feature.get("wardData") as WardFeatureData | undefined;
      const destroyed = Boolean(wardData?.ward.is_destroyed);
      const sentry = wardData?.ward.is_obs === false;

      return sentry
        ? selected
          ? wardDetailStyles.selectedSentry
          : multiSelected
            ? wardDetailStyles.multiSelectedSentry
            : hovered
              ? wardDetailStyles.hoveredSentry
              : wardDetailStyles.sentry
        : selected
          ? destroyed
            ? wardDetailStyles.selectedDewarded
            : wardDetailStyles.selectedSurvived
          : multiSelected
            ? destroyed
              ? wardDetailStyles.multiSelectedDewarded
              : wardDetailStyles.multiSelectedSurvived
            : hovered
              ? destroyed
                ? wardDetailStyles.hoveredDewarded
                : wardDetailStyles.hoveredSurvived
              : destroyed
                ? wardDetailStyles.dewarded
                : wardDetailStyles.survived;
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
  layers.trees,
  layers.sightings,
  layers.hiddenLocationPreview,
];

export const mapLayers = [layers.tiles, ...overlayLayers];

export default layers;
