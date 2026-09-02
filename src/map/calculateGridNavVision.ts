import Feature from "ol/Feature";
import type Geometry from "ol/geom/Geometry";
import MultiLineString from "ol/geom/MultiLineString";
import MultiPolygon from "ol/geom/MultiPolygon";
import { gridOrigin, gridSize, mapSize, observerRadius } from "./constants";
import { pixelProjection, unitProjection } from "./projections";
import { cellBlocksVision } from "./visionOcclusion";

function hasLineOfSight(
  elevations: number[][],
  originColumn: number,
  originRow: number,
  targetColumn: number,
  targetRow: number,
  eyeHeight: number,
): boolean {
  const deltaColumn = targetColumn - originColumn;
  const deltaRow = targetRow - originRow;
  const columnSteps = Math.abs(deltaColumn);
  const rowSteps = Math.abs(deltaRow);
  const columnDirection = Math.sign(deltaColumn);
  const rowDirection = Math.sign(deltaRow);
  let column = originColumn;
  let row = originRow;
  let completedColumns = 0;
  let completedRows = 0;

  function cellIsClear(candidateColumn: number, candidateRow: number): boolean {
    const value = elevations[candidateRow]?.[candidateColumn];

    return value !== undefined && !cellBlocksVision(value, eyeHeight);
  }

  while (completedColumns < columnSteps || completedRows < rowSteps) {
    const decision = (1 + 2 * completedColumns) * rowSteps - (1 + 2 * completedRows) * columnSteps;

    if (decision === 0) {
      // The ray crosses a cell corner. Both side-adjacent cells are touched and
      // must participate in occlusion, otherwise vision leaks diagonally through trees.
      if (!cellIsClear(column + columnDirection, row) || !cellIsClear(column, row + rowDirection)) {
        return false;
      }
      column += columnDirection;
      row += rowDirection;
      completedColumns += 1;
      completedRows += 1;
    } else if (decision < 0) {
      column += columnDirection;
      completedColumns += 1;
    } else {
      row += rowDirection;
      completedRows += 1;
    }

    if (!cellIsClear(column, row)) {
      return false;
    }
  }

  return true;
}

/**
 * Approximates Source 2 Fog of War on the map's 64-unit gridnav cells.
 * Blocking cells remain visible, but stop visibility from continuing behind them.
 */
export function calculateGridNavVision(
  elevations: number[][],
  x: number,
  y: number,
  z: number,
  radius = observerRadius,
  ignoreElevation = false,
): Feature<Geometry>[] {
  const localGridOriginX = gridOrigin.x - mapSize.units.x0;
  const localGridOriginY = gridOrigin.y - mapSize.units.y0;
  const originColumn = Math.round((x - localGridOriginX) / gridSize);
  const originRow = Math.round((y - localGridOriginY) / gridSize);
  // Fog of war is resolved per gridnav cell. Use the cell center for the
  // radius test as well as line-of-sight, so moving within a cell cannot add
  // or remove cells at the edge of the ward's vision.
  const originCenterX = localGridOriginX + originColumn * gridSize;
  const originCenterY = localGridOriginY + originRow * gridSize;
  const cellRadius = Math.ceil(radius / gridSize);
  const eyeHeight = z * 128;
  const polygons: number[][][][] = [];
  const perimeterEdges = new Map<string, [[number, number], [number, number]]>();

  function toggleEdge(start: [number, number], end: [number, number]) {
    const first = `${start[0]},${start[1]}`;
    const second = `${end[0]},${end[1]}`;
    const key = first < second ? `${first}|${second}` : `${second}|${first}`;

    if (perimeterEdges.has(key)) {
      perimeterEdges.delete(key);
    } else {
      perimeterEdges.set(key, [start, end]);
    }
  }

  for (let row = originRow - cellRadius; row <= originRow + cellRadius; row += 1) {
    for (let column = originColumn - cellRadius; column <= originColumn + cellRadius; column += 1) {
      if (elevations[row]?.[column] === undefined) {
        continue;
      }

      const centerX = localGridOriginX + column * gridSize;
      const centerY = localGridOriginY + row * gridSize;

      if (Math.hypot(centerX - originCenterX, centerY - originCenterY) > radius) {
        continue;
      }
      if (
        !ignoreElevation &&
        !hasLineOfSight(elevations, originColumn, originRow, column, row, eyeHeight)
      ) {
        continue;
      }

      const left = gridOrigin.x + (column - 0.5) * gridSize;
      const right = left + gridSize;
      const bottom = gridOrigin.y + (row - 0.5) * gridSize;
      const top = bottom + gridSize;
      toggleEdge([left, bottom], [right, bottom]);
      toggleEdge([right, bottom], [right, top]);
      toggleEdge([right, top], [left, top]);
      toggleEdge([left, top], [left, bottom]);
      polygons.push([
        [
          [left, bottom],
          [right, bottom],
          [right, top],
          [left, top],
          [left, bottom],
        ],
      ]);
    }
  }

  return [
    new Feature({
      geometry: new MultiPolygon(polygons).transform(unitProjection, pixelProjection),
      visionFill: true,
      sentryVision: ignoreElevation,
    }),
    new Feature({
      geometry: new MultiLineString([...perimeterEdges.values()]).transform(
        unitProjection,
        pixelProjection,
      ),
      visionBorder: true,
      sentryVision: ignoreElevation,
    }),
  ];
}
