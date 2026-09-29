import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BsArrowDown,
  BsArrowUp,
  BsCollection,
  BsDownload,
  BsFileEarmarkArrowUp,
  BsGear,
  BsSearch,
  BsTrash,
  BsUpload,
  BsX,
} from "react-icons/bs";
import {
  elevatedSurfaceClass,
  fieldControlClass,
  formControlClass,
  SwitchNav,
} from "../components/ui";
import { numericIds } from "../dataset/model";
import type { ImportedCollection, ImportedLibrary, ImportedMatch } from "./model";
import runReplayParser from "./runReplayParser";
import { downloadImportedLibrary, readImportedLibraryBackup, saveImportedLibrary } from "./storage";
import { useImportedStore } from "./state";

type ImportedTab = "library" | "import" | "settings";
type QueueStatus =
  "queued" | "parsing" | "saving" | "imported" | "duplicate" | "failed" | "cancelled";
type QueueEntry = { file: File; status: QueueStatus; detail?: string };
type CollectionFilter = string;

const tabs: { id: ImportedTab; label: string }[] = [
  { id: "library", label: "Library" },
  { id: "import", label: "Import" },
  { id: "settings", label: "Settings" },
];

const mapLabels: Record<number, string> = { 0: "2023", 1: "2024", 2: "2026" };

