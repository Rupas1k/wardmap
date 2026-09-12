import { numericIds } from "../dataset/model";
import type { DatasetSettings } from "../dataset/model";
import type { Ward } from "../types";
import { loadImportedLibrary } from "./storage";

export async function loadImportedWardDataset(
  dataset: DatasetSettings,
  mapVersion: number,
  signal: AbortSignal,
): Promise<Ward[]> {
  const library = await loadImportedLibrary();

  if (signal.aborted) {
    throw new DOMException("Dataset loading was cancelled.", "AbortError");
  }

  const collectionMatchIds = new Set(
    library.collections
      .filter((collection) => dataset.collectionIds.includes(collection.id))
      .flatMap((collection) => collection.matchIds),
  );
  const selectedMatches = library.matches.filter(
    (match) =>
      match.mapVersion === mapVersion &&
      (dataset.collectionIds.length === 0 || collectionMatchIds.has(match.matchId)),
  );
  const selectedMatchIds = new Set(numericIds(dataset.matchIds).map(Number));
  const placingPlayers = new Set(numericIds(dataset.playerIds).map(Number));
  const opponentPlayers = new Set(numericIds(dataset.opponentPlayerIds).map(Number));
  const destroyers = new Set(numericIds(dataset.destroyedByPlayerIds).map(Number));
  const myAccounts = new Set(library.profile.accountIds);

  return selectedMatches.flatMap((match) => {
    if (selectedMatchIds.size > 0 && !selectedMatchIds.has(match.matchId)) {
      return [];
    }

    const myPlayer = match.players.find((player) => myAccounts.has(player.id));

    return match.wards.filter((ward) => {
      const opposingPlayers = opponentPlayers.size
        ? match.players.some(
            (player) =>
              opponentPlayers.has(player.id) && player.isRadiant !== Boolean(ward.is_radiant),
          )
        : true;
      const perspectiveMatches =
        dataset.perspective === "all" ||
        (dataset.perspective === "mine" &&
          ward.player_placed_id !== null &&
          myAccounts.has(ward.player_placed_id)) ||
        (dataset.perspective === "allies" &&
          myPlayer !== undefined &&
          ward.is_radiant === myPlayer.isRadiant) ||
        (dataset.perspective === "enemies" &&
          myPlayer !== undefined &&
          ward.is_radiant !== myPlayer.isRadiant);

      return (
        perspectiveMatches &&
        opposingPlayers &&
        (placingPlayers.size === 0 ||
          (ward.player_placed_id !== null && placingPlayers.has(ward.player_placed_id))) &&
        (destroyers.size === 0 ||
          (ward.player_destroyed_id !== null && destroyers.has(ward.player_destroyed_id))) &&
        (dataset.teamIds.length === 0 ||
          (ward.team_id !== null && dataset.teamIds.includes(ward.team_id))) &&
        (dataset.opponentTeamIds.length === 0 ||
          (ward.opponent_team_id !== null &&
            dataset.opponentTeamIds.includes(ward.opponent_team_id))) &&
        (dataset.side === "all" || ward.is_radiant === (dataset.side === "radiant")) &&
        (dataset.wardType === "all" || ward.is_obs === (dataset.wardType === "observer")) &&
        (dataset.outcome === "all" || ward.is_destroyed === (dataset.outcome === "destroyed")) &&
        (dataset.teamResult === "all" || ward.team_won === (dataset.teamResult === "won")) &&
        ward.time_placed >= dataset.minimumGameMinute * 60 &&
        ward.time_placed <= dataset.maximumGameMinute * 60 &&
        (ward.match_duration ?? 0) >= dataset.minimumMatchDuration * 60 &&
        (ward.match_duration ?? 0) <= dataset.maximumMatchDuration * 60 &&
        ward.duration >= dataset.minimumWardLifetime &&
        ward.duration <= dataset.maximumWardLifetime
      );
    });
  });
}
