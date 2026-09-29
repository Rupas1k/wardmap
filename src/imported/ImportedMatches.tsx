import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BsArrowDown,
  BsArrowUp,
  BsDownload,
  BsFileEarmarkArrowUp,
  BsSearch,
  BsTrash,
  BsUpload,
  BsX,
} from "react-icons/bs";
import { elevatedSurfaceClass, formControlClass, SwitchNav } from "../components/ui";
import { numericIds } from "../dataset/model";
import { mapPatchLabel, mapPatchLabels } from "../map/versions";
import { emptyImportedLibrary } from "./model";
import type { ImportedCollection, ImportedLibrary, ImportedMatch } from "./model";
import { newestPlayerNames } from "./playerIdentity";
import runReplayParser from "./runReplayParser";
import {
  downloadImportedLibrary,
  readImportedLibraryBackup,
  removeImportedMatches,
  replaceImportedLibrary,
  saveImportedLibraryMetadata,
  saveImportedMatch,
} from "./storage";
import { useImportedStore } from "./state";

type ImportedTab = "library" | "import" | "settings";
type QueueStatus =
  "queued" | "parsing" | "saving" | "imported" | "duplicate" | "failed" | "cancelled";
type QueueEntry = { jobId: string; file: File; status: QueueStatus; detail?: string };
type CollectionFilter = string;

const tabs: { id: ImportedTab; label: string }[] = [
  { id: "library", label: "Library" },
  { id: "import", label: "Import" },
  { id: "settings", label: "Settings" },
];

const primaryButtonClass =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-sm bg-cyan-500/15 px-3 py-2 text-xs font-medium text-cyan-200 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-35";
const secondaryButtonClass =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-sm border border-white/10 bg-white/[0.025] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-35";
const dangerButtonClass =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-sm border border-rose-400/20 px-3 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-35";

