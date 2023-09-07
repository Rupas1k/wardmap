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
    }


    runWasm = async wards => {
        await init()

        const wards_wasm = wards.map(ward => { return {id: ward.id, x_pos: ward.x_pos, y_pos: ward.y_pos} })

        const start = Date.now()
        const result = await run_model({
            eps: this.params.eps,
            min_samples: this.params.min_samples,
            wards: wards_wasm
        });
        console.log(Date.now() - start)

        return new Map([...result.entries()].sort((a, b) => a[0] - b[0]));
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