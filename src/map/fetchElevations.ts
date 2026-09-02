import "bz2";

import { assetUrl } from "../config";

function decompress(input: Uint8Array): Uint8Array {
  const implementation = window.bz2;

  if (typeof implementation?.decompress !== "function") {
    throw new Error("The BZ2 decompressor failed to initialize");
  }

  return implementation.decompress(input);
}

export async function fetchElevations(
  mapVersion: number,
  signal?: AbortSignal,
): Promise<number[][]> {
  const response = await fetch(
    assetUrl(`static/data/elevations/${mapVersion}`),
    signal ? { signal } : {},
  );

  if (!response.ok) {
    throw new Error(`Unable to load elevations for map ${mapVersion}: ${response.status}`);
  }

  const result = decompress(new Uint8Array(await response.arrayBuffer()));
  const dataView = new DataView(result.buffer, result.byteOffset, result.byteLength);
  const rows = dataView.getUint16(0);
  const columns = dataView.getUint16(2);
  const elevations: number[][] = [];
  let offset = 4;

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const row: number[] = [];

    for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
      row.push(dataView.getInt16(offset));
      offset += 2;
    }
    elevations.push(row);
  }

  return elevations;
}
