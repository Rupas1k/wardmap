export const mapSize = {
    pixels: {
        x: 16384,
        y: 16384,
    },
    units: {
        x: 18099 - 256,//144.53 * 128, //151.42
        y: 18099 - 200, //144.53 * 128,
        x0: 58.29 * 128,//7234,//55.74 * 128,
        y0: 58.29 * 128, //7234,
    }
}

export const mapCenter = [(mapSize.pixels.x) / 2, (mapSize.pixels.y) / 2]
// export const mapExtent = [-5000, -2000, mapSize.pixels.x + 5000, mapSize.pixels.y + 2000]
export const mapExtent = [-2500, -1500, mapSize.pixels.x + 2500, mapSize.pixels.y + 1500]

export const gridSize = 64

export const observerRadius = {
    day: 1600,
    night: 0
}

export const minZoom = 1
export const maxZoom = 6
