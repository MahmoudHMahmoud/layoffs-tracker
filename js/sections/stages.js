// ============================================
// STAGES SECTION
// ============================================

import { topN, groupBy, sumLayoffs } from '../dataLoader.js';
import { formatNumber, getColor, getColorWithAlpha } from '../utils/formatters.js';
import { createChart, barChartConfig, polarChartConfig, doughnutChartConfig } from '../utils/chartFactory.js';
import { generateStageInsights, renderInsights } from '../insightsEngine.js';

let charts = {};

const STAGE_ORDER = ['Seed', 'Series A', 'Series B', 'Series C', 'Series D', 'Series E', 'Series F', 'Series G', 'Series H', 'Series I', 'Private Equity', 'Acquired', 'Post-IPO', 'Unknown'];

export function render(container, data) {
  const withStage = data.filter(r => r.stage && r.stage !== 'Unknown');
  const byStage = groupBy(withStage, 'stage');
  const stageData = STAGE_ORDER
    .filter(s => byStage[s] && byStage[s].length > 0)
    .map(s => ({
      name: s,
      total: sumLayoffs(byStage[s]),
      count: byStage[s].length,
      avgSize: sumLayoffs(byStage[s]) / byStage[s].length,
      avgPct: byStage[s].filter(r => r.percentage).length
        ? byStage[s].filter(r => r.percentage).reduce((sum, r) => sum + r.percentage, 0) / byStage[s].filter(r => r.percentage).length
        : null
    }));

  container.innerHTML = `
    <div class="section__header">
      <h1 class="section__title">Stage Analysis</h1>
      <p class="section__description">Understand which company maturity stages are most vulnerable to layoffs.</p>
    </div>
    <div class="grid grid--2">
      <div class="chart-card">
        <div class="chart-card__header">
          <div>
            <div class="chart-card__title">Layoffs by Company Stage</div>
            <div class="chart-card__subtitle">From Seed to Post-IPO — total layoffs at each stage</div>
          </div>
        </div>
        <div class="chart-container chart-container--lg"><canvas id="stage-bar-chart"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-card__header">
          <div>
            <div class="chart-card__title">Stage Distribution</div>
            <div class="chart-card__subtitle">Proportional view of layoffs by stage</div>
          </div>
        </div>
        <div class="chart-container chart-container--lg"><canvas id="stage-polar-chart"></canvas></div>
      </div>
    </div>
    <div class="grid grid--2" style="margin-top: var(--space-5)">
      <div class="chart-card">
        <div class="chart-card__header">
          <div>
            <div class="chart-card__title">Stage Vulnerability Ranking</div>
            <div class="chart-card__subtitle">Average layoff size and severity by stage</div>
          </div>
        </div>
        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead><tr><th>Stage</th><th>Total</th><th>Events</th><th>Avg Size</th><th>Avg %</th></tr></thead>
            <tbody>
              ${stageData.map(s => `
                <tr>
                  <td class="td-company">${s.name}</td>
                  <td class="td-number">${formatNumber(s.total)}</td>
                  <td class="td-number">${s.count}</td>
                  <td class="td-number">${formatNumber(s.avgSize)}</td>
                  <td class="td-number">${s.avgPct ? s.avgPct.toFixed(1) + '%' : 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="insights-panel">
        <div class="insights-panel__title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          Stage Insights
        </div>
        <div id="stage-insights"></div>
      </div>
    </div>
  `;

  // Bar chart
  charts.bar = createChart(
    document.getElementById('stage-bar-chart'),
    barChartConfig(stageData.map(s => s.name), [{
      label: 'Total Layoffs',
      data: stageData.map(s => s.total),
      colors: stageData.map((_, i) => getColorWithAlpha(i, 0.7)),
      borderColors: stageData.map((_, i) => getColor(i))
    }])
  );

  // Polar chart
  charts.polar = createChart(
    document.getElementById('stage-polar-chart'),
    polarChartConfig(stageData.map(s => s.name), stageData.map(s => s.total))
  );

  const insights = generateStageInsights(data);
  renderInsights(container.querySelector('#stage-insights'), insights);
}

export function update(data) {
  const container = document.getElementById('section-stages');
  if (container) render(container, data);
}
