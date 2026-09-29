import type { ImportedMatch } from "./model";

interface NameObservation {
  importedAt: number;
  name: string;
  playedAt: number;
}

function placeholderName(name: string, accountId: number): boolean {
  const normalized = name.trim();

  return (
    !normalized ||
    normalized.toLocaleLowerCase() === `player ${accountId}` ||
    /^(anonymous|unknown|unknown player)$/i.test(normalized)
  );
}

function newerName(candidate: NameObservation, current: NameObservation | undefined): boolean {
  return (
    !current ||
    candidate.playedAt > current.playedAt ||
    (candidate.playedAt === current.playedAt && candidate.importedAt > current.importedAt)
  );
}

export function newestPlayerNames(matches: readonly ImportedMatch[]): Map<number, string> {
  const names = new Map<number, NameObservation>();
  const placeholders = new Map<number, NameObservation>();

  for (const match of matches) {
    const playedAt = match.startedAt ?? match.importedAt;

    for (const player of match.players) {
      const observation = { importedAt: match.importedAt, name: player.name.trim(), playedAt };
      const observations = placeholderName(player.name, player.id) ? placeholders : names;

      if (newerName(observation, observations.get(player.id))) {
        observations.set(player.id, observation);
      }
    }
  }

  const accountIds = new Set([...names.keys(), ...placeholders.keys()]);

  return new Map(
    [...accountIds].map((accountId) => [
      accountId,
      names.get(accountId)?.name || placeholders.get(accountId)?.name || `Player ${accountId}`,
    ]),
  );
}
