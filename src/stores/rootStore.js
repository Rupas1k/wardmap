import React from "react";
import websocketStore from "./websocketStore";
import wardStore from "./wardStore";
import mapStore from "./mapStore";

class rootStore{
    constructor() {
        this.websocketStore = new websocketStore(this)
        this.wardStore = new wardStore(this)
        this.mapStore = new mapStore(this)
    }
}

const StoresContext = React.createContext();

let root = null

export const RootStoreProvider = ({ children }) => {
    root = root ?? new rootStore()
    return <StoresContext.Provider value={root}>{children}</StoresContext.Provider>
}

export const useStores = () => React.useContext(StoresContext);
