import {action, makeAutoObservable, makeObservable, observable} from "mobx";

class settingsStore{
    constructor() {
        makeObservable(this, {
            clusterParams: observable,
            setEps: action,
            setMinSamples: action
        })
    }

    clusterParams = {
        eps: null,
        min_samples: null
    }

    setEps = eps => {
        this.clusterParams.eps = eps
    }

    setMinSamples = minSamples => {
        this.clusterParams.min_samples = minSamples
    }
}

export default settingsStore
