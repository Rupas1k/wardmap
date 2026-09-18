import type { ClusteringSettings, VisionTechnique } from "../state/mapState";
import type { ClusterSets, Side } from "../types";

export type WardType = "all" | "observer" | "sentry";
export type WardOutcome =
  "all" | "dewarded" | "expired" | "allied_removed" | "match_ended" | "unresolved_removal";
export type TeamResult = "all" | "won" | "lost";

export interface DatasetSettings {
  leagueIds: number[];
  side: Side;
  wardType: WardType;
  outcome: WardOutcome;
  matchIds: string;
  playerIds: string;
  opponentPlayerIds: string;
  destroyedByPlayerIds: string;
  teamIds: number[];
  opponentTeamIds: number[];
  teamResult: TeamResult;
  minimumGameMinute: number;
  maximumGameMinute: number;
  minimumMatchDuration: number;
  maximumMatchDuration: number;
  minimumWardLifetime: number;
  maximumWardLifetime: number;
  minimumAddedVision: number | null;
  maximumAddedVision: number | null;
  minimumFreshSightings: number | null;
  maximumFreshSightings: number | null;
  minimumEnemyHeroVision: number | null;
  maximumEnemyHeroVision: number | null;
  minimumUniqueEnemyHeroVision: number | null;
  maximumUniqueEnemyHeroVision: number | null;
  minimumHeroesSpotted: number | null;
  maximumHeroesSpotted: number | null;
  minimumRevealEvents: number | null;
  maximumRevealEvents: number | null;
  minimumUniqueRevealEvents: number | null;
  maximumUniqueRevealEvents: number | null;
  minimumScoutingScore: number | null;
  maximumScoutingScore: number | null;
  minimumScoutingTracking: number | null;
  maximumScoutingTracking: number | null;
  minimumScoutingDiscovery: number | null;
  maximumScoutingDiscovery: number | null;
}

export interface WorkspaceSettings {
  dataset: DatasetSettings;
  clustering: ClusteringSettings;
  clusteringEnabled?: boolean;
  groupByGridCell?: boolean;
  showUnclustered?: boolean;
  visionTechnique: VisionTechnique;
  clusterDataVersion?: number;
  wardDataVersion?: number;
}

export const defaultDataset: DatasetSettings = {
  leagueIds: [],
  side: "all",
  wardType: "observer",
  outcome: "all",
  matchIds: "",
  playerIds: "",
  opponentPlayerIds: "",
  destroyedByPlayerIds: "",
  teamIds: [],
  opponentTeamIds: [],
  teamResult: "all",
  minimumGameMinute: -1.5,
  maximumGameMinute: 180,
  minimumMatchDuration: 0,
  maximumMatchDuration: 180,
  minimumWardLifetime: 0,
  maximumWardLifetime: 600,
  minimumAddedVision: null,
  maximumAddedVision: null,
  minimumFreshSightings: null,
  maximumFreshSightings: null,
  minimumEnemyHeroVision: null,
  maximumEnemyHeroVision: null,
  minimumUniqueEnemyHeroVision: null,
  maximumUniqueEnemyHeroVision: null,
  minimumHeroesSpotted: null,
  maximumHeroesSpotted: null,
  minimumRevealEvents: null,
  maximumRevealEvents: null,
  minimumUniqueRevealEvents: null,
  maximumUniqueRevealEvents: null,
  minimumScoutingScore: null,
  maximumScoutingScore: null,
  minimumScoutingTracking: null,
  maximumScoutingTracking: null,
  minimumScoutingDiscovery: null,
  maximumScoutingDiscovery: null,
};

export function numericIds(value: string): string[] {
  return value
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter((item) => /^\d+$/.test(item));
}

