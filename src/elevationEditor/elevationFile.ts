export type ElevationGrid = {
  bytes: Uint8Array;
  rows: number;
  columns: number;
  name: string;
};

export function parseElevation(file: File, buffer: ArrayBuffer): ElevationGrid {
  const bytes = new Uint8Array(buffer);

  if (bytes.byteLength < 4) {
    throw new Error("The elevation file is too small");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const rows = view.getUint16(0);
  const columns = view.getUint16(2);
  const expected = 4 + rows * columns * 2;

  if (!rows || !columns || bytes.byteLength !== expected) {
    throw new Error(
      `Expected ${expected.toLocaleString()} bytes, received ${bytes.byteLength.toLocaleString()}`,
    );
  }

  return { bytes, rows, columns, name: file.name };
}

export function readElevation(grid: ElevationGrid, index: number): number {
  const view = new DataView(grid.bytes.buffer, grid.bytes.byteOffset, grid.bytes.byteLength);

  return view.getInt16(4 + index * 2);
}

export function applyBlockedCells(grid: ElevationGrid, cells: Set<number>): Uint8Array {
  const output = grid.bytes.slice();
  const view = new DataView(output.buffer, output.byteOffset, output.byteLength);

  for (const index of cells) {
    view.setInt16(4 + index * 2, 0x7fff);
  }

  return output;
}

export function inferMapVersion(filename: string): string | null {
  const match = filename.match(/^([0-2])(?:[-_.].*)?\.bin$/i);

  return match?.[1] ?? null;
}
