import type { LeagueFreshness } from "../indexedDb";
import type { DatasetSettings } from "../dataset/model";
import type { League } from "../types";

export function compatibleLeagueDataset(
  dataset: DatasetSettings,
  leagues: League[],
  defaultLeague: League,
): DatasetSettings {
  const selectedLeagues = dataset.leagueIds.flatMap((id) => {
    const league = leagues.find((candidate) => candidate.id === id);

    return league ? [league] : [];
  });
  const version = selectedLeagues[0]?.version ?? defaultLeague.version;
  const leagueIds = selectedLeagues
    .filter((league) => league.version === version)
    .map((league) => league.id);

  return {
    ...dataset,
    leagueIds: leagueIds.length > 0 ? leagueIds : [defaultLeague.id],
  };
}

export function datasetFreshness(
  dataset: DatasetSettings | null,
  leagues: League[],
  cachedFreshness: LeagueFreshness | null,
) {
  if (!dataset) {
    return { stale: false, availableMatches: 0 };
  }

  const selected = dataset.leagueIds.flatMap((id) => {
    const league = leagues.find((candidate) => candidate.id === id);

    return league ? [league] : [];
  });
  const availableMatches = selected.reduce((total, league) => total + league.parsed_matches, 0);
  const stale = selected.some((league) => {
    const cached = cachedFreshness?.[String(league.id)];

    return (
      !cached ||
      cached.parsedMatches !== league.parsed_matches ||
      cached.latestParsedMatchId !== league.latest_parsed_match_id
    );
  });

  return { stale, availableMatches };
}