export function isWorkspaceSettings(value: unknown): value is WorkspaceSettings {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<WorkspaceSettings>;
  const dataset = candidate.dataset;
  const clustering = normalizeClusteringSettings(candidate.clustering);

  if (clustering) {
    candidate.clustering = clustering;
  }

  const optionalNumber = (number: unknown) =>
    number === undefined || number === null || Number.isFinite(number);

  return Boolean(
    dataset &&
    Array.isArray(dataset.leagueIds) &&
    dataset.leagueIds.every(Number.isFinite) &&
    ["all", "radiant", "dire"].includes(dataset.side) &&
    ["all", "observer", "sentry"].includes(dataset.wardType) &&
    ["all", "dewarded", "expired", "allied_removed", "match_ended", "unresolved_removal"].includes(
      dataset.outcome,
    ) &&
    typeof dataset.matchIds === "string" &&
    typeof dataset.playerIds === "string" &&
    (dataset.opponentPlayerIds === undefined || typeof dataset.opponentPlayerIds === "string") &&
    (dataset.destroyedByPlayerIds === undefined ||
      typeof dataset.destroyedByPlayerIds === "string") &&
    Array.isArray(dataset.teamIds) &&
    dataset.teamIds.every(Number.isFinite) &&
    Array.isArray(dataset.opponentTeamIds) &&
    dataset.opponentTeamIds.every(Number.isFinite) &&
    ["all", "won", "lost"].includes(dataset.teamResult) &&
    [
      dataset.minimumGameMinute,
      dataset.maximumGameMinute,
      dataset.minimumMatchDuration,
      dataset.maximumMatchDuration,
      dataset.minimumWardLifetime,
      dataset.maximumWardLifetime,
    ].every(Number.isFinite) &&
    [
      dataset.minimumEnemyHeroVision,
      dataset.maximumEnemyHeroVision,
      dataset.minimumUniqueEnemyHeroVision,
      dataset.maximumUniqueEnemyHeroVision,
      dataset.minimumHeroesSpotted,
      dataset.maximumHeroesSpotted,
      dataset.minimumRevealEvents,
      dataset.maximumRevealEvents,
      dataset.minimumUniqueRevealEvents,
      dataset.maximumUniqueRevealEvents,
      dataset.minimumScoutingScore,
      dataset.maximumScoutingScore,
      dataset.minimumScoutingTracking,
      dataset.maximumScoutingTracking,
      dataset.minimumScoutingDiscovery,
      dataset.maximumScoutingDiscovery,
      dataset.minimumAddedVision,
      dataset.maximumAddedVision,
      dataset.minimumFreshSightings,
      dataset.maximumFreshSightings,
    ].every(optionalNumber) &&
    clustering !== null &&
    isVisionTechnique(candidate.visionTechnique) &&
    (candidate.clusteringEnabled === undefined ||
      typeof candidate.clusteringEnabled === "boolean") &&
    (candidate.groupByGridCell === undefined || typeof candidate.groupByGridCell === "boolean") &&
    (candidate.showUnclustered === undefined || typeof candidate.showUnclustered === "boolean") &&
    (candidate.clusterDataVersion === undefined || Number.isFinite(candidate.clusterDataVersion)) &&
    (candidate.wardDataVersion === undefined || Number.isFinite(candidate.wardDataVersion)),
  );
}

export function isClusteringSettings(value: unknown): value is ClusteringSettings {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ClusteringSettings>;

  return Boolean(
    ["auto", "dbscan", "hdbscan", "st_dbscan", "time_weighted_hdbscan"].includes(
      candidate.algorithm ?? "",
    ) &&
    (candidate.selectionMethod === undefined ||
      ["eom", "leaf"].includes(candidate.selectionMethod)) &&
    Number.isFinite(candidate.radius) &&
    (candidate.timeWindow === undefined || Number.isFinite(candidate.timeWindow)) &&
    Number.isFinite(candidate.timeScaleSeconds) &&
    Number.isFinite(candidate.minSamples) &&
    Number.isFinite(candidate.minClusterSize) &&
    Number.isFinite(candidate.selectionEpsilon),
  );
}

export function normalizeClusteringSettings(value: unknown): ClusteringSettings | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const legacy = value as Record<string, unknown>;
  const candidate: Record<string, unknown> = {
    ...legacy,
    algorithm:
      legacy.algorithm === "optics"
        ? "dbscan"
        : legacy.algorithm === "st_hdbscan"
          ? "time_weighted_hdbscan"
          : legacy.algorithm,
    timeScaleSeconds: legacy.timeScaleSeconds ?? legacy.adaptiveTimeScale ?? 180,
  };

  delete candidate.adaptiveTimeScale;

  return isClusteringSettings(candidate) ? candidate : null;
}

export function isVisionTechnique(value: unknown): value is VisionTechnique {
  return value === "polygon" || value === "gridnav";
}

export function isClusterSets(value: unknown): value is ClusterSets {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ClusterSets>;

  return Boolean(
    Array.isArray(candidate.all) &&
    Array.isArray(candidate.radiant) &&
    Array.isArray(candidate.dire) &&
    candidate.average &&
    Number.isFinite(candidate.average.cluster_id),
  );
}

export function normalizeDataset(
  settings: Partial<DatasetSettings>,
  defaultLeagueId: number,
): DatasetSettings {
  const currentSettings = { ...settings } as Partial<DatasetSettings> & {
    collectionIds?: unknown;
    perspective?: unknown;
    source?: unknown;
  };

  delete currentSettings.collectionIds;
  delete currentSettings.perspective;
  delete currentSettings.source;

  return {
    ...defaultDataset,
    ...currentSettings,
    leagueIds: settings.leagueIds?.length ? settings.leagueIds : [defaultLeagueId],
    teamIds: settings.teamIds ?? [],
    opponentTeamIds: settings.opponentTeamIds ?? [],
    opponentPlayerIds: settings.opponentPlayerIds ?? "",
    destroyedByPlayerIds: "",
  };
}
