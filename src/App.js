import React from "react";
import Info from "./components/Info";
import MapComponent from "./components/Map";

class App extends React.Component {
    render() {
        return (
            <div>
                <MapComponent />
                Works
                <Info />
            </div>
        );
    }
}

export default App;
