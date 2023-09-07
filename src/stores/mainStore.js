import React from "react";
import websocketStore from "./websocketStore";
import wardStore from "./wardStore";
import wasmStore from "./wasmStore";
import mapStore from "./mapStore";

class mainStore{
    constructor() {
        this.websocketStore = new websocketStore(this)
        this.wardStore = new wardStore(this)
        this.wasmStore = new wasmStore(this)
        this.mapStore = new mapStore(this)
    }
}

const StoresContext = React.createContext(new mainStore());

export const useStores = () => React.useContext(StoresContext);