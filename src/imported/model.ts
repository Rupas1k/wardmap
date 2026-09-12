import type { Ward } from "../types";

export interface ImportedPlayer {
  id: number;
  name: string;
  isRadiant: boolean;
  hero: string;
}

export interface ImportedMatch {
  matchId: number;
  fileName: string;
  fileHash: string;
  mapVersion: number;
  gameVersion: number;
  startedAt: number;
  duration: number;
  importedAt: number;
  parserVersion: number;
  radiantWon: boolean;
  players: ImportedPlayer[];
  wards: Ward[];
}

export interface ImportedCollection {
  id: string;
  name: string;
  matchIds: number[];
  createdAt: number;
}

export interface ImportedProfile {
  accountIds: number[];
}

export interface ImportedLibrary {
  matches: ImportedMatch[];
  collections: ImportedCollection[];
  profile: ImportedProfile;
}

export const emptyImportedLibrary: ImportedLibrary = {
  matches: [],
  collections: [],
  profile: { accountIds: [] },
};
