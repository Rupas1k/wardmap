/// <reference types="vite/client" />

declare module "bz2";

interface Window {
  bz2?: {
    decompress(input: Uint8Array): Uint8Array;
  };
}

declare module "visibility-polygon" {
  export function convertToSegments(polygons: number[][][]): number[][][];
  export function compute(position: number[], segments: number[][][]): number[][];
}
