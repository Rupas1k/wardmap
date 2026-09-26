/// <reference types="vite/client" />

declare module "visibility-polygon" {
  export function convertToSegments(polygons: number[][][]): number[][][];
  export function compute(position: number[], segments: number[][][]): number[][];
}
