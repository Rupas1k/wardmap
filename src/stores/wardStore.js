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
                this.setWasmClusters(await runWasm(this.wasmClusterParams, data))
            }
        )

        reaction(
            () => ({
                eps: this.wasmClusterParams.eps,
                min_samples: this.wasmClusterParams.min_samples
            }),
            async params => {
                this.setWardDataHashTable(new Map(this.wardData.map((ward) => [ward.id, ward])))
                this.setWasmClusters(await runWasm(params, this.wardData))
            }
        )

        reaction(
            () => this.wasmClusters,
            data => {
                this.rootStore.mapStore.setWasmClusters()
            }
        )
    }

    wasmClusterParams = observable({
        eps: 64,
        min_samples: 5
    })

    wardData = []
    wardDataHashTable = new Map()

    wasmClusters = []


    setWardData = data => {
        this.wardData = data
    }

    setWasmClusters = data => {
        this.wasmClusters = data
    }

    setClusters = data => {
        this.clusters = data
    }

    setWardDataHashTable = data => {
        this.wardDataHashTable = data
    }

    setEps = eps => {
        this.wasmClusterParams.eps = parseInt(eps)
    }

    setMinSamples = minSamples => {
        this.wasmClusterParams.min_samples = parseInt(minSamples)
    }
}

export default wardStore