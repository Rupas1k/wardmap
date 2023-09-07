import {makeAutoObservable} from "mobx";
import init, {run_model} from "wasm";

class wasmStore {
    constructor(mainStore) {
        this.mainStore = mainStore
        makeAutoObservable(this)
    }

    params = {
        eps: 64,
        min_samples: 5,
        appx: false
    }


    runWasm = async wards => {

        await init()

        const wards_wasm = wards.map(ward => { return {id: ward.id, x_pos: ward.x_pos, y_pos: ward.y_pos} })

        const start = Date.now()
        let result = run_model({
            eps: this.params.eps,
            min_samples: this.params.min_samples,
            appx: this.params.appx,
            wards: wards_wasm
        });
        console.log(Date.now() - start)

        result = new Map([...result.entries()].sort((a, b) => a[0] - b[0]));

        // let new_result = []
        // let hashTable = toJS(wardStore.wardDataHashTable)
        // result.forEach((cluster, key) => {
        //     if (key === -1) return
        //     let new_cluster = []
        //     cluster.forEach(ward_id => {
        //         let ward = wardStore.wardDataHashTable.get(ward_id)
        //         new_cluster.push(ward)
        //     })
        //     new_result.push(new_cluster)
        // })

        return result
    }

    onEpsChange = event => {
        let value = event.target.value
        this.params.eps = value.length > 0 && value == +value && parseInt(value) <= Number.MAX_SAFE_INTEGER ? parseInt(value) : 1
    }

    onMinSamplesChange = event => {
        let value = event.target.value
        this.params.min_samples = value.length > 0 && value == +value && parseInt(value) <= Number.MAX_SAFE_INTEGER ? parseInt(value) : 1
    }



}

export default wasmStore