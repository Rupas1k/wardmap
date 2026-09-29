export const mapPatchLabels: Readonly<Record<number, string>> = {
  0: "7.34d+ map",
  1: "7.36b+ map",
  2: "7.41e+ map",
};

export function mapPatchLabel(version: number): string {
  return mapPatchLabels[version] ?? `Map ${version}`;
}
