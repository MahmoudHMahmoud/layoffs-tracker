// ============================================
// COMPANIES SECTION
// ============================================

import { topN, groupBy, sumLayoffs, getMonthlyTimeSeries } from '../dataLoader.js';
import { formatNumber, formatNumberFull, formatDate, monthKeyToLabel, getColor, getColorWithAlpha } from '../utils/formatters.js';
import { createChart, barChartConfig, lineChartConfig } from '../utils/chartFactory.js';
import { generateCompanyInsights, renderInsights } from '../insightsEngine.js';
import { calculateRiskScore } from '../analyticsEngine.js';

let charts = {};

export function render(container, data) {
  const top20 = topN(data, 'company', 20);
  const byCompany = groupBy(data, 'company');

  // Repeat offenders
  const repeaters = Object.entries(byCompany)
    .map(([name, rows]) => ({
      name, count: rows.length, total: sumLayoffs(rows),
      risk: calculateRiskScore(rows),
      industries: [...new Set(rows.map(r => r.industry))].join(', '),
      lastDate: new Date(Math.max(...rows.map(r => r.date.getTime())))
    }))
    .filter(c => c.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  container.innerHTML = `
    <div class="section__header">
      <h1 class="section__title">Company Analysis</h1>
      <p class="section__description">Deep dive into individual companies — identify top contributors, repeat offenders, and patterns.</p>
    </div>
    <div class="grid grid--2">
      <div class="chart-card">
        <div class="chart-card__header">
          <div>
            <div class="chart-card__title">Top 20 Companies by Layoffs</div>
            <div class="chart-card__subtitle">Companies with the highest total layoffs</div>
          </div>
        </div>
        <div class="chart-container chart-container--lg"><canvas id="co-top20-chart"></canvas></div>
      </div>
      <div>
        <div class="chart-card" style="margin-bottom: var(--space-5)">
          <div class="chart-card__header">
            <div>
              <div class="chart-card__title">Company Comparison</div>
              <div class="chart-card__subtitle">Select companies to compare side-by-side</div>
            </div>
          </div>
          <div style="margin-bottom: var(--space-3);">
            <select id="co-compare-select" multiple style="width:100%; min-height:60px; padding:8px; font-size: 12px;">
              ${Object.keys(byCompany).sort().map(c => `<option value="${c}">${c} (${formatNumber(sumLayoffs(byCompany[c]))})</option>`).join('')}
            </select>
            <div class="text-xs text-secondary" style="margin-top:4px;">Hold Ctrl/Cmd to select multiple (max 5)</div>
          </div>
          <div class="chart-container chart-container--sm"><canvas id="co-compare-chart"></canvas></div>
        </div>
        <div class="insights-panel">
          <div class="insights-panel__title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            Company Insights
          </div>
          <div id="co-insights"></div>
        </div>
      </div>
    </div>
    <div class="chart-card" style="margin-top: var(--space-5)">
      <div class="chart-card__header">
        <div>
          <div class="chart-card__title">Repeat Layoff Companies</div>
          <div class="chart-card__subtitle">Companies with multiple layoff rounds — higher risk indicators</div>
        </div>
      </div>
      <div style="overflow-x: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Rounds</th>
              <th>Total Laid Off</th>
              <th>Risk Score</th>
              <th>Industry</th>
              <th>Last Layoff</th>
            </tr>
          </thead>
          <tbody>
            ${repeaters.map(r => `
              <tr>
                <td class="td-company">${r.name}</td>
                <td class="td-number">${r.count}</td>
                <td class="td-number">${formatNumberFull(r.total)}</td>
                <td>
                  <div class="score-meter">
                    <div class="score-meter__bar"><div class="score-meter__fill score-meter__fill--${r.risk > 60 ? 'high' : r.risk > 30 ? 'medium' : 'low'}" style="width:${r.risk}%"></div></div>
                    <span class="score-meter__label">${r.risk}</span>
                  </div>
                </td>
                <td>${r.industries}</td>
                <td>${formatDate(r.lastDate.toISOString())}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Top 20 chart
  charts.top20 = createChart(
    document.getElementById('co-top20-chart'),
    barChartConfig(top20.map(c => c.name), [{
      label: 'Total Layoffs',
      data: top20.map(c => c.total),
      colorIndex: 4
    }], { horizontal: true })
  );

  // Comparison select
  const select = container.querySelector('#co-compare-select');
  select.addEventListener('change', () => {
    const selected = [...select.selectedOptions].map(o => o.value).slice(0, 5);
    renderComparisonChart(data, selected);
  });

  // Default comparison - top 3
  renderComparisonChart(data, top20.slice(0, 3).map(c => c.name));

  // Insights
  const insights = generateCompanyInsights(data);
  renderInsights(container.querySelector('#co-insights'), insights);
}

function renderComparisonChart(data, companies) {
  if (charts.compare) charts.compare.destroy();
  if (!companies.length) return;

  const byCompany = groupBy(data, 'company');
  const datasets = companies.map((name, i) => {
    const rows = byCompany[name] || [];
    const monthly = {};
    rows.forEach(r => {
      if (!monthly[r.month]) monthly[r.month] = 0;
      monthly[r.month] += r.laidOff;
    });
    const allMonths = [...new Set(data.map(r => r.month))].sort();
    return {
      label: name,
      data: allMonths.map(m => monthly[m] || 0),
      color: getColor(i),
      pointRadius: 1
    };
  });

  const allMonths = [...new Set(data.map(r => r.month))].sort();
  const labels = allMonths.map(m => monthKeyToLabel(m));

  charts.compare = createChart(
    document.getElementById('co-compare-chart'),
    lineChartConfig(labels, datasets, { maxXTicks: 10 })
  );
}

export function update(data) {
  const container = document.getElementById('section-companies');
  if (container) render(container, data);
}