function duration(seconds: number | null) {
  if (seconds === null) {
    return "Duration unknown";
  }
  seconds = Math.round(seconds);

  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function bytes(value: number | undefined) {
  if (!value) {
    return "0 MB";
  }
  if (value >= 1_073_741_824) {
    return `${(value / 1_073_741_824).toFixed(1)} GB`;
  }

  return `${(value / 1_048_576).toFixed(value < 10_485_760 ? 1 : 0)} MB`;
}

function playerFor(match: ImportedMatch, accountIds: readonly number[]) {
  return match.players.find((player) => accountIds.includes(player.id));
}

function matchSummary(match: ImportedMatch, won: boolean | null): string {
  const started =
    match.startedAt === null ? "Date unknown" : new Date(match.startedAt).toLocaleDateString();
  const result = won === null ? [] : [won ? "Won" : "Lost"];

  return [started, duration(match.duration), `${match.wards.length} wards`, ...result].join(", ");
}

export default function ImportedMatches({
  mapVersion,
  onShowMatches,
}: {
  mapVersion: number;
  onShowMatches: (matchIds: number[]) => void;
}) {
  const ready = useImportedStore((state) => state.ready);
  const library = useImportedStore((state) => state.library);
  const setLibrary = useImportedStore((state) => state.setLibrary);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ImportedTab>("library");
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [importCollectionId, setImportCollectionId] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [accountIds, setAccountIds] = useState(library.profile.accountIds.join(", "));
  const [search, setSearch] = useState("");
  const [collectionFilter, setCollectionFilter] = useState<CollectionFilter>("all");
  const [resultFilter, setResultFilter] = useState<"all" | "won" | "lost">("all");
  const [importedWithinDays, setImportedWithinDays] = useState<"all" | number>("all");
  const [versionFilter, setVersionFilter] = useState<"all" | number>(mapVersion);
  const [onlyMine, setOnlyMine] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkCollectionId, setBulkCollectionId] = useState("");
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [storage, setStorage] = useState<{ usage: number | undefined; quota: number | undefined }>({
    usage: undefined,
    quota: undefined,
  });
  const [persistentStorage, setPersistentStorage] = useState<boolean | null>(null);
  const importRequest = useRef<AbortController | null>(null);
  const backupInput = useRef<HTMLInputElement>(null);

  const playerNames = useMemo(() => newestPlayerNames(library.matches), [library.matches]);
  const players = useMemo(
    () =>
      [...playerNames]
        .map(([id, name]) => ({ id, name }))
        .sort((left, right) => left.name.localeCompare(right.name)),
    [playerNames],
  );

  const visibleMatches = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();

    return library.matches
      .filter((match) => {
        const me = playerFor(match, library.profile.accountIds);
        const won = me && match.radiantWon !== null ? me.isRadiant === match.radiantWon : null;
        const collectionMatches =
          collectionFilter === "all" ||
          (collectionFilter === "unsorted"
            ? !library.collections.some((collection) => collection.matchIds.includes(match.matchId))
            : library.collections
                .find((collection) => collection.id === collectionFilter)
                ?.matchIds.includes(match.matchId));
        const text = [
          match.matchId,
          match.fileName,
          ...match.players.flatMap((player) => [
            player.name,
            playerNames.get(player.id) ?? "",
            player.hero ?? "",
          ]),
        ]
          .join(" ")
          .toLocaleLowerCase();

        return (
          collectionMatches &&
          (versionFilter === "all" || match.mapVersion === versionFilter) &&
          (resultFilter === "all" || won === (resultFilter === "won")) &&
          (!onlyMine || Boolean(me)) &&
          (importedWithinDays === "all" ||
            match.importedAt >= Date.now() - importedWithinDays * 86_400_000) &&
          (!query || text.includes(query))
        );
      })
      .sort(
        (left, right) =>
          (right.startedAt ?? right.importedAt) - (left.startedAt ?? left.importedAt),
      );
  }, [
    collectionFilter,
    importedWithinDays,
    library.collections,
    library.matches,
    library.profile.accountIds,
    onlyMine,
    resultFilter,
    search,
    versionFilter,
    playerNames,
  ]);

  useEffect(() => () => importRequest.current?.abort(), []);

  useEffect(() => {
    setAccountIds(library.profile.accountIds.join(", "));
    setSelected((ids) => ids.filter((id) => library.matches.some((match) => match.matchId === id)));
    void navigator.storage
      ?.estimate()
      .then((estimate) => setStorage({ usage: estimate.usage, quota: estimate.quota }));
  }, [library]);

  useEffect(() => {
    void navigator.storage
      ?.persisted?.()
      .then(setPersistentStorage)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", close);

    return () => window.removeEventListener("keydown", close);
  }, [open]);

  async function persistMetadata(next: ImportedLibrary) {
    await saveImportedLibraryMetadata(next);
    setLibrary(next);
  }

  function updateQueue(jobId: string, update: Partial<QueueEntry>) {
    setQueue((current) =>
      current.map((entry) => (entry.jobId === jobId ? { ...entry, ...update } : entry)),
    );
  }

  function addFiles(files: readonly File[]) {
    if (importing) {
      return;
    }

    const accepted = files.filter((file) => /\.(dem|bz2)$/i.test(file.name));

    setQueue((current) => {
      const keys = new Set(current.map((entry) => fileKey(entry.file)));

      return [
        ...current,
        ...accepted
          .filter((file) => !keys.has(fileKey(file)))
          .map((file): QueueEntry => ({ jobId: crypto.randomUUID(), file, status: "queued" })),
      ];
    });
    setMessage(
      accepted.length === files.length
        ? null
        : `${files.length - accepted.length} unsupported files skipped`,
    );
  }

  async function importFiles() {
    const pending = queue.filter((entry) =>
      ["queued", "failed", "cancelled"].includes(entry.status),
    );

    if (!pending.length || importing || !ready) {
      return;
    }

    setImporting(true);
    setMessage(null);
    const controller = new AbortController();
    importRequest.current = controller;
    let current = useImportedStore.getState().library;
    let nextWardId = Math.min(
      current.nextWardId ?? -1,
      current.matches.reduce(
        (minimum, match) => match.wards.reduce((value, ward) => Math.min(value, ward.id), minimum),
        0,
      ) - 1,
    );
    const importedIds: number[] = [];
    let duplicates = 0;
    let failures = 0;

    try {
      for (const entry of pending) {
        updateQueue(entry.jobId, { status: "parsing", detail: `Reading ${entry.file.name}` });

        try {
          const match = await runReplayParser(
            entry.file,
            mapVersion,
            entry.jobId,
            (progress) => updateQueue(entry.jobId, { status: "parsing", detail: progress }),
            controller.signal,
          );
          const duplicateIndex = current.matches.findIndex(
            (candidate) =>
              candidate.fileHash === match.fileHash || candidate.matchId === match.matchId,
          );

          if (duplicateIndex >= 0 && !replaceExisting) {
            duplicates += 1;
            updateQueue(entry.jobId, {
              status: "duplicate",
              detail: `Match ${match.matchId} already exists`,
            });
            continue;
          }

          updateQueue(entry.jobId, { status: "saving", detail: "Saving parsed match" });
          match.wards = match.wards.map((ward) => ({ ...ward, id: nextWardId-- }));
          const replacedMatchId = current.matches[duplicateIndex]?.matchId;

          await saveImportedMatch(match, replacedMatchId);

          const matches = [...current.matches];

          if (duplicateIndex >= 0) {
            matches.splice(duplicateIndex, 1, match);
          } else {
            matches.push(match);
          }

          const collections = current.collections.map((collection) =>
            collection.id === importCollectionId
              ? {
                  ...collection,
                  matchIds: [...new Set([...collection.matchIds, match.matchId])],
                  updatedAt: Date.now(),
                }
              : collection,
          );
          current = { ...current, matches, nextWardId, collections };
          await saveImportedLibraryMetadata(current);
          setLibrary(current);
          importedIds.push(match.matchId);
          updateQueue(entry.jobId, { status: "imported", detail: `Match ${match.matchId}` });
        } catch (reason) {
          if (reason instanceof DOMException && reason.name === "AbortError") {
            throw reason;
          }

          failures += 1;
          updateQueue(entry.jobId, {
            status: "failed",
            detail: reason instanceof Error ? reason.message : "Unable to import replay",
          });
        }
      }

      setMessage(`${importedIds.length} imported, ${duplicates} duplicates, ${failures} failed`);

      if (importedIds.length) {
        setSelected(importedIds);
      }
    } catch (reason) {
      const cancelled = reason instanceof DOMException && reason.name === "AbortError";
      setQueue((entries) =>
        entries.map((entry) =>
          entry.status === "parsing"
            ? {
                ...entry,
                status: cancelled ? "cancelled" : "failed",
                detail: cancelled ? "Cancelled" : "Parser stopped",
              }
            : entry,
        ),
      );
      setMessage(cancelled ? "Import cancelled" : "Unable to continue importing replays");
    } finally {
      importRequest.current = null;
      setImporting(false);
    }
  }

  async function createCollection() {
    const name = collectionName.trim();

    if (!name) {
      return;
    }

    const now = Date.now();
    const collection: ImportedCollection = {
      id: crypto.randomUUID(),
      name,
      description: "",
      matchIds: [],
      createdAt: now,
      updatedAt: now,
    };

    await persistMetadata({ ...library, collections: [...library.collections, collection] });
    setImportCollectionId(collection.id);
    setCollectionFilter(collection.id);
    setCollectionName("");
    setCreatingCollection(false);
  }

  async function updateCollection(id: string, update: Partial<ImportedCollection>) {
    const current = useImportedStore.getState().library;
    await persistMetadata({
      ...current,
      collections: current.collections.map((collection) =>
        collection.id === id ? { ...collection, ...update, updatedAt: Date.now() } : collection,
      ),
    });
  }

  async function removeCollection(collection: ImportedCollection) {
    if (!window.confirm(`Delete “${collection.name}”? Its matches will remain in the library.`)) {
      return;
    }
    await persistMetadata({
      ...library,
      collections: library.collections.filter(({ id }) => id !== collection.id),
    });

    if (collectionFilter === collection.id) {
      setCollectionFilter("all");
    }
    if (importCollectionId === collection.id) {
      setImportCollectionId("");
    }
  }

  async function duplicateCollection(collection: ImportedCollection) {
    const now = Date.now();
    await persistMetadata({
      ...library,
      collections: [
        ...library.collections,
        {
          ...collection,
          id: crypto.randomUUID(),
          name: `${collection.name} copy`,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });
  }

  async function renameCollection(collection: ImportedCollection) {
    const name = window.prompt("Collection name", collection.name)?.trim();

    if (name && name !== collection.name) {
      await updateCollection(collection.id, { name });
    }
  }

  async function moveCollection(id: string, direction: -1 | 1) {
    const index = library.collections.findIndex((collection) => collection.id === id);
    const target = index + direction;

    if (index < 0 || target < 0 || target >= library.collections.length) {
      return;
    }

    const collections = [...library.collections];
    [collections[index], collections[target]] = [collections[target]!, collections[index]!];
    await persistMetadata({ ...library, collections });
  }

  async function setMatchesInCollection(
    matchIds: readonly number[],
    id: string,
    included: boolean,
  ) {
    const ids = new Set(matchIds);
    const current = useImportedStore.getState().library;
    await persistMetadata({
      ...current,
      collections: current.collections.map((collection) => {
        if (collection.id !== id) {
          return collection;
        }

        return {
          ...collection,
          updatedAt: Date.now(),
          matchIds: included
            ? [...new Set([...collection.matchIds, ...ids])]
            : collection.matchIds.filter((matchId) => !ids.has(matchId)),
        };
      }),
    });
  }

  async function removeMatches(matchIds: readonly number[]) {
    const ids = new Set(matchIds);

    if (
      !ids.size ||
      !window.confirm(
        `Delete ${ids.size} imported ${ids.size === 1 ? "match" : "matches"}? Original replay files are required to restore them.`,
      )
    ) {
      return;
    }

    const current = useImportedStore.getState().library;
    const next = {
      ...current,
      matches: current.matches.filter((match) => !ids.has(match.matchId)),
      collections: current.collections.map((collection) => ({
        ...collection,
        matchIds: collection.matchIds.filter((id) => !ids.has(id)),
      })),
    };

    await removeImportedMatches([...ids]);
    await persistMetadata(next);
  }

  async function saveProfile() {
    const profile = { accountIds: numericIds(accountIds).map(Number) };
    await persistMetadata({ ...library, profile });
    setMessage(profile.accountIds.length ? "Player identity saved" : "Player identity cleared");
  }

  function showMatches(ids: readonly number[]) {
    const supported = ids.filter((id) =>
      library.matches.some((match) => match.matchId === id && match.mapVersion === mapVersion),
    );

    if (!supported.length) {
      setMessage(`No selected matches use map ${mapVersion}`);

      return;
    }
    onShowMatches(supported);
    setOpen(false);
  }

  function exportCollection(collection: ImportedCollection) {
    const ids = new Set(collection.matchIds);

    downloadImportedLibrary({
      ...library,
      matches: library.matches.filter((match) => ids.has(match.matchId)),
      collections: [collection],
    });
  }

  async function restoreBackup(file: File) {
    try {
      const restored = await readImportedLibraryBackup(file);

      if (
        !window.confirm(
          `Replace this browser's library with ${restored.matches.length} backed-up matches?`,
        )
      ) {
        return;
      }
      await replaceImportedLibrary(restored);
      setLibrary(restored);
      setSelected([]);
      setMessage(`${restored.matches.length} matches restored from backup`);
      setTab("library");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Unable to restore library backup");
    }
  }

  async function protectStorage() {
    if (!navigator.storage?.persist) {
      setMessage("Persistent browser storage is not available");

      return;
    }

    try {
      const granted = await navigator.storage.persist();

      setPersistentStorage(granted);
      setMessage(granted ? "Replay storage protected" : "Storage protection was not granted");
    } catch {
      setMessage("Unable to change browser storage protection");
    }
  }

  async function clearLibrary() {
    const next: ImportedLibrary = {
      ...emptyImportedLibrary,
      profile: library.profile,
    };

    await replaceImportedLibrary(next);
    setLibrary(next);
    setSelected([]);
    setMessage("Replay library cleared");
  }

  const pendingCount = queue.filter((entry) =>
    ["queued", "failed", "cancelled"].includes(entry.status),
  ).length;
  const finishedCount = queue.filter((entry) =>
    ["imported", "duplicate"].includes(entry.status),
  ).length;
  const selectedVisible = visibleMatches.filter((match) => selected.includes(match.matchId));
  const allVisibleSelected =
    visibleMatches.length > 0 && selectedVisible.length === visibleMatches.length;
  const activeCollection = library.collections.find(({ id }) => id === collectionFilter) ?? null;
  const activeCollectionIndex = activeCollection
    ? library.collections.findIndex(({ id }) => id === activeCollection.id)
    : -1;

  function openLibrary() {
    setTab(library.matches.length ? "library" : "import");
    setOpen(true);
  }

  const dialog = (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}
    >
      <section
        aria-label="Replay library"
        aria-modal="true"
        className={`${elevatedSurfaceClass} flex max-h-[min(46rem,calc(100vh-2rem))] w-full max-w-2xl flex-col overflow-hidden`}
        role="dialog"
      >
        <header className="shrink-0 border-b border-white/8 px-5 pt-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-sm font-semibold text-slate-100">Replay library</h3>
            <button
              aria-label="Close replay library"
              className="grid size-9 place-items-center rounded-sm text-xl text-slate-500 hover:bg-white/5 hover:text-slate-200"
              type="button"
              onClick={() => setOpen(false)}
            >
              <BsX />
            </button>
          </div>
          <SwitchNav
            className="mt-4"
            options={tabs.map(({ id, label }) => ({ value: id, label }))}
            value={tab}
            onChange={setTab}
          />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:px-5">
          {tab === "library" ? (
            <div className="mx-auto max-w-3xl">
              <div className="flex gap-2">
                <label className="relative min-w-0 flex-1">
                  <BsSearch className="absolute top-2.5 left-2.5 text-slate-600" />
                  <input
                    aria-label="Search replay library"
                    className={`${formControlClass} min-h-9 pl-8`}
                    placeholder="Match, file, player, or hero"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
              </div>

              <div className="mt-3 flex min-w-0 gap-1">
                <select
                  aria-label="Collection filter"
                  className={`${formControlClass} min-w-0 flex-1`}
                  value={collectionFilter}
                  onChange={(event) => setCollectionFilter(event.target.value)}
                >
                  <option value="all">All matches ({library.matches.length})</option>
                  <option value="unsorted">
                    Unsorted (
                    {
                      library.matches.filter(
                        (match) =>
                          !library.collections.some((collection) =>
                            collection.matchIds.includes(match.matchId),
                          ),
                      ).length
                    }
                    )
                  </option>
                  {library.collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name} ({collection.matchIds.length})
                    </option>
                  ))}
                </select>
                <button
                  aria-label="New collection"
                  className="grid size-9 shrink-0 place-items-center rounded-sm border border-white/10 text-lg text-slate-500 hover:border-white/20 hover:text-slate-200"
                  title="New collection"
                  type="button"
                  onClick={() => setCreatingCollection(true)}
                >
                  +
                </button>
              </div>

              <details className="mt-2 border-y border-white/8 text-xs">
                <summary className="cursor-pointer py-2 text-slate-400 hover:text-slate-200">
                  Filters
                </summary>
                <div className="grid gap-2 pb-3 sm:grid-cols-2">
                  <label className="flex min-h-9 items-center gap-2 text-slate-400">
                    <input
                      checked={onlyMine}
                      className="accent-cyan-400"
                      disabled={!library.profile.accountIds.length}
                      type="checkbox"
                      onChange={(event) => setOnlyMine(event.target.checked)}
                    />
                    My matches
                  </label>
                  <select
                    aria-label="Map version filter"
                    className={formControlClass}
                    value={versionFilter}
                    onChange={(event) =>
                      setVersionFilter(
                        event.target.value === "all" ? "all" : Number(event.target.value),
                      )
                    }
                  >
                    <option value="all">All maps</option>
                    {Object.entries(mapPatchLabels).map(([version, label]) => (
                      <option key={version} value={version}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Match result filter"
                    className={formControlClass}
                    value={resultFilter}
                    onChange={(event) => setResultFilter(event.target.value as typeof resultFilter)}
                  >
                    <option value="all">All results</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </select>
                  <select
                    aria-label="Imported date filter"
                    className={formControlClass}
                    value={importedWithinDays}
                    onChange={(event) =>
                      setImportedWithinDays(
                        event.target.value === "all" ? "all" : Number(event.target.value),
                      )
                    }
                  >
                    <option value="all">Any import date</option>
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                  </select>
                </div>
              </details>

              {creatingCollection ? (
                <div className="mt-3 flex items-center gap-2 border-y border-white/8 py-2">
                  <input
                    autoFocus
                    className={`${formControlClass} min-w-0 flex-1`}
                    placeholder="Collection name"
                    value={collectionName}
                    onChange={(event) => setCollectionName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        void createCollection();
                      }
                      if (event.key === "Escape") {
                        setCreatingCollection(false);
                        setCollectionName("");
                      }
                    }}
                  />
                  <button
                    className={primaryButtonClass}
                    disabled={!collectionName.trim()}
                    type="button"
                    onClick={() => void createCollection()}
                  >
                    Create
                  </button>
                  <button
                    className={secondaryButtonClass}
                    type="button"
                    onClick={() => {
                      setCreatingCollection(false);
                      setCollectionName("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : null}

              {activeCollection ? (
                <details className="mt-2 border-b border-white/8 text-xs">
                  <summary className="cursor-pointer py-2 text-slate-400 hover:text-slate-200">
                    Manage {activeCollection.name}
                  </summary>
                  <div className="flex flex-wrap items-center gap-1.5 pb-2">
                    <span className="mr-auto min-w-0 truncate font-medium text-slate-300">
                      {activeCollection.name}
                      <span className="ml-2 font-normal text-slate-600">
                        {activeCollection.matchIds.length} matches
                      </span>
                    </span>
                    <button
                      aria-label="Move collection up"
                      className="grid size-8 place-items-center text-slate-500 hover:text-slate-200 disabled:text-slate-700"
                      disabled={activeCollectionIndex === 0}
                      title="Move up"
                      type="button"
                      onClick={() => void moveCollection(activeCollection.id, -1)}
                    >
                      <BsArrowUp />
                    </button>
                    <button
                      aria-label="Move collection down"
                      className="grid size-8 place-items-center text-slate-500 hover:text-slate-200 disabled:text-slate-700"
                      disabled={activeCollectionIndex === library.collections.length - 1}
                      title="Move down"
                      type="button"
                      onClick={() => void moveCollection(activeCollection.id, 1)}
                    >
                      <BsArrowDown />
                    </button>
                    <button
                      className="min-h-8 px-2 text-cyan-400 hover:text-cyan-300"
                      type="button"
                      onClick={() => showMatches(activeCollection.matchIds)}
                    >
                      Show
                    </button>
                    <button
                      className="min-h-8 px-2 text-slate-400 hover:text-slate-200"
                      type="button"
                      onClick={() => void renameCollection(activeCollection)}
                    >
                      Rename
                    </button>
                    <button
                      className="min-h-8 px-2 text-slate-400 hover:text-slate-200"
                      type="button"
                      onClick={() => exportCollection(activeCollection)}
                    >
                      Export
                    </button>
                    <button
                      className="min-h-8 px-2 text-slate-400 hover:text-slate-200"
                      type="button"
                      onClick={() => void duplicateCollection(activeCollection)}
                    >
                      Duplicate
                    </button>
                    <button
                      aria-label={`Delete ${activeCollection.name}`}
                      className="grid size-8 place-items-center text-slate-600 hover:text-rose-300"
                      title="Delete collection"
                      type="button"
                      onClick={() => void removeCollection(activeCollection)}
                    >
                      <BsTrash />
                    </button>
                  </div>
                  <textarea
                    aria-label="Collection notes"
                    className="mt-2 min-h-9 w-full resize-y border-0 border-t border-white/6 bg-transparent pt-2 text-[11px] text-slate-400 outline-none placeholder:text-slate-700"
                    placeholder="Add notes"
                    defaultValue={activeCollection.description}
                    key={activeCollection.id}
                    onBlur={(event) =>
                      void updateCollection(activeCollection.id, {
                        description: event.target.value.trim(),
                      })
                    }
                  />
                </details>
              ) : null}

              <div
                className={`mt-2 flex min-h-11 flex-wrap items-center gap-2 border-y border-white/8 py-2 text-xs ${selected.length ? "bg-cyan-400/5 px-2" : ""}`}
              >
                <label className="flex items-center gap-2 text-slate-400">
                  <input
                    checked={allVisibleSelected}
                    className="accent-cyan-400"
                    type="checkbox"
                    onChange={() =>
                      setSelected(
                        allVisibleSelected
                          ? selected.filter(
                              (id) => !visibleMatches.some((match) => match.matchId === id),
                            )
                          : [
                              ...new Set([
                                ...selected,
                                ...visibleMatches.map((match) => match.matchId),
                              ]),
                            ],
                      )
                    }
                  />
                  {selected.length
                    ? `${selected.length} selected`
                    : `${visibleMatches.length} matches`}
                </label>
                {selected.length ? (
                  <>
                    <button
                      className={primaryButtonClass}
                      type="button"
                      onClick={() => showMatches(selected)}
                    >
                      Show
                    </button>
                    <select
                      aria-label="Bulk collection"
                      className={`${formControlClass} min-h-9 w-auto min-w-36`}
                      value={bulkCollectionId}
                      onChange={(event) => setBulkCollectionId(event.target.value)}
                    >
                      <option value="">Choose collection</option>
                      {library.collections.map((collection) => (
                        <option key={collection.id} value={collection.id}>
                          {collection.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className={secondaryButtonClass}
                      disabled={!bulkCollectionId}
                      type="button"
                      onClick={() => void setMatchesInCollection(selected, bulkCollectionId, true)}
                    >
                      Add
                    </button>
                    <button
                      className={secondaryButtonClass}
                      disabled={!bulkCollectionId}
                      type="button"
                      onClick={() => void setMatchesInCollection(selected, bulkCollectionId, false)}
                    >
                      Remove
                    </button>
                    <button
                      aria-label="Delete selected matches"
                      className="ml-auto grid size-9 place-items-center text-slate-600 hover:text-rose-300"
                      title="Delete selected"
                      type="button"
                      onClick={() => void removeMatches(selected)}
                    >
                      <BsTrash />
                    </button>
                  </>
                ) : null}
              </div>

              {!visibleMatches.length ? (
                <div className="py-16 text-center text-sm text-slate-500">
                  No matches match these filters.
                </div>
              ) : (
                <div className="divide-y divide-white/8">
                  {visibleMatches.map((match) => {
                    const me = playerFor(match, library.profile.accountIds);
                    const won =
                      me && match.radiantWon !== null ? me.isRadiant === match.radiantWon : null;
                    const supported = match.mapVersion === mapVersion;

                    return (
                      <article
                        className={`cursor-pointer px-2 py-3 transition ${selected.includes(match.matchId) ? "bg-cyan-400/[0.07]" : "hover:bg-white/[0.025]"}`}
                        key={match.fileHash}
                        onClick={(event) => {
                          if (
                            event.target instanceof Element &&
                            event.target.closest("button, input, select, textarea, label, summary")
                          ) {
                            return;
                          }
                          setSelected((current) =>
                            current.includes(match.matchId)
                              ? current.filter((id) => id !== match.matchId)
                              : [...current, match.matchId],
                          );
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            aria-label={`Select match ${match.matchId}`}
                            checked={selected.includes(match.matchId)}
                            className="mt-0.5 accent-cyan-400"
                            type="checkbox"
                            onChange={() =>
                              setSelected((current) =>
                                current.includes(match.matchId)
                                  ? current.filter((id) => id !== match.matchId)
                                  : [...current, match.matchId],
                              )
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-xs font-medium text-slate-200">
                                Match {match.matchId}
                              </p>
                              {!supported ? (
                                <span className="text-[10px] text-amber-300">
                                  {mapPatchLabel(match.mapVersion)}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-[11px] text-slate-400">
                              {matchSummary(match, won)}
                            </p>
                            <p className="mt-1 truncate text-[11px] text-slate-500">
                              {me
                                ? `${playerNames.get(me.id) ?? me.name}, ${me.hero ?? "Unknown hero"}`
                                : match.fileName}
                            </p>
                          </div>
                          <button
                            className="min-h-8 shrink-0 px-2 text-xs text-cyan-400 hover:text-cyan-300 disabled:text-slate-700"
                            disabled={!supported}
                            type="button"
                            onClick={() => showMatches([match.matchId])}
                          >
                            Show
                          </button>
                          <button
                            aria-label={`Delete match ${match.matchId}`}
                            className="grid size-9 shrink-0 place-items-center text-slate-600 hover:text-rose-300"
                            type="button"
                            onClick={() => void removeMatches([match.matchId])}
                          >
                            <BsTrash />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          {tab === "import" ? (
            <div className="mx-auto max-w-2xl">
              <label
                className={`grid min-h-32 cursor-pointer place-items-center rounded-sm border border-dashed px-4 text-center outline-none transition focus-within:border-cyan-300/60 ${dragging ? "border-cyan-300/60 bg-cyan-400/5" : "border-white/15 hover:border-cyan-300/35 hover:bg-white/[0.02]"}`}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setDragging(false);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  addFiles(Array.from(event.dataTransfer.files));
                }}
              >
                <input
                  accept=".dem,.bz2,.dem.bz2"
                  className="sr-only"
                  key={fileInputKey}
                  multiple
                  type="file"
                  onChange={(event) => {
                    addFiles(Array.from(event.target.files ?? []));
                    setFileInputKey((value) => value + 1);
                  }}
                />
                <span>
                  <BsFileEarmarkArrowUp className="mx-auto text-xl text-slate-500" />
                  <span className="mt-2 block text-xs text-slate-300">
                    Drop replays here or choose files
                  </span>
                  <span className="mt-1 block text-[11px] text-slate-600">
                    .dem or .dem.bz2, {mapPatchLabel(mapVersion)}
                  </span>
                </span>
              </label>

              <div className="mt-4 divide-y divide-white/8 border-y border-white/8">
                <label className="grid min-h-11 grid-cols-[8rem_minmax(0,1fr)] items-center gap-3 text-xs">
                  <span className="text-slate-500">Collection</span>
                  <select
                    className="min-w-0 justify-self-end bg-transparent text-right text-slate-200 outline-none [color-scheme:dark] [&>option]:bg-slate-900"
                    value={importCollectionId}
                    onChange={(event) => setImportCollectionId(event.target.value)}
                  >
                    <option value="">Unsorted</option>
                    {library.collections.map((collection) => (
                      <option key={collection.id} value={collection.id}>
                        {collection.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex min-h-11 items-center justify-between gap-3 text-xs">
                  <span className="text-slate-500">Replace existing matches</span>
                  <input
                    checked={replaceExisting}
                    className="accent-cyan-400"
                    type="checkbox"
                    onChange={(event) => setReplaceExisting(event.target.checked)}
                  />
                </label>
              </div>

              {queue.length ? (
                <div className="mt-5 divide-y divide-white/8 border-y border-white/8">
                  {queue.map((entry) => (
                    <div
                      className="flex min-h-12 items-center gap-3 py-2 text-xs"
                      key={entry.jobId}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-slate-300">{entry.file.name}</p>
                        <p className="truncate text-[11px] text-slate-600">
                          {bytes(entry.file.size)}
                          {entry.detail ? `, ${entry.detail}` : ""}
                        </p>
                      </div>
                      {entry.status === "duplicate" ? (
                        <button
                          className="text-[11px] text-amber-300 hover:text-amber-200"
                          type="button"
                          onClick={() => {
                            setSearch(entry.detail?.match(/\d+/)?.[0] ?? "");
                            setCollectionFilter("all");
                            setVersionFilter("all");
                            setTab("library");
                          }}
                        >
                          View match
                        </button>
                      ) : (
                        <span
                          className={`text-[11px] ${entry.status === "failed" ? "text-rose-300" : entry.status === "imported" ? "text-emerald-300" : "text-slate-500"}`}
                        >
                          {entry.status === "parsing"
                            ? "Parsing"
                            : entry.status === "saving"
                              ? "Saving"
                              : entry.status === "imported"
                                ? "Imported"
                                : entry.status === "cancelled"
                                  ? "Cancelled"
                                  : entry.status === "failed"
                                    ? "Failed"
                                    : "Ready"}
                        </span>
                      )}
                      {!importing ? (
                        <button
                          aria-label={`Remove ${entry.file.name}`}
                          className="grid size-8 place-items-center text-slate-600 hover:text-slate-300"
                          type="button"
                          onClick={() =>
                            setQueue((current) => current.filter((item) => item !== entry))
                          }
                        >
                          <BsX />
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {queue.length ? (
                <div className="sticky bottom-0 z-10 mt-4 flex min-h-14 items-center gap-3 border-t border-white/10 bg-slate-950/95 py-2 backdrop-blur-sm">
                  {finishedCount && !importing ? (
                    <button
                      className="text-xs text-slate-500 hover:text-slate-300"
                      type="button"
                      onClick={() =>
                        setQueue((current) =>
                          current.filter(
                            (entry) => !["imported", "duplicate"].includes(entry.status),
                          ),
                        )
                      }
                    >
                      Clear finished
                    </button>
                  ) : null}
                  <div className="ml-auto flex items-center gap-2">
                    {importing ? (
                      <button
                        className={secondaryButtonClass}
                        type="button"
                        onClick={() => importRequest.current?.abort()}
                      >
                        Cancel
                      </button>
                    ) : null}
                    <button
                      className={primaryButtonClass}
                      disabled={!pendingCount || importing || !ready}
                      type="button"
                      onClick={() => void importFiles()}
                    >
                      <BsFileEarmarkArrowUp />
                      {importing
                        ? "Importing…"
                        : `Import ${pendingCount} ${pendingCount === 1 ? "replay" : "replays"}`}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === "settings" ? (
            <div className="mx-auto max-w-2xl">
              <section>
                <h4 className="mb-2 text-xs font-medium text-slate-300">Player</h4>
                <div className="divide-y divide-white/8 border-y border-white/8">
                  <label className="grid min-h-12 grid-cols-[8rem_minmax(0,1fr)] items-center gap-3 text-xs">
                    <span className="text-slate-500">Identity</span>
                    <select
                      className="min-w-0 justify-self-end bg-transparent text-right text-slate-200 outline-none [color-scheme:dark] [&>option]:bg-slate-900"
                      value={library.profile.accountIds[0] ?? ""}
                      onChange={(event) => {
                        const ids = event.target.value ? [Number(event.target.value)] : [];
                        setAccountIds(ids.join(", "));
                        void persistMetadata({ ...library, profile: { accountIds: ids } });
                      }}
                    >
                      <option value="">Not selected</option>
                      {players.map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.name} (
                          {
                            library.matches.filter((match) =>
                              match.players.some((candidate) => candidate.id === player.id),
                            ).length
                          }
                          )
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid min-h-12 grid-cols-[8rem_minmax(0,1fr)] items-center gap-3 text-xs">
                    <label className="text-slate-500" htmlFor="imported-account-ids">
                      Account IDs
                    </label>
                    <div className="flex min-w-0 items-center gap-2">
                      <input
                        id="imported-account-ids"
                        className={`${formControlClass} min-w-0 flex-1`}
                        placeholder="Steam account IDs"
                        value={accountIds}
                        onChange={(event) => setAccountIds(event.target.value)}
                      />
                      <button
                        className={secondaryButtonClass}
                        type="button"
                        onClick={() => void saveProfile()}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-slate-600">
                  Used for My matches, perspective filters, and results.
                </p>
              </section>

              <section className="mt-6">
                <h4 className="mb-2 text-xs font-medium text-slate-300">Storage</h4>
                <div className="divide-y divide-white/8 border-y border-white/8 text-xs">
                  <div className="flex min-h-12 items-center justify-between gap-3">
                    <span className="text-slate-500">Browser storage</span>
                    <span className="text-slate-300">
                      {bytes(storage.usage)}
                      {storage.quota ? ` of ${bytes(storage.quota)}` : ""}
                    </span>
                  </div>
                  <div className="flex min-h-12 items-center justify-between gap-3">
                    <div>
                      <p className="text-slate-500">Protect replay data</p>
                      <p className="mt-0.5 text-[11px] text-slate-600">
                        Prevent automatic browser cleanup
                      </p>
                    </div>
                    {persistentStorage ? (
                      <span className="text-emerald-300">Enabled</span>
                    ) : (
                      <button
                        className={secondaryButtonClass}
                        type="button"
                        onClick={() => void protectStorage()}
                      >
                        Enable
                      </button>
                    )}
                  </div>
                  <div className="flex min-h-14 flex-wrap items-center gap-2 py-2">
                    <input
                      ref={backupInput}
                      accept="application/json,.json"
                      className="hidden"
                      type="file"
                      onChange={(event) => {
                        const file = event.target.files?.[0];

                        if (file) {
                          void restoreBackup(file);
                        }
                        event.target.value = "";
                      }}
                    />
                    <button
                      className={secondaryButtonClass}
                      type="button"
                      onClick={() => downloadImportedLibrary(library)}
                    >
                      <BsDownload /> Export
                    </button>
                    <button
                      className={secondaryButtonClass}
                      type="button"
                      onClick={() => backupInput.current?.click()}
                    >
                      <BsUpload /> Restore
                    </button>
                    <button
                      className={`${dangerButtonClass} ml-auto`}
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Delete every imported match and collection from this browser?",
                          )
                        ) {
                          void clearLibrary();
                        }
                      }}
                    >
                      <BsTrash /> Clear library
                    </button>
                  </div>
                </div>
                {storage.usage && storage.quota && storage.usage / storage.quota > 0.8 ? (
                  <p className="mt-2 text-xs text-amber-300">
                    Storage is nearly full. Export a backup before importing more replays.
                  </p>
                ) : null}
              </section>
            </div>
          ) : null}

          {message ? (
            <p className="mt-4 whitespace-pre-wrap border-t border-white/10 pt-3 text-xs text-slate-400">
              {message}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );

  return (
    <>
      <button
        className="inline-flex min-h-7 items-center gap-1.5 rounded-sm px-1.5 text-[11px] text-cyan-400 hover:bg-cyan-400/5 hover:text-cyan-300"
        title={library.matches.length ? "Manage imported replays" : "Import replay files"}
        type="button"
        onClick={openLibrary}
      >
        <BsFileEarmarkArrowUp /> {library.matches.length ? "Manage" : "Import replays"}
      </button>
      {open ? createPortal(dialog, document.body) : null}
    </>
  );
}
