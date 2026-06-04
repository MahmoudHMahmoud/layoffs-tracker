// ============================================
// FUNDING SECTION
// ============================================

import { sumLayoffs, groupBy } from '../dataLoader.js';
import { formatNumber, formatCurrency, getColor, getColorWithAlpha } from '../utils/formatters.js';
import { createChart, scatterChartConfig, barChartConfig } from '../utils/chartFactory.js';
import { generateFundingInsights, renderInsights } from '../insightsEngine.js';
import { pearsonCorrelation } from '../analyticsEngine.js';

let charts = {};

export function render(container, data) {
  const funded = data.filter(r => r.fundingMil && r.fundingMil > 0);

  // Correlation
  const fundingVals = funded.map(r => r.fundingMil);
  const layoffVals = funded.map(r => r.laidOff);
  const correlation = pearsonCorrelation(fundingVals, layoffVals);

  // Funding brackets
  const brackets = [
    { label: '$0–10M', min: 0, max: 10 },
    { label: '$10–50M', min: 10, max: 50 },
    { label: '$50–100M', min: 50, max: 100 },
    { label: '$100–500M', min: 100, max: 500 },
    { label: '$500M–1B', min: 500, max: 1000 },
    { label: '$1B+', min: 1000, max: Infinity }
  ];

  const bracketData = brackets.map(b => {
    const rows = funded.filter(r => r.fundingMil >= b.min && r.fundingMil < b.max);
    return { label: b.label, avgLayoffs: rows.length ? sumLayoffs(rows) / rows.length : 0, count: rows.length, total: sumLayoffs(rows) };
  });

  // Inefficient companies (high funding, high layoffs)
  const inefficient = [...funded]
    .sort((a, b) => (b.laidOff / b.fundingMil) - (a.laidOff / a.fundingMil))
    .slice(0, 10);

  container.innerHTML = `
    <div class="section__header">
      <h1 class="section__title">Funding vs Layoffs</h1>
      <p class="section__description">Analyze the relationship between funding raised and layoffs — does more money prevent job cuts?</p>
    </div>
    <div class="grid grid--kpi" style="margin-bottom: var(--space-5)">
      <div class="kpi" style="--kpi-color: var(--accent-purple); --kpi-bg: var(--accent-purple-dim)">
        <div class="kpi__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
        <div class="kpi__value">${funded.length}</div>
        <div class="kpi__label">Companies with Funding Data</div>
      </div>
      <div class="kpi" style="--kpi-color: ${correlation > 0 ? 'var(--accent-magenta)' : 'var(--accent-cyan)'}; --kpi-bg: ${correlation > 0 ? 'var(--accent-magenta-dim)' : 'var(--accent-cyan-dim)'}">
        <div class="kpi__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
        <div class="kpi__value">${correlation.toFixed(3)}</div>
        <div class="kpi__label">Correlation Coefficient</div>
        <div class="kpi__change ${correlation > 0 ? 'kpi__change--up' : 'kpi__change--down'}">${correlation > 0.3 ? 'Moderate Positive' : correlation > 0 ? 'Weak Positive' : correlation > -0.3 ? 'Weak Negative' : 'Moderate Negative'}</div>
      </div>
    </div>
    <div class="grid grid--2">
      <div class="chart-card">
        <div class="chart-card__header">
          <div>
            <div class="chart-card__title">Funding vs Layoffs Scatter</div>
            <div class="chart-card__subtitle">Each dot represents a layoff event</div>
          </div>
        </div>
        <div class="chart-container chart-container--lg"><canvas id="fund-scatter-chart"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-card__header">
          <div>
            <div class="chart-card__title">Average Layoffs by Funding Bracket</div>
            <div class="chart-card__subtitle">Grouped by amount of funding raised</div>
          </div>
        </div>
        <div class="chart-container chart-container--lg"><canvas id="fund-bracket-chart"></canvas></div>
      </div>
    </div>
    <div class="grid grid--2" style="margin-top: var(--space-5)">
      <div class="chart-card">
        <div class="chart-card__header">
          <div>
            <div class="chart-card__title">Highest Layoff-to-Funding Ratio</div>
            <div class="chart-card__subtitle">Companies laying off the most relative to funding raised</div>
          </div>
        </div>
        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead><tr><th>Company</th><th>Funding</th><th>Laid Off</th><th>Ratio</th><th>Industry</th></tr></thead>
            <tbody>
              ${inefficient.map(r => `
                <tr>
                  <td class="td-company">${r.company}</td>
                  <td class="td-number">${formatCurrency(r.fundingMil)}</td>
                  <td class="td-number">${formatNumber(r.laidOff)}</td>
                  <td class="td-number">${(r.laidOff / r.fundingMil).toFixed(2)}</td>
                  <td>${r.industry}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="insights-panel">
        <div class="insights-panel__title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          Funding Insights
        </div>
        <div id="fund-insights"></div>
      </div>
    </div>
  `;

  // Scatter plot
  const scatterData = funded.slice(0, 500).map(r => ({ x: r.fundingMil, y: r.laidOff, company: r.company }));
  charts.scatter = createChart(
    document.getElementById('fund-scatter-chart'),
    scatterChartConfig([{
      label: 'Companies',
      data: scatterData,
      pointRadius: 4
    }], {
      xLabel: 'Funding Raised ($M)',
      yLabel: 'Workers Laid Off',
      xTickCallback: (v) => '$' + formatNumber(v),
      tooltipCallback: (ctx) => {
        const p = ctx.raw;
        return `${p.company}: $${formatNumber(p.x)}M funding, ${formatNumber(p.y)} laid off`;
      }
    })
  );

  // Bracket bar chart
  charts.brackets = createChart(
    document.getElementById('fund-bracket-chart'),
    barChartConfig(bracketData.map(b => b.label), [{
      label: 'Avg Layoffs',
      data: bracketData.map(b => Math.round(b.avgLayoffs)),
      colors: bracketData.map((_, i) => getColorWithAlpha(i + 1, 0.7)),
      borderColors: bracketData.map((_, i) => getColor(i + 1))
    }])
  );

  const insights = generateFundingInsights(data);
  renderInsights(container.querySelector('#fund-insights'), insights);
}

export function update(data) {
  const container = document.getElementById('section-funding');
  if (container) render(container, data);
}
