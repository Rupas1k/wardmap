import "ol/ol.css";
import OlMap from "ol/Map";
import View from "ol/View";
import { defaults } from "ol/control/defaults";
import DragPan from "ol/interaction/DragPan";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource, XYZ } from "ol/source";
import { Fill, Stroke, Style } from "ol/style";
import { assetUrl } from "../config";
import { mapCenter, mapExtent, maxZoom, minZoom } from "../map/constants";
import { pixelProjection } from "../map/projections";
import "../main.css";
import { applyBlockedCells, inferMapVersion, parseElevation, readElevation } from "./elevationFile";
import type { ElevationGrid } from "./elevationFile";
import { cellAt, cellFeature, cellFromIndex } from "./gridGeometry";
import { renderEditor } from "./view";
import type { EditMode } from "./view";
import "./style.css";

type Change = { index: number; selected: boolean };

const root = document.querySelector<HTMLDivElement>("#elevation-editor");

if (!root) {
  throw new Error("Elevation editor root is missing");
}

const elements = renderEditor(root);
const selectionSource = new VectorSource();
const hoverSource = new VectorSource();
const tileSource = new XYZ({ projection: pixelProjection, wrapX: false });
const map = new OlMap({
  target: elements.mapTarget,
  layers: [
    new TileLayer({ source: tileSource }),
    new VectorLayer({
      source: selectionSource,
      style: new Style({
        fill: new Fill({ color: "rgba(248,113,113,.42)" }),
        stroke: new Stroke({ color: "rgba(254,202,202,.9)", width: 1 }),
      }),
    }),
    new VectorLayer({
      source: hoverSource,
      style: new Style({
        fill: new Fill({ color: "rgba(34,211,238,.16)" }),
        stroke: new Stroke({ color: "#67e8f9", width: 1.5 }),
      }),
    }),
  ],
  view: new View({
    projection: pixelProjection,
    center: mapCenter,
    extent: mapExtent,
    zoom: 3,
    minZoom,
    maxZoom,
    enableRotation: false,
  }),
  controls: defaults({ rotate: false }),
});
const dragPan = map
  .getInteractions()
  .getArray()
  .find((interaction): interaction is DragPan => interaction instanceof DragPan);

let grid: ElevationGrid | null = null;
let mode: EditMode = "block";
let selected = new Set<number>();
let savedSelection = new Set<number>();
let history: Change[][] = [];
let activeStroke: Map<number, boolean> | null = null;

function selectionsMatch(left: Set<number>, right: Set<number>): boolean {
  return left.size === right.size && [...left].every((index) => right.has(index));
}

function hasUnsavedChanges(): boolean {
  return !selectionsMatch(selected, savedSelection);
}

function updateTiles(): void {
  tileSource.setUrl(assetUrl(`static/img/tiles/${elements.mapVersion.value}/{z}/{x}/{y}.png`));
}

function updateControls(): void {
  const dirty = hasUnsavedChanges();
  const count = selected.size.toLocaleString();

  elements.exportButton.disabled = !grid;
  elements.clearButton.disabled = !selected.size;
  elements.undoButton.disabled = !history.length;
  elements.saveState.hidden = !dirty;
  elements.selectionSummary.textContent = `${count} blocked ${selected.size === 1 ? "cell" : "cells"}`;
}

function renderSelection(): void {
  selectionSource.clear();

  if (grid) {
    const currentGrid = grid;
    selectionSource.addFeatures(
      [...selected].map((index) => cellFeature(cellFromIndex(currentGrid, index))),
    );
  }

  updateControls();
}

function setMode(nextMode: EditMode): void {
  mode = nextMode;
  dragPan?.setActive(mode === "pan");

  for (const button of elements.modeButtons) {
    button.classList.toggle("active", button.dataset.mode === mode);
  }
}

