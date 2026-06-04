// ============================================
// GEOGRAPHIC SECTION
// ============================================

import { topN, groupBy, sumLayoffs } from '../dataLoader.js';
import { formatNumber, formatNumberFull, getColor, getColorWithAlpha } from '../utils/formatters.js';
import { createChart, barChartConfig, doughnutChartConfig } from '../utils/chartFactory.js';
import { generateGeoInsights, renderInsights } from '../insightsEngine.js';

let charts = {};
let mapInstance = null;
let heatLayer = null;

export function render(container, data) {
  const topCountries = topN(data, 'country', 15);
  const topContinents = topN(data, 'continent', 7);

  container.innerHTML = `
    <div class="section__header">
      <h1 class="section__title">Geographic Analysis</h1>
      <p class="section__description">Visualize layoffs across the globe — identify regional hotspots and geographic patterns.</p>
    </div>
    <div class="chart-card">
      <div class="chart-card__header">
        <div>
          <div class="chart-card__title">Global Layoff Heatmap</div>
          <div class="chart-card__subtitle">Geographic distribution of layoff events — brighter areas indicate higher concentration</div>
        </div>
      </div>
      <div class="map-container" id="geo-map"></div>
    </div>
    <div class="grid grid--2" style="margin-top: var(--space-5)">
      <div class="chart-card">
        <div class="chart-card__header">
          <div>
            <div class="chart-card__title">Top Countries</div>
            <div class="chart-card__subtitle">Countries with the most layoffs</div>
          </div>
        </div>
        <div class="chart-container chart-container--lg"><canvas id="geo-countries-chart"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-card__header">
          <div>
            <div class="chart-card__title">Continental Breakdown</div>
            <div class="chart-card__subtitle">Layoffs by continent</div>
          </div>
        </div>
        <div class="chart-container"><canvas id="geo-continent-chart"></canvas></div>
      </div>
    </div>
    <div class="grid grid--2" style="margin-top: var(--space-5)">
      <div class="chart-card">
        <div class="chart-card__header">
          <div>
            <div class="chart-card__title">Country Ranking</div>
            <div class="chart-card__subtitle">Detailed metrics by country</div>
          </div>
        </div>
        <div style="overflow-x:auto; max-height:400px; overflow-y:auto;">
          <table class="data-table">
            <thead><tr><th>#</th><th>Country</th><th>Total Layoffs</th><th>Events</th><th>Avg/Event</th></tr></thead>
            <tbody>
              ${topCountries.map((c, i) => `
                <tr>
                  <td class="td-number">${i + 1}</td>
                  <td class="td-company">${c.name}</td>
                  <td class="td-number">${formatNumberFull(c.total)}</td>
                  <td class="td-number">${c.count}</td>
                  <td class="td-number">${formatNumber(c.total / c.count)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="insights-panel">
        <div class="insights-panel__title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          Geographic Insights
        </div>
        <div id="geo-insights"></div>
      </div>
    </div>
  `;

  // Initialize map
  setTimeout(() => initMap(data), 100);

  // Countries bar chart
  charts.countries = createChart(
    document.getElementById('geo-countries-chart'),
    barChartConfig(topCountries.map(c => c.name), [{
      label: 'Total Layoffs',
      data: topCountries.map(c => c.total),
      colorIndex: 2
    }], { horizontal: true })
  );

  // Continent doughnut
  charts.continent = createChart(
    document.getElementById('geo-continent-chart'),
    doughnutChartConfig(topContinents.map(c => c.name), topContinents.map(c => c.total))
  );

  const insights = generateGeoInsights(data);
  renderInsights(container.querySelector('#geo-insights'), insights);
}

function initMap(data) {
  const mapEl = document.getElementById('geo-map');
  if (!mapEl || !window.L) return;

  if (mapInstance) { mapInstance.remove(); mapInstance = null; }

  mapInstance = L.map('geo-map', {
    center: [20, 0],
    zoom: 2,
    minZoom: 2,
    maxZoom: 10,
    zoomControl: true,
    scrollWheelZoom: true
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(mapInstance);

  // Heat data: [lat, lng, intensity]
  const heatData = data
    .filter(r => r.lat && r.lng)
    .map(r => [r.lat, r.lng, Math.min(r.laidOff / 100, 10)]);

  if (window.L.heatLayer && heatData.length) {
    heatLayer = L.heatLayer(heatData, {
      radius: 20,
      blur: 25,
      maxZoom: 8,
      max: 10,
      gradient: {
        0.2: '#06d6a0',
        0.4: '#3b82f6',
        0.6: '#f59e0b',
        0.8: '#e63946',
        1.0: '#ec4899'
      }
    }).addTo(mapInstance);
  }

  // Add circle markers for top events
  const topEvents = [...data].sort((a, b) => b.laidOff - a.laidOff).slice(0, 50);
  topEvents.forEach(r => {
    if (!r.lat || !r.lng) return;
    const circle = L.circleMarker([r.lat, r.lng], {
      radius: Math.min(3 + Math.sqrt(r.laidOff) / 5, 15),
      fillColor: '#e63946',
      fillOpacity: 0.4,
      color: '#e63946',
      weight: 1
    }).addTo(mapInstance);

    circle.bindPopup(`
      <div style="font-size:13px;">
        <strong>${r.company}</strong><br/>
        <span style="color:#8888a0;">${r.industry} • ${r.country}</span><br/>
        <span style="color:#e63946; font-weight:600;">${formatNumber(r.laidOff)} laid off</span>
        ${r.percentage ? `<br/><span>${r.percentage}% of workforce</span>` : ''}
      </div>
    `);
  });

  setTimeout(() => mapInstance.invalidateSize(), 200);
}

export function update(data) {
  const container = document.getElementById('section-geographic');
  if (container) render(container, data);
}
