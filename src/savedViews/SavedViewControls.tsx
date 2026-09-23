import { useState } from "react";
import { fieldControlClass } from "../components/ui";
import type { StoredAnalysis } from "../indexedDb";
import type { ViewState } from "./viewState";

type SavedView = StoredAnalysis<ViewState>;

interface SavedViewControlsProps {
  activeView: SavedView | null;
  deletedView: SavedView | null;
  disabled: boolean;
  modified: boolean;
  remove: (view: SavedView) => Promise<void>;
  rename: (view: SavedView, name: string) => Promise<boolean>;
  restore: (key: string) => void;
  revert: () => void;
  save: (name: string) => Promise<boolean>;
  share: (view: SavedView) => Promise<void>;
  undoRemove: () => Promise<void>;
  update: () => Promise<boolean>;
  views: SavedView[];
}

interface PendingAction {
  kind: "delete" | "open";
  view: SavedView;
}

export default function SavedViewControls({
  activeView,
  deletedView,
  disabled,
  modified,
  remove,
  rename,
  restore,
  revert,
  save,
  share,
  undoRemove,
  update,
  views,
}: SavedViewControlsProps) {
  const [creating, setCreating] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  function openView(view: SavedView) {
    if (modified && view.key !== activeView?.key) {
      setPendingAction({ kind: "open", view });

      return;
    }

    restore(view.key);
  }

  function deleteView(view: SavedView) {
    if (modified && view.key === activeView?.key) {
      setPendingAction({ kind: "delete", view });

      return;
    }

    void remove(view);
  }

  function confirmAction() {
    if (!pendingAction) {
      return;
    }

    const { kind, view } = pendingAction;
    setPendingAction(null);

    if (kind === "open") {
      restore(view.key);
    } else {
      void remove(view);
    }
  }

  return (
    <div className="text-xs">
      {activeView ? (
        <>
          <div className="flex min-w-0 items-baseline justify-between gap-3">
            <p className="truncate text-slate-300">{activeView.name}</p>
            {modified ? <span className="shrink-0 text-amber-300">Modified</span> : null}
          </div>
          <div className="mt-1 flex items-center gap-3">
            <button
              className="py-1 text-cyan-300 hover:text-cyan-200 disabled:cursor-default disabled:text-slate-600"
              disabled={disabled || pending || !modified}
              type="button"
              onClick={() => {
                setPending(true);
                void update().finally(() => setPending(false));
              }}
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              className="py-1 text-slate-500 hover:text-slate-300 disabled:cursor-default disabled:text-slate-700"
              disabled={pending || !modified}
              type="button"
              onClick={revert}
            >
              Revert
            </button>
            <button
              className="py-1 text-slate-500 hover:text-slate-300"
              type="button"
              onClick={() => setCreating(true)}
            >
              Save as
            </button>
          </div>
        </>
      ) : (
        <button
          className="py-1 text-cyan-300 hover:text-cyan-200 disabled:cursor-not-allowed disabled:text-slate-600"
          disabled={disabled}
          type="button"
          onClick={() => setCreating(true)}
        >
          Save current view
        </button>
      )}

      {creating ? (
        <SaveViewForm
          initialName={activeView ? `${activeView.name} copy` : "Ward analysis"}
          save={save}
          close={() => setCreating(false)}
        />
      ) : null}

      {views.length > 0 ? (
        <div className="mt-3 border-t border-white/10 pt-2">
          <p className="mb-1 text-slate-600">Saved views</p>
          <div className="max-h-64 overflow-y-auto">
            {views.map((view) =>
              editingKey === view.key ? (
                <RenameViewForm
                  key={view.key}
                  view={view}
                  close={() => setEditingKey(null)}
                  rename={rename}
                />
              ) : (
                <div
                  className={`grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center border-b border-white/5 last:border-0 ${
                    view.key === activeView?.key ? "bg-cyan-500/5" : ""
                  }`}
                  key={view.key}
                >
                  <button
                    className="truncate py-2 text-left text-slate-300 hover:text-white"
                    type="button"
                    onClick={() => openView(view)}
                  >
                    {view.name}
                  </button>
                  <ShareViewButton share={() => share(view)} />
                  <button
                    className="px-2 text-slate-500 hover:text-white"
                    type="button"
                    onClick={() => setEditingKey(view.key)}
                  >
                    Rename
                  </button>
                  <button
                    aria-label={`Delete ${view.name}`}
                    className="pl-2 text-sm text-slate-600 hover:text-rose-300"
                    type="button"
                    onClick={() => deleteView(view)}
                  >
                    ×
                  </button>
                </div>
              ),
            )}
          </div>
        </div>
      ) : null}

      {pendingAction ? (
        <div className="mt-2 border-l-2 border-amber-400/60 pl-3 text-slate-400">
          <p>
            Discard changes and {pendingAction.kind === "open" ? "open" : "delete"}{" "}
            <span className="text-slate-200">{pendingAction.view.name}</span>?
          </p>
          <div className="mt-1 flex gap-3">
            <button
              className="py-1 text-slate-500 hover:text-white"
              type="button"
              onClick={() => setPendingAction(null)}
            >
              Cancel
            </button>
            <button
              className="py-1 text-amber-300 hover:text-amber-200"
              type="button"
              onClick={confirmAction}
            >
              Discard changes
            </button>
          </div>
        </div>
      ) : null}

      {deletedView ? (
        <div className="mt-2 flex min-w-0 items-center justify-between gap-3 border-t border-white/10 pt-2">
          <p className="truncate text-slate-500">Deleted {deletedView.name}</p>
          <button
            className="shrink-0 py-1 text-cyan-300 hover:text-cyan-200"
            type="button"
            onClick={() => void undoRemove()}
          >
            Undo
          </button>
        </div>
      ) : null}
    </div>
  );
}

