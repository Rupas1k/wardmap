import { useEffect } from "react";
import { useImportedStore } from "./state";
import { loadImportedLibrary } from "./storage";

export default function useImportedLibrary() {
  const setLibrary = useImportedStore((state) => state.setLibrary);
  const setReady = useImportedStore((state) => state.setReady);

  useEffect(() => {
    let active = true;

    void loadImportedLibrary()
      .then((library) => {
        if (active) {
          setLibrary(library);
          setReady(true);
        }
      })
      .catch(() => {
        if (active) {
          setReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, [setLibrary, setReady]);
}
