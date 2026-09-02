import type { ClusterSets, Ward } from "./types";

const databaseName = "dota2wardmap";
const databaseVersion = 3;
const settingsStore = "settings";
const analysesStore = "analyses";

export interface StoredAnalysis<TSettings = unknown> {
  key: string;
  kind: "dataset" | "saved" | "session";
  name: string;
  savedAt: number;
  leagueId: number | null;
  settings: TSettings;
  wards: Ward[];
  clusterSets?: ClusterSets;
  leagueFreshness?: LeagueFreshness;
}

export interface LeagueFreshnessEntry {
  parsedMatches: number;
  latestParsedMatchId: number | null;
}

export type LeagueFreshness = Record<string, LeagueFreshnessEntry>;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);

    request.onupgradeneeded = (event) => {
      const database = request.result;

      if (!database.objectStoreNames.contains(settingsStore)) {
        database.createObjectStore(settingsStore);
      }

      let analyses: IDBObjectStore;

      if (!database.objectStoreNames.contains(analysesStore)) {
        analyses = database.createObjectStore(analysesStore, { keyPath: "key" });
        analyses.createIndex("kind", "kind");
        analyses.createIndex("savedAt", "savedAt");
      } else {
        analyses = request.transaction!.objectStore(analysesStore);
      }

      if (!analyses.indexNames.contains("kindSavedAt")) {
        analyses.createIndex("kindSavedAt", ["kind", "savedAt"]);
      }

      if (event.oldVersion < 2 && database.objectStoreNames.contains(analysesStore)) {
        const store = request.transaction!.objectStore(analysesStore);
        const cursorRequest = store.openCursor();

        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;

          if (!cursor) {
            return;
          }

          const row = cursor.value as Omit<StoredAnalysis, "kind"> & { kind: string };

          if (row.kind === "main") {
            row.kind = "dataset";
          }
          if (row.kind === "lab") {
            row.kind = "saved";
          }

          cursor.update(row);
          cursor.continue();
        };
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open IndexedDB"));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

export async function getSetting<T>(key: string): Promise<T | null> {
  const database = await openDatabase();

  try {
    return (
      ((await requestResult(
        database.transaction(settingsStore).objectStore(settingsStore).get(key),
      )) as T | undefined) ?? null
    );
  } finally {
    database.close();
  }
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  const database = await openDatabase();

  try {
    await requestResult(
      database.transaction(settingsStore, "readwrite").objectStore(settingsStore).put(value, key),
    );
  } finally {
    database.close();
  }
}

export async function getAnalysis<TSettings = unknown>(
  key: string,
): Promise<StoredAnalysis<TSettings> | null> {
  const database = await openDatabase();

  try {
    return (
      ((await requestResult(
        database.transaction(analysesStore).objectStore(analysesStore).get(key),
      )) as StoredAnalysis<TSettings> | undefined) ?? null
    );
  } finally {
    database.close();
  }
}

export async function saveAnalysis<TSettings>(analysis: StoredAnalysis<TSettings>): Promise<void> {
  const database = await openDatabase();

  try {
    await requestResult(
      database.transaction(analysesStore, "readwrite").objectStore(analysesStore).put(analysis),
    );
  } finally {
    database.close();
  }
}

export async function deleteAnalysis(key: string): Promise<void> {
  const database = await openDatabase();

  try {
    await requestResult(
      database.transaction(analysesStore, "readwrite").objectStore(analysesStore).delete(key),
    );
  } finally {
    database.close();
  }
}

export async function listAnalyses<TSettings = unknown>(
  kind: StoredAnalysis["kind"],
): Promise<StoredAnalysis<TSettings>[]> {
  const database = await openDatabase();

  try {
    const rows = (await requestResult(
      database.transaction(analysesStore).objectStore(analysesStore).index("kind").getAll(kind),
    )) as StoredAnalysis<TSettings>[];

    return rows.sort((left, right) => right.savedAt - left.savedAt);
  } finally {
    database.close();
  }
}

export async function pruneAnalyses(kind: StoredAnalysis["kind"], keep: number): Promise<void> {
  const database = await openDatabase();

  try {
    const transaction = database.transaction(analysesStore, "readwrite");
    const index = transaction.objectStore(analysesStore).index("kindSavedAt");
    const range = IDBKeyRange.bound([kind, 0], [kind, Number.MAX_SAFE_INTEGER]);
    await new Promise<void>((resolve, reject) => {
      let seen = 0;
      const request = index.openCursor(range, "prev");
      request.onsuccess = () => {
        const cursor = request.result;

        if (!cursor) {
          resolve();

          return;
        }
        seen += 1;

        if (seen > keep) {
          cursor.delete();
        }
        cursor.continue();
      };
      request.onerror = () => reject(request.error ?? new Error("Unable to prune IndexedDB"));
    });
  } finally {
    database.close();
  }
}
