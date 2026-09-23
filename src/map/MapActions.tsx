import { useState } from "react";
import type { ReactNode } from "react";
import { BsBookmark, BsDownload } from "react-icons/bs";
import Popup from "../components/Popup";
import { FloatingIconButton, floatingIconControlClass } from "../components/ui";

export function SavedViewsMenu({
  children,
  disabled,
  modified,
  save,
}: {
  children: ReactNode;
  disabled: boolean;
  modified: boolean;
  save: () => Promise<boolean>;
}) {
  const [saving, setSaving] = useState(false);

  return (
    <div className="flex items-center gap-1">
      <Popup
        ariaLabel={modified ? "Open saved views, unsaved changes" : "Open saved views"}
        groupName="map-tools"
        trigger={<BsBookmark className={modified ? "text-amber-300" : ""} />}
        triggerClassName={floatingIconControlClass}
        triggerTitle={modified ? "Saved views, unsaved changes" : "Saved views"}
        width="wide"
      >
        {() => (
          <div>
            <p className="mb-2 text-xs font-medium text-slate-300">Saved views</p>
            {children}
          </div>
        )}
      </Popup>
      {modified ? (
        <button
          className="rounded-lg bg-amber-300/10 px-2.5 py-2 text-xs text-amber-200 hover:bg-amber-300/15 hover:text-amber-100 disabled:cursor-wait disabled:opacity-50"
          disabled={disabled || saving}
          type="button"
          onClick={() => {
            setSaving(true);
            void save().finally(() => setSaving(false));
          }}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      ) : null}
    </div>
  );
}

export function DownloadMapButton({ download }: { download: () => Promise<void> }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="relative">
      <FloatingIconButton
        aria-label={downloading ? "Preparing map image" : "Download current map"}
        disabled={downloading}
        title={downloading ? "Preparing image…" : "Download current map"}
        onClick={() => {
          setError(false);
          setDownloading(true);
          void download()
            .catch(() => setError(true))
            .finally(() => setDownloading(false));
        }}
      >
        <BsDownload />
      </FloatingIconButton>
      {error ? (
        <p className="absolute top-0 left-full ml-2 w-max border border-white/10 bg-slate-950/95 px-2 py-1.5 text-xs text-rose-300 shadow-xl">
          Unable to download image
        </p>
      ) : null}
    </div>
  );
}
