import {Circle, Fill, Stroke, Style} from "ol/style";

const defaultFill = new Fill({
    color: 'rgba(255,255,255, 0.5)',
})

const defaultStroke = new Stroke({
    color: '#3399CC',
    width: 1.25,
})

const defaultStyle = [
    new Style({
        image: new Circle({
            fill: defaultFill,
            stroke: defaultStroke,
            radius: 5,
        }),
        fill: defaultFill,
        stroke: defaultStroke,
    }),
]

const getPointColor = (feature, side) => {
    const destroyedRatio = feature.getProperties().data.cluster[side].destroyed / feature.getProperties().data.cluster[side].amount

    const red = 128 + (destroyedRatio - 0.3) * 255
    const green = 128 - (destroyedRatio - 0.3) * 255
    const blue = 0

    return destroyedRatio > 0 && destroyedRatio < 1 ? [red, green, blue, 1] : destroyedRatio === 0 ? '#FF00FF' : destroyedRatio === 1 ? '#800000' : '#fff'
}

const getPointRadius = (feature, side) => {
    const amountRatio = (feature.getProperties().data.cluster[side].amount - 10) / 10
    const returnValue = 5 + amountRatio
    return Math.min(Math.max(returnValue, 4), 6)
}

const mainStyle = (feature, side) => {
    if (feature.getGeometry().getType() === "Point") {
        if (feature.getProperties().data.cluster[side].amount === 0) {
            return new Style({
                image: new Circle({
                    radius: 4,
                    fill: new Fill({
                        color: 'grey'
                    }),
                    stroke: new Stroke({
                        width: 1.8,
                        color: '#000',
                    })
                })
            })
        } else {
            return new Style({
                image: new Circle({
                    radius: getPointRadius(feature, side),
                    fill: new Fill({
                        color: getPointColor(feature, side)
                    }),
                    stroke: new Stroke({
                        width: 2,
                        color: '#151515',
                    })
                })
            })
        }
    }

    if (feature.getGeometry().getType() === "Polygon") {
        return new Style({
            fill: new Fill({
                color: [188, 156, 60, 0.5],
            }),
            stroke: new Stroke({
                color: [255, 255, 170],
            }),
        })
    }

    return defaultStyle
}

export default mainStyle