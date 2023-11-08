import React from "react";
import wardStore from "./wardStore";
import mapStore from "./mapStore";

class rootStore{
    constructor() {
        this.wardStore = new wardStore(this)
        this.mapStore = new mapStore(this)
    }
}

export let root = null

const StoresContext = React.createContext(root);

export const RootStoreProvider = ({ children }) => {
    root = root ?? new rootStore()
    return <StoresContext.Provider value={root}>{children}</StoresContext.Provider>
}

export const useStores = () => React.useContext(StoresContext);
