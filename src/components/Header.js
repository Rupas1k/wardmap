import React from "react"
import {Container, Nav, Navbar} from "react-bootstrap";

export default class Header extends React.Component {
    render() {
        return (
            <Navbar expand="lg" className="bg-body-tertiary">
                <Container>
                    <Navbar.Brand href="#home">
                        <div className="brand">
                            <img src="/favicon.ico" alt=""/>
                            <span>Example</span>
                        </div>
                    </Navbar.Brand>
                    <Nav className="me-auto">
                        <Nav.Link href="#home">Home</Nav.Link>
                        <Nav.Link href="#features">Example</Nav.Link>
                        <Nav.Link href="#pricing">Example</Nav.Link>
                    </Nav>
                </Container>
            </Navbar>
        );
    }
}