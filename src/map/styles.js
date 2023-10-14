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

const getPointColor = feature => {
    // const duration_delta = (feature.getProperties().data.cluster.duration - 280) / 360 * 255
    const destroyed_ratio = feature.getProperties().data.cluster.is_destroyed / feature.getProperties().data.cluster.amount
    const amount_ratio = (feature.getProperties().data.cluster.amount - 200) / 400

    const opacity = amount_ratio > -0.3 ? 0.7 + amount_ratio : 0.4

    const red = 128 + (destroyed_ratio - 0.25) * 255
    const green = 128 - (destroyed_ratio - 0.25) * 255
    const blue = 0

    return [red, green, blue, opacity]

}

const mainStyle = feature => {

    if(feature.getGeometry().getType() === "Point" && feature.getProperties().data.cluster.amount !== undefined){
        // console.log(feature.getProperties().data.cluster)
        return new Style({
            image: new Circle({
                radius: 5.5,
                fill: new Fill({
                    color: getPointColor(feature)
                }),
                stroke: new Stroke({
                    width: 1.8,
                    color: '#151515',
                })
            })
        })
    }

    if(feature.getGeometry().getType() === "Polygon"){
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