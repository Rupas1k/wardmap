import {makeAutoObservable, reaction} from "mobx";
import {Feature} from "ol";
import {Point} from "ol/geom";
import {projections} from "../map/projections";

class mapStore {
    map = null
    vectorLayer = null
    vectorSource = null

    features = []
    visionFeature = null
    currentFeature = null

    constructor(rootStore) {
        this.rootStore = rootStore
        makeAutoObservable(this);

        reaction(
            () => this.features,
            features => {
                this.updateMap()
            }
        )

        reaction(
            () => this.visionFeature,
            (curr, prev) => {
                if (prev !== null) this.vectorSource.removeFeature(prev)
                this.vectorSource.addFeature(this.visionFeature)
            }
        )
    }

    setMap = (mapInstance, vectorLayer, vectorSource) => {
        this.map = mapInstance;
        this.vectorSource = vectorSource
        this.vectorLayer = vectorLayer
    }

    setFeatures = (features) => {
        this.features = features
    }

    addFeature = feature => {
        this.features.push(feature)
    }

    setVisionFeature = feature => {
        this.visionFeature = feature
    }

    setWasmClusters = () => {
        const {wardStore} = this.rootStore
        const {pixel, unit} = projections
        const features = []
        wardStore.clusterData.forEach((cluster, key) => {
            if (key === -1) return
            let coord = [0, 0, null]
            let i = 0
            cluster.forEach(ward_id => {
                let ward = wardStore.wardDataHashTable.get(ward_id)
                if (coord[2] == null) coord[2] = ward.z_pos
                coord[0] += ward.x_pos
                coord[1] += ward.y_pos
                i += 1
            })
            coord[0] /= i
            coord[1] /= i

            const feature = new Feature({
                geometry: new Point([coord[0], coord[1]]).transform(unit, pixel),
                data: {"cluster": cluster, "coordinates": [coord[0], coord[1], coord[2]]},
            })

            features.push(feature)


        })
        this.setFeatures(features)
    }

    setClusters = () => {
        const {wardStore} = this.rootStore
        const {pixel, unit} = projections
        const features = []
        wardStore.clusters.forEach(cluster => {
            let coord = [cluster.x_pos, cluster.y_pos, cluster["z_pos"]]
            const feature = new Feature({
                geometry: new Point([coord[0], coord[1]]).transform(unit, pixel),
                data: {"cluster": cluster, "coordinates": [coord[0], coord[1], coord[2]]},
            })
            features.push(feature)
        })
        this.setFeatures(features)
    }

    updateMap = () => {
        this.visionFeature = new Feature()
        this.vectorSource.clear()
        this.vectorSource.addFeatures(this.features)
    }
}

export default mapStore