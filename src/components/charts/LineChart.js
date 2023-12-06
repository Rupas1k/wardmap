import React from "react"
import {Line} from "react-chartjs-2";

export const labels = {
    timeline: ['-0', '5', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55', '60+']
}


const setData = (labels, datasets) => {
    return {
        labels: labels,
        datasets: datasets
    }
}


const setOptions = title => {
    const thisOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        stacked: false,
        plugins: {
            title: {
                display: false,
                text: title,
            },
            legend: {
                display: false
            }
        },
        scales: {
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                ticks: {
                    precision: 0,
                },
                suggestedMin: 0,
                suggestedMax: 5
            },

        },
    }

    // thisOptions.plugins.title = title
    return thisOptions
}


const LineChart = props => {
    const {title, labels, datasets} = props
    return (
        <Line
            data={setData(labels, datasets)}
            options={setOptions(title)}
        />
    )
}

export default LineChart