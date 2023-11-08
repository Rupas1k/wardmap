import React from "react"
import {Line} from "react-chartjs-2";

export const labels = {
    timeline: ['-0', '5', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55', '60+']
}

const default_options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
        mode: 'index',
        intersect: false,
    },
    stacked: false,
    plugins: {
        title: {
            display: true,
            text: null,
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

const default_dataset = {
    label: 'All',
    data: null,
    borderColor: 'rgb(255, 99, 132)',
    backgroundColor: 'rgba(255, 99, 132, 0.5)',
    yAxisID: 'y',
}

const default_data = {
    labels: null,
    datasets: [
        default_dataset
    ],
}


const setData = data => {
    const datasets = []

    data.datasets.forEach(dataset => {
        datasets.push({...default_dataset, ...dataset})
    })

    return {
        ...default_data,
        ...data,
        datasets: datasets
    }
}

const setOptions = options => {
    return {...default_options, ...options}
}


export default class LineChart extends React.Component {
    render() {
        const {data, options} = this.props
        return (
            <Line
                data={setData(data)}
                options={setOptions(options)}
            />
        )
    }
}