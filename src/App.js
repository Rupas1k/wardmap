import React from "react";
import 'bootstrap/dist/css/bootstrap.css'
import './sass/main.sass'
import 'ol/ol.css'
import "rc-slider/assets/index.css"
import {BrowserRouter, Navigate, Route, Routes} from "react-router-dom";

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
        return (
            <div className="application bg-body text-light" data-bs-theme="dark">
                <BrowserRouter>
                    <Routes>
                        <Route path={"/" + prefix} exact element={<Main/>}/>
                        <Route path={"/" + prefix + "/league/:leagueId"} element={<Main/>}/>
                        <Route path="*" element={<Navigate to={"/" + prefix} />}/>
                    </Routes>
                </BrowserRouter>
            </div>
        );
    }
}

export default App;
