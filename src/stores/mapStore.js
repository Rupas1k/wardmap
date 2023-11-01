import {makeAutoObservable, reaction, autorun} from "mobx";
import {Feature} from "ol";
import {Point, Polygon} from "ol/geom";
import layers from "../map/layers";
import {projections} from "../map/projections";
import calculateVision from "../map/calculateVision";
import {gridSize, mapSize} from "../map/constants";
import mainStyle from "../map/styles";

const {unit, pixel} = projections

class mapStore {
    map = null

    elevations = null

    features = []
    visionFeature = null
    currentFeature = null
    averageValues = null

    sides = ['radiant', 'dire', 'all']
    currentSide = 2

    maps = ['divine_sanctum', 'default']
    currentMap = 0


    constructor(rootStore) {
        this.rootStore = rootStore
        makeAutoObservable(this);

        autorun(async () => {
            this.setElevations(await this.fetchElevations())
        })

        reaction(
            () => this.features,
            () => {
                this.updateMap()
            }
        )

        reaction(
            () => this.currentFeature,
            current => {
                if(current){
                    const coordinates = current.getProperties().data.coordinates
                    const x = Math.floor(coordinates[0] - mapSize.units.x0)
                    const y = Math.floor(coordinates[1] - mapSize.units.y0)
                    const z = (coordinates[2] - 16384) / 128
                    this.setVisionFeature(calculateVision(this.elevations, x, y, z))
                } else {
                    this.setVisionFeature(new Feature())
                }
            }
        )

        reaction(
            () => this.visionFeature,
            (curr, prev) => {
                if (prev !== null) layers.wards.getSource().removeFeature(prev)
                layers.wards.getSource().addFeature(this.visionFeature)
            }
        )

        reaction(
            () => this.currentSide,
            () => {
                this.updateStyle()
            }
        )
    }

    fetchElevations = async () => {
        return (await fetch("/data/elevations.json")).json()
    }

    setElevations = (elevations) => {
        this.elevations = elevations
    }

    setMap = mapInstance => {
        this.map = mapInstance;
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

    setCurrentFeature = feature => {
        this.currentFeature = feature
    }

    setWasmClusters = () => {
        const {wardStore} = this.rootStore
        const {pixel, unit} = projections
        const features = []
        wardStore.wasmClusters.forEach((cluster, key) => {
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
            if (cluster.cluster_id === -1){
                this.setAverageValues(cluster)
            } else {
                let coord = [cluster.x_pos, cluster.y_pos, cluster.z_pos]
                const feature = new Feature({
                    geometry: new Point([coord[0], coord[1]]).transform(unit, pixel),
                    data: {"cluster": cluster, "coordinates": [coord[0], coord[1], coord[2]]},
                })
                features.push(feature)
            }
        })
        this.setFeatures(features)
    }

    updateMap = () => {
        this.visionFeature = new Feature()
        layers.wards.getSource().clear()
        layers.wards.getSource().addFeatures(this.features)
        this.updateStyle()
    }

    updateStyle = () => {
        layers.wards.setStyle(feature => mainStyle(feature, this.sides[this.currentSide]))
    }

    switchMap = () => {
        this.currentMap = this.currentMap < this.maps.length - 1 ? this.currentMap + 1 : 0
        layers.tiles.getSource().setUrl(`img/tiles/${this.maps[this.currentMap]}/734d/{z}/{x}/{y}.png`)
    }

    setCurrentSide = side => {
        this.currentSide = side
    }

    setAverageValues = average => {
        this.averageValues = average
    }

    debugMapElevations = z => {
        const features = []
        const x_min = mapSize.units.x0
        const y_min = mapSize.units.y0
        const cells = Math.ceil(mapSize.units.y / gridSize) // 283 566

        for(let i = 0; i < cells; i++){
            for(let j = 0; j < cells; j++){
                // if(elevation[cells - i - 1][j] / 128 >= z){
                if((this.elevations[cells - i - 1][j] >> 1) / 128 >= z){
                    features.push(new Feature({
                        geometry: new Polygon([[
                            [x_min + (j - 0.5) * gridSize, y_min + (cells - i - 1 - 0.5) * gridSize],
                            [x_min + (j + 1 - 0.5) * gridSize, y_min + (cells - i - 1 - 0.5) * gridSize],
                            [x_min + (j + 1 - 0.5) * gridSize, y_min + (cells - i + 1 - 1 - 0.5) * gridSize],
                            [x_min + (j - 0.5) * gridSize, y_min + (cells - i + 1 - 1 - 0.5) * gridSize],
                            [x_min + (j - 0.5) * gridSize, y_min + (cells - i - 1 - 0.5) * gridSize],
                        ]]).transform(unit, pixel)
                    }))
                }
            }
        }

        if (layers.elevations.getSource().getFeatures().length){
            layers.elevations.getSource().clear()
        } else {
            layers.elevations.getSource().addFeatures(features)
        }
    }

    debugMapTrees = () => {
        const features = []
        const x_min = mapSize.units.x0
        const y_min = mapSize.units.y0
        const cells = Math.ceil(mapSize.units.y / gridSize) // 283 566

        for(let i = 0; i < cells; i++){
            for(let j = 0; j < cells; j++){
                // if(trees[cells - i - 1][j] > -1){
                if(this.elevations[cells - i - 1][j] & 1){
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
}

export default mapStore