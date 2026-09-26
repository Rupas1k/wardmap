import Feature from "ol/Feature";
import Polygon from "ol/geom/Polygon";
import type { Coordinate } from "ol/coordinate";
import { gridOrigin, gridSize } from "../map/constants";
import { pixelToUnit, unitToPixel } from "../map/projections";
import type { ElevationGrid } from "./elevationFile";

export type GridCell = {
  row: number;
  column: number;
  index: number;
};

export function cellAt(grid: ElevationGrid, coordinate: Coordinate): GridCell | null {
  const [x = 0, y = 0] = pixelToUnit(coordinate);
  const column = Math.round((x - gridOrigin.x) / gridSize);
  const row = Math.round((y - gridOrigin.y) / gridSize);

  if (row < 0 || column < 0 || row >= grid.rows || column >= grid.columns) {
    return null;
  }

  return { row, column, index: row * grid.columns + column };
}

export function cellFromIndex(grid: ElevationGrid, index: number): GridCell {
  return {
    row: Math.floor(index / grid.columns),
    column: index % grid.columns,
    index,
  };
}

export function cellFeature(cell: GridCell): Feature<Polygon> {
  const x = gridOrigin.x + cell.column * gridSize;
  const y = gridOrigin.y + cell.row * gridSize;
  const half = gridSize / 2;
  const ring = [
    [x - half, y - half],
    [x + half, y - half],
    [x + half, y + half],
    [x - half, y + half],
    [x - half, y - half],
  ].map(unitToPixel);
  const feature = new Feature(new Polygon([ring]));
  feature.setId(cell.index);

  return feature;
}
