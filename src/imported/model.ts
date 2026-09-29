import type { Ward } from "../types";

export interface ImportedPlayer {
  id: number;
  name: string;
  isRadiant: boolean;
  hero: string | null;
}

export interface ImportedMatch {
  matchId: number;
  fileName: string;
  fileHash: string;
  mapVersion: number;
  gameVersion: number | null;
  startedAt: number | null;
  duration: number | null;
  importedAt: number;
  parserVersion: number;
  warnings?: string[];
  radiantWon: boolean | null;
  players: ImportedPlayer[];
  wards: Ward[];
}

export interface ImportedCollection {
  id: string;
  name: string;
  matchIds: number[];
  createdAt: number;
  updatedAt?: number;
  description?: string;
}

export interface ImportedProfile {
  accountIds: number[];
}

export interface ImportedLibrary {
  nextWardId?: number;
  matches: ImportedMatch[];
  collections: ImportedCollection[];
  profile: ImportedProfile;
}

export const emptyImportedLibrary: ImportedLibrary = {
  matches: [],
  collections: [],
  profile: { accountIds: [] },
};
