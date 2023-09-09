import React from "react";
import Header from "./components/Header";
import 'bootstrap/dist/css/bootstrap.css'
import './sass/main.sass'
import 'ol/ol.css'
import Main from "./components/Main";
import {observer} from "mobx-react";
import {BrowserRouter, Route, Routes} from "react-router-dom";
import About from "./components/About";

// import calculateVision from "./map/calculateVision";

class App extends React.Component {

    render() {
        return (
            <div className="application" data-bs-theme="dark">
                <Header/>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<Main/>}/>
                        <Route path="/about" element={<About/>}/>
                    </Routes>
                </BrowserRouter>
            </div>
        );
    }
}

export default App;
