import React from "react";
import {observer} from "mobx-react"
import {Container, Row, Col, ButtonGroup, Button} from "react-bootstrap";
import {useStores} from "../stores/rootStore";

const timeFormat = seconds => {
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
}

export default class MapData extends React.Component {

    DataSwitches = observer(() => {
        const {mapStore} = useStores()
        return (
            <ButtonGroup className="side-switches">
                <Button className="btn-dark" onClick={() => mapStore.setCurrentSide(0)} disabled={mapStore.currentSide === 0}>Radiant</Button>
                <Button className="btn-dark" onClick={() => mapStore.setCurrentSide(1)} disabled={mapStore.currentSide === 1}>Dire</Button>
                <Button className="btn-dark" onClick={() => mapStore.setCurrentSide(2)} disabled={mapStore.currentSide === 2}>All</Button>
            </ButtonGroup>
        )
    })

    ClusterData = observer(() => {
        const {mapStore} = useStores()

        const cluster_data = mapStore.currentFeature !== null ? mapStore.currentFeature.getProperties().data.cluster : null
        const average = mapStore.averageValues

        const page = mapStore.sides[mapStore.currentSide]

        const {DataSwitches} = this

        const cluster_info = (
            <div className="cluster-info">
                <DataSwitches/>
                <Container className="data-rows" fluid>
                    <Row>
                        <Col className="col-lg-6 col-xl-4 col-6">
                            <div className="col-data">
                                <div className="name">Amount</div>
                                <div className="data">
                                    {cluster_data && cluster_data[page].amount ? (
                                        <div className="data-content">
                                            {cluster_data[page].amount}
                                            {/*<span className="delta">-12</span>*/}
                                        </div>
                                    ) : "--"}
                                </div>
                            </div>
                        </Col>
                        <Col className="col-lg-6 col-xl-4 col-6">
                            <div className="col-data">
                                <div className="name">Destroyed</div>
                                <div className="data">
                                    {cluster_data && cluster_data[page].destroyed ? (
                                        <div className="data-content">
                                            {cluster_data[page].destroyed}
                                            {/*<span className="delta green">+00:53</span>*/}
                                        </div>
                                    ) : "--"}
                                </div>
                            </div>
                        </Col>
                        <Col className="col-lg-6 col-xl-4 col-6">
                            <div className="col-data">
                                <div className="name">% Survived</div>
                                <div className="data">
                                    {cluster_data && cluster_data[page].amount ? (
                                        <div className="data-content">
                                            {((1 - cluster_data[page].destroyed / cluster_data[page].amount) * 100).toFixed(2)}%
                                            {/*<span className="delta">-12</span>*/}
                                        </div>
                                    ) : "--"}
                                </div>
                            </div>
                        </Col>
                        <Col className="col-lg-6 col-xl-4 col-6">
                            <div className="col-data">
                                <div className="name">Duration</div>
                                <div className="data">
                                    {cluster_data && cluster_data[page].duration ? (
                                        <div className="data-content">
                                            {timeFormat(cluster_data[page].duration)}
                                            {/*<span className="delta green">+00:53</span>*/}
                                            <span className={`delta ${cluster_data[page].duration >= average[page].duration ? 'green' : 'red'}`}>
                                                {cluster_data[page].duration >= average[page].duration ? '+' : '-'}{timeFormat(Math.abs(cluster_data[page].duration - average[page].duration))}
                                            </span>
                                        </div>
                                    ) : "--"}
                                </div>
                            </div>
                        </Col>
                        <Col className="col-lg-6 col-xl-4 col-6">
                            <div className="col-data">
                                <div className="name">Time Placed</div>
                                <div className="data">
                                    {cluster_data && cluster_data[page].time_placed ? (
                                        <div className="data-content">
                                            {String(Math.floor(cluster_data[page].time_placed / 60)).padStart(2, "0")}:
                                            {String(cluster_data[page].time_placed % 60).padStart(2, "0")}
                                            {/*<span className="delta green">+13:17</span>*/}
                                        </div>
                                    ) : "--"}
                                </div>
                            </div>
                        </Col>
                        <Col className="col-lg-6 col-xl-4 col-6">
                            <div className="col-data">
                                <div className="name">Gold lead</div>
                                <div className="data">
                                    {cluster_data && cluster_data[page].advantage ? (
                                        <div className="data-content">
                                            {<span className={cluster_data[page].advantage >= 0 ? "green" : "red"}>{cluster_data[page].advantage || "--"}</span>}
                                            {/*<span className="delta red">{cluster_data[page].advantage - average[page].advantage}</span>*/}
                                        </div>
                                    ) : "--"}
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Container>
                <Container fluid>
                    <Row>
                        <Col>About</Col>
                    </Row>
                    <Row>
                        {/*<Col>123</Col>*/}
                        {/*<Col>123</Col>*/}
                        {/*<Col>123</Col>*/}
                    </Row>
                </Container>
            </div>
        );

        return (
            <>
                {cluster_info}
            </>
        )
    })

    NoWard = observer(() => {
        const {mapStore} = useStores()
        return (mapStore.currentFeature === null ? <div className="not-selected">No ward selected</div> : <div></div>)
    })

    render() {
        const {ClusterData} = this

        return (
            <ClusterData/>
        )
    }
}