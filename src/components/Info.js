import React from "react";
import {observer} from "mobx-react"

import wardStore from "../stores/wardStore";

export default class Info extends React.Component {
    WardData = observer(() => {
        let wardData = wardStore.wardData

        return (
            <div>
                {JSON.stringify(wardData)}
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
