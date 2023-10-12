import {Feature} from "ol";

import calculateVision from "./calculateVision";
import {mapSize} from "./constants";
import debugMapTrees from "../actions/debug/debugMapTrees";
import layers from "./layers";
import {XYZ} from "ol/source";
import {projections} from "./projections";

const {pixel} = projections

export const click = (e, mapStore) => {
    const this_pixel = mapStore.map.getEventPixel(e.originalEvent);
    let feature = null
    mapStore.map.forEachFeatureAtPixel(this_pixel, (this_feature) => {
        if (this_feature.getGeometry().getType() === "Point") {
            feature = this_feature
        }
    });

    if (feature) {
        const coordinates = feature.getProperties().data.coordinates
        const x = Math.floor(coordinates[0] - mapSize.units.x0)
        const y = Math.floor(coordinates[1] - mapSize.units.y0)
        const z = (coordinates[2] - 16384) / 128

        // debugMapTrees(mapStore)
        mapStore.setCurrentFeature(feature)
        mapStore.setVisionFeature(calculateVision(x, y, z))
    } else {
        mapStore.setCurrentFeature(null)
        mapStore.setVisionFeature(new Feature())
    }
}