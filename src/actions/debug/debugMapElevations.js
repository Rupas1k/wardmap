import {Feature} from "ol";
import {Polygon} from "ol/geom";

import {mapSize} from "../../map/constants";
import elevation from "../../map/data/elevation.json"

import {projections} from "../../map/projections";

const {unit, pixel} = projections

const debugMapElevations = (mapStore, z) => {
    const features = []
    const x_min = mapSize.units.x0
    const y_min = mapSize.units.y0
    const cells = 283 // 283 566
    const gridsize = 64

    for(let i = 0; i < cells; i++){
        for(let j = 0; j < cells; j++){
            if(elevation[cells - i - 1][j] / 128 >= z){
                features.push(new Feature({
                    geometry: new Polygon([[
                        [x_min + (j - 0.5) * gridsize, y_min + (cells - i - 1 - 0.5) * gridsize],
                        [x_min + (j + 1 - 0.5) * gridsize, y_min + (cells - i - 1 - 0.5) * gridsize],
                        [x_min + (j + 1 - 0.5) * gridsize, y_min + (cells - i + 1 - 1 - 0.5) * gridsize],
                        [x_min + (j - 0.5) * gridsize, y_min + (cells - i + 1 - 1 - 0.5) * gridsize],
                        [x_min + (j - 0.5) * gridsize, y_min + (cells - i - 1 - 0.5) * gridsize],
                    ]]).transform(unit, pixel)
                }))
            }
        }
    }

    mapStore.features = features
}

export default debugMapElevations
