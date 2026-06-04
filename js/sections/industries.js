// ============================================
// INDUSTRIES SECTION
// ============================================

import { topN, groupBy, sumLayoffs } from '../dataLoader.js';
import { formatNumber, getColor, getColorWithAlpha, monthKeyToLabel } from '../utils/formatters.js';
import { createChart, barChartConfig, lineChartConfig, doughnutChartConfig } from '../utils/chartFactory.js';
import { generateIndustryInsights, renderInsights } from '../insightsEngine.js';
import { volatilityIndex } from '../analyticsEngine.js';

let charts = {};

export function render(container, data) {
  const topIndustries = topN(data, 'industry', 15);
  const volIndex = volatilityIndex(data, 'industry').slice(0, 10);

  container.innerHTML = `
    <div class="section__header">
      <h1 class="section__title">Industry Analysis</h1>
      <p class="section__description">Analyze which industries are most affected, track trends, and identify volatility patterns.</p>
    </div>
    <div class="grid grid--2">
      <div class="chart-card">
        <div class="chart-card__header">
          <div>
            <div class="chart-card__title">Layoffs by Industry</div>
            <div class="chart-card__subtitle">Total layoffs per industry sector</div>
          </div>
        </div>
        <div class="chart-container chart-container--lg"><canvas id="ind-bar-chart"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-card__header">
          <div>
            <div class="chart-card__title">Industry Distribution</div>
            <div class="chart-card__subtitle">Proportional share of layoffs</div>
          </div>
        </div>
        <div class="chart-container chart-container--lg"><canvas id="ind-doughnut-chart"></canvas></div>
      </div>
    </div>
    <div class="chart-card" style="margin-top: var(--space-5)">
      <div class="chart-card__header">
        <div>
          <div class="chart-card__title">Industry Trends Over Time</div>
          <div class="chart-card__subtitle">Top 5 industries — monthly layoff trends</div>
        </div>
      </div>
      <div class="chart-container chart-container--lg"><canvas id="ind-trends-chart"></canvas></div>
    </div>
    <div class="grid grid--2" style="margin-top: var(--space-5)">
      <div class="chart-card">
        <div class="chart-card__header">
          <div>
            <div class="chart-card__title">Industry Volatility Index</div>
            <div class="chart-card__subtitle">Higher volatility = more unpredictable layoff patterns</div>
          </div>
        </div>
        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead><tr><th>Industry</th><th>Volatility</th><th>Avg Layoff</th><th>Events</th></tr></thead>
            <tbody>
              ${volIndex.map(v => `
                <tr>
                  <td class="td-company">${v.name}</td>
                  <td class="td-number">${v.volatility.toFixed(1)}</td>
                  <td class="td-number">${formatNumber(v.mean)}</td>
                  <td class="td-number">${v.count}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="insights-panel">
        <div class="insights-panel__title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          Industry Insights
        </div>
        <div id="ind-insights"></div>
      </div>
    </div>
  `;

  // Bar chart
  charts.bar = createChart(
    document.getElementById('ind-bar-chart'),
    barChartConfig(topIndustries.map(i => i.name), [{
      label: 'Total Layoffs',
      data: topIndustries.map(i => i.total),
      colorIndex: 0
    }], { horizontal: true })
  );

  // Doughnut
  const top8 = topIndustries.slice(0, 8);
  charts.doughnut = createChart(
    document.getElementById('ind-doughnut-chart'),
    doughnutChartConfig(top8.map(i => i.name), top8.map(i => i.total))
  );

  // Trends
  const top5 = topIndustries.slice(0, 5);
  const byIndustry = groupBy(data, 'industry');
  const allMonths = [...new Set(data.map(r => r.month))].filter(Boolean).sort();
  const trendDatasets = top5.map((ind, i) => {
    const rows = byIndustry[ind.name] || [];
    const monthly = {};
    rows.forEach(r => { if (r.month) { monthly[r.month] = (monthly[r.month] || 0) + r.laidOff; } });
    return {
      label: ind.name,
      data: allMonths.map(m => monthly[m] || 0),
      color: getColor(i),
      pointRadius: 0,
      tension: 0.4
    };
  });

  charts.trends = createChart(
    document.getElementById('ind-trends-chart'),
    lineChartConfig(allMonths.map(m => monthKeyToLabel(m)), trendDatasets, { maxXTicks: 12 })
  );

  const insights = generateIndustryInsights(data);
  renderInsights(container.querySelector('#ind-insights'), insights);
}

export function update(data) {
  const container = document.getElementById('section-industries');
  if (container) render(container, data);
}
