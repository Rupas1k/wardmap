import init, { elevation_data } from "../../wasm/pkg/wardmap_wasm";

let initialization: ReturnType<typeof init> | null = null;

function initializeWasm(): ReturnType<typeof init> {
  initialization ??= init();

  return initialization;
}

export async function loadElevations(
  mapVersion: number,
  signal?: AbortSignal,
): Promise<number[][]> {
  await initializeWasm();
  signal?.throwIfAborted();

  const result = elevation_data(mapVersion);
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
