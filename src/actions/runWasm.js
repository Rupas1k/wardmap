import init, {run_model} from "wasm";

const runWasm = async (params, wards) => {
    await init()

    const wards_wasm = wards.map(ward => { return {id: ward.id, x_pos: ward.x_pos, y_pos: ward.y_pos} })

    const start = Date.now()
    const result = run_model({
        eps: params.eps,
        min_samples: params.min_samples,
        wards: wards_wasm
    });
    console.log(Date.now() - start)

    return new Map([...result.entries()].sort((a, b) => a[0] - b[0]));
}

export default runWasm