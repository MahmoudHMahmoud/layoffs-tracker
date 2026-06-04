// ============================================
// CHART FACTORY — Reusable Chart.js config builders
// ============================================

import { CHART_COLORS, getColor, getColorWithAlpha } from './formatters.js';

const FONT_FAMILY = "'Inter', sans-serif";
const MONO_FONT = "'JetBrains Mono', monospace";

// Set global Chart.js defaults for dark theme
export function setChartDefaults() {
  if (!window.Chart) return;
  const Chart = window.Chart;
  Chart.defaults.color = '#8888a0';
  Chart.defaults.font.family = FONT_FAMILY;
  Chart.defaults.font.size = 11;
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(20, 20, 35, 0.95)';
  Chart.defaults.plugins.tooltip.titleColor = '#e8e8ed';
  Chart.defaults.plugins.tooltip.bodyColor = '#8888a0';
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.1)';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.titleFont = { weight: '600', family: FONT_FAMILY };
  Chart.defaults.plugins.tooltip.bodyFont = { family: FONT_FAMILY };
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.pointStyle = 'circle';
  Chart.defaults.plugins.legend.labels.padding = 16;
  Chart.defaults.elements.point.radius = 3;
  Chart.defaults.elements.point.hoverRadius = 6;
  Chart.defaults.elements.line.tension = 0.3;
  Chart.defaults.elements.bar.borderRadius = 4;
  Chart.defaults.scale.grid.color = 'rgba(255,255,255,0.04)';
  Chart.defaults.scale.border = { display: false };
  Chart.defaults.scale.ticks.padding = 8;
}

const gridConfig = {
  color: 'rgba(255,255,255,0.04)'
};

const defaultAnimation = {
  duration: 800,
  easing: 'easeOutQuart'
};

export function createChart(ctx, config) {
  if (!window.Chart) return null;
  // Destroy existing chart on same canvas
  const existing = window.Chart.getChart(ctx);
  if (existing) existing.destroy();
  return new window.Chart(ctx, config);
}

export function lineChartConfig(labels, datasets, options = {}) {
  return {
    type: 'line',
    data: {
      labels,
      datasets: datasets.map((ds, i) => ({
        label: ds.label || '',
        data: ds.data,
        borderColor: ds.color || getColor(i),
        backgroundColor: ds.fill ? getColorWithAlpha(i, 0.1) : 'transparent',
        borderWidth: ds.borderWidth || 2,
        fill: ds.fill || false,
        tension: ds.tension ?? 0.35,
        pointRadius: ds.pointRadius ?? 2,
        pointHoverRadius: 6,
        pointBackgroundColor: ds.color || getColor(i),
        borderDash: ds.dashed ? [5, 5] : [],
        order: ds.order ?? i,
        ...ds.extra
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: defaultAnimation,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: datasets.length > 1, position: 'top', align: 'end' },
        tooltip: { mode: 'index', intersect: false },
        ...options.plugins
      },
      scales: {
        x: {
          grid: gridConfig,
          ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: options.maxXTicks || 15 }
        },
        y: {
          grid: gridConfig,
          beginAtZero: true,
          ticks: {
            callback: options.yTickCallback || ((v) => v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v)
          }
        },
        ...options.scales
      },
      ...options.chartOptions
    }
  };
}

export function barChartConfig(labels, datasets, options = {}) {
  const isHorizontal = options.horizontal || false;
  return {
    type: 'bar',
    data: {
      labels,
      datasets: datasets.map((ds, i) => ({
        label: ds.label || '',
        data: ds.data,
        backgroundColor: ds.colors || ds.data.map((_, j) => getColorWithAlpha(ds.colorIndex ?? j, 0.7)),
        borderColor: ds.borderColors || ds.data.map((_, j) => getColor(ds.colorIndex ?? j)),
        borderWidth: 1,
        borderRadius: ds.borderRadius ?? 6,
        barPercentage: ds.barPercentage ?? 0.7,
        categoryPercentage: ds.categoryPercentage ?? 0.8,
        ...ds.extra
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: isHorizontal ? 'y' : 'x',
      animation: defaultAnimation,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: datasets.length > 1, position: 'top', align: 'end' },
        ...options.plugins
      },
      scales: {
        x: {
          grid: gridConfig,
          ticks: isHorizontal ? {
            callback: options.xTickCallback || ((v) => v >= 1000 ? (v/1000).toFixed(0) + 'K' : v)
          } : { maxRotation: 45, autoSkip: true, maxTicksLimit: 20 }
        },
        y: {
          grid: gridConfig,
          beginAtZero: true,
          ticks: !isHorizontal ? {
            callback: options.yTickCallback || ((v) => v >= 1000 ? (v/1000).toFixed(0) + 'K' : v)
          } : {}
        },
        ...options.scales
      },
      ...options.chartOptions
    }
  };
}

export function doughnutChartConfig(labels, data, options = {}) {
  return {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: data.map((_, i) => getColorWithAlpha(i, 0.75)),
        borderColor: data.map((_, i) => getColor(i)),
        borderWidth: 1,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: defaultAnimation,
      cutout: options.cutout || '65%',
      plugins: {
        legend: { position: 'right', labels: { padding: 12, font: { size: 11 } } },
        ...options.plugins
      },
      ...options.chartOptions
    }
  };
}

export function scatterChartConfig(datasets, options = {}) {
  return {
    type: 'scatter',
    data: {
      datasets: datasets.map((ds, i) => ({
        label: ds.label || '',
        data: ds.data,
        backgroundColor: getColorWithAlpha(i, 0.5),
        borderColor: getColor(i),
        borderWidth: 1,
        pointRadius: ds.pointRadius || 5,
        pointHoverRadius: 8,
        ...ds.extra
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: defaultAnimation,
      plugins: {
        legend: { display: datasets.length > 1 },
        tooltip: {
          callbacks: {
            label: options.tooltipCallback || ((ctx) => `(${ctx.parsed.x}, ${ctx.parsed.y})`)
          }
        },
        ...options.plugins
      },
      scales: {
        x: {
          grid: gridConfig,
          title: { display: !!options.xLabel, text: options.xLabel, color: '#8888a0' },
          ticks: { callback: options.xTickCallback || ((v) => v) }
        },
        y: {
          grid: gridConfig,
          beginAtZero: true,
          title: { display: !!options.yLabel, text: options.yLabel, color: '#8888a0' },
          ticks: { callback: options.yTickCallback || ((v) => v) }
        }
      },
      ...options.chartOptions
    }
  };
}

export function polarChartConfig(labels, data, options = {}) {
  return {
    type: 'polarArea',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: data.map((_, i) => getColorWithAlpha(i, 0.5)),
        borderColor: data.map((_, i) => getColor(i)),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: defaultAnimation,
      scales: {
        r: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { display: false },
          beginAtZero: true
        }
      },
      plugins: {
        legend: { position: 'right', labels: { padding: 12, font: { size: 11 } } },
        ...options.plugins
      },
      ...options.chartOptions
    }
  };
}
