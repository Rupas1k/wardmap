import { useState } from "react";
import type { StoredAnalysis } from "../indexedDb";
import type { WorkspaceSettings } from "../dataset/model";
import Popup from "../components/Popup";
import { fieldControlClass } from "../components/ui";

export default function SavedViewControls({
  disabled,
  remove,
  rename,
  restore,
  save,
  share,
  views,
}: {
  disabled: boolean;
  remove: (view: StoredAnalysis<WorkspaceSettings>) => Promise<void>;
  rename: (view: StoredAnalysis<WorkspaceSettings>) => Promise<void>;
  restore: (key: string) => void;
  save: (name: string) => Promise<boolean>;
  share: (view: StoredAnalysis<WorkspaceSettings>) => Promise<void>;
  views: StoredAnalysis<WorkspaceSettings>[];
}) {
  return (
    <div className="flex flex-col items-start">
      {views.length > 0 ? (
        <Popup
          trigger="Saved views"
          triggerClassName="py-1.5 text-xs text-slate-400 hover:text-white"
        >
          {({ close }) => (
            <>
              <p className="text-xs font-semibold text-slate-300">Saved views</p>
              <div className="mt-2">
                {views.map((view) => (
                  <div
                    className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center border-b border-white/5 last:border-0"
                    key={view.key}
                  >
                    <button
                      className="truncate py-2 text-left text-xs text-slate-300 hover:text-white"
                      onClick={() => {
                        restore(view.key);
                        close();
                      }}
                    >
                      {view.name}
                    </button>
                    <ShareViewButton share={() => share(view)} />
                    <button
                      className="px-2 text-[10px] text-slate-500 hover:text-white"
                      onClick={() => void rename(view)}
                    >
                      Rename
                    </button>
                    <button
                      aria-label={`Delete ${view.name}`}
                      className="pl-2 text-sm text-slate-600 hover:text-rose-300"
                      onClick={() => void remove(view)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </Popup>
      ) : null}
      <SaveViewPopup disabled={disabled} save={save} />
    </div>
  );
}

function ShareViewButton({ share }: { share: () => Promise<void> }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      className="px-2 text-[10px] text-slate-500 hover:text-white"
      type="button"
      onClick={() => {
        void share().then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        });
      }}
    >
      {copied ? "Copied" : "Share"}
    </button>
  );
}

function SaveViewPopup({
  disabled,
  save,
}: {
  disabled: boolean;
  save: (name: string) => Promise<boolean>;
}) {
  const [name, setName] = useState("Ward analysis");
  const [pending, setPending] = useState(false);

  return (
    <Popup
      disabled={disabled}
      trigger="Save current view"
      triggerClassName="py-1.5 text-xs text-slate-400 hover:text-white"
    >
      {({ close }) => (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const nextName = name.trim();

            if (!nextName) {
              return;
            }

            setPending(true);
            void save(nextName).then((saved) => {
              setPending(false);

              if (saved) {
                setName("Ward analysis");
                close();
              }
            });
          }}
        >
          <label className="block text-xs font-semibold text-slate-300">
            View name
            <input
              className={`${fieldControlClass} px-3 py-2 text-sm`}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <div className="mt-3 flex justify-end gap-3">
            <button
              className="px-1 py-1.5 text-xs text-slate-500 hover:text-white"
              type="button"
              onClick={close}
            >
              Cancel
            </button>
            <button
              className="rounded-sm bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/25 disabled:cursor-wait disabled:opacity-50"
              disabled={pending || !name.trim()}
              type="submit"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}
    </Popup>
  );
}
