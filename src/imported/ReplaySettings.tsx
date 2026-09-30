import { useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { BsDownload, BsTrash, BsUpload } from "react-icons/bs";
import { formControlClass } from "../components/ui";
import type { ImportedLibrary } from "./model";
import { downloadImportedLibrary } from "./storage";

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
