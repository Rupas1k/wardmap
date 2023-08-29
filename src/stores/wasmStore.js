import {makeAutoObservable, toJS} from "mobx";
import init, {greet, run_model} from "wasm";

class wasmStore {
    constructor(mainStore) {
        this.mainStore = mainStore
        makeAutoObservable(this)
    }

    params = {
        eps: 64,
        min_samples: 10,
        appx: true
    }

    eps = 0

    async runWasm(wards){
        let start = Date.now()

        await init()

        console.log(Date.now() - start)


        let wards_wasm = wards.map(ward => { return {id: ward.id, x_pos: ward.x_pos, y_pos: ward.y_pos} })

        console.log(Date.now() - start)


        let result = run_model({
            eps: this.params.eps,
            min_samples: this.params.min_samples,
            appx: this.params.appx,
            wards: wards_wasm
        });

        console.log(Date.now() - start)

        const {wardStore} = this.mainStore

        result = new Map([...result.entries()].sort((a, b) => a[0] - b[0]));
        console.log(Date.now() - start)

        let new_result = []
        // let hashTable = toJS(wardStore.wardDataHashTable)
        result.forEach((cluster, key) => {
            if (key === -1) return
            let new_cluster = []
            cluster.forEach(ward_id => {
                let ward = wardStore.wardDataHashTable.get(ward_id)
                new_cluster.push(ward)
            })
            new_result.push(new_cluster)
        })

        console.log(Date.now() - start)
        wardStore.setClusterData(new_result)
    }

    onEpsChange = event => {
        let value = event.target.value
        this.params.eps = value.length > 0 && value == +value && parseInt(value) <= Number.MAX_SAFE_INTEGER ? parseInt(value) : 0
    }

}

export default wasmStore