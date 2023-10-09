import {Circle, Fill, Stroke, Style} from "ol/style";

const fill = new Fill({
    color: 'rgba(255,255,255, 0.5)',
})

const stroke = new Stroke({
    color: '#3399CC',
    width: 1.25,
})

const defaultStyle = [
    new Style({
        image: new Circle({
            fill: fill,
            stroke: stroke,
            radius: 5,
        }),
        fill: fill,
        stroke: stroke,
    }),
]

const mainStyle = feature => {
    if(feature.getGeometry().getType() === "Point"){
        const duration_delta = (feature.getProperties().data.cluster.duration - 275) / 360 * 255
        const amount_delta = (feature.getProperties().data.cluster.amount - 200) / 400

        return new Style({
            image: new Circle({
                radius: 5.5,
                fill: new Fill({
                    color: [128 - duration_delta, 128 + duration_delta, 0, amount_delta > -0.2 ? 0.8 + amount_delta : 0.6]
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