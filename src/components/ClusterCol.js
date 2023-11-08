import React from "react"
import {Col} from "react-bootstrap";

export default class ClusterCol extends React.Component{
    render() {
        const {name, data, delta} = this.props

        return (
            <Col className="col-lg-6 col-xl-4 col-6">
                <div className="col-data">
                    <div className="name">{name}</div>
                    <div className="data">
                        <div className="data-content">
                            <span className="data">{data}</span>
                            {delta ? <span className="delta">{delta}</span> : null}
                        </div>
                    </div>
                </div>
            </Col>
        )
    }
}