import Feature from "ol/Feature";
import { Circle, Polygon } from "ol/geom";
import { fromCircle } from "ol/geom/Polygon";
import intersect from "@turf/intersect";
import { featureCollection, polygon } from "@turf/helpers";
import { compute, convertToSegments } from "visibility-polygon";
import { gridOrigin, gridSize, mapSize, observerRadius } from "./constants";
import { pixelProjection, unitProjection } from "./projections";
import { cellBlocksVision } from "./visionOcclusion";

type Coordinate = [number, number];

function getGridCellCenter(x: number, y: number): Coordinate {
  const localGridOriginX = gridOrigin.x - mapSize.units.x0;
  const localGridOriginY = gridOrigin.y - mapSize.units.y0;
  const column = Math.round((x - localGridOriginX) / gridSize);
  const row = Math.round((y - localGridOriginY) / gridSize);

  return [localGridOriginX + column * gridSize, localGridOriginY + row * gridSize];
}

function calculateVisibilityPolygon(
  elevations: number[][],
  x: number,
  y: number,
  z: number,
  radius: number,
  ignoreElevation: boolean,
): Coordinate[] {
  const localGridOriginX = gridOrigin.x - mapSize.units.x0;
  const localGridOriginY = gridOrigin.y - mapSize.units.y0;
  const polygons: Coordinate[][] = [
    [
      [x - radius, y + radius],
      [x + radius, y + radius],
      [x - radius, y - radius],
      [x + radius, y - radius],
    ],
  ];
  const x0 = Math.round((x - radius - localGridOriginX) / gridSize);
  const y0 = Math.round((y - radius - localGridOriginY) / gridSize);
  const currentX = Math.round((x - localGridOriginX) / gridSize);
  const currentY = Math.round((y - localGridOriginY) / gridSize);
  const currentCell = elevations[currentY]?.[currentX] ?? 0;

  for (let row = y0; row < y0 + Math.floor((2 * radius) / gridSize) + 1; row += 1) {
    for (let column = x0; column < x0 + Math.floor((2 * radius) / gridSize) + 1; column += 1) {
      const elevation = elevations[row]?.[column];

      if (elevation === undefined) {
        continue;
      }
      if (
        (currentCell & 1) !== 0 &&
        Math.abs(currentX - column) < 2 &&
        Math.abs(currentY - row) < 2
      ) {
        continue;
      }

      if (!ignoreElevation && cellBlocksVision(elevation, z * 128)) {
        const left = localGridOriginX + (column - 0.5) * gridSize;
        const right = left + gridSize;
        const bottom = localGridOriginY + (row - 0.5) * gridSize;
        const top = bottom + gridSize;

        polygons.push([
          [left, top],
          [right, top],
          [right, bottom],
          [left, bottom],
        ]);
      }
    }
  }

  const computed = compute([x, y], convertToSegments(polygons)) as Coordinate[];
  const first = computed[0];

  if (first) {
    computed.push(first);
  }

  return computed.map(([coordinateX, coordinateY]) => [
    coordinateX + mapSize.units.x0,
    coordinateY + mapSize.units.y0,
  ]);
}

export default function calculateVision(
  elevations: number[][],
  x: number,
  y: number,
  z: number,
  radius = observerRadius,
  ignoreElevation = false,
): Feature<Polygon> {
  const [originX, originY] = getGridCellCenter(x, y);
  const visibilityCoordinates = calculateVisibilityPolygon(
    elevations,
    originX,
    originY,
    z,
    radius,
    ignoreElevation,
  );
  const circleGeometry = fromCircle(
    new Circle([originX + mapSize.units.x0, originY + mapSize.units.y0], radius),
    128,
  );
  const visibilityPolygon = polygon([visibilityCoordinates]);
  const circlePolygon = polygon(circleGeometry.getCoordinates());
  const intersection = intersect(featureCollection([visibilityPolygon, circlePolygon]));
  const coordinates =
    intersection?.geometry.type === "Polygon"
      ? intersection.geometry.coordinates
      : [visibilityCoordinates];

  return new Feature({
    geometry: new Polygon(coordinates).transform(unitProjection, pixelProjection),
    sentryVision: ignoreElevation,
  });
}
