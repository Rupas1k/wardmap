import React from "react";
import MapComponent from "../components/Map";
import Settings from "../components/Settings";
import {Container, Row, Col} from "react-bootstrap";
import {RootStoreProvider} from "../stores/rootStore";

export default class Main extends React.Component {
    render() {
        return (
            <RootStoreProvider>
                <Container className="container-fluid main" fluid>
                    <Row>
                        <Col className="col-7 p-0 map-col bg-body">
                            <MapComponent/>
                        </Col>
                        <Col className="col-5 data-col bg-body-secondary">
                            <Settings/>
                        </Col>
                    </Row>
                </Container>
            </RootStoreProvider>
        )
    }
}