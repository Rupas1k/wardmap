import React from "react";
import {observer} from "mobx-react"
import {useStores} from "../stores/rootStore";
import settingsStore from "./stores/settingsStore";

import {Container, Row, Col, ButtonGroup, Button} from "react-bootstrap";
import RangeSlider from "react-bootstrap-range-slider";

export default class Settings extends React.Component {
    settingsStore = new settingsStore()

    Params = observer(() => {
        const {wardStore} = useStores()

        this.settingsStore.setEps(this.settingsStore.clusterParams.eps ? this.settingsStore.clusterParams.eps : wardStore.clusterParams.eps)
        this.settingsStore.setMinSamples(this.settingsStore.clusterParams.min_samples ? this.settingsStore.clusterParams.min_samples : wardStore.clusterParams.min_samples)

        return(
            <div>
                <input type="text" value={this.settingsStore.clusterParams.eps} onChange={event => this.settingsStore.setEps(event.target.value)} onBlur={event => wardStore.setEps(event.target.value)}/>
                <input type="text" value={this.settingsStore.clusterParams.min_samples} onChange={event => this.settingsStore.setMinSamples(event.target.value)} onBlur={event => wardStore.setMinSamples(event.target.value)}/>
            </div>
    )
    })

    WardData = observer(() => {
        const {mapStore} = useStores()

        return(
            <pre>{mapStore.currentFeature ? JSON.stringify(mapStore.currentFeature.getProperties().data.cluster, null, 4) : null}</pre>
        )
    })

    WardList = observer(() => {
        const {mapStore} = useStores()

        const rows = mapStore.features.map(feature => {
            return (
                <div className="entry-row">
                    <div>{feature.getProperties().data.cluster.cluster_id}</div>
                    <div>{feature.getProperties().data.cluster.duration}</div>
                    <div>{feature.getProperties().data.cluster.time_placed}</div>
                    <div>{feature.getProperties().data.cluster.average_rank}</div>
                </div>
            )
        })

        return rows
    })

    render() {
        const {WardData, WardList} = this


        return (
            <Container fluid className="settings">
                <Row>
                    <Col>
                        {<WardData />}
                        {/*{<this.Params/>}*/}
                        {/*<WardData/>*/}
                        {/*<RangeSlider/>*/}
                    </Col>
                </Row>
                <Row>
                    <Col className="ward-list">
                        {/*<WardList />*/}
                    </Col>
                </Row>
            </Container>
        );
    }
}
