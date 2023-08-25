import {makeAutoObservable} from "mobx";
import init, {greet, run_model} from "wasm";
import {useEffect} from "react";

class wasmStore {
    constructor(mainStore) {
        this.mainStore = mainStore
        makeAutoObservable(this)
    }

    async runWasm(wards){
        await init()
        let start = Date.now()
        const result = run_model({
            eps: this.params.eps,
            min_samples: this.params.min_samples,
            wards: wards
        });
        console.log(Date.now() - start)
        this.wasmResult = result
        console.log(result)
    }

    params = {
        "eps": 128,
        "min_samples": 10
    }

    wasmResult = {}
}

export default wasmStore