function RenameViewForm({
  close,
  rename,
  view,
}: {
  close: () => void;
  rename: (view: SavedView, name: string) => Promise<boolean>;
  view: SavedView;
}) {
  const [name, setName] = useState(view.name);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="border-b border-white/5 py-1.5"
      onSubmit={(event) => {
        event.preventDefault();

        if (!name.trim()) {
          return;
        }

        setPending(true);
        void rename(view, name).then((renamed) => {
          setPending(false);

          if (renamed) {
            close();
          }
        });
      }}
    >
      <input
        aria-label={`Rename ${view.name}`}
        autoFocus
        className={`${fieldControlClass} px-2 py-1.5 text-xs`}
        disabled={pending}
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            close();
          }
        }}
      />
      <div className="mt-1 flex justify-end gap-3">
        <button
          className="py-1 text-slate-500 hover:text-white"
          disabled={pending}
          type="button"
          onClick={close}
        >
          Cancel
        </button>
        <button
          className="py-1 text-cyan-300 hover:text-cyan-200 disabled:text-slate-600"
          disabled={pending || !name.trim()}
          type="submit"
        >
          {pending ? "Saving…" : "Rename"}
        </button>
      </div>
    </form>
  );
}

function ShareViewButton({ share }: { share: () => Promise<void> }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      className="px-2 text-slate-500 hover:text-white"
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

function SaveViewForm({
  close,
  initialName,
  save,
}: {
  close: () => void;
  initialName: string;
  save: (name: string) => Promise<boolean>;
}) {
  const [name, setName] = useState(initialName);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-2 border-t border-white/10 pt-2"
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
            close();
          }
        });
      }}
    >
      <label className="text-slate-500">
        Name
        <input
          autoFocus
          className={`${fieldControlClass} px-2 py-1.5 text-xs`}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <div className="mt-2 flex justify-end gap-3">
        <button className="py-1 text-slate-500 hover:text-white" type="button" onClick={close}>
          Cancel
        </button>
        <button
          className="py-1 font-medium text-cyan-300 hover:text-cyan-200 disabled:cursor-wait disabled:text-slate-600"
          disabled={pending || !name.trim()}
          type="submit"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
