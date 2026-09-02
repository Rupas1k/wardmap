import Map from "ol/Map";
import View from "ol/View";
import { Image as ImageLayer, Vector as VectorLayer } from "ol/layer";
import { ImageStatic } from "ol/source";
import { assetUrl } from "../config";
import { mapCenter, mapSize } from "./constants";
import { overlayLayers } from "./layers";
import { pixelProjection } from "./projections";

const fullMapExportSize = 4096;
const exportPixelRatio = 4;
const exportViewportSize = fullMapExportSize / exportPixelRatio;

function canvasTransform(canvas: HTMLCanvasElement): DOMMatrix {
  const transform = canvas.style.transform;

  if (transform) {
    return new DOMMatrix(transform);
  }

  const width = Number.parseFloat(canvas.style.width) || canvas.width;
  const height = Number.parseFloat(canvas.style.height) || canvas.height;

  return new DOMMatrix().scale(width / canvas.width, height / canvas.height);
}

function download(canvas: HTMLCanvasElement): Promise<void> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Unable to create map image"));

        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);

      link.download = `wardmap-${date}.png`;
      link.href = url;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      resolve();
    }, "image/png");
  });
}

async function renderComplete(map: Map): Promise<void> {
  await new Promise<void>((resolve) => {
    map.once("rendercomplete", () => resolve());
    map.renderSync();
  });
}

function createOverlayLayers() {
  return overlayLayers.map(
    (layer) =>
      new VectorLayer({
        opacity: layer.getOpacity(),
        source: layer.getSource()!,
        style: layer.getStyle(),
        visible: layer.getVisible(),
      }),
  );
}

function composeMap(map: Map, width: number, height: number, scale: number): HTMLCanvasElement {
  const output = document.createElement("canvas");
  output.width = Math.round(width * scale);
  output.height = Math.round(height * scale);

  const context = output.getContext("2d");

  if (!context) {
    throw new Error("Canvas export is unavailable");
  }

  context.fillStyle = "#020617";
  context.fillRect(0, 0, output.width, output.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const canvases = map
    .getViewport()
    .querySelectorAll<HTMLCanvasElement>(".ol-layer canvas, canvas.ol-layer");

  for (const canvas of canvases) {
    if (canvas.width === 0 || canvas.height === 0) {
      continue;
    }

    const opacity = canvas.parentElement?.style.opacity || canvas.style.opacity;
    context.globalAlpha = opacity === "" ? 1 : Number(opacity);

    const transform = canvasTransform(canvas);
    context.setTransform(
      transform.a * scale,
      transform.b * scale,
      transform.c * scale,
      transform.d * scale,
      transform.e * scale,
      transform.f * scale,
    );
    context.drawImage(canvas, 0, 0);
  }

  context.globalAlpha = 1;
  context.resetTransform();

  return output;
}

export default async function exportMapImage(): Promise<void> {
  const width = exportViewportSize;
  const height = exportViewportSize;
  const scale = exportPixelRatio;
  const target = document.createElement("div");
  target.style.position = "fixed";
  target.style.left = "-100000px";
  target.style.top = "0";
  target.style.width = `${width}px`;
  target.style.height = `${height}px`;
  document.body.append(target);

  const imageSource = new ImageStatic({
    crossOrigin: "anonymous",
    imageExtent: [0, 0, mapSize.pixels.x, mapSize.pixels.y],
    projection: pixelProjection,
    url: assetUrl("static/img/map/741-ti10.jpg"),
  });
  const exportMap = new Map({
    controls: [],
    interactions: [],
    layers: [new ImageLayer({ source: imageSource }), ...createOverlayLayers()],
    pixelRatio: exportPixelRatio,
    target,
    view: new View({
      center: mapCenter,
      projection: pixelProjection,
      resolution: mapSize.pixels.x / exportViewportSize,
    }),
  });

  exportMap.setSize([width, height]);

  try {
    await renderComplete(exportMap);

    if (imageSource.getState() === "error") {
      throw new Error("Unable to load export map image");
    }

    await download(composeMap(exportMap, width, height, scale));
  } finally {
    exportMap.setTarget(undefined);
    exportMap.dispose();
    target.remove();
  }
}
