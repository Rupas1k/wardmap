import React, {useEffect} from "react";
import {observer} from "mobx-react"
import {useStores} from "../stores/mainStore";

export default class Info extends React.Component {
    EpsInput = observer(() => {
        const {wasmStore} = useStores()
        return (
            <>
                <p>Current eps: {wasmStore.params.eps}, min_samples: {wasmStore.params.min_samples}</p>
                <input type="text" value={wasmStore.params.eps} onChange={wasmStore.onEpsChange}/>
            </>
        )
    })
    WardData = observer(() => {
        const {wardStore, websocketStore, wasmStore} = useStores()
        return (
            <div>
                <this.EpsInput/>
                <input type="button" value="clear" onClick={() => wardStore.setClusterData({})}/>
                <input type="button" value="update" onClick={() => wardStore.wardDataRequest()}/>
                <input type="button" value="run" onClick={async () => {
                    console.log("appx");
                    wasmStore.params.appx = true;
                    await wasmStore.runWasm(websocketStore.websocketResult);
                    console.log("notappx");
                    // wasmStore.params.appx = false;
                    // await wasmStore.runWasm(websocketStore.websocketResult);
                }}/>
                <input type="button" value="updateParams" onClick={() => {
                    wasmStore.params.eps = 1
                }}/>
                {/*{JSON.stringify(wasmStore.wasmResult)}*/}
                <br/>
                <pre>{JSON.stringify(wardStore.clusterData, undefined, 2)}</pre>
            </div>
        )
    })

    render() {
        const {WardData} = this
        return (
            <div>
                Info
                <WardData/>
            </div>
        );
    }
}
