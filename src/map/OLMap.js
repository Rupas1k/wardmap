import {Map, View} from "ol";
import {defaults} from "ol/control"
import {Vector as VectorSource, XYZ} from "ol/source";
import {Tile as TileLayer, Vector as VectorLayer} from "ol/layer";

import {projections} from "./projections"
import {mapSize, minZoom, maxZoom} from "./constants";
import mainStyle from "./styles";


const {pixel} = projections

const view = new View({
    projection: pixel,
    center: [(mapSize.pixels.x) / 2, (mapSize.pixels.y) / 2],
    extent: [-5000, -2000, mapSize.pixels.x + 5000, mapSize.pixels.y + 2000],
    zoom: minZoom,
    minZoom: minZoom,
    maxZoom: maxZoom,
})


const tileLayer = new TileLayer({
    source: new XYZ({
        url: 'img/tiles/{z}/{x}/{y}.png',
        projection: pixel,
        wrapX: false,
    }),
})

export const vectorSource = new VectorSource()
export const vectorLayer = new VectorLayer({
    source: vectorSource,
    style: mainStyle
})

export const createMap = () => {
    return new Map({
        layers: [tileLayer, vectorLayer],
        target: 'map',
        view: view,
        controls: defaults({
            zoom: false
        })
    })
}
