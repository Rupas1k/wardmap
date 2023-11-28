import React from "react";
import 'bootstrap/dist/css/bootstrap.css'
import './sass/main.sass'
import 'ol/ol.css'
import "rc-slider/assets/index.css"
import {BrowserRouter, createBrowserRouter, Route, RouterProvider, Routes} from "react-router-dom";
import Header from "./components/common/Header";

import Main from "./pages/Main";
import About from "./pages/About";

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

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
)

const router = createBrowserRouter([
    {
        path: "/",
        element: <Main />,
    },
    {
        path: "/league/:leagueId",
        element: <Main />,
    },
    {
        path: "/about",
        element: <About />,
    },
]);

class App extends React.Component {
    render() {
        return (
            <div className="application bg-body text-light" data-bs-theme="dark">
                <BrowserRouter>
                    <Routes>
                        <Route path="/" exact element={<Main/>}/>
                        <Route path="/league/:leagueId" element={<Main/>}/>
                        <Route path="/about" element={<About/>}/>
                    </Routes>
                </BrowserRouter>
                {/*<RouterProvider router={router} />*/}
            </div>
        );
    }
}

export default App;
