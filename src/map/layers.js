import {Tile as TileLayer, Vector as VectorLayer} from "ol/layer";
import {Vector as VectorSource, XYZ} from "ol/source";

import {projections} from "./projections";
import mainStyle from "./styles";
import {Fill, Style} from "ol/style";
import {Feature} from "ol";
import {Polygon} from "ol/geom";


const {pixel} = projections

const layers = {
    tiles: new TileLayer({
        source: new XYZ({
            // url: 'img/tiles/divine_sanctum/734d/{z}/{x}/{y}.png',
            url: null,
            projection: pixel,
            wrapX: false,
        }),
    }),
    wards: new VectorLayer({
        source: new VectorSource(),
        style: feature => mainStyle(feature, 'all')
    }),
    trees: new VectorLayer({
        source: new VectorSource()
    }),
    elevations: new VectorLayer({
        source: new VectorSource()
    }),
    shade: new VectorLayer({
        style: new Style({
            fill: new Fill({
                color: [0, 0, 0, 0],
            }),
        }),
        source: new VectorSource({
             features: [new Feature({
                 geometry: new Polygon([
                     [[0, 0],
                     [0, 16384],
                     [16384, 16384],
                     [16384, 0],
                     [0, 0]]
                 ])
             })]
        })
    })
}

export default layers