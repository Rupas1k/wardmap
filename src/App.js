import React from "react";
import 'bootstrap/dist/css/bootstrap.css'
import './sass/main.sass'
import 'ol/ol.css'
import "rc-slider/assets/index.css"
import {HashRouter, Navigate, Route, Routes} from "react-router-dom";

import Main from "./pages/Main";


import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js'
import {prefix} from "./const";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
)

class App extends React.Component {
    render() {
        console.log("/" + prefix + "/league/:leagueId")
        return (
            <div className="application bg-body text-light" data-bs-theme="dark">
                <HashRouter>
                    <Routes>
                        <Route path={"/"} exact element={<Main/>}/>
                        <Route path={"/league/:leagueId"} element={<Main/>}/>
                        <Route path="*" element={<Navigate to={"/"} />}/>
                    </Routes>
                </HashRouter>
            </div>
        );
    }
}

export default App;
