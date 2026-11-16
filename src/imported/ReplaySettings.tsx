import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { BsDownload, BsTrash, BsUpload } from "react-icons/bs";
import {
  fetchMatchStatuses,
  refreshMatchHistory,
  type MatchHistoryEntry,
  type MatchSyncResult,
} from "../api/matchSync";
import { fetchLibraryMatch, serverLibraryRevision } from "../api/fetchLibraryMatch";
import { formControlClass } from "../components/ui";
import type { ImportedLibrary } from "./model";
import { downloadImportedLibrary, saveImportedMatch } from "./storage";

interface ReplaySettingsProps {
  accountIds: string;
  library: ImportedLibrary;
  players: { id: number; name: string }[];
  storage: { usage: number | undefined; quota: number | undefined };
  clearLibrary: () => Promise<void>;
  persistMetadata: (library: ImportedLibrary) => Promise<void>;
  restoreBackup: (file: File) => Promise<void>;
  saveProfile: () => Promise<void>;
  setAccountIds: Dispatch<SetStateAction<string>>;
}

const secondaryButtonClass =
  "inline-flex min-h-8 items-center justify-center gap-1.5 rounded-sm px-2 py-1.5 text-xs text-slate-400 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-35";
const dangerButtonClass =
  "inline-flex min-h-8 items-center justify-center gap-1.5 rounded-sm px-2 py-1.5 text-xs text-rose-300 transition hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-35";

function bytes(value: number | undefined) {
  if (!value) {
    return "0 MB";
  }
  if (value >= 1_073_741_824) {
    return (value / 1_073_741_824).toFixed(1) + " GB";
  }

  return (value / 1_048_576).toFixed(value < 10_485_760 ? 1 : 0) + " MB";
}

function syncSummary(result: MatchSyncResult) {
  const parts = [`${result.parsed} parsed`];

  if (result.queued) {
    parts.push(`${result.queued} queued`);
  }
  if (result.pending) {
    parts.push(`${result.pending} processing`);
  }
  if (result.unavailable) {
    parts.push(`${result.unavailable} replay${result.unavailable === 1 ? "" : "s"} unavailable`);
  }
  if (result.failed) {
    parts.push(`${result.failed} failed`);
  }

  return parts.join(" · ");
}

const matchStatusLabel = {
  parsed: "Parsed",
  queued: "Queued",
  pending: "Queued",
  processing: "Parsing",
  unavailable: "Replay unavailable",
  failed: "Failed",
} satisfies Record<MatchSyncResult["history"][number]["status"], string>;

function activeMatches(history: MatchHistoryEntry[]) {
  return history.filter((match) => ["queued", "pending", "processing"].includes(match.status));
}

