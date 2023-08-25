import React from "react";
import {inject, observer} from "mobx-react"
import {useStores} from "../stores/mainStore";
import wasm from "wasm";

export default class Info extends React.Component {
    WardData = observer(() => {
        const {wardStore, websocketStore, wasmStore} = useStores()
        return (
            <div>
                <p>Current eps: {wasmStore.params.eps}, min_samples: {wasmStore.params.min_samples}</p>
                <input type="button" value="clear" onClick={() => wardStore.clearWardData()}/>
                <input type="button" value="update" onClick={() => wardStore.wardDataRequest()}/>
                <input type="button" value="updateParams" onClick={() => {wasmStore.params.eps = 1}}/>
                {JSON.stringify(wasmStore.wasmResult)}
                {/*{JSON.stringify(wardData)}*/}
            </div>
        )
    })
    render() {
        return (
            <div>
                Info
                <this.WardData />
            </div>
        );
    }
}
