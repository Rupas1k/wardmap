import React from "react";
import {Container, Row, Col} from "react-bootstrap";
import {RootStoreProvider} from "../stores/rootStore";
import SideSwitch from "../components/SideSwitch";
import Records from "../components/Records";
import Graphs from "../components/Graphs";
import PlayersList from "../components/PlayersList";
import MapControllers from "../components/MapControllers";
import MapView from "../components/MapView";
import Header from "../components/common/Header";

export default class Main extends React.Component {
    render() {
        return (
            <RootStoreProvider>
                <Header/>
                <Container className="main" fluid>
                    <Row>
                        <Col className="col-lg-6 col-12 p-0 map-col bg-body">
                            <div>
                                <MapControllers />
                                <MapView />
                            </div>
                        </Col>
                        <Col className="col-lg-6 col-12 data-col bg-body-secondary">
                            <SideSwitch/>
                            <div className="cluster-info">
                                <Container className="data-rows" fluid>
                                    <Row>
                                        <Records/>
                                    </Row>
                                    <Row>
                                        <Col className="col-lg-6 col-12">
                                            <Graphs/>
                                        </Col>
                                        <Col className="col-lg-6 col-12">
                                            <PlayersList/>
                                        </Col>
                                    </Row>
                                </Container>
                                <Container className="data-rows" fluid>
                                    <Row>
                                        <Col>
                                            Dataset info: todo
                                        </Col>
                                    </Row>
                                </Container>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </RootStoreProvider>
        )
    }
}