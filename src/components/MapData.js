import React from "react";
import {observer} from "mobx-react"
import {Container, Row, Col, ButtonGroup, Button} from "react-bootstrap";
import {useStores} from "../stores/rootStore";

import LineChart, {labels} from "./charts/LineChart";


const timeFormat = seconds => {
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
}

export default class MapData extends React.Component {

    DataSwitches = observer(() => {
        const {mapStore} = useStores()
        return (
            <ButtonGroup className="side-switches">
                <Button className="btn-dark" onClick={() => mapStore.setCurrentSide(0)}
                        disabled={mapStore.currentSide === 0}>Radiant</Button>
                <Button className="btn-dark" onClick={() => mapStore.setCurrentSide(1)}
                        disabled={mapStore.currentSide === 1}>Dire</Button>
                <Button className="btn-dark" onClick={() => mapStore.setCurrentSide(2)}
                        disabled={mapStore.currentSide === 2}>All</Button>
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
                <div className="rows">
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
                                                <span
                                                    className={`delta ${cluster_data[page].duration >= average[page].duration ? 'green' : 'red'}`}>
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
                                                {<span
                                                    className={cluster_data[page].advantage >= 0 ? "green" : "red"}>{cluster_data[page].advantage || "--"}</span>}
                                                {/*<span className="delta red">{cluster_data[page].advantage - average[page].advantage}</span>*/}
                                            </div>
                                        ) : "--"}
                                    </div>
                                </div>
                            </Col>
                        </Row>
                        <Row>
                            <Col className="col-lg-6 col-12" style={{height: "300px"}}>
                                {/*<LineChart*/}
                                {/*    data={{*/}
                                {/*        labels: labels.timeline,*/}
                                {/*        datasets: [{*/}
                                {/*            data: cluster_data ? cluster_data.graphs.wards : {}*/}
                                {/*        }]*/}
                                {/*    }}*/}
                                {/*    options={{*/}
                                {/*        plugins: {*/}
                                {/*            title: {*/}
                                {/*                display: true,*/}
                                {/*                text: "Amount by minute"*/}
                                {/*            },*/}
                                {/*            legend: {*/}
                                {/*                display: false*/}
                                {/*            }*/}
                                {/*        }*/}
                                {/*    }}*/}
                                {/*/>*/}
                            </Col>
                            {/*<Col className="col-lg-6 col-12"><LineChart /></Col>*/}
                            <Col>
                                <table width="100%">
                                    {cluster_data && cluster_data.players ? cluster_data.players.map(player => {
                                        return (
                                            <tr>
                                                <td>{player.player_placed_id}</td>
                                                <td>{player.amount}</td>
                                            </tr>
                                        )
                                    }) : "--"}
                                </table>
                            </Col>
                        </Row>
                        <Row>
                            {/*<Col className="col-lg-6 col-12" style={{height: "300px"}}><LineChart /></Col>*/}
                            {/*<Col className="col-lg-6 col-12"><LineChart /></Col>*/}
                        </Row>
                    </Container>
                    {/*{mapStore.metadata ? (*/}
                    {/*    <Container fluid className="data-rows">*/}
                    {/*        <Row>*/}
                    {/*            <Col><h1>About</h1></Col>*/}
                    {/*        </Row>*/}
                    {/*        /!*<Row>*!/*/}
                    {/*        /!*    <Col>This map*!/*/}
                    {/*        /!*        represents {(mapStore.metadata.entries_in_dataset / mapStore.metadata.total_entries * 100).toFixed(2)}%*!/*/}
                    {/*        /!*        of wards in {mapStore.metadata.matches_amount} matches</Col>*!/*/}
                    {/*        /!*</Row>*!/*/}
                    {/*        <Row>*/}
                    {/*            <Col>*/}
                    {/*                <div className="col-data">*/}
                    {/*                    <div className="data">*/}
                    {/*                        <div className="name">Total entries</div>*/}
                    {/*                        <div className="data-content">{mapStore.metadata.total_entries}</div>*/}
                    {/*                    </div>*/}
                    {/*                </div>*/}
                    {/*            </Col>*/}
                    {/*            <Col>*/}
                    {/*                <div className="col-data">*/}
                    {/*                    <div className="data">*/}
                    {/*                        <div className="name">Clustered entries</div>*/}
                    {/*                        <div className="data-content">{mapStore.metadata.entries_in_dataset}</div>*/}
                    {/*                    </div>*/}
                    {/*                </div>*/}
                    {/*            </Col>*/}
                    {/*            <Col>*/}
                    {/*                <div className="col-data">*/}
                    {/*                    <div className="data">*/}
                    {/*                        <div className="name">%</div>*/}
                    {/*                        <div*/}
                    {/*                            className="data-content">{(mapStore.metadata.entries_in_dataset / mapStore.metadata.total_entries * 100).toFixed(2)}</div>*/}
                    {/*                    </div>*/}
                    {/*                </div>*/}
                    {/*            </Col>*/}
                    {/*            <Col>*/}
                    {/*                <div className="col-data">*/}
                    {/*                    <div className="data">*/}
                    {/*                        <div className="name">Matches</div>*/}
                    {/*                        <div className="data-content">{mapStore.metadata.matches_amount}</div>*/}
                    {/*                    </div>*/}
                    {/*                </div>*/}
                    {/*            </Col>*/}
                    {/*            /!*<Col>123</Col>*!/*/}
                    {/*            /!*<Col>123</Col>*!/*/}
                    {/*        </Row>*/}
                    {/*    </Container>*/}
                    {/*) : null}*/}
                </div>
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