import React, {useEffect} from "react";
import {observer} from "mobx-react"
import {Container, Row, Col, ButtonGroup, Button} from "react-bootstrap";
import {useStores} from "../stores/rootStore";

export default class MapData extends React.Component {
    Switches = observer(() => {
        return (
            <ButtonGroup>
                <Button className="btn-secondary">Ward Data</Button>
                <Button className="btn-secondary">Average</Button>
                <Button className="btn-secondary">List </Button>
            </ButtonGroup>
        )
    })

    ClusterData = observer(() => {
        const {mapStore} = useStores()

        const cluster_data = mapStore.currentFeature !== null ? mapStore.currentFeature.getProperties().data.cluster : null

        const cluster_info = (
            <div className="cluster-info">
                <Col className="section-name">
                    <h1>Ward Data</h1>
                </Col>
                {/*<div>Cluster Id: {cluster_data ? cluster_data.cluster_id : "--"}</div>*/}
                <Row>
                    <Col>
                        <div className="name">Duration</div>
                        <div className="data">{cluster_data ? cluster_data.duration : "--"}</div>
                    </Col>
                    <Col>
                        <div className="name">Time Placed</div>
                        <div className="data">
                            {cluster_data ? (
                                <>
                                    {String(Math.floor(cluster_data.time_placed / 60)).padStart(2, "0")}:
                                    {String(cluster_data.time_placed % 60).padStart(2, "0")}
                                </>
                            ) : "--"}
                        </div>
                    </Col>
                    <Col>
                        <div className="name">Amount</div>
                        <div className="data">{cluster_data ? cluster_data.amount : "--"}</div>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <div className="name">Radiant Networth</div>
                        <div className="data">{cluster_data ? cluster_data.radiant_networth : "--"}</div>
                    </Col>
                    <Col>
                        <div className="name">Dire Networth</div>
                        <div className="data">{cluster_data ? cluster_data.dire_networth : "--"}</div>
                    </Col>
                    <Col>
                        <div className="name">Advantage</div>
                        <div className="data">
                            {cluster_data ? Math.abs(cluster_data.dire_networth - cluster_data.radiant_networth) : "--"}
                        </div>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <div className="name">Survived</div>
                        <div className="data">{cluster_data ? `${((1 - cluster_data.is_destroyed / cluster_data.amount) * 100).toFixed(2)}%` : "--"}</div>
                    </Col>
                    <Col>
                        <div className="name">Dire</div>
                        <div className="data">{cluster_data ? cluster_data.dire_networth : "--"}</div>
                    </Col>
                    <Col>
                        <div className="name">Advantage</div>
                        <div className="data">
                            {cluster_data ? Math.abs(cluster_data.dire_networth - cluster_data.radiant_networth) : "--"}
                        </div>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <div className="name">Radiant</div>
                        <div className="data">{cluster_data ? cluster_data.is_radiant : "--"}</div>
                    </Col>
                    <Col>
                        <div className="name">Dire</div>
                        <div className="data">{cluster_data ? cluster_data.amount - cluster_data.is_radiant : "--"}</div>
                    </Col>
                    <Col>
                        <div className="name">Total</div>
                        <div className="data">
                            {cluster_data ? cluster_data.amount : "--"}
                        </div>
                    </Col>
                </Row>
            </div>
        );

        return (
            <Container>
                <Row>
                    <Col>
                        {cluster_info}
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <pre>{mapStore.currentFeature ? JSON.stringify(mapStore.currentFeature.getProperties().data.cluster, null, 4) : null}</pre>
                    </Col>
                </Row>
            </Container>
        )
    })

    NoWard = observer(() => {
        const {mapStore} = useStores()
        return (mapStore.currentFeature === null ? <div className="not-selected">No ward selected</div> : <div></div>)
    })

    render() {
        const {Switches, ClusterData, NoWard} = this

        return (
            <Container>
                {/*<NoWard/>*/}
                <Row>
                    <Col>
                        <Switches/>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <ClusterData/>
                    </Col>
                </Row>
            </Container>
        )
    }
}