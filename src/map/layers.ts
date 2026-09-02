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
const wardDetailStyles = {
  dewarded: wardPointStyle("#fb7185", false),
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
      const wardData = feature.get("wardData") as WardFeatureData | undefined;
      const destroyed = Boolean(wardData?.ward.is_destroyed);
      const sentry = wardData?.ward.is_obs === false;

      return sentry
        ? selected
          ? wardDetailStyles.selectedSentry
          : wardDetailStyles.sentry
        : selected
          ? destroyed
            ? wardDetailStyles.selectedDewarded
            : wardDetailStyles.selectedSurvived
          : destroyed
            ? wardDetailStyles.dewarded
            : wardDetailStyles.survived;
    },
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
];

export const mapLayers = [layers.tiles, ...overlayLayers];

export default layers;
