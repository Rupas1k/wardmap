import { DatasetTooLargeError, fetchWardCount, fetchWards } from "../api/fetchWards";
import type { WardLoadProgress } from "../api/fetchWards";
import { parseWardRecords } from "../api/validation";
import {
  deleteAnalysis,
  getAnalysis,
  listAnalyses,
  pruneAnalyses,
  saveAnalysis,
} from "../indexedDb";
import type { StoredAnalysis } from "../indexedDb";
import type { LeagueFreshness } from "../indexedDb";
import type { ClusterSets, League, Ward } from "../types";
import { isWorkspaceSettings, numericIds } from "./model";
import type { DatasetSettings, WorkspaceSettings } from "./model";

export const clusterDataVersion = 13;
export const wardDataVersion = 5;
const datasetCacheLimit = 8;

function canonicalDataset(dataset: DatasetSettings): DatasetSettings {
  const numeric = (values: number[]) => [...new Set(values)].sort((left, right) => left - right);
  const ids = (value: string) => numericIds(value).sort().join(",");

  return {
    ...dataset,
    leagueIds: numeric(dataset.leagueIds),
    teamIds: numeric(dataset.teamIds),
    opponentTeamIds: numeric(dataset.opponentTeamIds),
    matchIds: ids(dataset.matchIds),
    playerIds: ids(dataset.playerIds),
    opponentPlayerIds: ids(dataset.opponentPlayerIds),
    destroyedByPlayerIds: ids(dataset.destroyedByPlayerIds),
  };
}

export function leagueFreshness(
  leagues: readonly League[],
  leagueIds: readonly number[],
): LeagueFreshness {
  return Object.fromEntries(
    leagueIds.flatMap((id) => {
      const league = leagues.find((candidate) => candidate.id === id);

      return league
        ? [
            [
              String(id),
              {
                parsedMatches: league.parsed_matches,
                latestParsedMatchId: league.latest_parsed_match_id,
              },
            ],
          ]
        : [];
    }),
  );
}

export interface LoadedWardDataset {
  wards: Ward[];
  leagueFreshness: LeagueFreshness | null;
}

interface LoadWardDatasetOptions {
  signal: AbortSignal;
  maximumWards: number;
  onProgress?: (progress: WardLoadProgress) => void;
}

export async function loadWardDataset(
  dataset: DatasetSettings,
  leagues: readonly League[],
  forceRefresh: boolean,
  { signal, maximumWards, onProgress }: LoadWardDatasetOptions,
): Promise<LoadedWardDataset> {
  const normalizedDataset = canonicalDataset(dataset);
  const key = `workspace:data:v${wardDataVersion}:${JSON.stringify(normalizedDataset)}`;

  if (!forceRefresh) {
    try {
      const cached = await getAnalysis<DatasetSettings>(key);

      if (cached) {
        if (cached.wards.length > maximumWards) {
          throw new DatasetTooLargeError(cached.wards.length, maximumWards);
        }

        onProgress?.({ loaded: cached.wards.length, total: cached.wards.length });

        return {
          wards: parseWardRecords(cached.wards),
          leagueFreshness: cached.leagueFreshness ?? null,
        };
      }
    } catch (reason) {
      if (reason instanceof DatasetTooLargeError) {
        throw reason;
      }

      console.warn("Unable to restore cached ward data", reason);
      try {
        await deleteAnalysis(key);
      } catch {
        // IndexedDB is an optional cache; network loading can continue without it.
      }
    }
  }

  const filters = {
    league_ids: dataset.leagueIds,
    match_ids: numericIds(dataset.matchIds),
    player_ids: numericIds(dataset.playerIds),
    opponent_player_ids: numericIds(dataset.opponentPlayerIds),
    destroyed_by_player_ids: numericIds(dataset.destroyedByPlayerIds),
    team_ids: dataset.teamIds,
    opponent_team_ids: dataset.opponentTeamIds,
    team_result: dataset.teamResult,
    side: dataset.side,
    ward_type: dataset.wardType,
    outcome: dataset.outcome,
    minimum_game_minute: dataset.minimumGameMinute,
    maximum_game_minute: dataset.maximumGameMinute,
    minimum_match_duration: dataset.minimumMatchDuration,
    maximum_match_duration: dataset.maximumMatchDuration,
    minimum_ward_lifetime: dataset.minimumWardLifetime,
    maximum_ward_lifetime: dataset.maximumWardLifetime,
  };
  const total = await fetchWardCount(filters, signal);

  if (total > maximumWards) {
    throw new DatasetTooLargeError(total, maximumWards);
  }

  onProgress?.({ loaded: 0, total });
  const wards =
    total === 0 ? [] : await fetchWards(filters, total, maximumWards, onProgress, signal);

  const freshness = leagueFreshness(leagues, dataset.leagueIds);

  try {
    await saveAnalysis({
      key,
      kind: "dataset",
      name: `${dataset.leagueIds.length} league ward dataset`,
      savedAt: Date.now(),
      leagueId: dataset.leagueIds.length === 1 ? dataset.leagueIds[0]! : null,
      settings: normalizedDataset,
      wards,
      leagueFreshness: freshness,
    });
    await pruneAnalyses("dataset", datasetCacheLimit);
  } catch (reason) {
    console.warn("Unable to cache ward data", reason);
  }

  return { wards, leagueFreshness: freshness };
}

export function withStorageVersion(
  settings: Omit<WorkspaceSettings, "clusterDataVersion" | "wardDataVersion">,
): WorkspaceSettings {
  return { ...settings, clusterDataVersion, wardDataVersion };
}

export async function persistWorkspace(
  key: string,
  kind: "saved" | "session",
  name: string,
  settings: WorkspaceSettings,
  wards: Ward[],
  clusterSets: ClusterSets,
  freshness?: LeagueFreshness,
): Promise<void> {
  await saveAnalysis({
    key,
    kind,
    name,
    savedAt: Date.now(),
    leagueId: settings.dataset.leagueIds.length === 1 ? settings.dataset.leagueIds[0]! : null,
    settings,
    wards,
    clusterSets,
    ...(freshness ? { leagueFreshness: freshness } : {}),
  });
}

export async function savedWorkspaceViews(): Promise<StoredAnalysis<WorkspaceSettings>[]> {
  return (await listAnalyses("saved")).filter((view): view is StoredAnalysis<WorkspaceSettings> =>
    isWorkspaceSettings(view.settings),
  );
}

export async function renameWorkspaceView(
  view: StoredAnalysis<WorkspaceSettings>,
  name: string,
): Promise<StoredAnalysis<WorkspaceSettings>[]> {
  await saveAnalysis({ ...view, name });

  return savedWorkspaceViews();
}

export async function deleteWorkspaceView(key: string): Promise<void> {
  await deleteAnalysis(key);
}
