import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import type { ChartData, ChartOptions } from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export const timelineLabels = [
  "-1:30",
  "0",
  "5",
  "10",
  "15",
  "20",
  "25",
  "30",
  "35",
  "40",
  "45",
  "50",
  "55",
  "60+",
];

interface LineChartProps {
  datasets: ChartData<"line", number[], string>["datasets"];
  labels: string[];
}

const options: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  plugins: {
    title: { display: false },
    legend: { display: false },
  },
  scales: {
    x: {
      grid: { color: "rgba(148, 163, 184, 0.06)" },
      ticks: { color: "#64748b" },
      border: { color: "rgba(148, 163, 184, 0.12)" },
    },
    y: {
      type: "linear",
      display: true,
      position: "left",
      ticks: { precision: 0, color: "#64748b" },
      grid: { color: "rgba(148, 163, 184, 0.08)" },
      border: { color: "rgba(148, 163, 184, 0.12)" },
      suggestedMin: 0,
      suggestedMax: 5,
    },
  },
};

export default function LineChart({ datasets, labels }: LineChartProps) {
  return <Line data={{ labels, datasets }} options={options} />;
}
