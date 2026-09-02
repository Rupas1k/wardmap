export const automaticIndividualThreshold = 2;
export const automaticSmallDatasetThreshold = 1500;

export function automaticMergeDistance(wardCount: number): number {
  return Math.max(48, Math.min(64, Math.round(64 * Math.sqrt(5000 / wardCount))));
}

export function automaticMinClusterSize(wardCount: number): number {
  if (wardCount < automaticSmallDatasetThreshold) {
    return 2;
  }

  return Math.max(3, Math.min(16, Math.round(wardCount / 500)));
}

export function automaticMinSamples(wardCount: number): number {
  if (wardCount < automaticSmallDatasetThreshold) {
    return 2;
  }

  return Math.max(3, Math.min(8, Math.round(wardCount / 1200)));
}

export function shouldClusterAutomatically(wardCount: number): boolean {
  return wardCount >= automaticIndividualThreshold;
}
