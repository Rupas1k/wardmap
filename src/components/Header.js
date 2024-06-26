import React from "react"
import {Container, Dropdown, Nav, Navbar} from "react-bootstrap";
import {useNavigate, useParams} from "react-router-dom";
import {observer} from "mobx-react";
import {homepage, prefix} from "../const";


const Header = observer(() => {
    const navigate = useNavigate();
    let {leagueId} = useParams()
    if (!leagueId) leagueId = window.leagues[0].id

    const currentLeague = window.leagues.filter(x => x.id === parseInt(leagueId))[0]

    return (
        <Navbar expand="sm" className="bg-body-tertiary">
            <Container className="header-container" fluid>
                {/*<Navbar.Brand href="#1" onClick={() => navigate("/")}>*/}
                <Navbar.Brand href="#">
                    <div className="brand">
                        <img src={homepage + "/favicon.ico"} alt=""/>
                        <span>Ward Map - {currentLeague.name}</span>
                    </div>
                </Navbar.Brand>
                <Nav>
                    <Dropdown align="end">
                        <Dropdown.Toggle variant="" id="dropdown-basic">Leagues</Dropdown.Toggle>
                        <Dropdown.Menu>
                            {window.leagues.map(league => {
                                return <Dropdown.Item key={league.id} disabled={league.id === currentLeague.id} onClick={() => navigate(`/league/${league.id}`)}>{league.name}</Dropdown.Item>
                            })}
                        </Dropdown.Menu>
                    </Dropdown>
                    {/*<Nav.Link onClick={() => navigate("/about")}>About</Nav.Link>*/}
                </Nav>
            </Container>
        </Navbar>
    );
})


export default Header