const primaryButtonClass =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-sm bg-cyan-500/15 px-3 py-2 text-xs font-medium text-cyan-200 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-35";
const secondaryButtonClass =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-sm border border-white/10 bg-white/[0.025] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-35";
const dangerButtonClass =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-sm border border-rose-400/20 px-3 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-35";
const panelClass = "rounded-sm border border-white/8 bg-white/[0.025] p-4";

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
  const [accountIds, setAccountIds] = useState(library.profile.accountIds.join(", "));
  const [search, setSearch] = useState("");
  const [collectionFilter, setCollectionFilter] = useState<CollectionFilter>("all");
  const [resultFilter, setResultFilter] = useState<"all" | "won" | "lost">("all");
  const [importedWithinDays, setImportedWithinDays] = useState<"all" | number>("all");
  const [versionFilter, setVersionFilter] = useState<"all" | number>(mapVersion);
  const [onlyMine, setOnlyMine] = useState(false);
  const [warningsOnly, setWarningsOnly] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkCollectionId, setBulkCollectionId] = useState("");
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [storage, setStorage] = useState<{ usage: number | undefined; quota: number | undefined }>({
    usage: undefined,
    quota: undefined,
  });
  const importRequest = useRef<AbortController | null>(null);
  const backupInput = useRef<HTMLInputElement>(null);

  const players = useMemo(
    () =>
      [
        ...new Map(
          library.matches.flatMap((match) => match.players).map((player) => [player.id, player]),
        ).values(),
      ].sort((left, right) => left.name.localeCompare(right.name)),
    [library.matches],
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
          ...match.players.flatMap((player) => [player.name, player.hero ?? ""]),
        ]
          .join(" ")
          .toLocaleLowerCase();

        return (
          collectionMatches &&
          (versionFilter === "all" || match.mapVersion === versionFilter) &&
          (resultFilter === "all" || won === (resultFilter === "won")) &&
          (!onlyMine || Boolean(me)) &&
          (!warningsOnly || (match.warnings?.length ?? 0) > 0) &&
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
    warningsOnly,
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

  async function persist(next: ImportedLibrary) {
    await saveImportedLibrary(next);
    setLibrary(next);
  }

  function updateQueue(key: string, update: Partial<QueueEntry>) {
    setQueue((current) =>
      current.map((entry) => (fileKey(entry.file) === key ? { ...entry, ...update } : entry)),
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
          .map((file): QueueEntry => ({ file, status: "queued" })),
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
    const names = new Map(pending.map((entry) => [entry.file.name, fileKey(entry.file)]));

    try {
      const { matches: parsed, errors } = await runReplayParser(
        pending.map((entry) => entry.file),
        mapVersion,
        (progress) => {
          const name = [...names.keys()].find((candidate) => progress.endsWith(candidate));

          if (name) {
            updateQueue(names.get(name)!, { status: "parsing", detail: progress });
          }
        },
        controller.signal,
      );
      const current = useImportedStore.getState().library;
      const nextMatches = [...current.matches];
      let nextWardId = Math.min(
        current.nextWardId ?? -1,
        current.matches.reduce(
          (minimum, match) =>
            match.wards.reduce((value, ward) => Math.min(value, ward.id), minimum),
          0,
        ) - 1,
      );
      const importedIds: number[] = [];

      for (const match of parsed) {
        const key = names.get(match.fileName);

        if (key) {
          updateQueue(key, { status: "saving", detail: "Saving parsed match" });
        }

        const duplicateIndex = nextMatches.findIndex(
          (candidate) =>
            candidate.fileHash === match.fileHash || candidate.matchId === match.matchId,
        );

        if (duplicateIndex >= 0 && !replaceExisting) {
          if (key) {
            updateQueue(key, {
              status: "duplicate",
              detail: `Match ${match.matchId} already exists`,
            });
          }
          continue;
        }

        match.wards = match.wards.map((ward) => ({ ...ward, id: nextWardId-- }));

        if (duplicateIndex >= 0) {
          nextMatches.splice(duplicateIndex, 1, match);
        } else {
          nextMatches.push(match);
        }
        importedIds.push(match.matchId);

        if (key) {
          updateQueue(key, { status: "imported", detail: `Match ${match.matchId}` });
        }
      }

      for (const error of errors) {
        const name = [...names.keys()].find((candidate) => error.startsWith(`${candidate}:`));

        if (name) {
          updateQueue(names.get(name)!, { status: "failed", detail: error.slice(name.length + 2) });
        }
      }

      const collections = current.collections.map((collection) =>
        collection.id === importCollectionId
          ? {
              ...collection,
              matchIds: [...new Set([...collection.matchIds, ...importedIds])],
              updatedAt: Date.now(),
            }
          : collection,
      );
      await persist({ ...current, matches: nextMatches, nextWardId, collections });
      setMessage(
        `${importedIds.length} imported, ${parsed.length - importedIds.length} duplicates, ${errors.length} failed`,
      );

      if (importedIds.length) {
        setSelected(importedIds);
      }
    } catch (reason) {
      const cancelled = reason instanceof DOMException && reason.name === "AbortError";
      setQueue((current) =>
        current.map((entry) =>
          ["parsing", "saving"].includes(entry.status)
            ? {
                ...entry,
                status: cancelled ? "cancelled" : "failed",
                detail: cancelled ? "Cancelled" : "Parser stopped",
              }
            : entry,
        ),
      );
      setMessage(
        cancelled
          ? "Import cancelled"
          : reason instanceof Error
            ? reason.message
            : "Unable to import matches",
      );
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

    await persist({ ...library, collections: [...library.collections, collection] });
    setImportCollectionId(collection.id);
    setCollectionFilter(collection.id);
    setCollectionName("");
  }

  async function updateCollection(id: string, update: Partial<ImportedCollection>) {
    const current = useImportedStore.getState().library;
    await persist({
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
    await persist({
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
    await persist({
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
    await persist({ ...library, collections });
  }

  async function setMatchesInCollection(
    matchIds: readonly number[],
    id: string,
    included: boolean,
  ) {
    const ids = new Set(matchIds);
    const current = useImportedStore.getState().library;
    await persist({
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
    await persist({
      ...library,
      matches: library.matches.filter((match) => !ids.has(match.matchId)),
      collections: library.collections.map((collection) => ({
        ...collection,
        matchIds: collection.matchIds.filter((id) => !ids.has(id)),
      })),
    });
  }

  async function saveProfile() {
    const profile = { accountIds: numericIds(accountIds).map(Number) };
    await persist({ ...library, profile });
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
      await persist(restored);
      setSelected([]);
      setMessage(`${restored.matches.length} matches restored from backup`);
      setTab("library");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Unable to restore library backup");
    }
  }

  const selectedVisible = visibleMatches.filter((match) => selected.includes(match.matchId));
  const allVisibleSelected =
    visibleMatches.length > 0 && selectedVisible.length === visibleMatches.length;

  const dialog = (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}
    >
      <section
        aria-label="Replay library"
        aria-modal="true"
        className={`${elevatedSurfaceClass} flex max-h-[min(50rem,calc(100vh-2rem))] w-full max-w-5xl flex-col overflow-hidden`}
        role="dialog"
      >
        <header className="shrink-0 border-b border-white/8 px-5 pt-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Replay library</h3>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {library.matches.filter((match) => match.mapVersion === mapVersion).length} ready
                for map {mapVersion}, {library.matches.length} total
              </p>
            </div>
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
            className="mt-4 max-w-md"
            options={tabs.map(({ id, label }) => ({
              value: id,
              label:
                id === "library" && library.matches.length
                  ? `${label} ${library.matches.length}`
                  : label,
            }))}
            value={tab}
            onChange={setTab}
          />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:px-5">
          {tab === "library" ? (
            <div className="grid min-h-[30rem] gap-5 md:grid-cols-[13rem_minmax(0,1fr)]">
              <aside className="border-b border-white/8 pb-4 md:border-r md:border-b-0 md:pr-4 md:pb-0">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-300">Collections</p>
                  <button
                    className="text-xs text-cyan-400 hover:text-cyan-300"
                    type="button"
                    onClick={() => document.getElementById("new-imported-collection")?.focus()}
                  >
                    New
                  </button>
                </div>
                {(
                  [
                    ["all", "All matches", library.matches.length],
                    [
                      "unsorted",
                      "Unsorted",
                      library.matches.filter(
                        (match) =>
                          !library.collections.some((collection) =>
                            collection.matchIds.includes(match.matchId),
                          ),
                      ).length,
                    ],
                  ] as const
                ).map(([id, name, count]) => (
                  <button
                    className={`mb-1 flex min-h-9 w-full items-center justify-between rounded-sm px-3 py-2 text-left text-xs ${collectionFilter === id ? "bg-cyan-400/10 font-medium text-cyan-200" : "text-slate-400 hover:bg-white/4"}`}
                    key={id}
                    type="button"
                    onClick={() => setCollectionFilter(id)}
                  >
                    <span>{name}</span>
                    <span className="text-[10px] text-slate-600">{count}</span>
                  </button>
                ))}
                <div className="mt-1 space-y-0.5">
                  {library.collections.map((collection, index) => (
                    <div
                      className={`group rounded-sm ${collectionFilter === collection.id ? "bg-cyan-400/10" : "hover:bg-white/4"}`}
                      key={collection.id}
                    >
                      <button
                        className={`flex min-h-9 w-full items-center justify-between px-3 py-2 text-left text-xs ${collectionFilter === collection.id ? "font-medium text-cyan-200" : "text-slate-400"}`}
                        type="button"
                        onClick={() => setCollectionFilter(collection.id)}
                      >
                        <span className="truncate">{collection.name}</span>
                        <span className="text-[10px] text-slate-600">
                          {collection.matchIds.length}
                        </span>
                      </button>
                      {collectionFilter === collection.id ? (
                        <div className="grid grid-cols-2 gap-1.5 border-t border-white/5 p-2 text-xs">
                          <button
                            aria-label="Move collection up"
                            className={secondaryButtonClass}
                            disabled={index === 0}
                            type="button"
                            onClick={() => void moveCollection(collection.id, -1)}
                          >
                            <BsArrowUp /> Up
                          </button>
                          <button
                            aria-label="Move collection down"
                            className={secondaryButtonClass}
                            disabled={index === library.collections.length - 1}
                            type="button"
                            onClick={() => void moveCollection(collection.id, 1)}
                          >
                            <BsArrowDown /> Down
                          </button>
                          <button
                            className={`${primaryButtonClass} col-span-2`}
                            type="button"
                            onClick={() => showMatches(collection.matchIds)}
                          >
                            Show collection on map
                          </button>
                          <button
                            className={secondaryButtonClass}
                            type="button"
                            onClick={() => void renameCollection(collection)}
                          >
                            Rename
                          </button>
                          <button
                            className={secondaryButtonClass}
                            type="button"
                            onClick={() => void duplicateCollection(collection)}
                          >
                            Duplicate
                          </button>
                          <button
                            className={secondaryButtonClass}
                            type="button"
                            onClick={() => exportCollection(collection)}
                          >
                            Export
                          </button>
                          <button
                            className={dangerButtonClass}
                            type="button"
                            onClick={() => void removeCollection(collection)}
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid gap-2">
                  <input
                    id="new-imported-collection"
                    className={`${formControlClass} min-w-0 px-3 py-2 text-xs`}
                    placeholder="New collection"
                    value={collectionName}
                    onChange={(event) => setCollectionName(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && void createCollection()}
                  />
                  <button
                    className={secondaryButtonClass}
                    disabled={!collectionName.trim()}
                    type="button"
                    onClick={() => void createCollection()}
                  >
                    Create collection
                  </button>
                </div>
                {collectionFilter !== "all" && collectionFilter !== "unsorted" ? (
                  <div className="mt-2">
                    <p className="mb-2 text-[11px] leading-relaxed text-slate-500">
                      {Object.entries(
                        library.collections
                          .find(({ id }) => id === collectionFilter)
                          ?.matchIds.reduce<Record<number, number>>((counts, matchId) => {
                            const version = library.matches.find(
                              (match) => match.matchId === matchId,
                            )?.mapVersion;

                            if (version !== undefined) {
                              counts[version] = (counts[version] ?? 0) + 1;
                            }

                            return counts;
                          }, {}) ?? {},
                      )
                        .map(
                          ([version, count]) =>
                            `${mapLabels[Number(version)] ?? version}: ${count}`,
                        )
                        .join(", ") || "Empty collection"}
                    </p>
                    <textarea
                      aria-label="Collection notes"
                      className={`${formControlClass} min-h-20 resize-y text-xs`}
                      placeholder="Collection notes"
                      defaultValue={
                        library.collections.find(({ id }) => id === collectionFilter)?.description
                      }
                      key={collectionFilter}
                      onBlur={(event) =>
                        void updateCollection(collectionFilter, {
                          description: event.target.value.trim(),
                        })
                      }
                    />
                  </div>
                ) : null}
              </aside>

              <section className="min-w-0">
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="relative block sm:col-span-3">
                    <BsSearch className="absolute top-2 left-2 text-slate-600" />
                    <input
                      aria-label="Search replay library"
                      className={`${formControlClass} pl-7`}
                      placeholder="Match, file, player, or hero"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
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
                    {Object.entries(mapLabels).map(([version, label]) => (
                      <option key={version} value={version}>
                        {label} map
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
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <label className="flex min-h-9 items-center gap-2 rounded-sm border border-white/8 px-3">
                    <input
                      checked={onlyMine}
                      disabled={!library.profile.accountIds.length}
                      type="checkbox"
                      onChange={(event) => setOnlyMine(event.target.checked)}
                    />{" "}
                    My matches
                  </label>
                  <label className="flex min-h-9 items-center gap-2 rounded-sm border border-white/8 px-3">
                    <input
                      checked={warningsOnly}
                      type="checkbox"
                      onChange={(event) => setWarningsOnly(event.target.checked)}
                    />{" "}
                    Has warnings
                  </label>
                  <button
                    className={`${secondaryButtonClass} ml-auto`}
                    type="button"
                    onClick={() => setTab("settings")}
                  >
                    <BsGear className="inline" /> Identity & storage
                  </button>
                </div>

                <div
                  className={`mt-4 flex min-h-12 flex-wrap items-center gap-2 ${selected.length ? "rounded-sm border border-cyan-400/15 bg-cyan-400/5 p-2" : "border-y border-white/8 py-2"} text-xs`}
                >
                  <label className="flex items-center gap-2 text-slate-400">
                    <input
                      checked={allVisibleSelected}
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
                        Show on map
                      </button>
                      <select
                        aria-label="Bulk collection"
                        className={`${formControlClass} min-h-9`}
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
                        disabled={!bulkCollectionId}
                        className={secondaryButtonClass}
                        type="button"
                        onClick={() =>
                          void setMatchesInCollection(selected, bulkCollectionId, true)
                        }
                      >
                        Add
                      </button>
                      <button
                        disabled={!bulkCollectionId}
                        className={secondaryButtonClass}
                        type="button"
                        onClick={() =>
                          void setMatchesInCollection(selected, bulkCollectionId, false)
                        }
                      >
                        Remove
                      </button>
                      <button
                        className={`${dangerButtonClass} ml-auto`}
                        type="button"
                        onClick={() => void removeMatches(selected)}
                      >
                        <BsTrash className="inline" /> Delete
                      </button>
                    </>
                  ) : null}
                </div>

                {!visibleMatches.length ? (
                  <div className="py-16 text-center text-sm text-slate-500">
                    No matches match these filters.
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {visibleMatches.map((match) => {
                      const me = playerFor(match, library.profile.accountIds);
                      const won =
                        me && match.radiantWon !== null ? me.isRadiant === match.radiantWon : null;
                      const supported = match.mapVersion === mapVersion;
                      const memberships = library.collections.filter((collection) =>
                        collection.matchIds.includes(match.matchId),
                      );

                      return (
                        <article
                          className={`cursor-pointer rounded-sm border p-3 transition ${selected.includes(match.matchId) ? "border-cyan-400/35 bg-cyan-400/[0.07]" : "border-white/8 bg-slate-950/35 hover:border-white/15"}`}
                          key={match.fileHash}
                          onClick={(event) => {
                            if (
                              event.target instanceof Element &&
                              event.target.closest(
                                "button, input, select, textarea, label, summary",
                              )
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
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${supported ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}
                                >
                                  {supported ? "Ready" : `Map ${match.mapVersion}`}
                                </span>
                                {(match.warnings?.length ?? 0) > 0 ? (
                                  <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-300">
                                    {match.warnings!.length} warnings
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1.5 text-[11px] text-slate-400">
                                {match.startedAt === null
                                  ? "Date unknown"
                                  : new Date(match.startedAt).toLocaleDateString()}{" "}
                                , {duration(match.duration)}, {match.wards.length} wards
                                {won === null ? "" : won ? ", Won" : ", Lost"}
                              </p>
                              <p className="mt-1 truncate text-[11px] text-slate-500">
                                {me ? `${me.name}, ${me.hero ?? "Unknown hero"}` : match.fileName}
                              </p>
                              <details className="mt-2 rounded-sm bg-white/[0.025] px-2 py-1.5">
                                <summary className="cursor-pointer text-[11px] text-slate-400 hover:text-slate-200">
                                  <BsCollection className="mr-1 inline" />
                                  {memberships.length
                                    ? memberships.map(({ name }) => name).join(", ")
                                    : "Unsorted"}
                                </summary>
                                <div className="mt-1 grid gap-1 sm:grid-cols-2">
                                  {library.collections.length ? (
                                    library.collections.map((collection) => {
                                      const included = collection.matchIds.includes(match.matchId);

                                      return (
                                        <label
                                          className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-400"
                                          key={collection.id}
                                        >
                                          <input
                                            aria-label={`${included ? "Remove" : "Add"} match ${match.matchId} ${included ? "from" : "to"} ${collection.name}`}
                                            checked={included}
                                            className="accent-cyan-400"
                                            type="checkbox"
                                            onChange={(event) =>
                                              void setMatchesInCollection(
                                                [match.matchId],
                                                collection.id,
                                                event.target.checked,
                                              )
                                            }
                                          />
                                          <span className="truncate">{collection.name}</span>
                                        </label>
                                      );
                                    })
                                  ) : (
                                    <button
                                      className="text-left text-cyan-400"
                                      type="button"
                                      onClick={() =>
                                        document.getElementById("new-imported-collection")?.focus()
                                      }
                                    >
                                      Create a collection
                                    </button>
                                  )}
                                </div>
                              </details>
                            </div>
                            <button
                              disabled={!supported}
                              className={`${primaryButtonClass} shrink-0`}
                              type="button"
                              onClick={() => showMatches([match.matchId])}
                            >
                              Show on map
                            </button>
                            <button
                              aria-label={`Delete match ${match.matchId}`}
                              className="grid size-9 shrink-0 place-items-center rounded-sm text-slate-600 hover:bg-rose-400/10 hover:text-rose-300"
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
              </section>
            </div>
          ) : null}

          {tab === "import" ? (
            <div className="mx-auto max-w-2xl">
              <div className="mb-5">
                <h4 className="text-sm font-semibold text-slate-100">Import replay files</h4>
                <p className="mt-1 text-xs text-slate-500">
                  Select one or more Dota replay files. Parsing and storage happen in this browser.
                </p>
              </div>
              <div className={`${panelClass} mb-4 grid gap-3 sm:grid-cols-2`}>
                <label className="text-xs font-medium text-slate-300">
                  Add imported matches to
                  <select
                    className={fieldControlClass}
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
                <label className="flex items-center gap-2 text-xs text-slate-400 sm:pt-5">
                  <input
                    checked={replaceExisting}
                    className="accent-cyan-400"
                    type="checkbox"
                    onChange={(event) => setReplaceExisting(event.target.checked)}
                  />{" "}
                  Replace existing match when reimported
                </label>
              </div>
              <label
                className={`grid min-h-44 cursor-pointer place-items-center rounded-sm border border-dashed px-4 text-center transition ${dragging ? "border-cyan-300/60 bg-cyan-400/5" : "border-white/15 bg-slate-950/35 hover:border-cyan-300/35 hover:bg-white/[0.025]"}`}
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
                  <BsFileEarmarkArrowUp className="mx-auto text-2xl text-slate-500" />
                  <span className="mt-2 block text-xs font-medium text-slate-300">
                    Drop replay files here, or click to browse
                  </span>
                  <span className="mt-1 block text-[11px] text-slate-600">
                    .dem and .dem.bz2, parsed locally for map {mapVersion}
                  </span>
                </span>
              </label>
              {queue.length ? (
                <div className="mt-4 space-y-2">
                  {queue.map((entry) => (
                    <div
                      className="flex items-center gap-3 rounded-sm border border-white/8 bg-white/[0.025] px-3 py-2.5 text-xs"
                      key={fileKey(entry.file)}
                    >
                      <BsFileEarmarkArrowUp className="shrink-0 text-slate-600" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-slate-300">{entry.file.name}</p>
                        <p className="truncate text-[10px] text-slate-600">
                          {bytes(entry.file.size)}
                          {entry.detail ? `, ${entry.detail}` : ""}
                        </p>
                      </div>
                      {entry.status === "duplicate" ? (
                        <button
                          className="text-[10px] text-amber-300 uppercase"
                          type="button"
                          onClick={() => {
                            setSearch(entry.detail?.match(/\d+/)?.[0] ?? "");
                            setCollectionFilter("all");
                            setVersionFilter("all");
                            setTab("library");
                          }}
                        >
                          View duplicate
                        </button>
                      ) : (
                        <span
                          className={`text-[10px] uppercase ${entry.status === "failed" ? "text-rose-300" : entry.status === "imported" ? "text-emerald-400" : "text-slate-500"}`}
                        >
                          {entry.status}
                        </span>
                      )}
                      {!importing ? (
                        <button
                          aria-label={`Remove ${entry.file.name}`}
                          className="text-slate-600"
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
              <div className="mt-4 flex gap-2">
                <button
                  className={`${primaryButtonClass} min-w-0 flex-1`}
                  disabled={
                    !queue.some((entry) =>
                      ["queued", "failed", "cancelled"].includes(entry.status),
                    ) ||
                    importing ||
                    !ready
                  }
                  type="button"
                  onClick={() => void importFiles()}
                >
                  {importing ? "Parsing replays…" : "Import queued files"}
                </button>
                {importing ? (
                  <button
                    className={secondaryButtonClass}
                    type="button"
                    onClick={() => importRequest.current?.abort()}
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    className={secondaryButtonClass}
                    type="button"
                    onClick={() =>
                      setQueue((current) =>
                        current.filter(
                          (entry) => !["imported", "duplicate"].includes(entry.status),
                        ),
                      )
                    }
                  >
                    Clear completed
                  </button>
                )}
              </div>
              <p className="mt-3 text-center text-[10px] text-slate-500">
                Choose the replay's terrain map before importing. Files stay on this device.
              </p>
            </div>
          ) : null}

          {tab === "settings" ? (
            <div className="mx-auto max-w-2xl space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-100">Library settings</h4>
                <p className="mt-1 text-xs text-slate-500">
                  Set your player identity and manage the data stored in this browser.
                </p>
              </div>
              <section className={panelClass}>
                <h4 className="text-xs font-medium text-slate-200">Personal identity</h4>
                <p className="mt-1 text-[11px] text-slate-500">
                  Used for My matches, perspective filters, and win/loss labels.
                </p>
                <select
                  className={fieldControlClass}
                  value={library.profile.accountIds[0] ?? ""}
                  onChange={(event) => {
                    const ids = event.target.value ? [Number(event.target.value)] : [];
                    setAccountIds(ids.join(", "));
                    void persist({ ...library, profile: { accountIds: ids } });
                  }}
                >
                  <option value="">Not selected</option>
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name},{" "}
                      {
                        library.matches.filter((match) =>
                          match.players.some((candidate) => candidate.id === player.id),
                        ).length
                      }{" "}
                      matches
                    </option>
                  ))}
                </select>
                <div className="mt-2 flex gap-2">
                  <input
                    className={`${formControlClass} min-w-0 flex-1`}
                    placeholder="Additional account IDs"
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
              </section>
              <section className={panelClass}>
                <h4 className="text-xs font-medium text-slate-200">Local storage</h4>
                <p className="mt-1 text-[11px] text-slate-500">
                  {bytes(storage.usage)} used{storage.quota ? ` of ${bytes(storage.quota)}` : ""}.
                  Clearing browser data removes this library.
                </p>
                {storage.usage && storage.quota && storage.usage / storage.quota > 0.8 ? (
                  <p className="mt-2 text-xs text-amber-300">
                    Browser storage is nearly full. Export a backup before importing more replays.
                  </p>
                ) : null}
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
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className={secondaryButtonClass}
                    type="button"
                    onClick={() => downloadImportedLibrary(library)}
                  >
                    <BsDownload className="mr-1 inline" /> Export backup
                  </button>
                  <button
                    className={secondaryButtonClass}
                    type="button"
                    onClick={() => backupInput.current?.click()}
                  >
                    <BsUpload className="mr-1 inline" /> Restore backup
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
                        void persist({
                          matches: [],
                          collections: [],
                          profile: library.profile,
                          nextWardId: -1,
                        });
                      }
                    }}
                  >
                    <BsTrash className="mr-1 inline" /> Clear library
                  </button>
                </div>
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
        className="inline-flex items-center gap-1.5 text-[11px] text-cyan-400 hover:text-cyan-300"
        title="Open local replay library"
        type="button"
        onClick={() => setOpen(true)}
      >
        <BsUpload /> Replay library
      </button>
      {open ? createPortal(dialog, document.body) : null}
    </>
  );
}
