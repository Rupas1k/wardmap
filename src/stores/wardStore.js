import {makeAutoObservable, observable, reaction} from "mobx";
import runWasm from "../actions/runWasm";

class wardStore {
    constructor(rootStore) {
        this.rootStore = rootStore
        makeAutoObservable(this)
        reaction(
            () => this.wardData,
            async data => {
                this.setWardDataHashTable(new Map(data.map((ward) => [ward.id, ward])))
                this.setClusterData(await runWasm(this.clusterParams, data))
            }
        )

        reaction(
            () => ({
                eps: this.clusterParams.eps,
                min_samples: this.clusterParams.min_samples
            }),
            async params => {
                this.setWardDataHashTable(new Map(this.wardData.map((ward) => [ward.id, ward])))
                this.setClusterData(await runWasm(params, this.wardData))
            }
        )

        reaction(
            () => this.clusterData,
            data => {
                this.rootStore.mapStore.setClusterFeatures()
            }
        )

        reaction(
            () => this.clusters,
            data => {
                this.rootStore.mapStore.setClusters()
            }
        )
    }

    clusterParams = observable({
        eps: 32,
        min_samples: 10
    })

    wardData = []

    wardDataHashTable = new Map()

    clusterData = []

    clusters = []

    // fixedClusterData = []

    setWardData = data => {
        this.wardData = data
    }

    setClusterData = data => {
        this.clusterData = data
    }

    setClusters = data => {
        this.clusters = data
    }

    setWardDataHashTable = data => {
        this.wardDataHashTable = data
    }

    setEps = eps => {
        this.clusterParams.eps = parseInt(eps)
        console.log(eps)
    }

    setMinSamples = minSamples => {
        this.clusterParams.min_samples = parseInt(minSamples)
    }
}

export default wardStore