import { useState } from "react";
import type { ReactNode } from "react";
import { BsBookmark, BsDownload } from "react-icons/bs";
import Popup from "../components/Popup";
import { FloatingIconButton, floatingIconControlClass } from "../components/ui";

export function SavedViewsMenu({ children }: { children: ReactNode }) {
  return (
    <Popup
      ariaLabel="Open saved views"
      groupName="map-tools"
      trigger={<BsBookmark />}
      triggerClassName={floatingIconControlClass}
      triggerTitle="Saved views"
      width="wide"
    >
      {() => (
        <div>
          <p className="mb-2 text-xs font-medium text-slate-300">Saved views</p>
          {children}
        </div>
      )}
    </Popup>
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
