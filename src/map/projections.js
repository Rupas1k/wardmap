import {Projection, addCoordinateTransforms} from "ol/proj";
import {mapSize} from "./constants";

export const projections = {
    pixel: new Projection({
        code: "pixel",
        units: "pixels",
        extent: [0, 0, mapSize.pixels.x, mapSize.pixels.y]
    }),
    unit: new Projection({
        code: "unit",
        units: "units",
    })
}

export const unitToPixel = coord => {
    let x = (coord[0] - mapSize.units.x0) / mapSize.units.x * mapSize.pixels.x
    let y = (coord[1] - mapSize.units.y0) / mapSize.units.y * mapSize.pixels.y
    return [x, y]
}

addCoordinateTransforms(projections.unit, projections.pixel, unitToPixel, null)