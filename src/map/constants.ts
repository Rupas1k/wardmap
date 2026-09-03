const networkCoordinateCenter = 16384;
const mapWorldSpan = 17852.9309818549;

export const mapSize = {
  pixels: { x: 16384, y: 16384 },
  units: {
    x: mapWorldSpan,
    y: mapWorldSpan,
    x0: networkCoordinateCenter - mapWorldSpan / 2,
    y0: networkCoordinateCenter - mapWorldSpan / 2,
  },
} as const;

export const mapCenter: [number, number] = [mapSize.pixels.x / 2, mapSize.pixels.y / 2];
export const mapExtent: [number, number, number, number] = [
  -5000,
  -1500,
  mapSize.pixels.x + 5000,
  mapSize.pixels.y + 1500,
];
export const gridSize = 64;
export const gridOrigin = { x: 7461, y: 7461 } as const;
export const observerRadius = 1600;
export const sentryDetectionRadius = 1050;
export const fallbackMapVersion = 2;
export const minZoom = 1;
export const maxZoom = 4;
