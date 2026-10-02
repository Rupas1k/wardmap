import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BsX } from "react-icons/bs";
import { SwitchNav } from "../components/ui";
import ReplayImport from "./ReplayImport";
import type { QueueEntry } from "./ReplayImport";
import ReplayLibrary from "./ReplayLibrary";
import ReplaySettings from "./ReplaySettings";
import { numericIds } from "../dataset/model";
import { formatHeroName } from "../heroes";
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
type CollectionFilter = string;

const tabs: { id: ImportedTab; label: string }[] = [
  { id: "library", label: "Library" },
  { id: "import", label: "Import" },
  { id: "settings", label: "Settings" },
];

function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
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
  const [collectionStatus, setCollectionStatus] = useState<string | null>(null);
  const [updatingCollection, setUpdatingCollection] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [storage, setStorage] = useState<{ usage: number | undefined; quota: number | undefined }>({
    usage: undefined,
    quota: undefined,
  });
  const importRequest = useRef<AbortController | null>(null);
  const selectAllInput = useRef<HTMLInputElement>(null);

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
            formatHeroName(player.hero) ?? "",
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
    if (!collectionStatus) {
      return;
    }

    const timeout = window.setTimeout(() => setCollectionStatus(null), 2500);

    return () => window.clearTimeout(timeout);
  }, [collectionStatus]);

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
    if (updatingCollection) {
      return;
    }

    const ids = new Set(matchIds);
    const current = useImportedStore.getState().library;
    const collection = current.collections.find((candidate) => candidate.id === id);

    if (!collection) {
      return;
    }

    const changedCount = [...ids].filter((matchId) =>
      included ? !collection.matchIds.includes(matchId) : collection.matchIds.includes(matchId),
    ).length;

    if (!changedCount) {
      setCollectionStatus(included ? "Already in " + collection.name : "Not in " + collection.name);

      return;
    }

    const next = {
      ...current,
      collections: current.collections.map((candidate) => {
        if (candidate.id !== id) {
          return candidate;
        }

        return {
          ...candidate,
          updatedAt: Date.now(),
          matchIds: included
            ? [...new Set([...candidate.matchIds, ...ids])]
            : candidate.matchIds.filter((matchId) => !ids.has(matchId)),
        };
      }),
    };
    const action = included ? "added to" : "removed from";

    setUpdatingCollection(true);
    setLibrary(next);
    setCollectionStatus(changedCount + " " + action + " " + collection.name);

    try {
      await saveImportedLibraryMetadata(next);
    } catch {
      setLibrary(current);
      setCollectionStatus("Collection change failed");
    } finally {
      setUpdatingCollection(false);
    }
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
  useEffect(() => {
    if (selectAllInput.current) {
      selectAllInput.current.indeterminate = selectedVisible.length > 0 && !allVisibleSelected;
    }
  }, [allVisibleSelected, selectedVisible.length]);

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
      className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}
    >
      <section
        aria-label="Replay library"
        aria-modal="true"
        className="flex max-h-[min(46rem,calc(100vh-2rem))] w-full max-w-[40rem] flex-col overflow-hidden rounded-sm border border-white/10 bg-slate-900 text-slate-200 shadow-xl"
        role="dialog"
      >
        <header className="flex shrink-0 items-center gap-2 px-3">
          <h3 className="sr-only">Replay library</h3>
          <SwitchNav
            className="min-w-0 flex-1"
            options={tabs.map(({ id, label }) => ({ value: id, label }))}
            value={tab}
            onChange={setTab}
          />
          <button
            aria-label="Close replay library"
            className="-mr-1 grid size-8 shrink-0 place-items-center text-xl text-slate-500 hover:text-white"
            type="button"
            onClick={() => setOpen(false)}
          >
            <BsX />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {tab === "library" ? (
            <ReplayLibrary
              activeCollection={activeCollection}
              activeCollectionIndex={activeCollectionIndex}
              allVisibleSelected={allVisibleSelected}
              bulkCollectionId={bulkCollectionId}
              collectionFilter={collectionFilter}
              collectionName={collectionName}
              collectionStatus={collectionStatus}
              creatingCollection={creatingCollection}
              importedWithinDays={importedWithinDays}
              library={library}
              mapVersion={mapVersion}
              onlyMine={onlyMine}
              resultFilter={resultFilter}
              search={search}
              selectAllInput={selectAllInput}
              selected={selected}
              updatingCollection={updatingCollection}
              versionFilter={versionFilter}
              visibleMatches={visibleMatches}
              createCollection={createCollection}
              duplicateCollection={duplicateCollection}
              exportCollection={exportCollection}
              moveCollection={moveCollection}
              removeCollection={removeCollection}
              removeMatches={removeMatches}
              renameCollection={renameCollection}
              setBulkCollectionId={setBulkCollectionId}
              setCollectionFilter={setCollectionFilter}
              setCollectionName={setCollectionName}
              setCollectionStatus={setCollectionStatus}
              setCreatingCollection={setCreatingCollection}
              setImportedWithinDays={setImportedWithinDays}
              setMatchesInCollection={setMatchesInCollection}
              setOnlyMine={setOnlyMine}
              setResultFilter={setResultFilter}
              setSearch={setSearch}
              setSelected={setSelected}
              setVersionFilter={setVersionFilter}
              showMatches={showMatches}
              updateCollection={updateCollection}
            />
          ) : null}

          {tab === "import" ? (
            <ReplayImport
              dragging={dragging}
              fileInputKey={fileInputKey}
              finishedCount={finishedCount}
              importCollectionId={importCollectionId}
              importing={importing}
              library={library}
              mapVersion={mapVersion}
              pendingCount={pendingCount}
              queue={queue}
              ready={ready}
              replaceExisting={replaceExisting}
              importRequest={importRequest}
              addFiles={addFiles}
              importFiles={importFiles}
              setCollectionFilter={setCollectionFilter}
              setDragging={setDragging}
              setFileInputKey={setFileInputKey}
              setImportCollectionId={setImportCollectionId}
              setQueue={setQueue}
              setReplaceExisting={setReplaceExisting}
              setSearch={setSearch}
              setTab={setTab}
              setVersionFilter={setVersionFilter}
            />
          ) : null}

          {tab === "settings" ? (
            <ReplaySettings
              accountIds={accountIds}
              library={library}
              players={players}
              storage={storage}
              clearLibrary={clearLibrary}
              persistMetadata={persistMetadata}
              restoreBackup={restoreBackup}
              saveProfile={saveProfile}
              setAccountIds={setAccountIds}
            />
          ) : null}

          {message ? (
            <p className="mt-4 whitespace-pre-wrap text-xs text-slate-400">{message}</p>
          ) : null}
        </div>
      </section>
    </div>
  );

  return (
    <>
      <button
        className="shrink-0 text-xs text-cyan-300 hover:text-cyan-200"
        type="button"
        onClick={openLibrary}
      >
        {library.matches.length ? "Manage" : "Import replays"}
      </button>
      {open ? createPortal(dialog, document.body) : null}
    </>
  );
}
