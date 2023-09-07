import React from "react";
import Header from "./components/Header";
import 'bootstrap/dist/css/bootstrap.css'
import './sass/main.sass'
import 'ol/ol.css'
import Main from "./components/Main";
import {observer} from "mobx-react";

// import calculateVision from "./map/calculateVision";

class App extends React.Component {
    X = observer(() => {
        // calculateVision([7008, 10477, 1])

    })
    render() {
        return (
            <div className="application" data-bs-theme="dark">
                <Header/>
                <Main/>
                <this.X />
            </div>
        );
    }
}

export default App;
