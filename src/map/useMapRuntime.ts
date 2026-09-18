import type Map from "ol/Map";
import { boundingExtent } from "ol/extent";
import { useEffect, useState } from "react";
import type { RefObject } from "react";
import { useMapStore } from "../state/mapState";
import { fetchElevations } from "./fetchElevations";
import { unitToPixel } from "./projections";

export function useElevationGrid(version: number) {
  const setElevations = useMapStore((state) => state.setElevations);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);
    void fetchElevations(version, controller.signal)
      .then((elevations) => {
        setElevations(elevations);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setLoading(false);
        setError(reason instanceof Error ? reason.message : "Unable to load map elevations");
      });

    return () => controller.abort();
  }, [setElevations, version]);

  return { error, loading };
}

export function useMapCamera(map: RefObject<Map | null>) {
  const request = useMapStore((state) => state.cameraRequest);
  const clearRequest = useMapStore((state) => state.clearCameraRequest);

  useEffect(() => {
    if (!map.current || !request) {
      return;
    }

    if (request.kind === "fit") {
      map.current.getView().fit(boundingExtent(request.positions.map(unitToPixel)), {
        duration: 250,
        maxZoom: 4,
        padding: [72, 72, 72, 72],
      });
    } else {
      map.current.getView().animate({
        center: unitToPixel([request.x, request.y]),
        duration: 250,
      });
    }
    clearRequest();
  }, [clearRequest, map, request]);
}
