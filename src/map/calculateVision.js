import {
    convertToSegments,
    compute,
} from 'visibility-polygon';


import {mapSize, observerRadius, gridSize} from "./constants";
import {pixelProjection, unitProjection} from "./projections";

import {intersect, polygon} from "turf";
import {Circle, Polygon} from "ol/geom";
import {Feature} from "ol";
import {fromCircle} from "ol/geom/Polygon";


const x_min = mapSize.units.x0
const y_min = mapSize.units.y0
const y_size = mapSize.units.y
const radius = observerRadius


const calculateVisibilityPolygon = (elevations, x, y, z) => {
    const cells = Math.ceil(y_size / gridSize)
    const polygons = []

    polygons.push([
        [x - radius, y + radius],
        [x + radius, y + radius],
        [x - radius, y - radius],
        [x + radius, y - radius],
    ])

    const x0 = Math.round((x - radius) / gridSize)
    const y0 = cells - Math.round((y + radius) / gridSize) - 1

    const curr_x = Math.round(x / gridSize)
    const curr_y = cells - Math.round(y / gridSize) - 1

    for (let i = y0; i < y0 + Math.floor((2 * radius) / gridSize) + 1; i++) {
        for (let j = x0; j < x0 + Math.floor((2 * radius) / gridSize) + 1; j++) {
            if (j > 0 && j < cells && cells - i - 1 < cells && i < cells && i > 0 && cells - i - 1 > 0){
                if (!((elevations[cells - curr_y - 1][curr_x] & 1) && (Math.abs(curr_x - j) < 2 && Math.abs(curr_y - i) < 2))) {
                    if ((elevations[cells - i - 1][j] >> 1) > z * 128 + 64 || ((elevations[cells - i - 1][j] & 1) === 1 && (elevations[cells - i - 1][j] >> 1) + 128 + 64 > z * 128)) {
                        polygons.push([
                            [(j - 0.5) * gridSize, (cells - i - 0.7) * gridSize],
                            [(j + 1 - 0.5) * gridSize, (cells - i - 0.7) * gridSize],
                            [(j + 1 - 0.5) * gridSize, (cells - (i + 1) - 0.7) * gridSize],
                            [(j - 0.5) * gridSize, (cells - (i + 1) - 0.7) * gridSize],
                        ])
                    }
                }
            }
        }
    }

    const computed = compute([x, y], convertToSegments(polygons));
    computed.push(computed[0])

    return computed.map(coord => [coord[0] + x_min, coord[1] + y_min])
}

const calculateVision = (elevations, x, y, z) => {
    const visibilityPolygon = new Feature({
        geometry: new Polygon([calculateVisibilityPolygon(elevations, x, y, z)])
    })
    const circle = new Feature({
        geometry: new fromCircle(new Circle([x + x_min, y + y_min], radius), 128)
    })

    const turfVisibilityPolygon = polygon([visibilityPolygon.getGeometry().getCoordinates()[0]]);
    const turfCircle = polygon([circle.getGeometry().getCoordinates()[0]]);

    const intersectionCoordinates = intersect(turfVisibilityPolygon, turfCircle).geometry.coordinates[0];

    return new Feature({
        geometry: new Polygon([intersectionCoordinates]).transform(unitProjection, pixelProjection),
    });
}

export default calculateVision