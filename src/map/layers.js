import {Tile as TileLayer, Vector as VectorLayer} from "ol/layer";
import {Vector as VectorSource, XYZ} from "ol/source";

import {projections} from "./projections";
import mainStyle from "./styles";

const {pixel} = projections

const layers = {
    tiles: new TileLayer({
        source: new XYZ({
            url: 'img/tiles/divine_sanctum/734d/{z}/{x}/{y}.png',
            projection: pixel,
            wrapX: false,
        }),
    }),
    wards: new VectorLayer({
        source: new VectorSource(),
        style: mainStyle
    }),
    trees: new VectorLayer({
        source: new VectorSource()
    }),
    elevations: new VectorLayer({
        source: new VectorSource()
    })
}

export default layers