import React from "react"
import {Container, Nav, Navbar} from "react-bootstrap";

export default class Header extends React.Component {
    render() {
        return (
            <Navbar expand="lg" className="bg-body-tertiary">
                <Container>
                    <Navbar.Brand href="/">
                        <div className="brand">
                            <img src="/favicon.ico" alt=""/>
                            <span>Dota2WardMap</span>
                        </div>
                    </Navbar.Brand>
                    <Nav className="me-auto">
                        <Nav.Link href="/">Home</Nav.Link>
                        <Nav.Link href="#features">Example</Nav.Link>
                        <Nav.Link href="#pricing">Example</Nav.Link>
                        <Nav.Link href="/about">About</Nav.Link>
                    </Nav>
                </Container>
            </Navbar>
        );
    }
}