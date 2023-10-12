import {Map, View} from "ol";
import {defaults} from "ol/control"

import {projections} from "./projections"
import {minZoom, maxZoom, mapExtent, mapCenter} from "./constants";
import layers from "./layers";

const {pixel} = projections

export const createMap = () => {
    return new Map({
        layers: [layers.tiles, layers.wards, layers.trees, layers.elevations],
        target: 'map',
        view: new View({
            projection: pixel,
            center: mapCenter,
            extent: mapExtent,
            zoom: minZoom,
            minZoom: minZoom,
            maxZoom: maxZoom,
        }),
        controls: defaults({
            zoom: false
        })
    })
}