function wait(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      window.clearTimeout(timeout);
      reject(new DOMException("Match refresh was cancelled", "AbortError"));
    };

    const timeout = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export default function ReplaySettings({
  accountIds,
  library,
  players,
  storage,
  clearLibrary,
  persistMetadata,
  restoreBackup,
  saveProfile,
  setAccountIds,
}: ReplaySettingsProps) {
  const backupInput = useRef<HTMLInputElement>(null);
  const syncRequest = useRef<AbortController | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<MatchSyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const accountId = library.profile.accountIds[0];

  useEffect(() => () => syncRequest.current?.abort(), []);

  async function importParsedMatches(
    history: MatchHistoryEntry[],
    currentLibrary: ImportedLibrary,
    signal: AbortSignal,
  ) {
    const parsedIds = history
      .filter((match) => {
        if (match.status !== "parsed") {
          return false;
        }

        const existing = currentLibrary.matches.find(
          (candidate) => candidate.matchId === match.matchId,
        );

        return (
          !existing ||
          (existing.origin === "server" && existing.sourceRevision < serverLibraryRevision)
        );
      })
      .map((match) => match.matchId);
    const imported = [];
    let nextWardId = Math.min(
      currentLibrary.nextWardId ?? -1,
      currentLibrary.matches.reduce(
        (minimum, match) => match.wards.reduce((value, ward) => Math.min(value, ward.id), minimum),
        0,
      ) - 1,
    );

    for (const matchId of parsedIds) {
      const match = await fetchLibraryMatch(matchId, signal);
      match.wards = match.wards.map((ward) => ({ ...ward, id: nextWardId-- }));
      await saveImportedMatch(match, matchId);
      imported.push(match);
    }

    if (!imported.length) {
      return { library: currentLibrary, imported: 0 };
    }

    const importedById = new Map(imported.map((match) => [match.matchId, match]));
    const retained = currentLibrary.matches.filter((match) => !importedById.has(match.matchId));
    const nextLibrary = {
      ...currentLibrary,
      nextWardId,
      matches: [...retained, ...imported],
    };
    await persistMetadata(nextLibrary);

    return { library: nextLibrary, imported: imported.length };
  }

  async function refreshMatches() {
    if (!accountId || syncing) {
      return;
    }

    setSyncing(true);
    setSyncError(null);
    setImportedCount(0);

    try {
      syncRequest.current?.abort();
      const controller = new AbortController();
      syncRequest.current = controller;
      let currentLibrary = library;
      let importedTotal = 0;
      let result = await refreshMatchHistory(accountId, controller.signal);

      while (!controller.signal.aborted) {
        setSyncResult(result);

        const imported = await importParsedMatches(
          result.history,
          currentLibrary,
          controller.signal,
        );
        currentLibrary = imported.library;
        importedTotal += imported.imported;
        setImportedCount(importedTotal);

        let active = activeMatches(result.history);

        while (active.length && !controller.signal.aborted) {
          await wait(5_000, controller.signal);
          const history = await fetchMatchStatuses(
            result.history.map((match) => match.matchId),
            controller.signal,
          );
          result = { ...result, history };
          setSyncResult(result);

          const polled = await importParsedMatches(history, currentLibrary, controller.signal);
          currentLibrary = polled.library;
          importedTotal += polled.imported;
          setImportedCount(importedTotal);
          active = activeMatches(history);
        }

        if (controller.signal.aborted) {
          break;
        }

        result = await refreshMatchHistory(accountId, controller.signal);

        if (!activeMatches(result.history).length) {
          setSyncResult(result);

          const finalImport = await importParsedMatches(
            result.history,
            currentLibrary,
            controller.signal,
          );
          importedTotal += finalImport.imported;
          setImportedCount(importedTotal);

          break;
        }
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setSyncError(error instanceof Error ? error.message : "Could not refresh matches");
      }
    } finally {
      syncRequest.current = null;
      setSyncing(false);
    }
  }

  return (
    <div>
      <section>
        <h4 className="mb-2 text-xs font-medium text-slate-300">Player</h4>
        <div className="space-y-1">
          <label className="grid min-h-12 grid-cols-[7rem_minmax(0,1fr)] items-center gap-3 text-xs">
            <span className="text-slate-500">Identity</span>
            <select
              className={formControlClass}
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
          <div className="grid min-h-12 grid-cols-[7rem_minmax(0,1fr)] items-center gap-3 text-xs">
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
      </section>

      <section className="mt-6">
        <h4 className="mb-2 text-xs font-medium text-slate-300">Match history</h4>
        <div className="grid min-h-12 grid-cols-[7rem_minmax(0,1fr)] items-center gap-3 text-xs">
          <span className="text-slate-500">Server matches</span>
          <div className="flex min-w-0 items-center justify-end gap-3">
            {syncResult ? (
              <span className="min-w-0 truncate text-slate-400" title={syncSummary(syncResult)}>
                {syncSummary(syncResult)}
              </span>
            ) : null}
            <button
              className={secondaryButtonClass}
              disabled={!accountId || syncing}
              type="button"
              onClick={() => void refreshMatches()}
            >
              {syncing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
        {!accountId ? (
          <p className="text-xs text-slate-500">Select a player identity first.</p>
        ) : null}
        {syncError ? <p className="text-xs text-rose-300">{syncError}</p> : null}
        {importedCount ? (
          <p className="text-xs text-emerald-300">
            {importedCount} {importedCount === 1 ? "match" : "matches"} added to Library.
          </p>
        ) : null}
        {syncResult?.history.length ? (
          <div className="mt-2 max-h-64 overflow-y-auto border-t border-white/7">
            {syncResult.history.map((match) => (
              <a
                className="grid min-h-9 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-white/5 px-1 text-xs hover:bg-white/[0.025]"
                href={`https://www.opendota.com/matches/${match.matchId}`}
                key={match.matchId}
                rel="noreferrer"
                target="_blank"
              >
                <span className="font-mono text-slate-300">{match.matchId}</span>
                <span
                  className={
                    match.status === "parsed"
                      ? "text-emerald-300"
                      : match.status === "unavailable" || match.status === "failed"
                        ? "text-slate-600"
                        : "text-slate-400"
                  }
                >
                  {matchStatusLabel[match.status]}
                </span>
              </a>
            ))}
          </div>
        ) : null}
      </section>

      <section className="mt-6">
        <h4 className="mb-2 text-xs font-medium text-slate-300">Storage</h4>
        <div className="space-y-1 text-xs">
          <div className="grid min-h-12 grid-cols-[7rem_minmax(0,1fr)] items-center gap-3">
            <span className="text-slate-500">Browser storage</span>
            <span className="text-right text-slate-300">
              {bytes(storage.usage)}
              {storage.quota ? ` of ${bytes(storage.quota)}` : ""}
            </span>
          </div>
          <div className="flex min-h-12 flex-wrap items-center justify-end gap-1 py-2">
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
              className={dangerButtonClass}
              type="button"
              onClick={() => {
                if (
                  window.confirm("Delete every imported match and collection from this browser?")
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
  );
}
