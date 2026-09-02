export function cellBlocksVision(value: number, eyeHeight: number): boolean {
  const cellHeight = value >> 1;
  const hasTree = (value & 1) === 1;
  const highGroundBlocks = cellHeight > eyeHeight + 64;
  const treeCanopyBlocks = hasTree && cellHeight + 160 > eyeHeight;

  return highGroundBlocks || treeCanopyBlocks;
}
