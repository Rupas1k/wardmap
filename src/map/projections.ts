import type { Coordinate } from "ol/coordinate";
import { addCoordinateTransforms, Projection } from "ol/proj";
import { mapSize } from "./constants";

export const pixelProjection = new Projection({
  code: "pixel",
  units: "pixels",
  extent: [0, 0, mapSize.pixels.x, mapSize.pixels.y],
});

export const unitProjection = new Projection({ code: "unit", units: "m" });

export function unitToPixel(coordinate: Coordinate): Coordinate {
  const [inputX = 0, inputY = 0] = coordinate;
  const x = ((inputX - mapSize.units.x0) / mapSize.units.x) * mapSize.pixels.x;
  const y = ((inputY - mapSize.units.y0) / mapSize.units.y) * mapSize.pixels.y;

  return [x, y];
}

export function pixelToUnit(coordinate: Coordinate): Coordinate {
  const [inputX = 0, inputY = 0] = coordinate;
  const x = (inputX / mapSize.pixels.x) * mapSize.units.x + mapSize.units.x0;
  const y = (inputY / mapSize.pixels.y) * mapSize.units.y + mapSize.units.y0;

  return [x, y];
}

addCoordinateTransforms(unitProjection, pixelProjection, unitToPixel, pixelToUnit);
