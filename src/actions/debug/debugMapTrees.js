import {Feature} from "ol";
import {Polygon} from "ol/geom";

import {mapSize, gridSize} from "../../map/constants";
import elevations from "../../map/data/elevations.json"

import {projections} from "../../map/projections";
import layers from "../../map/layers";

const {unit, pixel} = projections

const debugMapTrees = mapStore => {
    const features = []
    const x_min = mapSize.units.x0
    const y_min = mapSize.units.y0
    const cells = Math.ceil(mapSize.units.y / gridSize) // 283 566

    for(let i = 0; i < cells; i++){
        for(let j = 0; j < cells; j++){
            // if(trees[cells - i - 1][j] > -1){
            if(elevations[cells - i - 1][j] & 1){
                features.push(new Feature({
                    geometry: new Polygon([[
                        [x_min + (j - 0.5) * gridSize, y_min + (cells - i - 1 - 0.7) * gridSize],
                        [x_min + (j + 1 - 0.5) * gridSize, y_min + (cells - i - 1 - 0.7) * gridSize],
                        [x_min + (j + 1 - 0.5) * gridSize, y_min + (cells - i + 1 - 1 - 0.7) * gridSize],
                        [x_min + (j - 0.5) * gridSize, y_min + (cells - i + 1 - 1 - 0.7) * gridSize],
                        [x_min + (j - 0.5) * gridSize, y_min + (cells - i - 1 - 0.7) * gridSize]
                    ]]).transform(unit, pixel)
                }))
            }
        }
    }
    if (layers.trees.getSource().getFeatures().length){
        layers.trees.getSource().clear()
    } else {
        layers.trees.getSource().addFeatures(features)
    }
}

export default debugMapTrees