function applyCellAt(coordinate: number[]): void {
  if (!grid || mode === "pan") {
    return;
  }

  const cell = cellAt(grid, coordinate);

  if (!cell) {
    return;
  }

  const radius = (Number(elements.brushSize.value) - 1) / 2;

  for (let row = cell.row - radius; row <= cell.row + radius; row += 1) {
    for (let column = cell.column - radius; column <= cell.column + radius; column += 1) {
      if (row < 0 || column < 0 || row >= grid.rows || column >= grid.columns) {
        continue;
      }

      const index = row * grid.columns + column;
      const before = selected.has(index);
      const after = mode === "block";

      if (before === after) {
        continue;
      }

      if (!activeStroke?.has(index)) {
        activeStroke?.set(index, before);
      }

      if (after) {
        selected.add(index);
      } else {
        selected.delete(index);
      }
    }
  }

  renderSelection();
}

function finishStroke(): void {
  if (!activeStroke) {
    return;
  }

  const changes = [...activeStroke].map(([index, wasSelected]) => ({
    index,
    selected: wasSelected,
  }));

  if (changes.length) {
    history.push(changes);
  }

  activeStroke = null;
  updateControls();
}

function showCell(coordinate: number[]): void {
  hoverSource.clear();

  if (!grid) {
    elements.cellSummary.textContent = "Import an elevation file to begin";

    return;
  }

  const cell = cellAt(grid, coordinate);

  if (!cell) {
    elements.cellSummary.textContent = "Outside the elevation grid";

    return;
  }

  hoverSource.addFeature(cellFeature(cell));
  elements.cellSummary.textContent = `Row ${cell.row}, column ${cell.column}, elevation ${readElevation(grid, cell.index)}`;
}

async function importElevation(file: File): Promise<void> {
  if (hasUnsavedChanges() && !window.confirm("Discard the changes to this elevation?")) {
    elements.fileInput.value = "";

    return;
  }

  elements.errorMessage.hidden = true;

  try {
    grid = parseElevation(file, await file.arrayBuffer());
    selected = new Set();
    savedSelection = new Set();
    history = [];
    elements.fileSummary.textContent = `${file.name}, ${grid.columns} × ${grid.rows}`;

    const inferredVersion = inferMapVersion(file.name);

    if (inferredVersion) {
      elements.mapVersion.value = inferredVersion;
      updateTiles();
    }

    renderSelection();
  } catch (reason) {
    elements.fileInput.value = "";
    elements.errorMessage.textContent =
      reason instanceof Error ? reason.message : "Unable to import elevation data";
    elements.errorMessage.hidden = false;
  }
}

function downloadElevation(): void {
  if (!grid) {
    return;
  }

  const output = applyBlockedCells(grid, selected);
  const blobBytes = new Uint8Array(output.byteLength);
  blobBytes.set(output);
  const url = URL.createObjectURL(new Blob([blobBytes], { type: "application/octet-stream" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${grid.name.replace(/\.bin$/i, "")}-fixed.bin`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);

  savedSelection = new Set(selected);
  history = [];
  updateControls();
}

map.on("pointermove", (event) => showCell(event.coordinate));
map.getViewport().addEventListener("pointermove", (event) => {
  if (activeStroke) {
    applyCellAt(map.getEventCoordinate(event));
  }
});
map.getViewport().addEventListener("pointerdown", (event) => {
  if (mode === "pan") {
    return;
  }

  activeStroke = new Map();
  applyCellAt(map.getEventCoordinate(event));
});
window.addEventListener("pointerup", finishStroke);
window.addEventListener("beforeunload", (event) => {
  if (hasUnsavedChanges()) {
    event.preventDefault();
  }
});
window.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    elements.undoButton.click();
  }
});

elements.fileInput.addEventListener("change", () => {
  const file = elements.fileInput.files?.[0];

  if (file) {
    void importElevation(file);
  }
});
elements.mapVersion.addEventListener("change", updateTiles);
elements.exportButton.addEventListener("click", downloadElevation);
elements.undoButton.addEventListener("click", () => {
  const changes = history.pop();

  if (!changes) {
    return;
  }

  for (const change of changes) {
    if (change.selected) {
      selected.add(change.index);
    } else {
      selected.delete(change.index);
    }
  }

  renderSelection();
});
elements.clearButton.addEventListener("click", () => {
  if (!selected.size) {
    return;
  }

  history.push([...selected].map((index) => ({ index, selected: true })));
  selected.clear();
  renderSelection();
});

for (const button of elements.modeButtons) {
  button.addEventListener("click", () => setMode(button.dataset.mode as EditMode));
}

updateTiles();
setMode("block");
updateControls();
