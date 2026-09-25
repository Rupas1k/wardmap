import Feature from "ol/Feature";
import MultiPolygon from "ol/geom/MultiPolygon";
import Polygon from "ol/geom/Polygon";
import { useEffect, useState } from "react";
import { BsFillGearFill } from "react-icons/bs";
import { assetUrl } from "../config";
import { gridOrigin, gridSize } from "./constants";
import layers from "./layers";
import { pixelProjection, unitProjection } from "./projections";
import { useMapStore } from "../state/mapState";
import { defaultClusterMarkerSize } from "../state/mapState";
import type {
  ClusterMarkerSize,
  MapColorMode,
  MapColorStatistic,
  VisionTechnique,
} from "../state/mapState";
import Popup from "../components/Popup";
import { fieldControlClass, floatingIconControlClass } from "../components/ui";

export default function MapSettings({
  mapVersion,
  visionTechnique,
  setVisionTechnique,
  clusterMarkerSize,
  setClusterMarkerSize,
  colorMode,
  colorStatistic,
  setColorMode,
  setColorStatistic,
}: {
  mapVersion: number;
  visionTechnique: VisionTechnique;
  setVisionTechnique: (technique: VisionTechnique) => void;
  clusterMarkerSize: ClusterMarkerSize;
  setClusterMarkerSize: (size: ClusterMarkerSize) => void;
  colorMode: MapColorMode;
  colorStatistic: MapColorStatistic;
  setColorMode: (mode: MapColorMode) => void;
  setColorStatistic: (statistic: MapColorStatistic) => void;
}) {
  const elevations = useMapStore((state) => state.elevations);
  const [debugElevation, setDebugElevation] = useState<number | null>(null);

  useEffect(() => {
    layers.tiles.getSource()!.setUrl(assetUrl(`static/img/tiles/${mapVersion}/{z}/{x}/{y}.png`));
  }, [mapVersion]);

  useEffect(() => {
    layers.wards.changed();
  }, [clusterMarkerSize]);

  useEffect(() => {
    const source = layers.elevations.getSource()!;

    source.clear();

    if (!elevations || debugElevation === null) {
      return;
    }

    const polygons: number[][][][] = [];

    for (let row = 0; row < elevations.length; row += 1) {
      for (let column = 0; column < (elevations[row]?.length ?? 0); column += 1) {
        if ((elevations[row]?.[column] ?? 0) >> 1 !== debugElevation) {
          continue;
        }

        const left = gridOrigin.x + (column - 0.5) * gridSize;
        const right = left + gridSize;
        const bottom = gridOrigin.y + (row - 0.5) * gridSize;
        const top = bottom + gridSize;

        polygons.push([
          [
            [left, bottom],
            [right, bottom],
            [right, top],
            [left, top],
            [left, bottom],
          ],
        ]);
      }
    }

    source.addFeature(
      new Feature({
        geometry: new MultiPolygon(polygons).transform(unitProjection, pixelProjection),
      }),
    );
  }, [debugElevation, elevations]);

  function toggleTrees() {
    if (!elevations) {
      return;
    }

    const source = layers.trees.getSource()!;

    if (source.getFeatures().length > 0) {
      source.clear();

      return;
    }

    const features: Feature<Polygon>[] = [];

    for (let row = 0; row < elevations.length; row += 1) {
      for (let column = 0; column < (elevations[row]?.length ?? 0); column += 1) {
        if (((elevations[row]?.[column] ?? 0) & 1) === 0) {
          continue;
        }

        const left = gridOrigin.x + (column - 0.5) * gridSize;
        const right = left + gridSize;
        const bottom = gridOrigin.y + (row - 0.5) * gridSize;
        const top = bottom + gridSize;

        features.push(
          new Feature({
            geometry: new Polygon([
              [
                [left, bottom],
                [right, bottom],
                [right, top],
                [left, top],
                [left, bottom],
              ],
            ]).transform(unitProjection, pixelProjection),
          }),
        );
      }
    }
    source.addFeatures(features);
  }

  return (
    <Popup
      ariaLabel="Open map settings"
      groupName="map-tools"
      trigger={<BsFillGearFill />}
      triggerClassName={floatingIconControlClass}
      triggerTitle="Map settings"
    >
      {() => (
        <div className="flex flex-col gap-2 text-sm">
          <p className="text-xs font-medium text-slate-300">Map settings</p>
          <label className="text-xs text-slate-500">
            Vision model
            <select
              className={fieldControlClass}
              value={visionTechnique}
              onChange={(event) => setVisionTechnique(event.target.value as VisionTechnique)}
            >
              <option value="gridnav">Gridnav</option>
              <option value="polygon">Visibility polygon</option>
            </select>
          </label>
          <div className="mt-1 border-t border-white/10 pt-3">
            <label className="text-xs text-slate-500">
              Color by
              <select
                className={fieldControlClass}
                value={colorMode}
                onChange={(event) => setColorMode(event.target.value as MapColorMode)}
              >
                <option value="deward-rate">Deward rate</option>
                <option value="added-vision">Added vision</option>
                <option value="enemy-sightings">New enemy sightings</option>
                <option value="lifetime">Ward lifetime</option>
                <option value="placement">Placement time</option>
                <option value="ward-type">Ward type</option>
                <option value="single">Single color</option>
              </select>
            </label>
            {["added-vision", "enemy-sightings", "lifetime", "placement"].includes(colorMode) ? (
              <label className="mt-2 block text-xs text-slate-500">
                Calculate using
                <select
                  className={fieldControlClass}
                  value={colorStatistic}
                  onChange={(event) => setColorStatistic(event.target.value as MapColorStatistic)}
                >
                  <option value="median">Median</option>
                  <option value="mean">Mean</option>
                </select>
              </label>
            ) : null}
          </div>
          <div className="mt-1 border-t border-white/10 pt-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">Marker size</p>
              <button
                className="text-xs text-slate-500 hover:text-slate-300 disabled:cursor-default disabled:opacity-40"
                disabled={
                  clusterMarkerSize.minimum === defaultClusterMarkerSize.minimum &&
                  clusterMarkerSize.maximum === defaultClusterMarkerSize.maximum
                }
                type="button"
                onClick={() => setClusterMarkerSize(defaultClusterMarkerSize)}
              >
                Reset
              </button>
            </div>
            <label className="mt-2 grid grid-cols-[3.5rem_1fr_2rem] items-center gap-2 text-xs text-slate-500">
              Smallest
              <input
                className="accent-cyan-400"
                max="20"
                min="2"
                step="0.5"
                type="range"
                value={clusterMarkerSize.minimum}
                onChange={(event) => {
                  const minimum = Number(event.target.value);

                  setClusterMarkerSize({
                    minimum,
                    maximum: Math.max(clusterMarkerSize.maximum, minimum),
                  });
                }}
              />
              <span className="text-right text-slate-300 tabular-nums">
                {clusterMarkerSize.minimum}px
              </span>
            </label>
            <label className="mt-2 grid grid-cols-[3.5rem_1fr_2rem] items-center gap-2 text-xs text-slate-500">
              Largest
              <input
                className="accent-cyan-400"
                max="20"
                min="2"
                step="0.5"
                type="range"
                value={clusterMarkerSize.maximum}
                onChange={(event) => {
                  const maximum = Number(event.target.value);

                  setClusterMarkerSize({
                    minimum: Math.min(clusterMarkerSize.minimum, maximum),
                    maximum,
                  });
                }}
              />
              <span className="text-right text-slate-300 tabular-nums">
                {clusterMarkerSize.maximum}px
              </span>
            </label>
          </div>
          <details className="mt-1 border-t border-white/10 pt-2 text-xs">
            <summary className="cursor-pointer list-none py-1 text-slate-500 hover:text-slate-300">
              Advanced
            </summary>
            <div className="pt-2">
              <label className="text-slate-500">
                Debug elevation
                <input
                  className={fieldControlClass}
                  disabled={!elevations}
                  placeholder="Off"
                  step="1"
                  type="number"
                  value={debugElevation ?? ""}
                  onChange={(event) =>
                    setDebugElevation(event.target.value === "" ? null : Number(event.target.value))
                  }
                />
              </label>
              <button
                className="mt-2 px-1 py-1 text-left text-slate-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!elevations}
                type="button"
                onClick={toggleTrees}
              >
                Debug trees
              </button>
            </div>
          </details>
        </div>
      )}
    </Popup>
  );
}
