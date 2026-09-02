import Map from "ol/Map";
import View from "ol/View";
import { defaults } from "ol/control/defaults";
import { mapLayers } from "./layers";
import { mapCenter, mapExtent, maxZoom, minZoom } from "./constants";
import { pixelProjection } from "./projections";

export function createMap(target: HTMLElement): Map {
  return new Map({
    layers: mapLayers,
    target,
    view: new View({
      projection: pixelProjection,
      center: mapCenter,
      extent: mapExtent,
      zoom: minZoom,
      minZoom,
      maxZoom,
      enableRotation: false,
    }),
    controls: defaults({ zoom: false, rotate: false }),
  });
}
