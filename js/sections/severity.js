// ============================================
// SEVERITY SECTION
// ============================================

import { groupBy, sumLayoffs } from '../dataLoader.js';
import { formatNumber, formatPercent, getColor, getColorWithAlpha } from '../utils/formatters.js';
import { createChart, barChartConfig, doughnutChartConfig, lineChartConfig } from '../utils/chartFactory.js';
import { generateSeverityInsights, renderInsights } from '../insightsEngine.js';

let charts = {};

const SEVERITY_LEVELS = [
  { label: 'Minor (<10%)', min: 0, max: 10, color: '#06d6a0' },
  { label: 'Moderate (10–30%)', min: 10, max: 30, color: '#3b82f6' },
  { label: 'Major (30–50%)', min: 30, max: 50, color: '#f59e0b' },
  { label: 'Mass (50–99%)', min: 50, max: 100, color: '#e63946' },
  { label: 'Shutdown (100%)', min: 100, max: 101, color: '#ec4899' }
];

export function render(container, data) {
  const withPct = data.filter(r => r.percentage != null && r.percentage > 0);

  const severityBuckets = SEVERITY_LEVELS.map(level => {
    const rows = withPct.filter(r => r.percentage >= level.min && r.percentage < level.max);
    return { ...level, count: rows.length, total: sumLayoffs(rows), rows };
  });

  // Extreme cases (shutdowns)
  const shutdowns = data.filter(r => r.percentage === 100)
    .sort((a, b) => b.laidOff - a.laidOff)
    .slice(0, 12);

  // Severity over time
  const byYear = groupBy(withPct, 'year');
  const years = Object.keys(byYear).sort();
  const avgSeverityByYear = years.map(y => {
    const rows = byYear[y];
    return rows.reduce((s, r) => s + r.percentage, 0) / rows.length;
  });

  container.innerHTML = `
    <div class="section__header">
      <h1 class="section__title">Layoff Severity</h1>
      <p class="section__description">Analyze the depth of layoffs — from minor trims to complete shutdowns.</p>
    </div>
    <div class="grid grid--kpi" style="margin-bottom: var(--space-5)">
      ${severityBuckets.map(b => `
        <div class="kpi" style="--kpi-color: ${b.color}; --kpi-bg: ${b.color}22">
          <div class="kpi__value" style="font-size: var(--text-2xl)">${b.count}</div>
          <div class="kpi__label">${b.label}</div>
          <div class="kpi__change" style="background: ${b.color}22; color: ${b.color}">${formatNumber(b.total)} laid off</div>
        </div>
      `).join('')}
    </div>
    <div class="grid grid--2">
      <div class="chart-card">
        <div class="chart-card__header">
          <div>
            <div class="chart-card__title">Severity Distribution</div>
            <div class="chart-card__subtitle">Proportion of layoffs by severity level</div>
          </div>
        </div>
        <div class="chart-container"><canvas id="sev-dist-chart"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-card__header">
          <div>
            <div class="chart-card__title">Severity Histogram</div>
            <div class="chart-card__subtitle">Distribution of layoff percentages</div>
          </div>
        </div>
        <div class="chart-container"><canvas id="sev-hist-chart"></canvas></div>
      </div>
    </div>
    <div class="grid grid--2" style="margin-top: var(--space-5)">
      <div class="chart-card">
        <div class="chart-card__header">
          <div>
            <div class="chart-card__title">Average Severity Over Time</div>
            <div class="chart-card__subtitle">Are layoffs getting more severe?</div>
          </div>
        </div>
        <div class="chart-container chart-container--sm"><canvas id="sev-trend-chart"></canvas></div>
      </div>
      <div class="insights-panel">
        <div class="insights-panel__title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          Severity Insights
        </div>
        <div id="sev-insights"></div>
      </div>
    </div>
    <div class="chart-card" style="margin-top: var(--space-5)">
      <div class="chart-card__header">
        <div>
          <div class="chart-card__title">Company Shutdowns (100% Layoff)</div>
          <div class="chart-card__subtitle">Companies that completely ceased operations</div>
        </div>
      </div>
      <div style="overflow-x: auto;">
        <table class="data-table">
          <thead><tr><th>Company</th><th>Industry</th><th>Workers</th><th>Country</th><th>Stage</th><th>Funding</th></tr></thead>
          <tbody>
            ${shutdowns.map(r => `
              <tr>
                <td class="td-company">${r.company}</td>
                <td>${r.industry}</td>
                <td class="td-number">${formatNumber(r.laidOff)}</td>
                <td>${r.country}</td>
                <td><span class="badge badge--info">${r.stage}</span></td>
                <td class="td-number">${r.fundingMil ? '$' + formatNumber(r.fundingMil) + 'M' : 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Distribution doughnut
  charts.dist = createChart(
    document.getElementById('sev-dist-chart'),
    doughnutChartConfig(
      severityBuckets.map(b => b.label),
      severityBuckets.map(b => b.count),
      { plugins: {} }
    )
  );

  // Histogram
  const histBins = [];
  for (let i = 0; i <= 100; i += 10) {
    const count = withPct.filter(r => r.percentage >= i && r.percentage < i + 10).length;
    histBins.push({ label: `${i}–${i + 10}%`, count });
  }
  charts.hist = createChart(
    document.getElementById('sev-hist-chart'),
    barChartConfig(histBins.map(b => b.label), [{
      label: 'Count',
      data: histBins.map(b => b.count),
      colors: histBins.map((_, i) => {
        const ratio = i / histBins.length;
        if (ratio < 0.3) return 'rgba(6, 214, 160, 0.7)';
        if (ratio < 0.6) return 'rgba(245, 158, 11, 0.7)';
        return 'rgba(230, 57, 70, 0.7)';
      }),
      borderColors: histBins.map((_, i) => {
        const ratio = i / histBins.length;
        if (ratio < 0.3) return '#06d6a0';
        if (ratio < 0.6) return '#f59e0b';
        return '#e63946';
      })
    }])
  );

  // Severity trend
  charts.trend = createChart(
    document.getElementById('sev-trend-chart'),
    lineChartConfig(years, [{
      label: 'Avg Severity %',
      data: avgSeverityByYear,
      color: '#f59e0b',
      fill: true
    }], { yTickCallback: (v) => v.toFixed(0) + '%' })
  );

  const insights = generateSeverityInsights(data);
  renderInsights(container.querySelector('#sev-insights'), insights);
}

export function update(data) {
  const container = document.getElementById('section-severity');
  if (container) render(container, data);
}
