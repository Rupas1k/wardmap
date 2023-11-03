import React from "react";
import 'bootstrap/dist/css/bootstrap.css'
import './sass/main.sass'
import 'ol/ol.css'
import "rc-slider/assets/index.css"
import {BrowserRouter, Route, Routes} from "react-router-dom";
import Header from "./components/Header";

import Main from "./pages/Main";
import About from "./pages/About";


class App extends React.Component {

    render() {
        return (
            <div className="application bg-body text-light" data-bs-theme="dark">
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
