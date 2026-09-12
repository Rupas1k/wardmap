import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { BsFileEarmarkArrowUp, BsTrash, BsUpload, BsX } from "react-icons/bs";
import {
  elevatedSurfaceClass,
  fieldControlClass,
  formControlClass,
  SwitchNav,
} from "../components/ui";
import { numericIds } from "../dataset/model";
import runReplayParser from "./runReplayParser";
import { saveImportedLibrary } from "./storage";
import { useImportedStore } from "./state";

type ImportedTab = "import" | "matches" | "collections";

const tabs: { id: ImportedTab; label: string }[] = [
  { id: "import", label: "Import" },
  { id: "matches", label: "Matches" },
  { id: "collections", label: "Collections" },
];

function duration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function ImportedMatches({ mapVersion }: { mapVersion: number }) {
  const library = useImportedStore((state) => state.library);
  const setLibrary = useImportedStore((state) => state.setLibrary);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ImportedTab>("import");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [collectionId, setCollectionId] = useState("");
  const [collectionName, setCollectionName] = useState("");
  const [accountIds, setAccountIds] = useState(library.profile.accountIds.join(", "));
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const supportedMatches = useMemo(
    () => library.matches.filter((match) => match.mapVersion === mapVersion).length,
    [library.matches, mapVersion],
  );
  const players = useMemo(
    () =>
      [
        ...new Map(
          library.matches.flatMap((match) => match.players).map((player) => [player.id, player]),
        ).values(),
      ].sort((left, right) => left.name.localeCompare(right.name)),
    [library.matches],
  );

  useEffect(() => {
    setAccountIds(library.profile.accountIds.join(", "));
  }, [library.profile.accountIds]);

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

  async function persist(next: typeof library) {
    await saveImportedLibrary(next);
    setLibrary(next);
  }

  function addFiles(nextFiles: readonly File[]) {
    const accepted = nextFiles.filter(
      (file) =>
        file.name.endsWith(".dem") || file.name.endsWith(".dem.bz2") || file.name.endsWith(".bz2"),
    );
    const combined = [...files];

    for (const file of accepted) {
      const duplicate = combined.some(
        (candidate) =>
          candidate.name === file.name &&
          candidate.size === file.size &&
          candidate.lastModified === file.lastModified,
      );

      if (!duplicate) {
        combined.push(file);
      }
    }

    setFiles(combined);
    setMessage(
      accepted.length === nextFiles.length
        ? null
        : `${nextFiles.length - accepted.length} unsupported files skipped`,
    );
  }

  async function importFiles() {
    if (files.length === 0) {
      return;
    }

    setImporting(true);
    setMessage(null);

    try {
      const parsed = await runReplayParser(files, mapVersion);
      const existingHashes = new Set(library.matches.map((match) => match.fileHash));
      const added = parsed.filter((match) => !existingHashes.has(match.fileHash));
      const matchIds = added.map((match) => match.matchId);
      const collections = library.collections.map((collection) =>
        collection.id === collectionId
          ? { ...collection, matchIds: [...new Set([...collection.matchIds, ...matchIds])] }
          : collection,
      );

      await persist({ ...library, matches: [...library.matches, ...added], collections });
      setFiles([]);
      setFileInputKey((value) => value + 1);
      setMessage(
        added.length === parsed.length
          ? `${added.length} ${added.length === 1 ? "match" : "matches"} imported`
          : `${added.length} imported · ${parsed.length - added.length} duplicates skipped`,
      );
      setTab("matches");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Unable to import matches");
    } finally {
      setImporting(false);
    }
  }

  async function createCollection() {
    const name = collectionName.trim();

    if (!name) {
      return;
    }

    const id = crypto.randomUUID();
    await persist({
      ...library,
      collections: [...library.collections, { id, name, matchIds: [], createdAt: Date.now() }],
    });
    setCollectionId(id);
    setCollectionName("");
  }

  async function saveProfile() {
    const profile = { accountIds: numericIds(accountIds).map(Number) };
    await persist({ ...library, profile });
    setMessage(profile.accountIds.length ? "Player identity saved" : "Player identity cleared");
  }

  async function selectPlayer(id: number | null) {
    const profile = { accountIds: id === null ? [] : [id] };
    setAccountIds(profile.accountIds.join(", "));
    await persist({ ...library, profile });
  }

  async function removeMatch(matchId: number) {
    if (
      !window.confirm("Remove this imported match? You will need its replay file to restore it.")
    ) {
      return;
    }

    await persist({
      ...library,
      matches: library.matches.filter((match) => match.matchId !== matchId),
      collections: library.collections.map((collection) => ({
        ...collection,
        matchIds: collection.matchIds.filter((id) => id !== matchId),
      })),
    });
  }

  async function removeCollection(id: string) {
    await persist({
      ...library,
      collections: library.collections.filter((collection) => collection.id !== id),
    });

    if (collectionId === id) {
      setCollectionId("");
    }
  }

  const dialog = (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          setOpen(false);
        }
      }}
    >
      <section
        aria-label="Imported matches"
        aria-modal="true"
        className={`${elevatedSurfaceClass} flex max-h-[min(44rem,calc(100vh-2rem))] w-full max-w-lg flex-col overflow-hidden`}
        role="dialog"
      >
        <header className="shrink-0 px-5 pt-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Imported matches</h3>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {supportedMatches} ready for map {mapVersion} · {library.matches.length} total
              </p>
            </div>
            <button
              aria-label="Close imported matches"
              className="text-xl text-slate-500 hover:text-slate-200"
              type="button"
              onClick={() => setOpen(false)}
            >
              <BsX />
            </button>
          </div>
          <SwitchNav
            className="mt-3"
            options={tabs.map(({ id, label }) => ({
              value: id,
              label:
                id === "matches" && library.matches.length
                  ? `${label} ${library.matches.length}`
                  : label,
            }))}
            value={tab}
            onChange={setTab}
          />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {tab === "import" ? (
            <div>
              <label
                className={`grid min-h-32 cursor-pointer place-items-center rounded-sm border border-dashed px-4 text-center transition ${
                  dragging
                    ? "border-cyan-300/60 bg-cyan-400/5"
                    : "border-white/15 bg-slate-950/45 hover:border-white/25"
                }`}
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
                  onChange={(event) => addFiles(Array.from(event.target.files ?? []))}
                />
                <span>
                  <BsFileEarmarkArrowUp className="mx-auto text-2xl text-slate-500" />
                  <span className="mt-2 block text-xs font-medium text-slate-300">
                    Drop replay files here
                  </span>
                  <span className="mt-1 block text-[11px] text-slate-600">
                    or click to choose · .dem and .dem.bz2
                  </span>
                </span>
              </label>

              {files.length ? (
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Ready to import</span>
                    <button
                      className="hover:text-slate-300"
                      type="button"
                      onClick={() => setFiles([])}
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="space-y-1">
                    {files.map((file) => (
                      <div
                        className="flex items-center gap-3 rounded-sm bg-white/3 px-2 py-2 text-xs"
                        key={`${file.name}:${file.size}:${file.lastModified}`}
                      >
                        <BsFileEarmarkArrowUp className="shrink-0 text-slate-600" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-slate-300">{file.name}</p>
                          <p className="text-[10px] text-slate-600">
                            {(file.size / 1_048_576).toFixed(1)} MB
                          </p>
                        </div>
                        <button
                          aria-label={`Remove ${file.name}`}
                          className="text-slate-600 hover:text-slate-300"
                          type="button"
                          onClick={() =>
                            setFiles((current) => current.filter((item) => item !== file))
                          }
                        >
                          <BsX />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <label className="mt-4 block text-[11px] text-slate-500">
                Collection
                <select
                  className={fieldControlClass}
                  value={collectionId}
                  onChange={(event) => setCollectionId(event.target.value)}
                >
                  <option value="">Unsorted</option>
                  {library.collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="mt-4 w-full rounded-sm bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/25 disabled:opacity-40"
                disabled={!files.length || importing}
                type="button"
                onClick={() => void importFiles()}
              >
                {importing
                  ? "Parsing replays…"
                  : files.length
                    ? `Import ${files.length} ${files.length === 1 ? "match" : "matches"}`
                    : "Choose replay files"}
              </button>
              <p className="mt-2 text-center text-[10px] text-amber-300/80">
                Mock parser active. Replay contents are not read yet.
              </p>
            </div>
          ) : null}

          {tab === "matches" ? (
            <div>
              <section className="rounded-sm bg-white/3 p-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-300">Personal identity</p>
                    <p className="mt-0.5 text-[10px] text-slate-600">
                      Used for personal perspective filters
                    </p>
                  </div>
                  <select
                    className="max-w-48 bg-transparent text-right text-xs text-slate-200 outline-none [color-scheme:dark] [&>option]:bg-slate-900"
                    value={library.profile.accountIds[0] ?? ""}
                    onChange={(event) =>
                      void selectPlayer(event.target.value ? Number(event.target.value) : null)
                    }
                  >
                    <option value="">Not selected</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </div>
                <details className="mt-2 border-t border-white/7 pt-2">
                  <summary className="cursor-pointer text-[10px] text-slate-600 hover:text-slate-400">
                    Additional account IDs
                  </summary>
                  <div className="mt-2 flex gap-2">
                    <input
                      className={`${formControlClass} min-w-0 flex-1`}
                      placeholder="Comma separated"
                      value={accountIds}
                      onChange={(event) => setAccountIds(event.target.value)}
                    />
                    <button
                      className="rounded-sm border border-white/10 px-3 text-xs text-slate-300 hover:bg-white/5"
                      type="button"
                      onClick={() => void saveProfile()}
                    >
                      Save
                    </button>
                  </div>
                </details>
              </section>

              {!library.matches.length ? (
                <div className="py-14 text-center">
                  <p className="text-sm text-slate-400">No imported matches</p>
                  <button
                    className="mt-2 text-xs text-cyan-400"
                    type="button"
                    onClick={() => setTab("import")}
                  >
                    Import your first replay
                  </button>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {library.matches
                    .slice()
                    .sort((left, right) => right.startedAt - left.startedAt)
                    .map((match) => {
                      const me = match.players.find((player) =>
                        library.profile.accountIds.includes(player.id),
                      );
                      const won = me ? me.isRadiant === match.radiantWon : null;
                      const supported = match.mapVersion === mapVersion;

                      return (
                        <article
                          className="rounded-sm border border-white/8 bg-slate-950/40 px-3 py-2.5"
                          key={match.fileHash}
                        >
                          <div className="flex items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-xs font-medium text-slate-200">
                                  Match {match.matchId}
                                </p>
                                <span
                                  className={`shrink-0 text-[9px] font-medium uppercase ${
                                    supported ? "text-emerald-400" : "text-amber-300"
                                  }`}
                                >
                                  {supported ? "Ready" : "Unsupported map"}
                                </span>
                              </div>
                              <p className="mt-1 text-[10px] text-slate-500">
                                {new Date(match.startedAt).toLocaleDateString()} ·{" "}
                                {duration(match.duration)} · Map {match.mapVersion}
                                {won === null ? "" : won ? " · Won" : " · Lost"}
                              </p>
                              <p className="mt-0.5 truncate text-[10px] text-slate-600">
                                {me ? `${me.name} · ${me.hero}` : match.fileName}
                              </p>
                            </div>
                            <button
                              aria-label={`Remove match ${match.matchId}`}
                              className="p-1 text-slate-600 hover:text-rose-300"
                              type="button"
                              onClick={() => void removeMatch(match.matchId)}
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

          {tab === "collections" ? (
            <div>
              <div className="flex gap-2">
                <input
                  className={`${formControlClass} min-w-0 flex-1`}
                  placeholder="Collection name"
                  value={collectionName}
                  onChange={(event) => setCollectionName(event.target.value)}
                />
                <button
                  className="rounded-sm border border-white/10 px-3 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-30"
                  disabled={!collectionName.trim()}
                  type="button"
                  onClick={() => void createCollection()}
                >
                  Create
                </button>
              </div>
              {!library.collections.length ? (
                <div className="py-14 text-center">
                  <p className="text-sm text-slate-400">No collections yet</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Collections keep related matches together.
                  </p>
                </div>
              ) : (
                <div className="mt-4 divide-y divide-white/7">
                  {library.collections.map((collection) => (
                    <div className="flex items-center gap-3 py-3 text-xs" key={collection.id}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-slate-300">{collection.name}</p>
                        <p className="mt-0.5 text-[10px] text-slate-600">
                          {collection.matchIds.length}{" "}
                          {collection.matchIds.length === 1 ? "match" : "matches"}
                        </p>
                      </div>
                      <button
                        aria-label={`Remove ${collection.name}`}
                        className="p-1 text-slate-600 hover:text-rose-300"
                        type="button"
                        onClick={() => void removeCollection(collection.id)}
                      >
                        <BsTrash />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {message ? (
            <p className="mt-4 border-t border-white/10 pt-3 text-xs text-slate-400">{message}</p>
          ) : null}
        </div>
      </section>
    </div>
  );

  return (
    <>
      <button
        className="inline-flex items-center gap-1.5 text-[11px] text-cyan-400 hover:text-cyan-300"
        title="Import local replay files"
        type="button"
        onClick={() => setOpen(true)}
      >
        <BsUpload /> Import matches
      </button>
      {open ? createPortal(dialog, document.body) : null}
    </>
  );
}
