// ============================================
// OVERVIEW SECTION — Global Dashboard
// ============================================

import { sumLayoffs, uniqueCount, topN, getMonthlyTimeSeries, groupBy } from '../dataLoader.js';
import { formatNumber, formatNumberFull, formatDate, monthKeyToLabel } from '../utils/formatters.js';
import { createChart, barChartConfig, lineChartConfig } from '../utils/chartFactory.js';
import { generateOverviewInsights, renderInsights } from '../insightsEngine.js';
import { animateCounter, staggerChildren } from '../utils/animations.js';

let charts = {};

export function render(container, data) {
  const total = sumLayoffs(data);
  const companies = uniqueCount(data, 'company');
  const countries = uniqueCount(data, 'country');
  const industries = uniqueCount(data, 'industry');
  const dates = data.map(r => r.date).sort((a, b) => a - b);
  const dateRange = dates.length ? `${formatDate(dates[0])} — ${formatDate(dates[dates.length - 1])}` : 'N/A';

  // Recent notable layoffs
  const recent = [...data].sort((a, b) => b.date - a.date).slice(0, 8);

  container.innerHTML = `
    <div class="section__header">
      <h1 class="section__title">Global Overview</h1>
      <p class="section__description">A comprehensive snapshot of global tech layoffs — key metrics, trends, and patterns at a glance.</p>
    </div>

    <div class="grid grid--kpi" id="overview-kpis">
      <div class="kpi" style="--kpi-color: var(--accent-magenta); --kpi-bg: var(--accent-magenta-dim)">
        <div class="kpi__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" y1="11" x2="23" y2="11"/></svg></div>
        <div class="kpi__value" data-count="${total}">0</div>
        <div class="kpi__label">Total Laid Off</div>
      </div>
      <div class="kpi" style="--kpi-color: var(--accent-purple); --kpi-bg: var(--accent-purple-dim)">
        <div class="kpi__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg></div>
        <div class="kpi__value" data-count="${companies}">0</div>
        <div class="kpi__label">Companies Affected</div>
      </div>
      <div class="kpi" style="--kpi-color: var(--accent-blue); --kpi-bg: var(--accent-blue-dim)">
        <div class="kpi__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></div>
        <div class="kpi__value" data-count="${countries}">0</div>
        <div class="kpi__label">Countries Impacted</div>
      </div>
      <div class="kpi" style="--kpi-color: var(--accent-cyan); --kpi-bg: var(--accent-cyan-dim)">
        <div class="kpi__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
        <div class="kpi__value">${dateRange}</div>
        <div class="kpi__label">Time Range</div>
      </div>
      <div class="kpi" style="--kpi-color: var(--accent-amber); --kpi-bg: var(--accent-amber-dim)">
        <div class="kpi__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
        <div class="kpi__value" data-count="${industries}">0</div>
        <div class="kpi__label">Industries Hit</div>
      </div>
    </div>

    <div class="grid grid--2" style="margin-top: var(--space-6)">
      <div class="chart-card">
        <div class="chart-card__header">
          <div>
            <div class="chart-card__title">Monthly Layoff Trend</div>
            <div class="chart-card__subtitle">Layoffs aggregated by month over time</div>
          </div>
        </div>
        <div class="chart-container"><canvas id="overview-monthly-chart"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-card__header">
          <div>
            <div class="chart-card__title">Top Industries</div>
            <div class="chart-card__subtitle">Industries most affected by layoffs</div>
          </div>
        </div>
        <div class="chart-container"><canvas id="overview-industry-chart"></canvas></div>
      </div>
    </div>

    <div class="grid grid--2" style="margin-top: var(--space-5)">
      <div class="chart-card">
        <div class="chart-card__header">
          <div>
            <div class="chart-card__title">Yearly Comparison</div>
            <div class="chart-card__subtitle">Total layoffs by year</div>
          </div>
        </div>
        <div class="chart-container chart-container--sm"><canvas id="overview-yearly-chart"></canvas></div>
      </div>
      <div class="insights-panel">
        <div class="insights-panel__title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          Key Insights
        </div>
        <div id="overview-insights"></div>
      </div>
    </div>

    <div class="chart-card" style="margin-top: var(--space-5)">
      <div class="chart-card__header">
        <div>
          <div class="chart-card__title">Recent Major Layoffs</div>
          <div class="chart-card__subtitle">Most recent layoff events in the dataset</div>
        </div>
      </div>
      <div style="overflow-x: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Industry</th>
              <th>Laid Off</th>
              <th>% Workforce</th>
              <th>Country</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${recent.map(r => `
              <tr>
                <td class="td-company">${r.company}</td>
                <td>${r.industry}</td>
                <td class="td-number">${formatNumberFull(r.laidOff)}</td>
                <td class="td-number">${r.percentage ? r.percentage.toFixed(1) + '%' : 'N/A'}</td>
                <td>${r.country}</td>
                <td>${formatDate(r.dateStr)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Animate KPI counters
  setTimeout(() => {
    const kpis = container.querySelectorAll('.kpi__value[data-count]');
    kpis.forEach(el => {
      const target = parseInt(el.dataset.count);
      if (!isNaN(target)) animateCounter(el, target, 1500);
    });
    staggerChildren(container.querySelector('#overview-kpis'), 100);
  }, 100);

  // Render charts
  renderCharts(data);

  // Render insights
  const insights = generateOverviewInsights(data);
  renderInsights(container.querySelector('#overview-insights'), insights);
}

function renderCharts(data) {
  destroyCharts();

  // Monthly trend
  const ts = getMonthlyTimeSeries(data);
  const monthLabels = ts.keys.map(k => monthKeyToLabel(k));
  charts.monthly = createChart(
    document.getElementById('overview-monthly-chart'),
    lineChartConfig(monthLabels, [{
      label: 'Layoffs',
      data: ts.totals,
      color: '#e63946',
      fill: true
    }], { maxXTicks: 12 })
  );

  // Top industries
  const topInd = topN(data, 'industry', 10);
  charts.industry = createChart(
    document.getElementById('overview-industry-chart'),
    barChartConfig(
      topInd.map(i => i.name),
      [{ label: 'Total Layoffs', data: topInd.map(i => i.total), colorIndex: 0 }],
      { horizontal: true }
    )
  );

  // Yearly
  const byYear = groupBy(data, 'year');
  const years = Object.keys(byYear).sort();
  const yearlyTotals = years.map(y => sumLayoffs(byYear[y]));
  charts.yearly = createChart(
    document.getElementById('overview-yearly-chart'),
    barChartConfig(years, [{
      label: 'Total Layoffs',
      data: yearlyTotals,
      colors: yearlyTotals.map((_, i) => `rgba(124, 58, 237, ${0.4 + i * 0.1})`),
      borderColors: yearlyTotals.map(() => '#7c3aed')
    }])
  );
}

function destroyCharts() {
  Object.values(charts).forEach(c => { if (c) c.destroy(); });
  charts = {};
}

export function update(data) {
  const container = document.getElementById('section-overview');
  if (container) render(container, data);
}
