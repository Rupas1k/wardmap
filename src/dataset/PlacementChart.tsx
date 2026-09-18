import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import type { ChartOptions } from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

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

const options: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      align: "end",
      labels: {
        boxHeight: 6,
        boxWidth: 14,
        color: "#94a3b8",
        padding: 12,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: "#64748b" },
      border: { color: "rgba(148, 163, 184, 0.12)" },
      title: { display: true, text: "Game minute", color: "#64748b" },
    },
    y: {
      beginAtZero: true,
      ticks: { precision: 0, color: "#64748b" },
      grid: { color: "rgba(148, 163, 184, 0.08)" },
      border: { color: "rgba(148, 163, 184, 0.12)" },
      title: { display: true, text: "Observer wards", color: "#64748b" },
    },
  },
};

export default function PlacementChart({
  placements,
  removals,
  labels,
  removalLabel = "Removed",
}: {
  placements: number[];
  removals: number[];
  labels: string[];
  removalLabel?: string;
}) {
  return (
    <Bar
      data={{
        labels,
        datasets: [
          {
            data: placements,
            label: "Placed",
            backgroundColor: "rgba(253, 224, 71, 0.7)",
            borderColor: "#fde047",
            borderWidth: 1,
            borderRadius: 2,
          },
          {
            data: removals,
            label: removalLabel,
            backgroundColor: "rgba(251, 113, 133, 0.65)",
            borderColor: "#fb7185",
            borderWidth: 1,
            borderRadius: 2,
          },
        ],
      }}
      options={options}
    />
  );
}
