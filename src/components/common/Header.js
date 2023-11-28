import React from "react"
import {Container, Dropdown, Nav, Navbar} from "react-bootstrap";
import {useNavigate} from "react-router-dom";


const Header = () => {
    const navigate = useNavigate();

    return (
        <Navbar expand="sm" className="bg-body-tertiary">
            <Container className="header-container" fluid>
                <Navbar.Brand href="#" onClick={() => navigate("/")}>
                    <div className="brand">
                        <img src="/favicon.ico" alt=""/>
                        <span>Dota2WardMap Preview</span>
                    </div>
                </Navbar.Brand>
                <Nav>
                    <Dropdown align="end">
                        <Dropdown.Toggle variant="" id="dropdown-basic">Leagues</Dropdown.Toggle>
                        <Dropdown.Menu>
                            {window.leagues.map(league => {
                                return <Dropdown.Item key={league.id} onClick={() => navigate(`/league/${league.id}`)}>{league.name}</Dropdown.Item>
                            })}
                        </Dropdown.Menu>
                    </Dropdown>
                    <Nav.Link onClick={() => navigate("/about")}>About</Nav.Link>
                </Nav>
            </Container>
        </Navbar>
    );
}


export default Header