import {Map, View} from "ol";
import {defaults} from "ol/control"

import {pixelProjection} from "./projections"
import {minZoom, maxZoom, mapExtent, mapCenter} from "./constants";
import layers from "./layers";


export const createMap = () => {
    return new Map({
        layers: [layers.tiles, layers.shade, layers.vision, layers.wards, layers.trees, layers.elevations],
        target: 'map',
        view: new View({
            projection: pixelProjection,
            center: mapCenter,
            extent: mapExtent,
            zoom: minZoom,
            minZoom: minZoom,
            maxZoom: maxZoom,
            enableRotation: false
        }),
        controls: defaults({
            zoom: false,
            rotate: false
        })
    })
}
