import React from "react"
import {Col} from "react-bootstrap";


const ClusterCol = props => {
    const {name, data, delta} = props

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

export default ClusterCol