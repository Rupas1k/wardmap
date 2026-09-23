import { useEffect, useRef, useState } from "react";
import type { SharedView } from "./sharedView";
import { sharedViewFromHash } from "./sharedView";

function clearSharedHash() {
  history.replaceState(null, "", `${location.pathname}${location.search}`);
}

export default function SharedViewLoader({
  apply,
}: {
  apply: (view: SharedView) => Promise<void>;
}) {
  const [view] = useState(() => sharedViewFromHash());
  const started = useRef(false);

  useEffect(() => {
    if (!view || started.current) {
      return;
    }

    started.current = true;
    clearSharedHash();
    void apply(view);
  }, [apply, view]);

  return null;
}
