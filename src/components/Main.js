import React from "react";
import MapComponent from "./Map";
import Settings from "./Settings";
import {Container, Row, Col} from "react-bootstrap";

export default class Main extends React.Component {
    render() {
        return (
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
        )
    }
}