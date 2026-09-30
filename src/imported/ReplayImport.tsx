import type { Dispatch, RefObject, SetStateAction } from "react";
import { BsFileEarmarkArrowUp, BsX } from "react-icons/bs";
import { formControlClass } from "../components/ui";
import { mapPatchLabel } from "../map/versions";
import type { ImportedLibrary } from "./model";

export type QueueStatus =
  "queued" | "parsing" | "saving" | "imported" | "duplicate" | "failed" | "cancelled";

export interface QueueEntry {
  jobId: string;
  file: File;
  status: QueueStatus;
  detail?: string;
}

interface ReplayImportProps {
  dragging: boolean;
  fileInputKey: number;
  finishedCount: number;
  importCollectionId: string;
  importing: boolean;
  library: ImportedLibrary;
  mapVersion: number;
  pendingCount: number;
  queue: QueueEntry[];
  ready: boolean;
  replaceExisting: boolean;
  importRequest: RefObject<AbortController | null>;
  addFiles: (files: readonly File[]) => void;
  importFiles: () => Promise<void>;
  setCollectionFilter: Dispatch<SetStateAction<string>>;
  setDragging: Dispatch<SetStateAction<boolean>>;
  setFileInputKey: Dispatch<SetStateAction<number>>;
  setImportCollectionId: Dispatch<SetStateAction<string>>;
  setQueue: Dispatch<SetStateAction<QueueEntry[]>>;
  setReplaceExisting: Dispatch<SetStateAction<boolean>>;
  setSearch: Dispatch<SetStateAction<string>>;
  setTab: Dispatch<SetStateAction<"library" | "import" | "settings">>;
  setVersionFilter: Dispatch<SetStateAction<"all" | number>>;
}

const primaryButtonClass =
  "inline-flex min-h-8 items-center justify-center gap-1.5 rounded-sm px-2 py-1.5 text-xs text-cyan-300 transition hover:bg-white/5 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-35";
const secondaryButtonClass =
  "inline-flex min-h-8 items-center justify-center gap-1.5 rounded-sm px-2 py-1.5 text-xs text-slate-400 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-35";

function bytes(value: number | undefined) {
  if (!value) {
    return "0 MB";
  }
  if (value >= 1_073_741_824) {
    return (value / 1_073_741_824).toFixed(1) + " GB";
  }

  return (value / 1_048_576).toFixed(value < 10_485_760 ? 1 : 0) + " MB";
}

export default function ReplayImport({
  dragging,
  fileInputKey,
  finishedCount,
  importCollectionId,
  importing,
  library,
  mapVersion,
  pendingCount,
  queue,
  ready,
  replaceExisting,
  importRequest,
  addFiles,
  importFiles,
  setCollectionFilter,
  setDragging,
  setFileInputKey,
  setImportCollectionId,
  setQueue,
  setReplaceExisting,
  setSearch,
  setTab,
  setVersionFilter,
}: ReplayImportProps) {
  return (
    <div>
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

      <div className="mt-4 space-y-1">
        <label className="grid min-h-11 grid-cols-[7rem_minmax(0,1fr)] items-center gap-3 text-xs">
          <span className="text-slate-500">Collection</span>
          <select
            className={formControlClass}
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
        <label className="grid min-h-11 grid-cols-[7rem_minmax(0,1fr)] items-center gap-3 text-xs">
          <span className="text-slate-500">Replace existing</span>
          <input
            checked={replaceExisting}
            className="justify-self-end accent-cyan-400"
            type="checkbox"
            onChange={(event) => setReplaceExisting(event.target.checked)}
          />
        </label>
      </div>

      {queue.length ? (
        <div className="mt-5 space-y-1">
          {queue.map((entry) => (
            <div className="flex min-h-12 items-center gap-3 py-2 text-xs" key={entry.jobId}>
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
                  onClick={() => setQueue((current) => current.filter((item) => item !== entry))}
                >
                  <BsX />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {queue.length ? (
        <div className="sticky bottom-0 z-10 mt-4 flex min-h-12 items-center gap-3 bg-slate-900/95 py-2">
          {finishedCount && !importing ? (
            <button
              className="text-xs text-slate-500 hover:text-slate-300"
              type="button"
              onClick={() =>
                setQueue((current) =>
                  current.filter((entry) => !["imported", "duplicate"].includes(entry.status)),
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
  );
}
