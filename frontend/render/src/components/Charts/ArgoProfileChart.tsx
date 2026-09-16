import React from 'react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { ArgoProfile } from '../../types/ocean';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

interface ArgoProfileChartProps {
  profile: ArgoProfile;
}

export const ArgoProfileChart: React.FC<ArgoProfileChartProps> = ({ profile }) => {
  const measurements = profile.measurements;

  // CTD Sounding: Y is depth (inverted so 0m is at top), X is value
  const tempData = measurements.map((m) => ({ x: m.temperature, y: m.depth }));
  const salData = measurements.map((m) => ({ x: m.salinity, y: m.depth }));

  const maxDepth = Math.max(...measurements.map((m) => m.depth));

  const data = {
    datasets: [
      {
        label: 'Temperature (°C)',
        data: tempData,
        borderColor: '#ff6b6b',
        backgroundColor: '#ff6b6b',
        pointRadius: 3,
        pointHoverRadius: 6,
        xAxisID: 'xTemp',
        tension: 0.25,
      },
      {
        label: 'Salinity (PSU)',
        data: salData,
        borderColor: '#00f2fe',
        backgroundColor: '#00f2fe',
        pointRadius: 3,
        pointHoverRadius: 6,
        xAxisID: 'xSal',
        tension: 0.25,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#d0e5ff',
          font: { size: 11, family: 'Inter' },
          boxWidth: 14,
        },
      },
      tooltip: {
        callbacks: {
          title: (items) => `Depth: -${items[0].parsed.y} m`,
          label: (item) => {
            const isTemp = item.datasetIndex === 0;
            const val = item.parsed.x != null ? item.parsed.x.toFixed(2) : '--';
            return isTemp
              ? ` Temp: ${val} °C`
              : ` Salinity: ${val} PSU`;
          },
        },
      },
    },
    scales: {
      y: {
        type: 'linear',
        reverse: true, // Inverted vertical ocean depth convention (0 at top)
        min: 0,
        max: maxDepth + 100,
        title: {
          display: true,
          text: 'Depth (meters)',
          color: '#8cb4d6',
          font: { size: 11 },
        },
        ticks: {
          color: '#8cb4d6',
          stepSize: 250,
          callback: (val) => `-${val}m`,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.07)',
        },
      },
      xTemp: {
        type: 'linear',
        position: 'bottom',
        title: {
          display: true,
          text: 'Temperature (°C)',
          color: '#ff6b6b',
          font: { size: 10 },
        },
        ticks: { color: '#ff6b6b', font: { size: 10 } },
        grid: { drawOnChartArea: false },
      },
      xSal: {
        type: 'linear',
        position: 'top',
        title: {
          display: true,
          text: 'Salinity (PSU)',
          color: '#00f2fe',
          font: { size: 10 },
        },
        ticks: { color: '#00f2fe', font: { size: 10 } },
        grid: { drawOnChartArea: false },
      },
    },
  };

  return (
    <div style={{ width: '100%', height: '280px', position: 'relative' }}>
      <Line data={data} options={options} />
    </div>
  );
};
