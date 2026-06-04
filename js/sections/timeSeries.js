// ============================================
// TIME SERIES SECTION
// ============================================

import { getMonthlyTimeSeries, getYearlyTimeSeries, rollingAverage, sumLayoffs, groupBy } from '../dataLoader.js';
import { formatNumber, monthKeyToLabel } from '../utils/formatters.js';
import { createChart, lineChartConfig, barChartConfig } from '../utils/chartFactory.js';
import { generateTimeInsights, renderInsights } from '../insightsEngine.js';
import { getTrendLine, trendForecast } from '../analyticsEngine.js';

let charts = {};
let currentGranularity = 'monthly';

export function render(container, data) {
  container.innerHTML = `
    <div class="section__header">
      <h1 class="section__title">Time-Series Analysis</h1>
      <p class="section__description">Explore layoff trends over time — identify waves, seasonality, and turning points.</p>
    </div>
    <div class="chart-card">
      <div class="chart-card__header">
        <div>
          <div class="chart-card__title">Layoffs Over Time</div>
          <div class="chart-card__subtitle">Track the ebb and flow of layoffs with trend lines and rolling averages</div>
        </div>
        <div class="chart-card__controls">
          <div class="toggle-group" id="ts-granularity">
            <button class="toggle-group__btn active" data-value="monthly">Monthly</button>
            <button class="toggle-group__btn" data-value="yearly">Yearly</button>
          </div>
          <div class="toggle-group" id="ts-overlays">
            <button class="toggle-group__btn active" data-value="rolling">Rolling Avg</button>
            <button class="toggle-group__btn" data-value="trend">Trend Line</button>
          </div>
        </div>
      </div>
      <div class="chart-container chart-container--lg"><canvas id="ts-main-chart"></canvas></div>
    </div>
    <div class="grid grid--2" style="margin-top: var(--space-5)">
      <div class="chart-card">
        <div class="chart-card__header">
          <div>
            <div class="chart-card__title">Year-over-Year Comparison</div>
            <div class="chart-card__subtitle">Compare layoff totals across years</div>
          </div>
        </div>
        <div class="chart-container"><canvas id="ts-yoy-chart"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-card__header">
          <div>
            <div class="chart-card__title">Quarterly Breakdown</div>
            <div class="chart-card__subtitle">Layoffs by quarter to spot seasonal patterns</div>
          </div>
        </div>
        <div class="chart-container"><canvas id="ts-quarterly-chart"></canvas></div>
      </div>
    </div>
    <div class="insights-panel" style="margin-top: var(--space-5)">
      <div class="insights-panel__title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        Time-Series Insights
      </div>
      <div id="ts-insights"></div>
    </div>
  `;

  // Bind controls
  container.querySelectorAll('#ts-granularity .toggle-group__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('#ts-granularity .toggle-group__btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentGranularity = btn.dataset.value;
      renderMainChart(data, container);
    });
  });

  container.querySelectorAll('#ts-overlays .toggle-group__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      renderMainChart(data, container);
    });
  });

  renderMainChart(data, container);
  renderYoYChart(data);
  renderQuarterlyChart(data);

  const insights = generateTimeInsights(data);
  renderInsights(container.querySelector('#ts-insights'), insights);
}

function renderMainChart(data, container) {
  if (charts.main) charts.main.destroy();

  const overlays = container.querySelectorAll('#ts-overlays .toggle-group__btn.active');
  const showRolling = [...overlays].some(b => b.dataset.value === 'rolling');
  const showTrend = [...overlays].some(b => b.dataset.value === 'trend');

  if (currentGranularity === 'monthly') {
    const ts = getMonthlyTimeSeries(data);
    const labels = ts.keys.map(k => monthKeyToLabel(k));
    const datasets = [{
      label: 'Monthly Layoffs',
      data: ts.totals,
      color: '#e63946',
      fill: true
    }];

    if (showRolling) {
      datasets.push({
        label: '3-Month Rolling Avg',
        data: rollingAverage(ts.totals, 3),
        color: '#f59e0b',
        borderWidth: 2,
        pointRadius: 0,
        dashed: false
      });
    }

    if (showTrend) {
      datasets.push({
        label: 'Trend Line',
        data: getTrendLine(ts.totals),
        color: '#7c3aed',
        borderWidth: 2,
        pointRadius: 0,
        dashed: true
      });
    }

    charts.main = createChart(document.getElementById('ts-main-chart'), lineChartConfig(labels, datasets, { maxXTicks: 12 }));
  } else {
    const ts = getYearlyTimeSeries(data);
    const datasets = [{
      label: 'Yearly Layoffs',
      data: ts.totals,
      colorIndex: 4
    }];

    charts.main = createChart(document.getElementById('ts-main-chart'), barChartConfig(ts.keys, datasets));
  }
}

function renderYoYChart(data) {
  if (charts.yoy) charts.yoy.destroy();
  const ts = getYearlyTimeSeries(data);
  charts.yoy = createChart(document.getElementById('ts-yoy-chart'), barChartConfig(ts.keys, [{
    label: 'Events',
    data: ts.counts,
    colors: ts.counts.map((_, i) => `rgba(59, 130, 246, ${0.4 + i * 0.1})`),
    borderColors: ts.counts.map(() => '#3b82f6')
  }]));
}

function renderQuarterlyChart(data) {
  if (charts.quarterly) charts.quarterly.destroy();
  const byQ = groupBy(data, 'quarter');
  const quarters = Object.keys(byQ).sort();
  const totals = quarters.map(q => sumLayoffs(byQ[q]));
  charts.quarterly = createChart(document.getElementById('ts-quarterly-chart'), barChartConfig(quarters, [{
    label: 'Layoffs',
    data: totals,
    colors: totals.map((_, i) => `rgba(6, 214, 160, ${0.3 + (i % 4) * 0.15})`),
    borderColors: totals.map(() => '#06d6a0')
  }], { maxXTicks: 10 }));
}

export function update(data) {
  const container = document.getElementById('section-timeseries');
  if (container) render(container, data);
}
