import {
    convertToSegments,
    compute,
} from 'visibility-polygon';


import {mapSize, observer_radius} from "./constants";

import trees from "./data/trees.json"
import elevation from "./data/elevation.json"


const x_min = mapSize.units.x0
const y_min = mapSize.units.y0
const y_size = mapSize.units.y
const radius = observer_radius.day


const calculateVision = coordinates => {
    const grid_size = 64
    const cells = Math.ceil(y_size / grid_size)

    const x = Math.floor(coordinates[0])
    const y = Math.floor(coordinates[1])
    const z = coordinates[2]

    const polygons = []

    polygons.push([
        [x - radius, y + radius],
        [x + radius, y + radius],
        [x - radius, y - radius],
        [x + radius, y - radius],
    ])

    const x0 = Math.floor((x - radius) / grid_size) - 1
    const y0 = cells - Math.floor((y + radius) / grid_size) - 1 - 1

    for (let i = y0; i < y0 + Math.floor((2 * radius) / grid_size) + 1; i++) {
        for (let j = x0; j < x0 + Math.floor((2 * radius) / grid_size) + 1; j++) {
            if (j > 0 && j < cells && cells - i - 1 < cells && i < cells && i > 0 && cells - i - 1 > 0) {
                if (elevation[cells - i - 1][j] > z * 128 + 64 || (trees[cells - i - 1][j] > -1 && trees[cells - i - 1][j] + 128 + 64 > z * 128)) {
                    polygons.push([
                        [(j - 0.5) * grid_size, (cells - i - 1) * grid_size],
                        [(j + 1 - 0.5) * grid_size, (cells - i - 1) * grid_size],
                        [(j + 1 - 0.5) * grid_size, (cells - (i + 1) - 1) * grid_size],
                        [(j - 0.5) * grid_size, (cells - (i + 1) - 1) * grid_size],
                    ])
                }
            }
        }
    }

    const computed = compute([x, y], convertToSegments(polygons));
    computed.push(computed[0])

    return computed.map(coord => [coord[0] + x_min, coord[1] + y_min])
}

export default calculateVision